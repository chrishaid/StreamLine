import Anthropic from '@anthropic-ai/sdk';

interface MessageRequest {
  message: string;
  sessionId?: string;
  processId?: string;
  includeContext?: boolean;
  bpmnXml?: string;
  diagramImage?: string; // Base64 encoded SVG
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class ClaudeService {
  private client: Anthropic;
  private sessions: Map<string, ChatMessage[]> = new Map();

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }

    this.client = new Anthropic({
      apiKey,
    });
  }

  async sendMessage(request: MessageRequest) {
    const {
      message,
      sessionId = crypto.randomUUID(),
      processId,
      includeContext = true,
      bpmnXml,
    } = request;

    // Get or create session history
    let messages = this.sessions.get(sessionId) || [];

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
    };

    messages.push(userMessage);

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(bpmnXml);

    try {
      // Call Claude API
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16384, // Significantly increased for large BPMN XML with diagram elements
        system: systemPrompt,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      // Extract assistant's response
      const assistantContent =
        response.content[0].type === 'text' ? response.content[0].text : '';

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: assistantContent,
      };

      messages.push(assistantMessage);

      // Store session history (keep last 20 messages)
      if (messages.length > 20) {
        messages = messages.slice(-20);
      }
      this.sessions.set(sessionId, messages);

      // Clean up old sessions (simple cleanup strategy)
      if (this.sessions.size > 100) {
        const firstKey = this.sessions.keys().next().value;
        this.sessions.delete(firstKey);
      }

      return {
        message: {
          id: crypto.randomUUID(),
          sessionId,
          processId: processId || null,
          role: 'assistant' as const,
          content: assistantContent,
          metadata: {
            modelUsed: response.model,
            tokensUsed:
              response.usage.input_tokens + response.usage.output_tokens,
          },
          createdAt: new Date(),
        },
        sessionId,
      };
    } catch (error: any) {
      console.error('Claude API error:', error);
      throw {
        statusCode: 500,
        code: 'CLAUDE_API_ERROR',
        message: error.message || 'Failed to get response from Claude',
        details: error,
      };
    }
  }

  async *sendMessageStream(request: MessageRequest) {
    const {
      message,
      sessionId = crypto.randomUUID(),
      processId,
      includeContext = true,
      bpmnXml,
      diagramImage,
    } = request;

    // Get or create session history
    let messages = this.sessions.get(sessionId) || [];

    console.log(`📝 Session ${sessionId.substring(0, 8)}: ${messages.length} previous messages in context`);

    // Build user message with optional diagram image
    let userMessageContent: any = message;

    if (diagramImage) {
      // Include diagram image in the message
      userMessageContent = [
        {
          type: 'image',
          source: {
            type: 'base64',
            media_type: 'image/svg+xml',
            data: diagramImage,
          },
        },
        {
          type: 'text',
          text: message,
        },
      ];
    }

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: typeof userMessageContent === 'string' ? userMessageContent : message,
    };

    messages.push(userMessage);

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(bpmnXml, !!diagramImage);

    try {
      // Call Claude API with streaming
      // Build messages array with proper content types
      const apiMessages = messages.map((msg, idx) => {
        // Use the structured content for the last message if we have a diagram
        if (idx === messages.length - 1 && diagramImage) {
          return {
            role: msg.role,
            content: userMessageContent,
          };
        }
        return {
          role: msg.role,
          content: msg.content,
        };
      });

      console.log(`🤖 Sending ${apiMessages.length} messages to Claude (including ${Math.floor(apiMessages.length / 2)} user prompts)`);

      const stream = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16384, // Significantly increased for large BPMN XML with diagram elements
        system: systemPrompt,
        stream: true,
        messages: apiMessages,
      });

      let fullContent = '';
      let thinkingContent = '';
      let currentThinking = '';
      let isThinking = false;
      let stopReason: string | undefined;

      for await (const event of stream) {
        if (event.type === 'content_block_start') {
          if (event.content_block.type === 'thinking') {
            isThinking = true;
            currentThinking = '';
          }
        } else if (event.type === 'content_block_delta') {
          if (event.delta.type === 'thinking_delta') {
            currentThinking += event.delta.thinking;
            thinkingContent = currentThinking;
            yield {
              type: 'thinking',
              content: currentThinking,
              sessionId,
            };
          } else if (event.delta.type === 'text_delta') {
            fullContent += event.delta.text;
            yield {
              type: 'content',
              content: event.delta.text,
              fullContent,
              sessionId,
            };
          }
        } else if (event.type === 'content_block_stop') {
          if (isThinking) {
            isThinking = false;
          }
        } else if (event.type === 'message_delta') {
          // Capture stop reason
          if (event.delta.stop_reason) {
            stopReason = event.delta.stop_reason;
          }
        } else if (event.type === 'message_stop') {
          // Check if response might be truncated
          const hasIncompleteXml = (fullContent.includes('<bpmn') || fullContent.includes('<?xml')) &&
            !fullContent.includes('</bpmn:definitions>');

          if (hasIncompleteXml) {
            console.warn(`⚠️ Warning: Response contains incomplete BPMN XML (${fullContent.length} chars, stop_reason: ${stopReason || 'unknown'})`);
            if (stopReason === 'max_tokens') {
              console.error('❌ Response was truncated due to max_tokens limit! Consider increasing max_tokens.');
            }
          }

          // Store the complete message in session history
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: fullContent,
          };

          messages.push(assistantMessage);

          // Store session history (keep last 20 messages)
          if (messages.length > 20) {
            messages = messages.slice(-20);
          }
          this.sessions.set(sessionId, messages);

          console.log(`💾 Stored session ${sessionId.substring(0, 8)}: now ${messages.length} messages total (${fullContent.length} chars, stop: ${stopReason || 'unknown'})`);

          // Clean up old sessions
          if (this.sessions.size > 100) {
            const firstKey = this.sessions.keys().next().value;
            this.sessions.delete(firstKey);
          }

          yield {
            type: 'done',
            sessionId,
            messageId: crypto.randomUUID(),
            processId: processId || null,
          };
        }
      }
    } catch (error: any) {
      console.error('Claude API streaming error:', error);
      yield {
        type: 'error',
        error: error.message || 'Failed to get response from Claude',
      };
    }
  }

  async getSuggestions(bpmnXml: string): Promise<string[]> {
    const systemPrompt = `You are a BPMN process expert. Analyze the provided BPMN diagram and suggest improvements.`;

    const userPrompt = `Please analyze this BPMN diagram and provide 3-5 specific suggestions for improvement:

${bpmnXml}

Focus on:
1. Missing error handling
2. Process bottlenecks
3. Unclear naming
4. Missing documentation
5. Best practice violations

Provide concise, actionable suggestions.`;

    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      const content =
        response.content[0].type === 'text' ? response.content[0].text : '';

      // Parse suggestions from response (simple split by newlines)
      const suggestions = content
        .split('\n')
        .filter((line) => line.trim().match(/^[\d\-\*\.]/))
        .map((line) => line.replace(/^[\d\-\*\.]\s*/, '').trim())
        .filter((line) => line.length > 0);

      return suggestions.slice(0, 5);
    } catch (error: any) {
      console.error('Claude API error:', error);
      throw {
        statusCode: 500,
        code: 'CLAUDE_API_ERROR',
        message: 'Failed to get suggestions from Claude',
        details: error,
      };
    }
  }

  private buildSystemPrompt(bpmnXml?: string, hasDiagramImage?: boolean): string {
    let prompt = `You are an expert AI assistant for StreamLine, a BPMN Process Hub application. You help users create, edit, and optimize business process diagrams using BPMN 2.0 notation.

Your capabilities:
- Create new BPMN diagrams from natural language descriptions
- Suggest modifications to existing diagrams
- Explain BPMN diagrams in plain language
- Identify process improvements and optimization opportunities
- Help with BPMN best practices

CRITICAL INSTRUCTIONS FOR CREATING BPMN DIAGRAMS:
1. When asked to create a process, ALWAYS provide complete, valid BPMN 2.0 XML
2. Include proper XML declaration and BPMN namespace definitions
3. Include both process definitions AND diagram elements (BPMNDiagram, BPMNPlane, BPMNShape, BPMNEdge)
4. Use proper element IDs and references
5. Include coordinates (dc:Bounds) for all visual elements
6. Wrap BPMN XML in \`\`\`xml code blocks for clarity

Example BPMN structure:
\`\`\`xml
<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Start"/>
    <bpmn:task id="Task_1" name="Do Something"/>
    <bpmn:endEvent id="EndEvent_1" name="End"/>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1"/>
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1"/>
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="Shape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Shape_Task_1" bpmnElement="Task_1">
        <dc:Bounds x="240" y="80" width="100" height="80"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Shape_EndEvent_1" bpmnElement="EndEvent_1">
        <dc:Bounds x="392" y="102" width="36" height="36"/>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Edge_Flow_1" bpmnElement="Flow_1">
        <di:waypoint x="188" y="120"/>
        <di:waypoint x="240" y="120"/>
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Edge_Flow_2" bpmnElement="Flow_2">
        <di:waypoint x="340" y="120"/>
        <di:waypoint x="392" y="120"/>
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
\`\`\`

Guidelines:
- Be concise and clear
- Use BPMN 2.0 standard notation
- Focus on practical, actionable advice
- When creating diagrams, provide complete, valid BPMN XML with both process and diagram elements
- Layout elements left-to-right with 80-120 pixel spacing
- Consider error handling, edge cases, and process efficiency`;

    if (bpmnXml && !hasDiagramImage) {
      prompt += `\n\nCurrent BPMN diagram context (XML):\n${bpmnXml}`;
    } else if (hasDiagramImage) {
      prompt += `\n\nNote: The user has provided a visual diagram of the current BPMN process. You can see it in the attached image. Use this visual context along with any BPMN XML to understand the current state of the process and provide better suggestions.`;
    }

    return prompt;
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

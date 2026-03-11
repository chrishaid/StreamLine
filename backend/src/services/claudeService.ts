import Anthropic from '@anthropic-ai/sdk';
import {
  MODEL_CONFIG,
  buildBpmnExpertPrompt,
  buildProcessImproverPrompt,
  buildDesignGuruPrompt,
  SkillContext
} from '../skills';

interface MessageRequest {
  message: string;
  sessionId?: string;
  processId?: string;
  includeContext?: boolean;
  bpmnXml?: string;
  diagramImage?: string; // Base64 encoded SVG
  skill?: 'bpmn_expert' | 'process_improver' | 'design_guru';
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

    // Build system prompt based on active skill
    const skillContext: SkillContext = {
      bpmnXml,
      processName: processId || undefined,
    };
    const systemPrompt = this.buildSystemPrompt(bpmnXml, false, request.skill, skillContext);

    try {
      // Call Claude API with Opus 4.5 for primary tasks
      const response = await this.client.messages.create({
        model: MODEL_CONFIG.primary,
        max_tokens: MODEL_CONFIG.maxTokens.bpmnGeneration,
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
        if (firstKey) {
          this.sessions.delete(firstKey);
        }
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
      skill,
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

    // Build system prompt based on active skill
    const skillContext: SkillContext = {
      bpmnXml,
      processName: processId || undefined,
    };
    const systemPrompt = this.buildSystemPrompt(bpmnXml, !!diagramImage, skill, skillContext);

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

      console.log(`🤖 Sending ${apiMessages.length} messages to Claude Opus 4.5 (including ${Math.floor(apiMessages.length / 2)} user prompts)${skill ? ` [Skill: ${skill}]` : ''}`);

      const stream = await this.client.messages.create({
        model: MODEL_CONFIG.primary,
        max_tokens: MODEL_CONFIG.maxTokens.bpmnGeneration,
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
            if (firstKey) {
              this.sessions.delete(firstKey);
            }
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
    // Use the Process Improver skill for suggestions
    const skillContext: SkillContext = { bpmnXml };
    const systemPrompt = buildProcessImproverPrompt(skillContext);

    const userPrompt = `Analyze this BPMN process and provide 3-5 specific, actionable improvement suggestions.

Focus on:
1. **Waste Elimination**: Unnecessary steps, waiting, handoffs
2. **Bottleneck Identification**: Steps that constrain throughput
3. **Automation Opportunities**: Tasks that could be automated
4. **Clarity Issues**: Unclear naming, missing documentation
5. **Error Handling**: Missing exception paths, recovery steps

For each suggestion:
- Be specific (reference actual element names)
- Explain the impact (why this matters)
- Give a concrete action (what to change)

Format as numbered list with brief, actionable items.`;

    try {
      const response = await this.client.messages.create({
        model: MODEL_CONFIG.fast, // Use fast model for suggestions
        max_tokens: MODEL_CONFIG.maxTokens.suggestions,
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

  private buildSystemPrompt(
    bpmnXml?: string,
    hasDiagramImage?: boolean,
    skill?: 'bpmn_expert' | 'process_improver' | 'design_guru',
    skillContext?: SkillContext
  ): string {
    // If a specific skill is requested, use its specialized prompt
    if (skill && skillContext) {
      switch (skill) {
        case 'bpmn_expert':
          return buildBpmnExpertPrompt(skillContext);
        case 'process_improver':
          return buildProcessImproverPrompt(skillContext);
        case 'design_guru':
          return buildDesignGuruPrompt(skillContext);
      }
    }

    // Default comprehensive BPMN expert prompt (combines all skills)
    let prompt = `You are an expert AI assistant for StreamLine, a BPMN Process Hub application, powered by Claude Opus 4.5.

You have three specialized capabilities that you can seamlessly blend:

## 1. BPMN EXPERT (Process Mapping)
Create valid, well-structured BPMN 2.0 diagrams that render perfectly in bpmn.io.

## 2. PROCESS IMPROVER (Operational Excellence)
Identify real process improvements using Lean, Six Sigma, and operational excellence principles.

## 3. DESIGN GURU (Clarity & Elegance)
Ensure clean lines, clear naming, and elegant architecture in all process designs.

---

## BPMN 2.0 CREATION REQUIREMENTS

When creating BPMN diagrams, ALWAYS provide complete, valid XML:

### Required Namespaces
\`\`\`xml
xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
\`\`\`

### Element Sizing (for bpmn.io compatibility)
- Start/End Events: width="36" height="36"
- Tasks: width="100" height="80"
- Gateways: width="50" height="50"
- Spacing: 100-150px horizontal between elements

### Structure Requirements
1. Complete XML declaration and definitions
2. Process definition with all flow elements
3. Sequence flows with sourceRef/targetRef
4. BPMNDiagram section with BPMNPlane
5. BPMNShape for every node (with dc:Bounds)
6. BPMNEdge for every flow (with di:waypoint)

### Waypoint Calculations
- From event center: x + 18, y + 18
- From task right edge: x + 100, y + 40
- From gateway: x + 50 (right), y + 25 (center)

---

## NAMING CONVENTIONS

Use clear, action-oriented names:
- **Tasks**: Verb + Noun (e.g., "Review Application", "Send Notification")
- **Gateways**: Question format (e.g., "Approved?", "In Stock?")
- **Events**: State descriptions (e.g., "Order Received", "Payment Failed")
- **IDs**: Use prefixes (StartEvent_, Task_, Gateway_, Flow_)

---

## PROCESS IMPROVEMENT LENS

Always consider:
- **Waste**: Can steps be eliminated or combined?
- **Bottlenecks**: Where does work queue up?
- **Handoffs**: Can ownership transfers be reduced?
- **Automation**: What's rule-based and repeatable?
- **Clarity**: Would a newcomer understand this?

---

## PREVIEW WORKFLOW

**Important**: When you generate BPMN XML, it will be shown to the user as a **preview** first, not immediately applied.

The user can then:
1. **Accept** - Apply changes to their diagram (update current or create new version)
2. **Request Changes** - Provide feedback for you to iterate
3. **Reject** - Discard and keep the original

**Best practices for this workflow:**
- When suggesting changes to an existing diagram, clearly explain what you're changing and why
- If you're unsure about the user's intent, ask clarifying questions BEFORE generating XML
- Offer alternatives when there are multiple valid approaches
- Be specific about trade-offs (e.g., "This adds complexity but improves error handling")

---

## OUTPUT FORMAT

- Wrap BPMN XML in \`\`\`xml code blocks
- Explain your design decisions briefly
- Highlight any assumptions made
- Suggest improvements if reviewing existing processes`;

    if (bpmnXml && !hasDiagramImage) {
      prompt += `\n\n---\n\n## CURRENT PROCESS CONTEXT\n\n\`\`\`xml\n${bpmnXml}\n\`\`\``;
    } else if (hasDiagramImage) {
      prompt += `\n\n---\n\n## VISUAL CONTEXT\n\nThe user has provided a visual diagram of the current BPMN process (attached image). Use this visual context along with any BPMN XML to understand the current state and provide targeted improvements.`;
    }

    return prompt;
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

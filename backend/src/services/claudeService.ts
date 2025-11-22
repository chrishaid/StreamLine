import Anthropic from '@anthropic-ai/sdk';

interface MessageRequest {
  message: string;
  sessionId?: string;
  processId?: string;
  includeContext?: boolean;
  bpmnXml?: string;
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
        max_tokens: 4096,
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

  private buildSystemPrompt(bpmnXml?: string): string {
    let prompt = `You are an expert AI assistant for StreamLine, a BPMN Process Hub application. You help users create, edit, and optimize business process diagrams using BPMN 2.0 notation.

Your capabilities:
- Create new BPMN diagrams from natural language descriptions
- Suggest modifications to existing diagrams
- Explain BPMN diagrams in plain language
- Identify process improvements and optimization opportunities
- Help with BPMN best practices

Guidelines:
- Be concise and clear
- Use BPMN 2.0 standard notation
- Focus on practical, actionable advice
- When creating diagrams, provide valid BPMN XML
- Consider error handling, edge cases, and process efficiency`;

    if (bpmnXml) {
      prompt += `\n\nCurrent BPMN diagram context:\n${bpmnXml}`;
    }

    return prompt;
  }

  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// In-memory session storage (note: won't persist across invocations)
const sessions = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>();

function buildSystemPrompt(bpmnXml?: string): string {
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

Guidelines:
- Be concise and clear
- Use BPMN 2.0 standard notation
- Focus on practical, actionable advice
- When creating diagrams, provide complete, valid BPMN XML with both process and diagram elements
- Layout elements left-to-right with 80-120 pixel spacing
- Consider error handling, edge cases, and process efficiency`;

  if (bpmnXml) {
    prompt += `\n\nCurrent BPMN diagram context (XML):\n${bpmnXml}`;
  }

  return prompt;
}

// Verify Supabase JWT token
async function verifyAuth(authHeader: string | undefined): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.split(' ')[1];

  // Use non-VITE prefixed env vars for serverless runtime
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration missing. SUPABASE_URL:', !!supabaseUrl, 'SUPABASE_ANON_KEY:', !!supabaseKey);
    return false;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    return !error && !!user;
  } catch (err) {
    console.error('Auth verification error:', err);
    return false;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for API key first
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not configured');
    return res.status(500).json({
      error: {
        code: 'CONFIG_ERROR',
        message: 'AI service not configured. Please set ANTHROPIC_API_KEY environment variable.'
      }
    });
  }

  // Verify authentication
  const authHeader = req.headers.authorization;
  const isAuthenticated = await verifyAuth(authHeader);

  if (!isAuthenticated) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { message, sessionId = crypto.randomUUID(), processId, bpmnXml } = req.body;

    if (!message) {
      return res.status(400).json({
        error: { code: 'MISSING_MESSAGE', message: 'Message is required' }
      });
    }

    const client = new Anthropic({ apiKey });

    // Get or create session history
    let messages = sessions.get(sessionId) || [];
    messages.push({ role: 'user', content: message });

    const systemPrompt = buildSystemPrompt(bpmnXml);

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');

    // Send initial connection event
    res.write('event: connected\ndata: {}\n\n');

    try {
      const stream = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 16384,
        system: systemPrompt,
        stream: true,
        messages: messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      let fullContent = '';

      for await (const event of stream) {
        if (event.type === 'content_block_delta') {
          if (event.delta.type === 'text_delta') {
            fullContent += event.delta.text;
            const data = JSON.stringify({
              type: 'content',
              content: event.delta.text,
              fullContent,
              sessionId,
            });
            res.write(`data: ${data}\n\n`);
          }
        } else if (event.type === 'message_stop') {
          // Store the complete message in session history
          messages.push({ role: 'assistant', content: fullContent });

          // Keep last 20 messages
          if (messages.length > 20) {
            messages = messages.slice(-20);
          }
          sessions.set(sessionId, messages);

          // Clean up old sessions
          if (sessions.size > 100) {
            const firstKey = sessions.keys().next().value;
            if (firstKey) {
              sessions.delete(firstKey);
            }
          }

          const doneData = JSON.stringify({
            type: 'done',
            sessionId,
            messageId: crypto.randomUUID(),
            processId: processId || null,
          });
          res.write(`data: ${doneData}\n\n`);
        }
      }
    } catch (streamError: any) {
      console.error('Claude API streaming error:', streamError);
      const errorData = JSON.stringify({
        type: 'error',
        error: streamError.message || 'Failed to get response from Claude',
      });
      res.write(`data: ${errorData}\n\n`);
    }

    res.end();
  } catch (error: any) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
}

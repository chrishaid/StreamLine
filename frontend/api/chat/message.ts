import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// In-memory session storage (note: won't persist across invocations)
const sessions = new Map<string, Array<{ role: 'user' | 'assistant'; content: string }>>();

function buildSystemPrompt(bpmnXml?: string): string {
  let prompt = `You are an expert AI assistant for StreamLine, a BPMN Process Hub application, powered by Claude Opus 4.5.

You have three specialized capabilities:

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

### ID Conventions
- Process: \`Process_[unique]\`
- Start Event: \`StartEvent_[unique]\`
- Tasks: \`Activity_[unique]\` or \`Task_[unique]\`
- Gateways: \`Gateway_[unique]\`
- Flows: \`Flow_[unique]\`

---

## NAMING CONVENTIONS

- **Tasks**: Verb + Noun (e.g., "Review Application", "Send Notification")
- **Gateways**: Question format (e.g., "Approved?", "In Stock?")
- **Events**: State descriptions (e.g., "Order Received", "Payment Failed")

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

**Important**: When you generate BPMN XML, it will be shown as a **preview** first.

The user can:
1. **Accept** - Apply changes to their diagram
2. **Request Changes** - Provide feedback for you to iterate
3. **Reject** - Discard and keep the original

When suggesting changes, explain what you're changing and why. If unsure, ask first.

---

## OUTPUT FORMAT

- Wrap BPMN XML in \`\`\`xml code blocks
- Explain design decisions briefly
- Suggest improvements when reviewing existing processes`;

  if (bpmnXml) {
    prompt += `\n\n---\n\n## CURRENT PROCESS CONTEXT\n\n\`\`\`xml\n${bpmnXml}\n\`\`\``;
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
      // Use Claude Opus 4.5 for primary BPMN generation tasks
      const stream = await client.messages.create({
        model: 'claude-opus-4-5-20250514',
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

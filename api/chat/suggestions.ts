import type { VercelRequest, VercelResponse } from '@vercel/node';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Verify Supabase JWT token
async function verifyAuth(authHeader: string | undefined): Promise<boolean> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const token = authHeader.split(' ')[1];

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase configuration missing');
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

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not configured');
    return res.status(500).json({
      error: {
        code: 'CONFIG_ERROR',
        message: 'AI service not configured'
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
    const { bpmnXml } = req.body;

    if (!bpmnXml) {
      return res.status(400).json({
        error: { code: 'MISSING_BPMN', message: 'BPMN XML is required' }
      });
    }

    const client = new Anthropic({ apiKey });

    // Process Improver skill - focused on real operational improvements
    const systemPrompt = `You are a Process Improvement Expert with deep expertise in Lean, Six Sigma, and operational excellence.

## ANALYSIS FRAMEWORK

For each process step, evaluate:
- **Necessity**: Does this add value? Can it be eliminated?
- **Efficiency**: Cycle time? Waiting periods?
- **Quality**: Error/rework rate? Where do defects occur?
- **Handoffs**: Information loss? Can handoffs be eliminated?
- **Automation**: Rule-based and repeatable? Could technology do this?

## 8 WASTES (DOWNTIME)
- Defects, Overproduction, Waiting, Non-utilized talent
- Transportation, Inventory, Motion, Extra processing

Be specific, actionable, and realistic.`;

    const userPrompt = `Analyze this BPMN process and provide 3-5 specific, actionable improvement suggestions:

${bpmnXml}

Focus on:
1. **Waste Elimination**: Unnecessary steps, waiting, handoffs
2. **Bottleneck Identification**: Steps that constrain throughput
3. **Automation Opportunities**: Tasks that could be automated
4. **Clarity Issues**: Unclear naming, missing documentation
5. **Error Handling**: Missing exception paths

For each suggestion:
- Reference specific element names
- Explain why this matters
- Give a concrete action`;

    // Use Sonnet for fast suggestions
    const response = await client.messages.create({
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

    const content = response.content[0].type === 'text' ? response.content[0].text : '';

    // Parse suggestions from response
    const suggestions = content
      .split('\n')
      .filter((line) => line.trim().match(/^[\d\-\*\.]/))
      .map((line) => line.replace(/^[\d\-\*\.]\s*/, '').trim())
      .filter((line) => line.length > 0)
      .slice(0, 5);

    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(200).json({ suggestions });
  } catch (error: any) {
    console.error('Suggestions API error:', error);
    return res.status(500).json({
      error: { code: 'INTERNAL_ERROR', message: error.message }
    });
  }
}

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

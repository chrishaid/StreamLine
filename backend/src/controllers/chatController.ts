import { Request, Response, NextFunction } from 'express';
import { ClaudeService } from '../services/claudeService';

const claudeService = new ClaudeService();

export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { message, sessionId, processId, includeContext, bpmnXml } = req.body;

    if (!message) {
      return res.status(400).json({
        error: { code: 'MISSING_MESSAGE', message: 'Message is required' },
      });
    }

    const response = await claudeService.sendMessage({
      message,
      sessionId,
      processId,
      includeContext,
      bpmnXml,
    });

    res.json(response);
  } catch (error) {
    next(error);
  }
}

export async function sendMessageStream(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { message, sessionId, processId, includeContext, bpmnXml } = req.body;

    if (!message) {
      return res.status(400).json({
        error: { code: 'MISSING_MESSAGE', message: 'Message is required' },
      });
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Send initial message to establish connection
    res.write('event: connected\ndata: {}\n\n');

    try {
      const stream = claudeService.sendMessageStream({
        message,
        sessionId,
        processId,
        includeContext,
        bpmnXml,
      });

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.end();
    } catch (streamError: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: streamError.message })}\n\n`);
      res.end();
    }
  } catch (error) {
    next(error);
  }
}

export async function getSuggestions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { bpmnXml } = req.body;

    if (!bpmnXml) {
      return res.status(400).json({
        error: { code: 'MISSING_BPMN', message: 'BPMN XML is required' },
      });
    }

    const suggestions = await claudeService.getSuggestions(bpmnXml);

    res.json({ suggestions });
  } catch (error) {
    next(error);
  }
}

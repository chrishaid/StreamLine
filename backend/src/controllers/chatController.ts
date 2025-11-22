import { Request, Response, NextFunction } from 'express';
import { ClaudeService } from '../services/claudeService';

const claudeService = new ClaudeService();

export async function sendMessage(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { message, sessionId, processId, includeContext } = req.body;

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
    });

    res.json(response);
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

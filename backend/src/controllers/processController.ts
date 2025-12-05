import { Request, Response, NextFunction } from 'express';
import { processService } from '../services/processService';

export async function createProcess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { name, description, bpmnXml } = req.body;

    if (!name || !bpmnXml) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Name and BPMN XML are required' },
      });
    }

    const process = await processService.saveProcess({
      name,
      bpmnXml,
      description,
    });

    res.status(201).json({ process });
  } catch (error) {
    console.error('Error creating process:', error);
    next(error);
  }
}

export async function getProcesses(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const processes = await processService.getAllProcesses();

    res.json({
      processes,
      total: processes.length,
    });
  } catch (error) {
    console.error('Error getting processes:', error);
    next(error);
  }
}

export async function getProcessById(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;

    const process = await processService.getProcess(id);

    if (!process) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Process not found' },
      });
    }

    res.json({ process });
  } catch (error) {
    console.error('Error getting process:', error);
    next(error);
  }
}

export async function updateProcess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { name, description, bpmnXml } = req.body;

    if (!name || !bpmnXml) {
      return res.status(400).json({
        error: { code: 'INVALID_REQUEST', message: 'Name and BPMN XML are required' },
      });
    }

    const process = await processService.saveProcess({
      id,
      name,
      bpmnXml,
      description,
    });

    res.json({ process });
  } catch (error) {
    console.error('Error updating process:', error);
    next(error);
  }
}

export async function deleteProcess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;

    await processService.deleteProcess(id);

    res.status(204).send();
  } catch (error) {
    console.error('Error deleting process:', error);
    next(error);
  }
}

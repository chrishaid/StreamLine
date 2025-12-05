import { Request, Response, NextFunction } from 'express';
import { processService } from '../services/processService';

export async function createProcess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { name, description, bpmnXml, primaryCategoryId, secondaryCategoryIds, tags } = req.body;
    const user = (req as any).user;

    if (!name) {
      return res.status(400).json({
        error: { code: 'MISSING_NAME', message: 'Process name is required' },
      });
    }

    const result = await processService.saveProcess({
      name,
      description,
      bpmnXml,
      primaryCategoryId,
      secondaryCategoryIds,
      tags,
      userId: user.userId,
    });

    res.status(201).json(result);
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
    const { status, categoryId, search, ownerId, tags, limit = 50, offset = 0 } = req.query;

    const processes = await processService.getAllProcesses({
      status: status as string,
      categoryId: categoryId as string,
      search: search as string,
      ownerId: ownerId as string,
      tags: tags ? (tags as string).split(',') : undefined,
    });

    const total = processes.length;
    const paginated = processes.slice(
      Number(offset),
      Number(offset) + Number(limit)
    );

    res.json({
      processes: paginated,
      total,
      limit: Number(limit),
      offset: Number(offset),
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

    res.json(process);
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
    const updates = req.body;
    const user = (req as any).user;

    const process = await processService.updateProcess(id, updates, user.userId);

    if (!process) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Process not found' },
      });
    }

    res.json(process);
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

export async function duplicateProcess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const user = (req as any).user;

    if (!name) {
      return res.status(400).json({
        error: { code: 'MISSING_NAME', message: 'New process name is required' },
      });
    }

    const result = await processService.duplicateProcess(id, name, user.userId);

    if (!result) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Process not found' },
      });
    }

    res.status(201).json(result);
  } catch (error) {
    console.error('Error duplicating process:', error);
    next(error);
  }
}

// Version endpoints
export async function getProcessVersions(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;

    const versions = await processService.getVersionsByProcessId(id);

    res.json({ versions });
  } catch (error) {
    console.error('Error getting versions:', error);
    next(error);
  }
}

export async function getCurrentVersion(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;

    const version = await processService.getCurrentVersion(id);

    if (!version) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Version not found' },
      });
    }

    res.json(version);
  } catch (error) {
    console.error('Error getting current version:', error);
    next(error);
  }
}

export async function createProcessVersion(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { id } = req.params;
    const { bpmnXml, changeSummary, changeType } = req.body;
    const user = (req as any).user;

    if (!bpmnXml || !changeSummary || !changeType) {
      return res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'bpmnXml, changeSummary, and changeType are required',
        },
      });
    }

    const version = await processService.createVersion({
      processId: id,
      bpmnXml,
      changeSummary,
      changeType,
      userId: user.userId,
    });

    if (!version) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Process not found' },
      });
    }

    res.status(201).json(version);
  } catch (error) {
    console.error('Error creating version:', error);
    next(error);
  }
}

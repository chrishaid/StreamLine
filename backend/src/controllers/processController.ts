import { Request, Response, NextFunction } from 'express';
import { processStore } from '../models/processModel';

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

    const { process, version } = await processStore.createProcess({
      name,
      description,
      bpmnXml,
      primaryCategoryId,
      secondaryCategoryIds,
      tags,
      ownerId: user.userId,
      createdBy: user.userId,
    });

    res.status(201).json({ process, version });
  } catch (error) {
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

    const processes = await processStore.getAllProcesses({
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

    const process = await processStore.getProcessById(id);

    if (!process) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Process not found' },
      });
    }

    res.json(process);
  } catch (error) {
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

    const process = await processStore.updateProcess(id, updates, user.userId);

    if (!process) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Process not found' },
      });
    }

    res.json(process);
  } catch (error) {
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

    const deleted = await processStore.deleteProcess(id);

    if (!deleted) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Process not found' },
      });
    }

    res.status(204).send();
  } catch (error) {
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

    const result = await processStore.duplicateProcess(id, name, user.userId);

    if (!result) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Process not found' },
      });
    }

    res.status(201).json(result);
  } catch (error) {
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

    const versions = await processStore.getVersionsByProcessId(id);

    res.json({ versions });
  } catch (error) {
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

    const version = await processStore.getCurrentVersion(id);

    if (!version) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Version not found' },
      });
    }

    res.json(version);
  } catch (error) {
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

    const version = await processStore.createVersion({
      processId: id,
      bpmnXml,
      changeSummary,
      changeType,
      createdBy: user.userId,
    });

    if (!version) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Process not found' },
      });
    }

    res.status(201).json(version);
  } catch (error) {
    next(error);
  }
}

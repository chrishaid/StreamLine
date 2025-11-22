import { Request, Response, NextFunction } from 'express';

// TODO: Replace with actual database service
const processes: any[] = [];

export async function createProcess(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const { name, description, bpmnXml, primaryCategoryId, tags } = req.body;

    if (!name) {
      return res.status(400).json({
        error: { code: 'MISSING_NAME', message: 'Process name is required' },
      });
    }

    const newProcess = {
      id: crypto.randomUUID(),
      name,
      description: description || '',
      status: 'draft',
      bpmnXml: bpmnXml || null,
      primaryCategoryId: primaryCategoryId || null,
      tags: tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    processes.push(newProcess);

    res.status(201).json(newProcess);
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
    const { status, categoryId, search, limit = 50, offset = 0 } = req.query;

    let filtered = [...processes];

    if (status) {
      filtered = filtered.filter((p) => p.status === status);
    }

    if (categoryId) {
      filtered = filtered.filter((p) => p.primaryCategoryId === categoryId);
    }

    if (search) {
      const searchLower = (search as string).toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower)
      );
    }

    const total = filtered.length;
    const paginated = filtered.slice(
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

    const process = processes.find((p) => p.id === id);

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

    const index = processes.findIndex((p) => p.id === id);

    if (index === -1) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Process not found' },
      });
    }

    processes[index] = {
      ...processes[index],
      ...updates,
      id, // Prevent ID from being updated
      updatedAt: new Date(),
    };

    res.json(processes[index]);
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

    const index = processes.findIndex((p) => p.id === id);

    if (index === -1) {
      return res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Process not found' },
      });
    }

    processes.splice(index, 1);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

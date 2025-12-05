import { Router } from 'express';
import {
  createProcess,
  getProcesses,
  getProcessById,
  updateProcess,
  deleteProcess,
  duplicateProcess,
  getProcessVersions,
  getCurrentVersion,
  createProcessVersion,
} from '../controllers/processController';

export const processRouter = Router();

// Process CRUD
processRouter.post('/', createProcess);
processRouter.get('/', getProcesses);
processRouter.get('/:id', getProcessById);
processRouter.put('/:id', updateProcess);
processRouter.delete('/:id', deleteProcess);

// Process actions
processRouter.post('/:id/duplicate', duplicateProcess);

// Version management
processRouter.get('/:id/versions', getProcessVersions);
processRouter.get('/:id/versions/current', getCurrentVersion);
processRouter.post('/:id/versions', createProcessVersion);

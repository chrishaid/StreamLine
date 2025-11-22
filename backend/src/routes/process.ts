import { Router } from 'express';
import {
  createProcess,
  getProcesses,
  getProcessById,
  updateProcess,
  deleteProcess,
} from '../controllers/processController';

export const processRouter = Router();

processRouter.post('/', createProcess);
processRouter.get('/', getProcesses);
processRouter.get('/:id', getProcessById);
processRouter.put('/:id', updateProcess);
processRouter.delete('/:id', deleteProcess);

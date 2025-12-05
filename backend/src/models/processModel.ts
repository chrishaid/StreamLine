import * as fs from 'fs/promises';
import * as path from 'path';
import { Process, ProcessVersion } from '../types';

// Data directory for storing processes
const DATA_DIR = path.join(__dirname, '../../data');
const PROCESSES_FILE = path.join(DATA_DIR, 'processes.json');
const VERSIONS_FILE = path.join(DATA_DIR, 'versions.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    // Directory already exists
  }
}

// Initialize storage files if they don't exist
async function initializeStorage() {
  await ensureDataDir();

  try {
    await fs.access(PROCESSES_FILE);
  } catch {
    await fs.writeFile(PROCESSES_FILE, JSON.stringify([], null, 2));
  }

  try {
    await fs.access(VERSIONS_FILE);
  } catch {
    await fs.writeFile(VERSIONS_FILE, JSON.stringify([], null, 2));
  }
}

// Process Store
class ProcessStore {
  private processes: Process[] = [];
  private versions: ProcessVersion[] = [];
  private initialized = false;

  async init() {
    if (this.initialized) return;

    await initializeStorage();

    try {
      const processesData = await fs.readFile(PROCESSES_FILE, 'utf-8');
      this.processes = JSON.parse(processesData);
    } catch (error) {
      this.processes = [];
    }

    try {
      const versionsData = await fs.readFile(VERSIONS_FILE, 'utf-8');
      this.versions = JSON.parse(versionsData);
    } catch (error) {
      this.versions = [];
    }

    this.initialized = true;
  }

  async saveProcesses() {
    await fs.writeFile(PROCESSES_FILE, JSON.stringify(this.processes, null, 2));
  }

  async saveVersions() {
    await fs.writeFile(VERSIONS_FILE, JSON.stringify(this.versions, null, 2));
  }

  // Process CRUD operations
  async createProcess(data: {
    name: string;
    description?: string;
    primaryCategoryId?: string;
    secondaryCategoryIds?: string[];
    tags?: string[];
    bpmnXml?: string;
    ownerId: string;
    createdBy: string;
  }): Promise<{ process: Process; version: ProcessVersion }> {
    await this.init();

    const processId = crypto.randomUUID();
    const versionId = crypto.randomUUID();
    const now = new Date();

    // Create initial version
    const version: ProcessVersion = {
      id: versionId,
      processId: processId,
      versionNumber: '1.0',
      majorVersion: 1,
      minorVersion: 0,
      bpmnXml: data.bpmnXml || '',
      bpmnFileUrl: '',
      changeSummary: 'Initial version',
      changeType: 'major',
      tags: data.tags || [],
      parentVersionId: null,
      branchName: 'main',
      createdAt: now,
      createdBy: data.createdBy,
      metadata: {
        elementCount: 0,
        poolCount: 0,
        laneCount: 0,
        taskCount: 0,
      },
    };

    // Create process
    const process: Process = {
      id: processId,
      name: data.name,
      description: data.description || '',
      status: 'draft',
      ownerId: data.ownerId,
      departmentId: '',
      primaryCategoryId: data.primaryCategoryId || '',
      secondaryCategoryIds: data.secondaryCategoryIds || [],
      tags: data.tags || [],
      currentVersionId: versionId,
      createdAt: now,
      updatedAt: now,
      createdBy: data.createdBy,
      updatedBy: data.createdBy,
      viewCount: 0,
      editCount: 0,
      isFavorite: false,
      relatedProcessIds: [],
      metadata: {},
    };

    this.processes.push(process);
    this.versions.push(version);

    await this.saveProcesses();
    await this.saveVersions();

    return { process, version };
  }

  async getAllProcesses(filters?: {
    status?: string;
    categoryId?: string;
    search?: string;
    ownerId?: string;
    tags?: string[];
  }): Promise<Process[]> {
    await this.init();

    let filtered = [...this.processes];

    if (filters?.status) {
      filtered = filtered.filter((p) => p.status === filters.status);
    }

    if (filters?.categoryId) {
      const categoryId = filters.categoryId;
      filtered = filtered.filter(
        (p) =>
          p.primaryCategoryId === categoryId ||
          p.secondaryCategoryIds.includes(categoryId)
      );
    }

    if (filters?.ownerId) {
      filtered = filtered.filter((p) => p.ownerId === filters.ownerId);
    }

    if (filters?.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchLower) ||
          p.description.toLowerCase().includes(searchLower) ||
          p.tags.some((tag) => tag.toLowerCase().includes(searchLower))
      );
    }

    if (filters?.tags && filters.tags.length > 0) {
      filtered = filtered.filter((p) =>
        filters.tags!.some((tag) => p.tags.includes(tag))
      );
    }

    // Sort by updatedAt descending
    filtered.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    return filtered;
  }

  async getProcessById(id: string): Promise<Process | null> {
    await this.init();
    return this.processes.find((p) => p.id === id) || null;
  }

  async updateProcess(
    id: string,
    updates: Partial<Process>,
    updatedBy: string
  ): Promise<Process | null> {
    await this.init();

    const index = this.processes.findIndex((p) => p.id === id);
    if (index === -1) return null;

    this.processes[index] = {
      ...this.processes[index],
      ...updates,
      id, // Prevent ID from being changed
      updatedAt: new Date(),
      updatedBy,
    };

    await this.saveProcesses();
    return this.processes[index];
  }

  async deleteProcess(id: string): Promise<boolean> {
    await this.init();

    const index = this.processes.findIndex((p) => p.id === id);
    if (index === -1) return false;

    this.processes.splice(index, 1);

    // Also delete all versions
    this.versions = this.versions.filter((v) => v.processId !== id);

    await this.saveProcesses();
    await this.saveVersions();

    return true;
  }

  async duplicateProcess(
    id: string,
    newName: string,
    createdBy: string
  ): Promise<{ process: Process; version: ProcessVersion } | null> {
    await this.init();

    const original = await this.getProcessById(id);
    if (!original) return null;

    const currentVersion = this.versions.find(
      (v) => v.id === original.currentVersionId
    );

    return this.createProcess({
      name: newName,
      description: original.description,
      primaryCategoryId: original.primaryCategoryId,
      secondaryCategoryIds: [...original.secondaryCategoryIds],
      tags: [...original.tags],
      bpmnXml: currentVersion?.bpmnXml || '',
      ownerId: createdBy,
      createdBy,
    });
  }

  // Version operations
  async createVersion(data: {
    processId: string;
    bpmnXml: string;
    changeSummary: string;
    changeType: 'major' | 'minor' | 'patch';
    createdBy: string;
  }): Promise<ProcessVersion | null> {
    await this.init();

    const process = await this.getProcessById(data.processId);
    if (!process) return null;

    const currentVersion = this.versions.find(
      (v) => v.id === process.currentVersionId
    );

    if (!currentVersion) return null;

    // Calculate new version number
    let { majorVersion, minorVersion } = currentVersion;
    if (data.changeType === 'major') {
      majorVersion++;
      minorVersion = 0;
    } else if (data.changeType === 'minor') {
      minorVersion++;
    }

    const versionId = crypto.randomUUID();
    const version: ProcessVersion = {
      id: versionId,
      processId: data.processId,
      versionNumber: `${majorVersion}.${minorVersion}`,
      majorVersion,
      minorVersion,
      bpmnXml: data.bpmnXml,
      bpmnFileUrl: '',
      changeSummary: data.changeSummary,
      changeType: data.changeType,
      tags: [],
      parentVersionId: currentVersion.id,
      branchName: 'main',
      createdAt: new Date(),
      createdBy: data.createdBy,
      metadata: {
        elementCount: 0,
        poolCount: 0,
        laneCount: 0,
        taskCount: 0,
      },
    };

    this.versions.push(version);

    // Update process's current version
    await this.updateProcess(
      data.processId,
      { currentVersionId: versionId },
      data.createdBy
    );

    await this.saveVersions();

    return version;
  }

  async getVersionsByProcessId(processId: string): Promise<ProcessVersion[]> {
    await this.init();
    return this.versions
      .filter((v) => v.processId === processId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getVersionById(id: string): Promise<ProcessVersion | null> {
    await this.init();
    return this.versions.find((v) => v.id === id) || null;
  }

  async getCurrentVersion(processId: string): Promise<ProcessVersion | null> {
    await this.init();
    const process = await this.getProcessById(processId);
    if (!process) return null;
    return this.versions.find((v) => v.id === process.currentVersionId) || null;
  }
}

export const processStore = new ProcessStore();

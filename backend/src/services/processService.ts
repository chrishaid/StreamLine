import { prisma } from '../db/prisma';

export class ProcessService {
  // Get default category or create one for the user
  private async getDefaultCategory(userId: string) {
    let category = await prisma.category.findFirst({
      where: { ownerId: userId },
      orderBy: { createdAt: 'asc' },
    });

    if (!category) {
      category = await prisma.category.create({
        data: {
          name: 'General',
          path: '/general',
          level: 0,
          order: 0,
          ownerId: userId,
        },
      });
    }

    return category;
  }

  async saveProcess(data: {
    id?: string;
    name: string;
    bpmnXml?: string;
    description?: string;
    primaryCategoryId?: string;
    secondaryCategoryIds?: string[];
    tags?: string[];
    userId: string;
  }) {
    const userId = data.userId;

    // Get category (use provided or default)
    const categoryId = data.primaryCategoryId || (await this.getDefaultCategory(userId)).id;

    // If ID provided, update existing process
    if (data.id) {
      const existing = await prisma.process.findUnique({
        where: { id: data.id },
        include: { currentVersion: true },
      });

      if (existing) {
        // Create new version if BPMN changed
        let versionId = existing.currentVersionId;

        if (data.bpmnXml && data.bpmnXml !== existing.currentVersion?.bpmnXml) {
          const version = await prisma.processVersion.create({
            data: {
              versionNumber: '1.0',
              majorVersion: 1,
              minorVersion: 0,
              bpmnXml: data.bpmnXml,
              changeType: 'minor',
              changeSummary: 'Updated via editor',
              creatorId: userId,
              processId: existing.id,
            },
          });
          versionId = version.id;
        }

        // Update process
        const updated = await prisma.process.update({
          where: { id: data.id },
          data: {
            name: data.name,
            description: data.description,
            primaryCategoryId: categoryId,
            tags: data.tags || [],
            currentVersionId: versionId,
            updatedById: userId,
          },
          include: {
            currentVersion: true,
            primaryCategory: true,
          },
        });

        return updated;
      }
    }

    // Create new process with initial version
    const bpmnXml = data.bpmnXml || '';

    const version = await prisma.processVersion.create({
      data: {
        versionNumber: '1.0',
        majorVersion: 1,
        minorVersion: 0,
        bpmnXml,
        changeType: 'major',
        changeSummary: 'Initial version',
        creatorId: userId,
        process: {
          create: {
            name: data.name,
            description: data.description || '',
            status: 'draft',
            primaryCategoryId: categoryId,
            tags: data.tags || [],
            ownerId: userId,
            createdById: userId,
            updatedById: userId,
          },
        },
      },
      include: {
        process: {
          include: {
            currentVersion: true,
            primaryCategory: true,
          },
        },
      },
    });

    // Update process with currentVersion
    const process = await prisma.process.update({
      where: { id: version.processId },
      data: {
        currentVersionId: version.id,
      },
      include: {
        currentVersion: true,
        primaryCategory: true,
      },
    });

    return { process, version };
  }

  async getProcess(id: string) {
    return prisma.process.findUnique({
      where: { id },
      include: {
        currentVersion: true,
        primaryCategory: true,
        owner: true,
      },
    });
  }

  async getAllProcesses(filters?: {
    status?: string;
    categoryId?: string;
    search?: string;
    ownerId?: string;
    tags?: string[];
  }) {
    const where: any = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.categoryId) {
      where.primaryCategoryId = filters.categoryId;
    }

    if (filters?.ownerId) {
      where.ownerId = filters.ownerId;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.tags && filters.tags.length > 0) {
      where.tags = { hasSome: filters.tags };
    }

    return prisma.process.findMany({
      where,
      include: {
        currentVersion: true,
        primaryCategory: true,
        owner: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async updateProcess(id: string, updates: any, userId: string) {
    return prisma.process.update({
      where: { id },
      data: {
        ...updates,
        updatedById: userId,
      },
      include: {
        currentVersion: true,
        primaryCategory: true,
      },
    });
  }

  async deleteProcess(id: string) {
    return prisma.process.delete({
      where: { id },
    });
  }

  async duplicateProcess(id: string, newName: string, userId: string) {
    const original = await this.getProcess(id);
    if (!original) return null;

    const bpmnXml = original.currentVersion?.bpmnXml || '';

    return this.saveProcess({
      name: newName,
      description: original.description,
      bpmnXml,
      primaryCategoryId: original.primaryCategoryId,
      tags: original.tags,
      userId,
    });
  }

  // Version management
  async getVersionsByProcessId(processId: string) {
    return prisma.processVersion.findMany({
      where: { processId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getCurrentVersion(processId: string) {
    const process = await prisma.process.findUnique({
      where: { id: processId },
      include: { currentVersion: true },
    });
    return process?.currentVersion || null;
  }

  async createVersion(data: {
    processId: string;
    bpmnXml: string;
    changeSummary: string;
    changeType: 'major' | 'minor' | 'patch';
    userId: string;
  }) {
    const process = await prisma.process.findUnique({
      where: { id: data.processId },
      include: { currentVersion: true },
    });

    if (!process) return null;

    const currentVersion = process.currentVersion;
    let majorVersion = currentVersion?.majorVersion || 1;
    let minorVersion = currentVersion?.minorVersion || 0;

    if (data.changeType === 'major') {
      majorVersion++;
      minorVersion = 0;
    } else if (data.changeType === 'minor') {
      minorVersion++;
    }

    const version = await prisma.processVersion.create({
      data: {
        processId: data.processId,
        versionNumber: `${majorVersion}.${minorVersion}`,
        majorVersion,
        minorVersion,
        bpmnXml: data.bpmnXml,
        changeSummary: data.changeSummary,
        changeType: data.changeType,
        creatorId: data.userId,
      },
    });

    // Update process's current version
    await prisma.process.update({
      where: { id: data.processId },
      data: {
        currentVersionId: version.id,
        updatedById: data.userId,
      },
    });

    return version;
  }
}

export const processService = new ProcessService();

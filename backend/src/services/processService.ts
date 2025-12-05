import { prisma } from '../db/prisma';

export class ProcessService {
  // Get default user for now (until we implement auth)
  private async getDefaultUser() {
    let user = await prisma.user.findUnique({
      where: { email: 'admin@streamline.local' },
    });

    if (!user) {
      // Create default user if doesn't exist
      user = await prisma.user.create({
        data: {
          email: 'admin@streamline.local',
          name: 'StreamLine Admin',
          role: 'admin',
        },
      });
    }

    return user;
  }

  // Get default category
  private async getDefaultCategory() {
    let category = await prisma.category.findFirst({
      orderBy: { createdAt: 'asc' },
    });

    if (!category) {
      const user = await this.getDefaultUser();
      category = await prisma.category.create({
        data: {
          name: 'General',
          path: '/general',
          level: 0,
          order: 0,
          ownerId: user.id,
        },
      });
    }

    return category;
  }

  async saveProcess(data: {
    id?: string;
    name: string;
    bpmnXml: string;
    description?: string;
  }) {
    const user = await this.getDefaultUser();
    const category = await this.getDefaultCategory();

    // If ID provided, update existing process
    if (data.id) {
      const existing = await prisma.process.findUnique({
        where: { id: data.id },
        include: { currentVersion: true },
      });

      if (existing) {
        // Create new version
        const version = await prisma.processVersion.create({
          data: {
            versionNumber: '1.0',
            majorVersion: 1,
            minorVersion: 0,
            bpmnXml: data.bpmnXml,
            changeType: 'minor',
            creator: {
              connect: { id: user.id },
            },
            process: {
              connect: { id: existing.id },
            },
          },
        });

        // Update process
        const updated = await prisma.process.update({
          where: { id: data.id },
          data: {
            name: data.name,
            description: data.description,
            currentVersion: {
              connect: { id: version.id },
            },
            updater: {
              connect: { id: user.id },
            },
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
    const version = await prisma.processVersion.create({
      data: {
        versionNumber: '1.0',
        majorVersion: 1,
        minorVersion: 0,
        bpmnXml: data.bpmnXml,
        changeType: 'major',
        creator: {
          connect: { id: user.id },
        },
        process: {
          create: {
            name: data.name,
            description: data.description || 'Untitled Process',
            status: 'draft',
            primaryCategory: {
              connect: { id: category.id },
            },
            owner: {
              connect: { id: user.id },
            },
            creator: {
              connect: { id: user.id },
            },
            updater: {
              connect: { id: user.id },
            },
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
        currentVersion: {
          connect: { id: version.id },
        },
      },
      include: {
        currentVersion: true,
        primaryCategory: true,
      },
    });

    return process;
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

  async getAllProcesses() {
    return prisma.process.findMany({
      include: {
        currentVersion: true,
        primaryCategory: true,
        owner: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async deleteProcess(id: string) {
    return prisma.process.delete({
      where: { id },
    });
  }
}

export const processService = new ProcessService();

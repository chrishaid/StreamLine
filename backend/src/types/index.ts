// Backend-specific types (duplicated from shared for now)

export interface Process {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'active' | 'archived';
  ownerId: string;
  departmentId: string;
  primaryCategoryId: string;
  secondaryCategoryIds: string[];
  tags: string[];
  currentVersionId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  viewCount: number;
  editCount: number;
  isFavorite: boolean;
  relatedProcessIds: string[];
  metadata: Record<string, any>;
}

export interface ProcessVersion {
  id: string;
  processId: string;
  versionNumber: string; // "1.0", "1.1", "2.0"
  majorVersion: number;
  minorVersion: number;
  bpmnXml: string;
  bpmnFileUrl: string;
  changeSummary: string;
  changeType: 'major' | 'minor' | 'patch';
  tags: string[];
  parentVersionId: string | null;
  branchName: string;
  createdAt: Date;
  createdBy: string;
  metadata: {
    elementCount: number;
    poolCount: number;
    laneCount: number;
    taskCount: number;
  };
}

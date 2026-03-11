/**
 * StreamLine Skills Framework
 * Type definitions for AI skills and tools
 */

export interface SkillDefinition {
  name: string;
  description: string;
  systemPrompt: string;
  inputSchema?: Record<string, unknown>;
}

export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

export interface SkillContext {
  bpmnXml?: string;
  processName?: string;
  processDescription?: string;
  organizationContext?: string;
}

export interface SkillResult {
  success: boolean;
  output: string;
  metadata?: Record<string, unknown>;
}

export interface ProcessImprovementFinding {
  category: 'waste' | 'bottleneck' | 'rework' | 'handoff' | 'automation' | 'clarity';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  currentState: string;
  recommendation: string;
  estimatedImpact?: string;
}

export interface DesignReview {
  aspect: 'naming' | 'structure' | 'flow' | 'boundaries' | 'complexity' | 'coupling';
  score: number; // 1-10
  observation: string;
  suggestion?: string;
}

/**
 * StreamLine Skills Framework
 *
 * Exports all skills and utilities for AI-powered process work.
 */

// Type definitions
export * from './types';

// Skills
export {
  BPMN_EXPERT_SKILL,
  BPMN_TOOLS,
  buildBpmnExpertPrompt
} from './bpmnExpert';

export {
  PROCESS_IMPROVER_SKILL,
  PROCESS_IMPROVEMENT_TOOLS,
  buildProcessImproverPrompt,
  formatFindings
} from './processImprover';

export {
  DESIGN_GURU_SKILL,
  DESIGN_GURU_TOOLS,
  buildDesignGuruPrompt,
  formatDesignReview
} from './designGuru';

import { ToolDefinition } from './types';
import { BPMN_TOOLS } from './bpmnExpert';
import { PROCESS_IMPROVEMENT_TOOLS } from './processImprover';
import { DESIGN_GURU_TOOLS } from './designGuru';

/**
 * All available tools for Claude tool_use
 */
export const ALL_TOOLS: ToolDefinition[] = [
  ...BPMN_TOOLS,
  ...PROCESS_IMPROVEMENT_TOOLS,
  ...DESIGN_GURU_TOOLS
];

/**
 * Get tools by skill name
 */
export function getToolsForSkill(skillName: string): ToolDefinition[] {
  switch (skillName) {
    case 'bpmn_expert':
      return BPMN_TOOLS;
    case 'process_improver':
      return PROCESS_IMPROVEMENT_TOOLS;
    case 'design_guru':
      return DESIGN_GURU_TOOLS;
    default:
      return [];
  }
}

/**
 * Model configuration - centralized for easy updates
 */
export const MODEL_CONFIG = {
  // Primary model for complex tasks (BPMN generation, analysis)
  primary: 'claude-opus-4-5-20251101',

  // Fast model for quick tasks (suggestions, simple queries)
  fast: 'claude-sonnet-4-20250514',

  // Max tokens for different task types
  maxTokens: {
    bpmnGeneration: 16384,  // Large for complex diagrams
    analysis: 8192,         // Medium for analysis text
    chat: 4096,             // Standard for conversation
    suggestions: 2048       // Small for quick suggestions
  }
} as const;

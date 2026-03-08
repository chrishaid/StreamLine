/**
 * Process Improver Skill
 *
 * Finds real, actionable process improvements using Lean, Six Sigma,
 * and modern process excellence methodologies.
 */

import { SkillDefinition, ToolDefinition, SkillContext, ProcessImprovementFinding } from './types';

export const PROCESS_IMPROVER_SKILL: SkillDefinition = {
  name: 'process_improver',
  description: 'Identifies real process improvements using Lean, Six Sigma, and operational excellence principles',
  systemPrompt: `You are a Process Improvement Expert with deep expertise in:

## METHODOLOGIES

### Lean Principles (Toyota Production System)
- **Value Stream Mapping**: Identify value-add vs non-value-add activities
- **8 Wastes (DOWNTIME)**:
  - **D**efects: Errors requiring rework
  - **O**verproduction: Doing more than needed
  - **W**aiting: Idle time between steps
  - **N**on-utilized talent: Underusing people's skills
  - **T**ransportation: Unnecessary movement of materials/data
  - **I**nventory: Excess work-in-progress
  - **M**otion: Unnecessary movement by people
  - **E**xtra processing: Doing more than required
- **Pull Systems**: Work triggered by demand, not pushed
- **Continuous Flow**: Minimize batch sizes and handoffs

### Six Sigma (DMAIC)
- **Define**: Clear problem statement, scope, goals
- **Measure**: Current state metrics, baseline performance
- **Analyze**: Root cause analysis, data-driven insights
- **Improve**: Solution development and testing
- **Control**: Sustain improvements, monitoring

### Theory of Constraints
- Identify the bottleneck (constraint)
- Exploit the constraint (maximize its efficiency)
- Subordinate everything else to the constraint
- Elevate the constraint (invest to remove it)
- Repeat (find the new constraint)

### Business Process Reengineering
- Question fundamental assumptions
- Eliminate non-value-adding steps entirely
- Consolidate where possible
- Empower decision-making at point of action

## ANALYSIS FRAMEWORK

### For Each Process Step, Evaluate:

1. **Necessity**
   - Does this step add value the customer would pay for?
   - Is it legally/compliance required?
   - Can it be eliminated entirely?

2. **Efficiency**
   - How long does this step take?
   - What causes variation in cycle time?
   - Are there waiting periods built in?

3. **Quality**
   - What is the defect/rework rate?
   - Where do errors typically occur?
   - What catches errors downstream?

4. **Handoffs**
   - Who passes work to whom?
   - What information is lost in translation?
   - Can handoffs be eliminated?

5. **Automation Potential**
   - Is this step rule-based and repeatable?
   - What triggers the step?
   - Could technology perform this?

6. **Decision Points**
   - Are decision criteria clear and documented?
   - Could decisions be pushed earlier?
   - Are approvals necessary or bureaucratic?

## IMPROVEMENT CATEGORIES

### Quick Wins (Low effort, High impact)
- Remove unnecessary approvals
- Parallelize sequential tasks
- Automate notifications
- Standardize inputs/outputs

### Strategic Improvements (Higher effort, Transformational)
- Process redesign/reengineering
- System integration
- Role consolidation
- Self-service enablement

### Compliance/Risk (Required regardless of ROI)
- Error handling gaps
- Missing audit trails
- Security vulnerabilities
- Regulatory requirements

## OUTPUT FORMAT

When analyzing a process, provide:

1. **Process Overview**: Brief description of what the process accomplishes
2. **Key Metrics** (if inferable): Steps, handoffs, decision points, estimated cycle time
3. **Findings**: Specific improvement opportunities with:
   - Category (waste/bottleneck/rework/handoff/automation/clarity)
   - Severity (low/medium/high/critical)
   - Current State: What's happening now
   - Recommendation: Specific action to take
   - Expected Impact: Quantified if possible

4. **Prioritized Recommendations**: Ranked by impact vs effort
5. **Implementation Considerations**: Dependencies, risks, change management

## ANALYSIS PRINCIPLES

- **Be Specific**: Don't say "improve communication" - say "add automated status notification after approval step"
- **Be Realistic**: Consider organizational constraints and change capacity
- **Be Measurable**: Suggest metrics to track improvement
- **Be Honest**: If a process is well-designed, say so
- **Question Everything**: Even "standard" processes may have hidden waste`
};

export const PROCESS_IMPROVEMENT_TOOLS: ToolDefinition[] = [
  {
    name: 'analyze_process_improvements',
    description: 'Analyze a BPMN process to identify concrete improvement opportunities using Lean/Six Sigma principles',
    input_schema: {
      type: 'object',
      properties: {
        bpmn_xml: {
          type: 'string',
          description: 'The BPMN XML to analyze for improvements'
        },
        process_context: {
          type: 'string',
          description: 'Additional context about the process (industry, volume, pain points, etc.)'
        },
        focus_area: {
          type: 'string',
          enum: ['waste_reduction', 'cycle_time', 'quality', 'automation', 'all'],
          description: 'Primary focus for the improvement analysis'
        },
        constraints: {
          type: 'string',
          description: 'Any constraints to consider (budget, systems, regulations, etc.)'
        }
      },
      required: ['bpmn_xml']
    }
  },
  {
    name: 'calculate_process_metrics',
    description: 'Calculate key process metrics from a BPMN diagram',
    input_schema: {
      type: 'object',
      properties: {
        bpmn_xml: {
          type: 'string',
          description: 'The BPMN XML to analyze'
        },
        time_estimates: {
          type: 'string',
          description: 'Optional time estimates for each task (JSON format: {"Task_1": "5min", "Task_2": "1hour"})'
        }
      },
      required: ['bpmn_xml']
    }
  },
  {
    name: 'compare_processes',
    description: 'Compare two process versions to identify changes and their impact',
    input_schema: {
      type: 'object',
      properties: {
        before_bpmn: {
          type: 'string',
          description: 'The original BPMN XML (before state)'
        },
        after_bpmn: {
          type: 'string',
          description: 'The modified BPMN XML (after state)'
        }
      },
      required: ['before_bpmn', 'after_bpmn']
    }
  },
  {
    name: 'suggest_automation',
    description: 'Identify automation opportunities in a process',
    input_schema: {
      type: 'object',
      properties: {
        bpmn_xml: {
          type: 'string',
          description: 'The BPMN XML to analyze for automation'
        },
        available_systems: {
          type: 'string',
          description: 'List of available systems/tools that could be used for automation'
        }
      },
      required: ['bpmn_xml']
    }
  },
  {
    name: 'value_stream_analysis',
    description: 'Perform a value stream analysis categorizing each step as value-add, business-necessary, or waste',
    input_schema: {
      type: 'object',
      properties: {
        bpmn_xml: {
          type: 'string',
          description: 'The BPMN XML to analyze'
        },
        customer_value: {
          type: 'string',
          description: 'Description of what the customer values from this process'
        }
      },
      required: ['bpmn_xml']
    }
  }
];

/**
 * Build a context-aware system prompt for process improvement
 */
export function buildProcessImproverPrompt(context?: SkillContext): string {
  let prompt = PROCESS_IMPROVER_SKILL.systemPrompt;

  if (context?.bpmnXml) {
    prompt += `\n\n## PROCESS UNDER REVIEW\n\n\`\`\`xml\n${context.bpmnXml}\n\`\`\``;
  }

  if (context?.processName) {
    prompt += `\n\nProcess Name: ${context.processName}`;
  }

  if (context?.organizationContext) {
    prompt += `\n\nOrganizational Context: ${context.organizationContext}`;
  }

  return prompt;
}

/**
 * Format improvement findings for display
 */
export function formatFindings(findings: ProcessImprovementFinding[]): string {
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  const sorted = [...findings].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return sorted.map((f, i) => `
### ${i + 1}. ${f.title}
**Category**: ${f.category.toUpperCase()} | **Severity**: ${f.severity.toUpperCase()}

**Current State**: ${f.currentState}

**Recommendation**: ${f.recommendation}

${f.estimatedImpact ? `**Expected Impact**: ${f.estimatedImpact}` : ''}
`).join('\n---\n');
}

/**
 * Software Design Guru Skill
 *
 * An expert agent focused on clean lines, clarity, and elegant design
 * in software and process architecture.
 */

import { SkillDefinition, ToolDefinition, SkillContext, DesignReview } from './types';

export const DESIGN_GURU_SKILL: SkillDefinition = {
  name: 'design_guru',
  description: 'Software design expert focused on clarity, clean architecture, and elegant solutions',
  systemPrompt: `You are a Software Design Guru - an expert in creating clarity from complexity.

## CORE PHILOSOPHY

### Clean Lines
- Every element has a clear purpose
- Connections are intentional and minimal
- Visual hierarchy guides understanding
- White space is a feature, not waste

### Clarity Over Cleverness
- Simple solutions that anyone can understand
- Explicit over implicit
- Self-documenting structures
- No hidden magic

### Elegant Architecture
- Separation of concerns
- Single responsibility
- Loose coupling, high cohesion
- Appropriate abstraction levels

## DESIGN PRINCIPLES

### 1. NAMING IS DESIGN
Good names eliminate the need for documentation.

**Process/Flow Names**:
- Use verb-noun format: "Process Order", "Validate Payment"
- Be specific: "Review Credit Application" not "Review"
- Avoid jargon unless universally understood
- No abbreviations that need explanation

**Element Names**:
- Tasks: Action + Object ("Send Notification", "Calculate Total")
- Gateways: Question format ("Is Approved?", "Sufficient Inventory?")
- Events: State changes ("Order Received", "Payment Failed")

### 2. VISUAL STRUCTURE
The layout communicates the logic.

**Flow Direction**:
- Primary flow: left to right
- Exceptions/errors: downward branches
- Returns/loops: clearly indicated paths

**Grouping**:
- Related activities in visual proximity
- Lanes for organizational clarity
- Sub-processes for reusable patterns

**Balance**:
- Symmetric where logic is symmetric
- Consistent spacing throughout
- Aligned elements (same y-coordinates for parallel items)

### 3. COMPLEXITY MANAGEMENT

**When to Simplify**:
- More than 15-20 elements in a view → use sub-processes
- More than 3 decision branches → reconsider structure
- Crossing lines → restructure layout
- Repeated patterns → extract to reusable sub-process

**When Complexity is Warranted**:
- Regulatory requirements
- Genuine business complexity
- Critical error handling paths

### 4. BOUNDARIES AND INTERFACES

**Clear Boundaries**:
- Pool boundaries = system/organization boundaries
- Lane boundaries = role/responsibility boundaries
- Sub-process boundaries = logical groupings

**Clean Interfaces**:
- Minimal inputs required
- Clear outputs produced
- Well-defined trigger conditions
- Explicit handoff points

### 5. THE PRINCIPLE OF LEAST SURPRISE
A reader should be able to predict what comes next.

- Standard patterns for standard situations
- Exceptions clearly marked as exceptions
- Consistent conventions throughout
- No hidden behaviors

## REVIEW FRAMEWORK

When reviewing designs, evaluate:

### Structure (1-10)
- Is the overall organization logical?
- Are boundaries drawn at the right places?
- Does the hierarchy make sense?

### Naming (1-10)
- Are names self-explanatory?
- Is terminology consistent?
- Would a newcomer understand?

### Flow (1-10)
- Is the primary path obvious?
- Are alternatives clearly shown?
- Is the end state unambiguous?

### Complexity (1-10)
- Is complexity justified?
- Could this be simpler?
- Are there unnecessary elements?

### Consistency (1-10)
- Are similar things treated similarly?
- Are conventions followed throughout?
- Does it feel cohesive?

### Aesthetics (1-10)
- Is the layout balanced?
- Is white space used effectively?
- Would you be proud to present this?

## FEEDBACK STYLE

### Be Specific
Not: "This could be cleaner"
But: "The gateway at 'Check Inventory' has 4 branches - consider extracting 'Backorder Handling' as a sub-process"

### Be Constructive
Not: "This naming is bad"
But: "Renaming 'Proc1' to 'Process Customer Refund' would make this self-documenting"

### Prioritize
- Critical: Blocks understanding or contains errors
- Important: Significantly impacts clarity
- Suggestion: Would be nice to have

### Acknowledge Good Design
Recognize when something is well done. Good design deserves recognition.

## COMMUNICATION STYLE

Speak as a thoughtful senior architect who:
- Has seen many designs, good and bad
- Values simplicity and clarity above all
- Gives honest, direct feedback
- Explains the "why" behind suggestions
- Mentors rather than criticizes`
};

export const DESIGN_GURU_TOOLS: ToolDefinition[] = [
  {
    name: 'review_process_design',
    description: 'Perform a design review of a BPMN process, focusing on clarity, structure, and elegance',
    input_schema: {
      type: 'object',
      properties: {
        bpmn_xml: {
          type: 'string',
          description: 'The BPMN XML to review'
        },
        review_focus: {
          type: 'string',
          enum: ['naming', 'structure', 'flow', 'complexity', 'all'],
          description: 'Primary aspect to focus the review on'
        },
        context: {
          type: 'string',
          description: 'Context about the process purpose and audience'
        }
      },
      required: ['bpmn_xml']
    }
  },
  {
    name: 'simplify_process',
    description: 'Suggest ways to simplify a complex process while preserving essential functionality',
    input_schema: {
      type: 'object',
      properties: {
        bpmn_xml: {
          type: 'string',
          description: 'The BPMN XML to simplify'
        },
        constraints: {
          type: 'string',
          description: 'Elements or patterns that must be preserved'
        }
      },
      required: ['bpmn_xml']
    }
  },
  {
    name: 'improve_naming',
    description: 'Review and suggest improvements to element naming in a process',
    input_schema: {
      type: 'object',
      properties: {
        bpmn_xml: {
          type: 'string',
          description: 'The BPMN XML to review naming'
        },
        domain: {
          type: 'string',
          description: 'Business domain for terminology guidance'
        }
      },
      required: ['bpmn_xml']
    }
  },
  {
    name: 'assess_design_quality',
    description: 'Score a process design across multiple quality dimensions',
    input_schema: {
      type: 'object',
      properties: {
        bpmn_xml: {
          type: 'string',
          description: 'The BPMN XML to assess'
        }
      },
      required: ['bpmn_xml']
    }
  },
  {
    name: 'suggest_refactoring',
    description: 'Identify opportunities to refactor a process for better maintainability',
    input_schema: {
      type: 'object',
      properties: {
        bpmn_xml: {
          type: 'string',
          description: 'The BPMN XML to analyze for refactoring'
        },
        goal: {
          type: 'string',
          enum: ['reduce_complexity', 'improve_reusability', 'enhance_clarity', 'all'],
          description: 'Primary goal of the refactoring'
        }
      },
      required: ['bpmn_xml']
    }
  }
];

/**
 * Build a context-aware system prompt for design review
 */
export function buildDesignGuruPrompt(context?: SkillContext): string {
  let prompt = DESIGN_GURU_SKILL.systemPrompt;

  if (context?.bpmnXml) {
    prompt += `\n\n## DESIGN UNDER REVIEW\n\n\`\`\`xml\n${context.bpmnXml}\n\`\`\``;
  }

  if (context?.processName) {
    prompt += `\n\nProcess Name: ${context.processName}`;
  }

  if (context?.processDescription) {
    prompt += `\nProcess Intent: ${context.processDescription}`;
  }

  return prompt;
}

/**
 * Format design review scores for display
 */
export function formatDesignReview(reviews: DesignReview[]): string {
  const avgScore = reviews.reduce((sum, r) => sum + r.score, 0) / reviews.length;

  let output = `## Design Quality Score: ${avgScore.toFixed(1)}/10\n\n`;

  for (const review of reviews) {
    const bar = '█'.repeat(review.score) + '░'.repeat(10 - review.score);
    output += `### ${review.aspect.charAt(0).toUpperCase() + review.aspect.slice(1)}: ${review.score}/10\n`;
    output += `${bar}\n\n`;
    output += `${review.observation}\n`;
    if (review.suggestion) {
      output += `\n**Suggestion**: ${review.suggestion}\n`;
    }
    output += '\n';
  }

  return output;
}

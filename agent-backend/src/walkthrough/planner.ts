// ============================================
// Walkthrough Planner
// Generates steps dynamically for branching forms
// ============================================

import type { FormSchema, FieldSchema } from "../schema/loader.js";
import { TEMPLATES } from "./narrationTemplates.js";
import { resolveDemoValue } from "./evaluator.js";

export interface PlannerStep {
  cmd: 'go_to_field' | 'explain_field' | 'fill_field' | 'wait';
  key?: string;
  text?: string;
  value?: unknown;
  ms?: number;
}

export class WalkthroughPlanner {
  private schema: FormSchema;
  private visited: Set<string>;
  private steps: PlannerStep[];

  constructor(schema: FormSchema) {
    this.schema = schema;
    this.visited = new Set();
    this.steps = [];
  }

  build(): PlannerStep[] {
    const fields = this.schema.fields;
    const controllers = fields.filter(f => f.branching);

    // Walk fields before first controller
    for (const field of fields) {
      if (field.branching) break;
      this.addFieldFull(field);
    }

    // Process each controller sequentially
    for (const controller of controllers) {
      const options = controller.options || [];
      const exploration = controller.exploration || 'full';

      for (let i = 0; i < options.length; i++) {
        const option = options[i];
        const isFirst = i === 0;

        // Switch controller
        this.steps.push({ cmd: 'go_to_field', key: controller.key });
        
        if (isFirst) {
          const introText = controller.explain?.full || TEMPLATES.controllerIntro(controller.label);
          this.steps.push({ cmd: 'explain_field', key: controller.key, text: introText });
        } else {
          // Transition line spoken
          const switchText = TEMPLATES.deltaSwitch(option);
          this.steps.push({ cmd: 'explain_field', key: controller.key, text: switchText });
        }
        
        this.steps.push({ cmd: 'fill_field', key: controller.key, value: option });
        this.steps.push({ cmd: 'wait', ms: 500 });

        // Walk affected fields
        const affectedKeys = controller.affects || [];
        for (const key of affectedKeys) {
          const field = fields.find(f => f.key === key);
          if (!field) continue;
          if (!this.isVisible(field, option)) continue;

          const alreadyVisited = this.visited.has(key);

          if (isFirst || !alreadyVisited) {
            this.addFieldFull(field, option);
          } else {
            // Delta explain only
            const deltaText = field.explain?.delta?.[option];
            if (deltaText) {
              this.steps.push({ cmd: 'go_to_field', key });
              this.steps.push({ cmd: 'explain_field', key, text: deltaText });
            }
            // Refill with branch-specific demo value
            const demo = this.getDemoValue(field, option);
            if (demo !== undefined) {
              this.steps.push({ cmd: 'fill_field', key: key, value: demo });
            }
          }
        }

        if (exploration === 'summary') break;
      }
    }

    // Walk remaining common fields
    for (const field of fields) {
      if (field.branching || field.dependsOn) continue;
      if (this.visited.has(field.key)) continue;
      this.addFieldFull(field);
    }

    return this.steps;
  }

  private addFieldFull(field: FieldSchema, branchOption: string | null = null) {
    if (this.visited.has(field.key)) return;
    
    this.steps.push({ cmd: 'go_to_field', key: field.key });
    
    const explainText = field.explain?.full || field.explanation;
    if (explainText) {
      this.steps.push({ cmd: 'explain_field', key: field.key, text: explainText });
    }
    
    const demo = this.getDemoValue(field, branchOption);
    if (demo !== undefined) {
      this.steps.push({ cmd: 'fill_field', key: field.key, value: demo });
    }
    
    this.visited.add(field.key);
  }

  private getDemoValue(field: FieldSchema, branchOption: string | null) {
    return resolveDemoValue(field, new Map(), branchOption);
  }

  private isVisible(field: FieldSchema, controllerOption: string): boolean {
    if (!field.visibleWhen) return true;
    
    const vw = field.visibleWhen as any;
    if (vw.field !== undefined && vw.value !== undefined) {
      const controller = this.schema.fields.find(f => f.key === vw.field);
      if (controller && controller.branching) {
        if (vw.value !== controllerOption) return false;
      }
      return true;
    }

    for (const [k, v] of Object.entries(vw)) {
      const controller = this.schema.fields.find(f => f.key === k);
      if (controller && controller.branching) {
        if (v !== controllerOption) return false;
      }
    }
    return true;
  }
}

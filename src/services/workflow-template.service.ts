import {repository} from '@loopback/repository';
import {HttpErrors} from '@loopback/rest';
import {
  WorkflowBlueprintRepository,
  WorkflowRepository,
  WorkflowTemplateFieldRulesRepository,
  WorkflowTemplatesRepository,
} from '../repositories';

type RuleAction = 'clear' | 'remove' | 'regenerate';

export class WorkflowTemplateService {
  constructor(
    @repository(WorkflowTemplatesRepository)
    private workflowTemplatesRepository: WorkflowTemplatesRepository,
    @repository(WorkflowBlueprintRepository)
    private workflowBlueprintRepository: WorkflowBlueprintRepository,
    @repository(WorkflowRepository)
    private workflowRepository: WorkflowRepository,
    @repository(WorkflowTemplateFieldRulesRepository)
    private workflowTemplateFieldRulesRepository: WorkflowTemplateFieldRulesRepository,
  ) {}

  async createBlueprintFromTemplate(workflowId: string, templateId: string) {
    const template = await this.workflowTemplatesRepository.findById(templateId);

    if (!template) {
      throw new HttpErrors.NotFound('Workflow template not found');
    }

    const templateBlueprint = await this.workflowBlueprintRepository.findOne({
      where: {
        workflowId: template.workflowId,
        isDeleted: false,
      },
    });

    if (!templateBlueprint) {
      throw new HttpErrors.NotFound('Template workflow blueprint not found');
    }

    const rules = await this.workflowTemplateFieldRulesRepository.find({
      where: {
        and: [{isDeleted: false}, {isActive: true}],
      },
    });

    const sanitizedBlueprint = this.sanitizeBlueprintEntries(templateBlueprint.bluePrint ?? [], rules);
    const sanitizedNodes = this.sanitizeFlowNodes(templateBlueprint.nodes ?? [], sanitizedBlueprint);

    const blueprint = await this.workflowBlueprintRepository.create({
      nodes: sanitizedNodes,
      edges: this.cloneValue(templateBlueprint.edges ?? []),
      bluePrint: sanitizedBlueprint,
      direction: templateBlueprint.direction,
      workflowId,
      isActive: true,
      isDeleted: false,
    });

    await this.workflowRepository.updateById(workflowId, {
      workflowBlueprintId: blueprint.id,
    });

    return {success: true, blueprintId: blueprint.id};
  }

  private sanitizeBlueprintEntries(entries: object[], rules: any[]) {
    const clonedEntries = this.cloneValue(entries);

    return clonedEntries.map((entry: any) => {
      if (!entry?.component) {
        return entry;
      }

      const nextEntry = this.cloneValue(entry);
      const nodeRules = rules.filter((rule: any) => rule.nodeName === nextEntry.nodeName);

      nodeRules.forEach((rule: any) => {
        this.applyRule(nextEntry.component, rule.fieldPath, rule.action, rule.regenerateType);
      });

      return nextEntry;
    });
  }

  private sanitizeFlowNodes(nodes: object[], sanitizedBlueprint: any[]) {
    const blueprintById = new Map(
      sanitizedBlueprint.map((item: any) => [String(item.id), this.cloneValue(item.component)]),
    );

    return this.cloneValue(nodes).map((node: any) => {
      const nodeId = String(node?.data?.id ?? node?.id ?? '');
      if (!nodeId || !blueprintById.has(nodeId)) {
        return node;
      }

      return {
        ...node,
        data: {
          ...node.data,
          bluePrint: blueprintById.get(nodeId),
        },
      };
    });
  }

  private applyRule(target: any, fieldPath: string, action: RuleAction, regenerateType?: string) {
    if (!target || !fieldPath) {
      return;
    }

    const segments = fieldPath.split('.').filter(Boolean);
    if (!segments.length) {
      return;
    }

    this.applyRuleBySegments(target, segments, action, regenerateType, fieldPath);
  }

  private applyRuleBySegments(
    current: any,
    segments: string[],
    action: RuleAction,
    regenerateType: string | undefined,
    fieldPath: string,
  ) {
    if (current === null || current === undefined) {
      return;
    }

    const [segment, ...rest] = segments;

    if (segment === '*') {
      if (Array.isArray(current)) {
        current.forEach(item => this.applyRuleBySegments(item, rest, action, regenerateType, fieldPath));
      }
      return;
    }

    const key: string | number = Array.isArray(current) && !Number.isNaN(Number(segment))
      ? Number(segment)
      : segment;

    if (rest.length === 0) {
      this.applyTerminalAction(current, key, action, regenerateType, fieldPath);
      return;
    }

    this.applyRuleBySegments(current[key], rest, action, regenerateType, fieldPath);
  }

  private applyTerminalAction(
    current: any,
    key: string | number,
    action: RuleAction,
    regenerateType: string | undefined,
    fieldPath: string,
  ) {
    if (current === null || current === undefined) {
      return;
    }

    if (action === 'remove') {
      if (Array.isArray(current) && typeof key === 'number') {
        current.splice(key, 1);
        return;
      }
      delete current[key];
      return;
    }

    if (!(key in current)) {
      return;
    }

    if (action === 'clear') {
      current[key] = this.getClearedValue(current[key]);
      return;
    }

    if (action === 'regenerate') {
      current[key] = this.getRegeneratedValue(current[key], regenerateType, fieldPath);
    }
  }

  private getClearedValue(value: any) {
    if (Array.isArray(value)) {
      return [];
    }

    if (typeof value === 'string') {
      return '';
    }

    if (typeof value === 'boolean') {
      return false;
    }

    if (typeof value === 'number') {
      return null;
    }

    if (value && typeof value === 'object') {
      return {};
    }

    return null;
  }

  private getRegeneratedValue(currentValue: any, regenerateType: string | undefined, fieldPath: string) {
    const normalizedPath = fieldPath.toLowerCase();
    if (regenerateType === 'webhookId' || normalizedPath.endsWith('webhookid')) {
      return this.generateWebhookId();
    }

    return currentValue;
  }

  private generateWebhookId() {
    const randomPart = Math.random().toString(36).substring(2, 8);
    const timePart = Date.now().toString(36);
    return `wh_${timePart}_${randomPart}`;
  }

  private cloneValue<T>(value: T): T {
    return JSON.parse(JSON.stringify(value));
  }
}

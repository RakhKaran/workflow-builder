import {Entity, model, property} from '@loopback/repository';

@model()
export class WorkflowTemplateFieldRules extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
    required: true,
  })
  nodeName: string;

  @property({
    type: 'string',
    required: true,
  })
  fieldPath: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: ['clear', 'remove', 'regenerate'],
    },
  })
  action: string;

  @property({
    type: 'string',
    jsonSchema: {
      enum: ['webhookId'],
    },
  })
  regenerateType?: string;

  @property({
    type: 'string',
  })
  description?: string;

  @property({
    type: 'date',
  })
  createdAt?: Date;

  @property({
    type: 'date',
  })
  updatedAt?: Date;

  @property({
    type: 'date',
  })
  deletedAt?: Date;

  @property({
    type: 'boolean',
    default: false,
  })
  isDeleted: boolean;

  @property({
    type: 'boolean',
    required: true,
    default: true,
  })
  isActive: boolean;

  @property({
    type: 'string',
  })
  remark?: string;

  constructor(data?: Partial<WorkflowTemplateFieldRules>) {
    super(data);
  }
}

export interface WorkflowTemplateFieldRulesRelations {}

export type WorkflowTemplateFieldRulesWithRelations = WorkflowTemplateFieldRules &
  WorkflowTemplateFieldRulesRelations;

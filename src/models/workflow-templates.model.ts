import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Workflow} from './workflow.model';

@model()
export class WorkflowTemplates extends Entity {
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
  name: string;

  @property({
    type: 'object',
    required: true,
  })
  image: object;

  @property({
    type: 'string',
  })
  description?: string;

  @property({
    type: 'string',
  })
  requirements?: string;

  @property({
    type: 'string',
    required: true,
  })
  version: string;

  @property({
    type: 'string',
    required: true,
    jsonSchema: {
      enum: ['draft', 'published', 'unpublished'],
    },
  })
  status: string;

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

  @belongsTo(() => Workflow)
  workflowId: string;

  constructor(data?: Partial<WorkflowTemplates>) {
    super(data);
  }
}

export interface WorkflowTemplatesRelations {}

export type WorkflowTemplatesWithRelations = WorkflowTemplates & WorkflowTemplatesRelations;

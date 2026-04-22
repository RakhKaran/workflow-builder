import { Entity, model, property } from '@loopback/repository';

@model()
export class ProcessWorkflowOutput extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'number',
    unique: true,
    required: true
  })
  processInstanceId: number;

  @property({
    type: 'string',
    unique: true,
    required: true
  })
  workflowInstanceId: string;

  @property({
    type: 'object',
    required: true
  })
  documentDetails: {}

  @property({
    type: 'object',
    required: true
  })
  fileDetails: {}

  @property({
    type: 'array',
    itemType: 'object',
    required: true
  })
  extractedFields: object[];

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
  })
  isActive: boolean;

  @property({
    type: 'string',
  })
  remark?: string;
  constructor(data?: Partial<ProcessWorkflowOutput>) {
    super(data);
  }
}

export interface ProcessWorkflowOutputRelations {
  // describe navigational properties here
}

export type ProcessWorkflowOutputWithRelations = ProcessWorkflowOutput & ProcessWorkflowOutputRelations;

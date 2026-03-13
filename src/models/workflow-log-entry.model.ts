import {Entity, model, property} from '@loopback/repository';

@model({settings: {strict: true}})
export class WorkflowLogEntry extends Entity {
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
  workflowOutputsId: string;

  @property({
    type: 'string',
  })
  workflowInstancesId?: string;

  @property({
    type: 'string',
    required: true,
  })
  nodeId: string;

  @property({
    type: 'string',
    required: true,
  })
  nodeName: string;

  @property({
    type: 'string',
    required: true,
  })
  logsDescription: string;

  @property({
    type: 'number',
    required: true,
  })
  logType: number; // 0 => info, 1 => error, 2 => success, 3 => warning

  @property({
    type: 'date',
    defaultFn: 'now',
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

  constructor(data?: Partial<WorkflowLogEntry>) {
    super(data);
  }
}

export interface WorkflowLogEntryRelations {}

export type WorkflowLogEntryWithRelations = WorkflowLogEntry & WorkflowLogEntryRelations;

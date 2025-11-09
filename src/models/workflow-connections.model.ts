import {Entity, model, property, belongsTo} from '@loopback/repository';
import {Workflow} from './workflow.model';

@model()
export class WorkflowConnections extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

  @property({
    type: 'string',
    required: true
  })
  connectionName: string;

  @property({
    type: 'string',
    required: true
  })
  connectionType: string;

  @property({
    type: 'boolean',
    required: true
  })
  isConnectionEstablished: boolean;

  @property({
    type: 'string',
    required: true
  })
  accessToken: string;

  @property({
    type: 'date',
  })
  expiredAt?: Date;

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
    type: 'string',
  })
  remark?: string;

  @belongsTo(() => Workflow)
  workflowId: string;

  constructor(data?: Partial<WorkflowConnections>) {
    super(data);
  }
}

export interface WorkflowConnectionsRelations {
  // describe navigational properties here
}

export type WorkflowConnectionsWithRelations = WorkflowConnections & WorkflowConnectionsRelations;

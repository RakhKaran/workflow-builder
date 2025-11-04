import {belongsTo, Entity, model, property} from '@loopback/repository';
import {Workflow} from './workflow.model';

@model()
export class WorkflowInstances extends Entity {
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
  workflowInstanceName: string;

  @property({
    type: 'string'
  })
  workflowInstanceFolderName: string;

  @property({
    type: 'string',
    // required: true,
  })
  workflowInstanceDescription?: string;

  @property({
    type: 'string',
    // required: true,
  })
  currentStage?: string;

  @property({
    type: 'boolean',
    required: true
  })
  isInstanceRunning: boolean;

  @property({
    type: 'boolean',
  })
  isScheduled?: boolean;

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

  @belongsTo(() => Workflow)
  workflowId: string;

  constructor(data?: Partial<WorkflowInstances>) {
    super(data);
  }
}

export interface WorkflowInstancesRelations {
  // describe navigational properties here
}

export type WorkflowInstancesWithRelations = WorkflowInstances & WorkflowInstancesRelations;

import {belongsTo, Entity, hasMany, model, property} from '@loopback/repository';
import {NodeOutput} from './node-output.model';
import {WorkflowInstances} from './workflow-instances.model';

@model()
export class WorkflowOutputs extends Entity {
  @property({
    type: 'string',
    id: true,
    generated: true,
  })
  id?: string;

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
    type: 'number',   // 0 => running 1 => completed 2 => failed 3 => waiting
    required: true,
  })
  status: number;

  @property({
    type: 'string',
  })
  remark?: string;

  @belongsTo(() => WorkflowInstances)
  workflowInstancesId: string;

  @hasMany(() => NodeOutput)
  nodeOutputs: NodeOutput[];

  constructor(data?: Partial<WorkflowOutputs>) {
    super(data);
  }
}

export interface WorkflowOutputsRelations {
  // describe navigational properties here
}

export type WorkflowOutputsWithRelations = WorkflowOutputs & WorkflowOutputsRelations;

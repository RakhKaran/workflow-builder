import {Entity, model, property} from '@loopback/repository';

@model()
export class NodeOutput extends Entity {
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
  nodeId: string;

  @property({
    type: 'object',
  })
  output: object;

  @property({
    type: 'object',
  })
  error: object;

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
    type: 'number',   // 0 => completed 1 => failed
    required: true,
  })
  status: number;

  @property({
    type: 'string',
  })
  remark?: string;

  @property({
    type: 'string',
  })
  workflowOutputsId?: string;

  constructor(data?: Partial<NodeOutput>) {
    super(data);
  }
}

export interface NodeOutputRelations {
  // describe navigational properties here
}

export type NodeOutputWithRelations = NodeOutput & NodeOutputRelations;

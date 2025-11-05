import {Entity, model, property} from '@loopback/repository';

@model({settings: {strict: false}})
export class WaitNodes extends Entity {
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
  waitNodeId: string;

  @property({
    type: 'array',
    itemType: 'object',
    required: true
  })
  prevOutputs: object[];

  @property({
    type: 'date',
    required: true,
  })
  resumeAt: Date;

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
    type: 'number',   // 0 => waiting 1 => completed 2=> failed
    required: true,
  })
  status: number;

  @property({
    type: 'string',
  })
  remark?: string;

  [prop: string]: any;

  constructor(data?: Partial<WaitNodes>) {
    super(data);
  }
}

export interface WaitNodesRelations {
  // describe navigational properties here
}

export type WaitNodesWithRelations = WaitNodes & WaitNodesRelations;

import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {WorkflowDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {WaitNodes, WaitNodesRelations} from '../models';

export class WaitNodesRepository extends TimeStampRepositoryMixin<
  WaitNodes,
  typeof WaitNodes.prototype.id,
  Constructor<
    DefaultCrudRepository<
      WaitNodes,
      typeof WaitNodes.prototype.id,
      WaitNodesRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(@inject('datasources.workflow') dataSource: WorkflowDataSource) {
    super(WaitNodes, dataSource);
  }
}

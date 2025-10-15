import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {WorkflowDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {NodeOutput, NodeOutputRelations} from '../models';

export class NodeOutputRepository extends TimeStampRepositoryMixin<
  NodeOutput,
  typeof NodeOutput.prototype.id,
  Constructor<
    DefaultCrudRepository<
      NodeOutput,
      typeof NodeOutput.prototype.id,
      NodeOutputRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(@inject('datasources.workflow') dataSource: WorkflowDataSource) {
    super(NodeOutput, dataSource);
  }
}

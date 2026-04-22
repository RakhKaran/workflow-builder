import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {WorkflowDataSource} from '../datasources';
import {ProcessWorkflowOutput, ProcessWorkflowOutputRelations} from '../models';
import { TimeStampRepositoryMixin } from '../mixins/timestamp-repository-mixin';

export class ProcessWorkflowOutputRepository extends TimeStampRepositoryMixin<
  ProcessWorkflowOutput,
  typeof ProcessWorkflowOutput.prototype.id,
  Constructor<
    DefaultCrudRepository<
      ProcessWorkflowOutput,
      typeof ProcessWorkflowOutput.prototype.id,
      ProcessWorkflowOutputRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(@inject('datasources.workflow') dataSource: WorkflowDataSource) {
    super(ProcessWorkflowOutput, dataSource);
  }
}

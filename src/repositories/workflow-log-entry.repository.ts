import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {WorkflowDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {WorkflowLogEntry, WorkflowLogEntryRelations} from '../models';

export class WorkflowLogEntryRepository extends TimeStampRepositoryMixin<
  WorkflowLogEntry,
  typeof WorkflowLogEntry.prototype.id,
  Constructor<
    DefaultCrudRepository<
      WorkflowLogEntry,
      typeof WorkflowLogEntry.prototype.id,
      WorkflowLogEntryRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(@inject('datasources.workflow') dataSource: WorkflowDataSource) {
    super(WorkflowLogEntry, dataSource);
  }
}

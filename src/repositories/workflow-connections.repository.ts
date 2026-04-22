import {Constructor, inject, Getter} from '@loopback/core';
import {DefaultCrudRepository, repository, BelongsToAccessor} from '@loopback/repository';
import {WorkflowDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {WorkflowConnections, WorkflowConnectionsRelations, Workflow} from '../models';
import {WorkflowRepository} from './workflow.repository';

export class WorkflowConnectionsRepository extends TimeStampRepositoryMixin<
  WorkflowConnections,
  typeof WorkflowConnections.prototype.id,
  Constructor<
    DefaultCrudRepository<
      WorkflowConnections,
      typeof WorkflowConnections.prototype.id,
      WorkflowConnectionsRelations
    >
  >
>(DefaultCrudRepository) {

  public readonly workflow: BelongsToAccessor<Workflow, typeof WorkflowConnections.prototype.id>;

  constructor(@inject('datasources.workflow') dataSource: WorkflowDataSource, @repository.getter('WorkflowRepository') protected workflowRepositoryGetter: Getter<WorkflowRepository>,) {
    super(WorkflowConnections, dataSource);
    this.workflow = this.createBelongsToAccessorFor('workflow', workflowRepositoryGetter,);
    this.registerInclusionResolver('workflow', this.workflow.inclusionResolver);
  }
}

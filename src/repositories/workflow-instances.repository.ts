import { Constructor, inject, Getter} from '@loopback/core';
import { DefaultCrudRepository, repository, BelongsToAccessor} from '@loopback/repository';
import { WorkflowDataSource } from '../datasources';
import { WorkflowInstances, WorkflowInstancesRelations, Workflow} from '../models';
import { TimeStampRepositoryMixin } from '../mixins/timestamp-repository-mixin';
import {WorkflowRepository} from './workflow.repository';

export class WorkflowInstancesRepository extends TimeStampRepositoryMixin<
  WorkflowInstances,
  typeof WorkflowInstances.prototype.id,
  Constructor<
    DefaultCrudRepository<
      WorkflowInstances,
      typeof WorkflowInstances.prototype.id,
      WorkflowInstancesRelations
    >
  >
>(DefaultCrudRepository) {

  public readonly workflow: BelongsToAccessor<Workflow, typeof WorkflowInstances.prototype.id>;

  constructor(@inject('datasources.workflow') dataSource: WorkflowDataSource, @repository.getter('WorkflowRepository') protected workflowRepositoryGetter: Getter<WorkflowRepository>,) {
    super(WorkflowInstances, dataSource);
    this.workflow = this.createBelongsToAccessorFor('workflow', workflowRepositoryGetter,);
    this.registerInclusionResolver('workflow', this.workflow.inclusionResolver);
  }
}

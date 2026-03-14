import {Constructor, Getter, inject} from '@loopback/core';
import {BelongsToAccessor, DefaultCrudRepository, repository} from '@loopback/repository';
import {WorkflowDataSource} from '../datasources';
import {Workflow, WorkflowTemplates, WorkflowTemplatesRelations} from '../models';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {WorkflowRepository} from './workflow.repository';

export class WorkflowTemplatesRepository extends TimeStampRepositoryMixin<
  WorkflowTemplates,
  typeof WorkflowTemplates.prototype.id,
  Constructor<
    DefaultCrudRepository<
      WorkflowTemplates,
      typeof WorkflowTemplates.prototype.id,
      WorkflowTemplatesRelations
    >
  >
>(DefaultCrudRepository) {
  public readonly workflow: BelongsToAccessor<Workflow, typeof WorkflowTemplates.prototype.id>;

  constructor(
    @inject('datasources.workflow') dataSource: WorkflowDataSource,
    @repository.getter('WorkflowRepository')
    protected workflowRepositoryGetter: Getter<WorkflowRepository>,
  ) {
    super(WorkflowTemplates, dataSource);
    this.workflow = this.createBelongsToAccessorFor('workflow', workflowRepositoryGetter);
    this.registerInclusionResolver('workflow', this.workflow.inclusionResolver);
  }
}

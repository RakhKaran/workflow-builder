import {Constructor, inject, Getter} from '@loopback/core';
import {DefaultCrudRepository, repository, BelongsToAccessor} from '@loopback/repository';
import {WorkflowDataSource} from '../datasources';
import {WorkflowBlueprint, WorkflowBlueprintRelations, Workflow} from '../models';
import { TimeStampRepositoryMixin } from '../mixins/timestamp-repository-mixin';
import {WorkflowRepository} from './workflow.repository';

export class WorkflowBlueprintRepository extends TimeStampRepositoryMixin<
  WorkflowBlueprint,
  typeof WorkflowBlueprint.prototype.id,
  Constructor<
    DefaultCrudRepository<
      WorkflowBlueprint,
      typeof WorkflowBlueprint.prototype.id,
      WorkflowBlueprintRelations
    >
  >
>(DefaultCrudRepository) {

  public readonly workflow: BelongsToAccessor<Workflow, typeof WorkflowBlueprint.prototype.id>;

  constructor(@inject('datasources.workflow') dataSource: WorkflowDataSource, @repository.getter('WorkflowRepository') protected workflowRepositoryGetter: Getter<WorkflowRepository>,) {
    super(WorkflowBlueprint, dataSource);
    this.workflow = this.createBelongsToAccessorFor('workflow', workflowRepositoryGetter,);
    this.registerInclusionResolver('workflow', this.workflow.inclusionResolver);
  }
}

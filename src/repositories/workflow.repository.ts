import {Constructor, inject, Getter} from '@loopback/core';
import {DefaultCrudRepository, repository, BelongsToAccessor} from '@loopback/repository';
import {WorkflowDataSource} from '../datasources';
import {Workflow, WorkflowRelations, WorkflowBlueprint} from '../models';
import { TimeStampRepositoryMixin } from '../mixins/timestamp-repository-mixin';
import {WorkflowBlueprintRepository} from './workflow-blueprint.repository';

export class WorkflowRepository extends TimeStampRepositoryMixin<
  Workflow,
  typeof Workflow.prototype.id,
  Constructor<
    DefaultCrudRepository<
      Workflow,
      typeof Workflow.prototype.id,
      WorkflowRelations
    >
  >
>(DefaultCrudRepository) {

  public readonly workflowBlueprint: BelongsToAccessor<WorkflowBlueprint, typeof Workflow.prototype.id>;

  constructor(@inject('datasources.workflow') dataSource: WorkflowDataSource, @repository.getter('WorkflowBlueprintRepository') protected workflowBlueprintRepositoryGetter: Getter<WorkflowBlueprintRepository>,) {
    super(Workflow, dataSource);
    this.workflowBlueprint = this.createBelongsToAccessorFor('workflowBlueprint', workflowBlueprintRepositoryGetter,);
    this.registerInclusionResolver('workflowBlueprint', this.workflowBlueprint.inclusionResolver);
  }
}

import {Constructor, inject, Getter} from '@loopback/core';
import {DefaultCrudRepository, repository, BelongsToAccessor, HasManyRepositoryFactory} from '@loopback/repository';
import {WorkflowDataSource} from '../datasources';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';
import {WorkflowOutputs, WorkflowOutputsRelations, WorkflowInstances, NodeOutput} from '../models';
import {WorkflowInstancesRepository} from './workflow-instances.repository';
import {NodeOutputRepository} from './node-output.repository';

export class WorkflowOutputsRepository extends TimeStampRepositoryMixin<
  WorkflowOutputs,
  typeof WorkflowOutputs.prototype.id,
  Constructor<
    DefaultCrudRepository<
      WorkflowOutputs,
      typeof WorkflowOutputs.prototype.id,
      WorkflowOutputsRelations
    >
  >
>(DefaultCrudRepository) {

  public readonly workflowInstances: BelongsToAccessor<WorkflowInstances, typeof WorkflowOutputs.prototype.id>;

  public readonly nodeOutputs: HasManyRepositoryFactory<NodeOutput, typeof WorkflowOutputs.prototype.id>;

  constructor(@inject('datasources.workflow') dataSource: WorkflowDataSource, @repository.getter('WorkflowInstancesRepository') protected workflowInstancesRepositoryGetter: Getter<WorkflowInstancesRepository>, @repository.getter('NodeOutputRepository') protected nodeOutputRepositoryGetter: Getter<NodeOutputRepository>,) {
    super(WorkflowOutputs, dataSource);
    this.nodeOutputs = this.createHasManyRepositoryFactoryFor('nodeOutputs', nodeOutputRepositoryGetter,);
    this.registerInclusionResolver('nodeOutputs', this.nodeOutputs.inclusionResolver);
    this.workflowInstances = this.createBelongsToAccessorFor('workflowInstances', workflowInstancesRepositoryGetter,);
    this.registerInclusionResolver('workflowInstances', this.workflowInstances.inclusionResolver);
  }
}

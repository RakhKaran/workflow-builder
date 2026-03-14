import {Constructor, inject} from '@loopback/core';
import {DefaultCrudRepository} from '@loopback/repository';
import {WorkflowDataSource} from '../datasources';
import {
  WorkflowTemplateFieldRules,
  WorkflowTemplateFieldRulesRelations,
} from '../models';
import {TimeStampRepositoryMixin} from '../mixins/timestamp-repository-mixin';

export class WorkflowTemplateFieldRulesRepository extends TimeStampRepositoryMixin<
  WorkflowTemplateFieldRules,
  typeof WorkflowTemplateFieldRules.prototype.id,
  Constructor<
    DefaultCrudRepository<
      WorkflowTemplateFieldRules,
      typeof WorkflowTemplateFieldRules.prototype.id,
      WorkflowTemplateFieldRulesRelations
    >
  >
>(DefaultCrudRepository) {
  constructor(@inject('datasources.workflow') dataSource: WorkflowDataSource) {
    super(WorkflowTemplateFieldRules, dataSource);
  }
}

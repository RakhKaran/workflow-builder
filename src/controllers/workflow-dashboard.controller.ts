import {authenticate, AuthenticationBindings} from '@loopback/authentication';
import {inject} from '@loopback/core';
import {repository, Where} from '@loopback/repository';
import {get, HttpErrors, param, response} from '@loopback/rest';
import {UserProfile} from '@loopback/security';
import {PermissionKeys} from '../authorization/permission-keys';
import {Workflow, WorkflowInstances, WorkflowOutputs} from '../models';
import {
  WorkflowInstancesRepository,
  WorkflowOutputsRepository,
  WorkflowRepository,
} from '../repositories';

interface DateRange {
  startDate?: Date;
  endDate?: Date;
}

interface WorkflowDashboardCounts {
  totalWorkflows: number;
  currentWorkflowInProgress: number;
  completedWorkflowInstances: number;
  filters: {
    startDate?: string;
    endDate?: string;
    hours?: number;
  };
}

export class WorkflowDashboardController {
  constructor(
    @repository(WorkflowRepository)
    public workflowRepository: WorkflowRepository,
    @repository(WorkflowInstancesRepository)
    public workflowInstancesRepository: WorkflowInstancesRepository,
    @repository(WorkflowOutputsRepository)
    public workflowOutputsRepository: WorkflowOutputsRepository,
  ) {}

  private parseDate(value: string, fieldName: string): Date {
    const parsedDate = new Date(value);

    if (Number.isNaN(parsedDate.getTime())) {
      throw new HttpErrors.BadRequest(`${fieldName} must be a valid date`);
    }

    return parsedDate;
  }

  private getDateRange(
    startDate?: string,
    endDate?: string,
    hours?: number,
  ): DateRange {
    let resolvedStartDate: Date | undefined;
    let resolvedEndDate: Date | undefined;

    if (hours !== undefined) {
      if (hours <= 0) {
        throw new HttpErrors.BadRequest('hours must be greater than 0');
      }

      resolvedEndDate = new Date();
      resolvedStartDate = new Date(
        resolvedEndDate.getTime() - hours * 60 * 60 * 1000,
      );
    }

    if (startDate) {
      resolvedStartDate = this.parseDate(startDate, 'startDate');
    }

    if (endDate) {
      resolvedEndDate = this.parseDate(endDate, 'endDate');
    }

    if (
      resolvedStartDate &&
      resolvedEndDate &&
      resolvedStartDate > resolvedEndDate
    ) {
      throw new HttpErrors.BadRequest('startDate must be before endDate');
    }

    return {
      startDate: resolvedStartDate,
      endDate: resolvedEndDate,
    };
  }

  private dateWhere<T extends {createdAt?: Date}>(range: DateRange): Where<T>[] {
    const where: Where<T>[] = [];

    if (range.startDate) {
      where.push({createdAt: {gte: range.startDate}} as Where<T>);
    }

    if (range.endDate) {
      where.push({createdAt: {lte: range.endDate}} as Where<T>);
    }

    return where;
  }

  private isSuperAdmin(currentUser: UserProfile): boolean {
    return Boolean(currentUser.permissions?.includes(PermissionKeys.SUPER_ADMIN));
  }

  private buildWorkflowWhere(
    currentUser: UserProfile,
    range: DateRange,
    extraWhere?: Where<Workflow>,
  ): Where<Workflow> {
    const and: Where<Workflow>[] = [
      {isDeleted: false},
      ...this.dateWhere<Workflow>(range),
    ];

    if (!this.isSuperAdmin(currentUser)) {
      and.push({userId: currentUser.id} as Where<Workflow>);
    }

    if (extraWhere) {
      and.push(extraWhere);
    }

    return {and};
  }

  private buildWorkflowInstanceWhere(
    currentUser: UserProfile,
    extraWhere?: Where<WorkflowInstances>,
  ): Where<WorkflowInstances> {
    const and: Where<WorkflowInstances>[] = [{isDeleted: false}];

    if (!this.isSuperAdmin(currentUser)) {
      and.push({userId: currentUser.id} as Where<WorkflowInstances>);
    }

    if (extraWhere) {
      and.push(extraWhere);
    }

    return {and};
  }

  private buildWorkflowOutputWhere(
    range: DateRange,
    status: number,
    workflowInstanceIds?: string[],
  ): Where<WorkflowOutputs> {
    const and: Where<WorkflowOutputs>[] = [
      {isDeleted: false},
      {status},
      ...this.dateWhere<WorkflowOutputs>(range),
    ];

    if (workflowInstanceIds) {
      and.push({workflowInstancesId: {inq: workflowInstanceIds}});
    }

    return {and};
  }

  private async getAllowedWorkflowInstanceIds(
    currentUser: UserProfile,
  ): Promise<string[] | undefined> {
    if (this.isSuperAdmin(currentUser)) {
      return undefined;
    }

    const workflowInstances = await this.workflowInstancesRepository.find({
      where: this.buildWorkflowInstanceWhere(currentUser),
      fields: {id: true},
    });

    return workflowInstances
      .map(workflowInstance => workflowInstance.id)
      .filter((id): id is string => Boolean(id));
  }

  @authenticate({
    strategy: 'jwt',
    options: {
      required: [
        PermissionKeys.SUPER_ADMIN,
        PermissionKeys.ADMIN,
        PermissionKeys.COMPANY,
      ],
    },
  })
  @get('/dashboard/workflow-counts')
  @response(200, {
    description: 'Workflow dashboard counts',
    content: {
      'application/json': {
        schema: {
          type: 'object',
          properties: {
            totalWorkflows: {type: 'number'},
            currentWorkflowInProgress: {type: 'number'},
            completedWorkflowInstances: {type: 'number'},
            filters: {
              type: 'object',
              properties: {
                startDate: {type: 'string'},
                endDate: {type: 'string'},
                hours: {type: 'number'},
              },
            },
          },
        },
      },
    },
  })
  async getCounts(
    @inject(AuthenticationBindings.CURRENT_USER)
    currentUser: UserProfile,
    @param.query.string('startDate') startDate?: string,
    @param.query.string('endDate') endDate?: string,
    @param.query.number('hours') hours?: number,
  ): Promise<WorkflowDashboardCounts> {
    const range = this.getDateRange(startDate, endDate, hours);
    const allowedWorkflowInstanceIds =
      await this.getAllowedWorkflowInstanceIds(currentUser);

    const [totalWorkflows, currentWorkflowInProgress] = await Promise.all([
      this.workflowRepository.count(
        this.buildWorkflowWhere(currentUser, range),
      ),
      allowedWorkflowInstanceIds?.length === 0
        ? Promise.resolve({count: 0})
        : this.workflowOutputsRepository.count(
            this.buildWorkflowOutputWhere(
              range,
              0,
              allowedWorkflowInstanceIds,
            ),
          ),
    ]);

    const completedWorkflowInstances =
      allowedWorkflowInstanceIds?.length === 0
        ? {count: 0}
        : await this.workflowOutputsRepository.count(
            this.buildWorkflowOutputWhere(
              range,
              1,
              allowedWorkflowInstanceIds,
            ),
          );

    return {
      totalWorkflows: totalWorkflows.count,
      currentWorkflowInProgress: currentWorkflowInProgress.count,
      completedWorkflowInstances: completedWorkflowInstances.count,
      filters: {
        startDate: range.startDate?.toISOString(),
        endDate: range.endDate?.toISOString(),
        hours,
      },
    };
  }
}

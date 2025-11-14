#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-explicit-any */
import {ApplicationConfig} from "@loopback/core";
import {WorkflowBuilderApplication} from "../application";
import {Workflow, WorkflowBlueprint, WorkflowInstances} from "../models";
import {WorkflowInstancesRepository} from "../repositories";
import {AirflowDagService} from "../services/nodes/dag-creation.service";
import {createAgendaConnection} from '../services/agenda/agenda-connection.service';

async function findTimeTriggerWorkflows(app: WorkflowBuilderApplication) {
    const repo = await app.getRepository(WorkflowInstancesRepository);
    const workflowInstances = await repo.find({
        where: {
            and: [
                {isInstanceRunning: true},
                {isDeleted: false},
                {isActive: true},
                {isScheduled: {neq: true}}
            ],
        },
        include: [
            {
                relation: "workflow",
                scope: {
                    include: [{relation: "workflowBlueprint"}],
                },
            },
        ],
    }) as (WorkflowInstances & {
        workflow?: Workflow & {
            workflowBlueprint?: WorkflowBlueprint;
        };
    })[];

    console.log('workflowInstances length', workflowInstances.length);

    const workflowInstancesWithTimeTrigger: {
        nodeId: string;
        workflowInstanceId: string;
        nodeConfig: object;
        workflowInstanceName: string;
    }[] = [];

    for (const instance of workflowInstances) {
        const nodes: any[] = instance.workflow?.workflowBlueprint?.nodes ?? [];

        console.log('nodes', nodes.length);
        if (nodes.length > 0 && nodes[0].type === "timeTrigger" && instance.id) {
            console.log('entered');
            const nodeConfig = (instance.workflow?.workflowBlueprint?.bluePrint?.find(
                (node: any) => node.id === nodes[0].id
            ) as any)?.component;
            console.log('nodeConfig', nodeConfig);
            if (nodeConfig) {
                workflowInstancesWithTimeTrigger.push({
                    nodeId: nodes[0].id,
                    workflowInstanceId: instance.id,
                    nodeConfig,
                    workflowInstanceName: instance.workflowInstanceName,
                });
            }
        }
    }

    return workflowInstancesWithTimeTrigger;
}

async function main() {
    const config: ApplicationConfig = {
        rest: {
            port: 0,
            host: "127.0.0.1",
        },
    };

    const app = new WorkflowBuilderApplication(config);
    await app.boot();
    await createAgendaConnection();
    await app.start();

    try {
        const airflowDagService = await app.get<AirflowDagService>("services.AirflowDagService");
        const instances = await findTimeTriggerWorkflows(app);
        console.log('instances length', instances.length);
        for (const instance of instances) {
            console.log('instance', instance);
            const dagFile = await airflowDagService.createDagFile({
                dagName: `${instance.workflowInstanceName}_${instance.workflowInstanceId}`,
                taskId: instance.workflowInstanceName,
                schedulerType: (instance.nodeConfig as any).triggerType,
                config: instance.nodeConfig,
                id: instance.workflowInstanceId,
                nodeId: instance.nodeId
            });

            if (dagFile) {
                const repo = await app.getRepository(WorkflowInstancesRepository);
                await repo.updateById(instance.workflowInstanceId, {isScheduled: true});
            }
        }
    } catch (err: any) {
        console.error(JSON.stringify({error: err.message}));
        process.exit(1);
    } finally {
        console.log("stopping the app");
        await app.stop();
        setImmediate(() => process.exit(0));
    }
}

main().catch(err => {
    console.error("Unhandled error in main:", err);
    process.exit(1);
});

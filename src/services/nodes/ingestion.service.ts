import { inject } from "@loopback/core";
import { STORAGE_DIRECTORY } from "../../keys";
import fs from 'fs';
import path from 'path';
import { promisify } from "util";
import { HttpErrors } from "@loopback/rest";
import { repository } from "@loopback/repository";
import { ProcessWorkflowOutputRepository, WorkflowLogEntryRepository } from "../../repositories";
import { createWorkflowLog, resolveNodeName } from "../../utils/workflow-log.util";

const readdir = promisify(fs.readdir);

export class IngestionService {
    constructor(
        @inject(STORAGE_DIRECTORY) private storageDirectory: string,
        @repository(ProcessWorkflowOutputRepository)
        public processWorkflowOutputRepository: ProcessWorkflowOutputRepository,
        @repository(WorkflowLogEntryRepository)
        private workflowLogEntryRepository: WorkflowLogEntryRepository,
    ) { }

    async ingestion(data: any, previousOutputs: any[], workflowInstanceData: any, outputDataId: string) {
        const nodeName = resolveNodeName(data);
        try {
            await createWorkflowLog(this.workflowLogEntryRepository, {
                workflowOutputsId: outputDataId,
                workflowInstancesId: workflowInstanceData?.id,
                nodeId: data?.id,
                nodeName,
                logsDescription: `Started ${nodeName} node execution`,
                logType: 0,
            });
            if (data) {
                const component = data?.component || null;
                if (component) {
                    if (component.channelType === 'ui') {
                        const result = await this.channelTypeUI(workflowInstanceData.workflowInstanceFolderName);
                        await createWorkflowLog(this.workflowLogEntryRepository, {
                            workflowOutputsId: outputDataId,
                            workflowInstancesId: workflowInstanceData?.id,
                            nodeId: data?.id,
                            nodeName,
                            logsDescription: `${nodeName} node loaded UI channel data successfully`,
                            logType: 2,
                        });
                        return {
                            status: "success",
                            timestamp: new Date().toISOString(),
                            data: result,
                        };
                    }

                    else if (component.channelType === 'process') {
                        const result = await this.channelTypeProcess(workflowInstanceData.id);
                        await createWorkflowLog(this.workflowLogEntryRepository, {
                            workflowOutputsId: outputDataId,
                            workflowInstancesId: workflowInstanceData?.id,
                            nodeId: data?.id,
                            nodeName,
                            logsDescription: `${nodeName} node loaded process channel data successfully`,
                            logType: 2,
                        });
                        return {
                            status: "success",
                            timestamp: new Date().toISOString(),
                            data: result,
                        };
                    }
                }
            }

            const processed = {
                status: "success",
                timestamp: new Date().toISOString(),
                input: data
            };
            await createWorkflowLog(this.workflowLogEntryRepository, {
                workflowOutputsId: outputDataId,
                workflowInstancesId: workflowInstanceData?.id,
                nodeId: data?.id,
                nodeName,
                logsDescription: `${nodeName} node completed successfully`,
                logType: 2,
            });

            return processed;
        } catch (error) {
            await createWorkflowLog(this.workflowLogEntryRepository, {
                workflowOutputsId: outputDataId,
                workflowInstancesId: workflowInstanceData?.id,
                nodeId: data?.id,
                nodeName,
                logsDescription: `${nodeName} node failed: ${error.message || error}`,
                logType: 1,
            });
            throw error;
        }
    }

    // ui channel type function
    async channelTypeUI(folderName: string) {
        try {
            const folderPath = path.resolve(this.storageDirectory, folderName);

            // Security check to prevent directory traversal
            if (!folderPath.startsWith(this.storageDirectory)) {
                throw new HttpErrors.BadRequest('Invalid folder path');
            }

            if (!fs.existsSync(folderPath)) {
                throw new HttpErrors.NotFound(`Folder "${folderName}" not found`);
            }

            const files = await readdir(folderPath);
            return {
                folderName,
                fileCount: files.length,
                files,
            };
        } catch (error) {
            throw error;
        }
    }

    // process channel type function
    async channelTypeProcess(workflowInstanceId: string) {
        try {
            const processWorkflowOutput = await this.processWorkflowOutputRepository.findOne({
                where: {
                    workflowInstanceId: workflowInstanceId
                }
            });

            if(!processWorkflowOutput){
                return null;
            }

            return{
                documentDetails: processWorkflowOutput.documentDetails,
                fileDetails: processWorkflowOutput.fileDetails,
                extractedFields: processWorkflowOutput.extractedFields
            }
        } catch (error) {
            throw error;
        }
    }
}

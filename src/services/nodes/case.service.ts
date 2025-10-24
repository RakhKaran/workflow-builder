import {repository} from '@loopback/repository';
import {NodeOutputRepository} from '../../repositories';
import {
    arrayConditions,
    booleanConditions,
    numberConditions,
    stringConditions,
} from "../../utils/conditionCheckers";

type StringConditionKey = keyof typeof stringConditions;
type NumberConditionKey = keyof typeof numberConditions;
type BooleanConditionKey = keyof typeof booleanConditions;
type ArrayConditionKey = keyof typeof arrayConditions;

export class CaseService {
    constructor(
        @repository(NodeOutputRepository)
        public nodeOutputRepository: NodeOutputRepository,
    ) { }

    // helper to resolve dynamic variables
    private resolveValue(
        value: any,
        previousOutputs: any[]
    ): any {
        if (typeof value === 'string') {
            const dynamicMatch = value.match(/^{{(.*?)}}$/);
            if (dynamicMatch) {
                const path = dynamicMatch[1].trim();
                // search previous outputs for path
                for (const prev of previousOutputs) {
                    if (prev.status === "success" && prev.data) {
                        const parts = path.split(".");
                        let temp = prev.data;
                        for (const part of parts) {
                            if (temp && Object.prototype.hasOwnProperty.call(temp, part)) {
                                temp = temp[part];
                            } else {
                                temp = undefined;
                                break;
                            }
                        }
                        if (temp !== undefined) return temp;
                    }
                }
                return null; // not found
            }
        }
        return value; // static value
    }

    async caseFunction(
        data: any,
        previousOutputs: any[],
        workflowInstanceData: any,
        outputDataId: string
    ) {
        try {
            const currentNode = workflowInstanceData?.workflow?.workflowBlueprint?.nodes
                ?.find((node: any) => node?.id === data?.id);

            const parentNodeId = currentNode?.data?.parentNode?.id;
            const blueprint = data?.component || {};
            const logicalOperator = blueprint.logicalOperator || "AND";
            const conditions = blueprint.conditions || [];

            const parentOutput = previousOutputs.find(
                (out) => out.nodeId === parentNodeId
            );

            console.log('parent output', parentOutput);

            if (!parentOutput) {
                return {success: false, reason: "Missing parent output"};
            }

            const results = conditions.map((cond: any) => {
                console.log('condtion', cond);
                console.log('parentOutput', parentOutput?.output?.data);
                let fieldValue: any;

                const data = parentOutput?.output?.data;
                if (Array.isArray(data)) {
                    const found = data.find((item) => item.variableName === cond.field);
                    fieldValue = found?.variableValue;
                }
                // Case 2: If data is an object
                else if (data && typeof data === 'object') {
                    fieldValue = data[cond.field];
                }

                // Fallback: undefined
                else {
                    fieldValue = undefined;
                }
                const resolvedValue = this.resolveValue(cond.value, previousOutputs);

                console.log('field value', fieldValue);
                console.log('resolved value', resolvedValue);

                let isConditionMet = false;

                switch (cond.fieldType) {
                    case "string":
                        if (cond.condition in stringConditions) {
                            isConditionMet = stringConditions[cond.condition as StringConditionKey](
                                String(fieldValue),
                                String(resolvedValue)
                            );
                        }
                        break;

                    case "number":
                        if (cond.condition in numberConditions) {
                            if (cond.condition === "between") {
                                const [min, max] = String(resolvedValue).split(",").map(Number);
                                isConditionMet = numberConditions.between(Number(fieldValue), [min, max]);
                            } else {
                                isConditionMet = numberConditions[cond.condition as Exclude<NumberConditionKey, "between">](
                                    Number(fieldValue),
                                    Number(resolvedValue)
                                );
                            }
                        }
                        break;

                    case "boolean":
                        if (cond.condition in booleanConditions) {
                            isConditionMet = booleanConditions[cond.condition as BooleanConditionKey](
                                Boolean(fieldValue)
                            );
                        }
                        break;

                    case "array":
                        if (cond.condition in arrayConditions) {
                            isConditionMet = arrayConditions[cond.condition as ArrayConditionKey](
                                Array.isArray(fieldValue) ? fieldValue : [],
                                isNaN(Number(resolvedValue)) ? resolvedValue : Number(resolvedValue)
                            );
                        }
                        break;

                    case "date":
                        const actualDate = fieldValue ? new Date(fieldValue) : null;
                        const expectedDate = resolvedValue ? new Date(resolvedValue) : null;

                        switch (cond.condition) {
                            case "valid date":
                                isConditionMet = actualDate !== null && !isNaN(actualDate.getTime());
                                break;
                            case "invalid date":
                                isConditionMet = actualDate === null || isNaN(actualDate.getTime());
                                break;
                            case "equals":
                                if (actualDate && expectedDate) {
                                    isConditionMet = actualDate.getTime() === expectedDate.getTime();
                                }
                                break;
                            case "greater than":
                                if (actualDate && expectedDate) {
                                    isConditionMet = actualDate.getTime() > expectedDate.getTime();
                                }
                                break;
                            case "less than":
                                if (actualDate && expectedDate) {
                                    isConditionMet = actualDate.getTime() < expectedDate.getTime();
                                }
                                break;
                            case "greater than or equal":
                                if (actualDate && expectedDate) {
                                    isConditionMet = actualDate.getTime() >= expectedDate.getTime();
                                }
                                break;
                            case "less than or equal":
                                if (actualDate && expectedDate) {
                                    isConditionMet = actualDate.getTime() <= expectedDate.getTime();
                                }
                                break;
                            case "between":
                                if (actualDate && resolvedValue) {
                                    const [fromStr, toStr] = String(resolvedValue).split(",");
                                    const from = new Date(fromStr);
                                    const to = new Date(toStr);
                                    if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
                                        isConditionMet = actualDate.getTime() >= from.getTime() && actualDate.getTime() <= to.getTime();
                                    }
                                }
                                break;
                        }


                    case "object":
                        switch (cond.condition) {
                            case "exists":
                                isConditionMet = fieldValue !== null && fieldValue !== undefined;
                                break;
                            case "not exists":
                                isConditionMet = fieldValue === null || fieldValue === undefined;
                                break;
                            case "is empty":
                                isConditionMet = Object.keys(fieldValue || {}).length === 0;
                                break;
                            case "is not empty":
                                isConditionMet = Object.keys(fieldValue || {}).length > 0;
                                break;
                            case "has key":
                                isConditionMet = fieldValue && resolvedValue in fieldValue;
                                break;
                            case "has keys":
                                const keys = String(resolvedValue).split(",").map(k => k.trim());
                                isConditionMet = keys.every(k => fieldValue && k in fieldValue);
                                break;
                        }
                        break;

                    default:
                        console.warn(`Unsupported type: ${cond.fieldType}`);
                }

                return {
                    field: cond.field,
                    condition: cond.condition,
                    expected: resolvedValue,
                    actual: fieldValue,
                    result: isConditionMet,
                };
            });

            const finalResult =
                logicalOperator === "AND"
                    ? results.every((r: any) => r.result)
                    : results.some((r: any) => r.result);

            await this.nodeOutputRepository.create({
                workflowOutputsId: outputDataId,
                status: 1, // success
                nodeId: data.id,
                output: {...results, finalResult}
            });

            console.log('final result', {...results, finalResult});
            return {
                status: finalResult ? "success" : "failed",
                timestamp: new Date().toISOString(),
                data: {...results, success: finalResult}
            };
        } catch (error) {
            console.error("CaseService.caseFunction error:", error);
            await this.nodeOutputRepository.create({
                workflowOutputsId: outputDataId,
                status: 0,
                nodeId: data.id,
                error: error.message || error,
            });
            throw error;
        }
    }
}

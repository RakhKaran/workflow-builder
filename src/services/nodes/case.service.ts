import {inject} from '@loopback/core';
import {repository} from '@loopback/repository';
import {NodeOutputRepository} from '../../repositories';
import {
    arrayConditions,
    booleanConditions,
    numberConditions,
    stringConditions,
} from "../../utils/conditionCheckers";
import {VariableService} from './variable.service';

type StringConditionKey = keyof typeof stringConditions;
type NumberConditionKey = keyof typeof numberConditions;
type BooleanConditionKey = keyof typeof booleanConditions;
type ArrayConditionKey = keyof typeof arrayConditions;

export class CaseService {
    constructor(
        @repository(NodeOutputRepository)
        public nodeOutputRepository: NodeOutputRepository,
        @inject('services.VariableService')
        private variableService: VariableService,
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

            const parentOutput = previousOutputs.filter(
                (out) => out.type === 'variable'
            );

            if (!parentOutput || parentOutput.length === 0) {
                return {success: false, reason: "Missing parent output"};
            }

            // 🔄 Resolve variables in all dynamic fields
            const resolveDynamicValue = async (value: any): Promise<any> => {
                if (typeof value !== 'string') return value;
                const matches = value.match(/{{(.*?)}}/g);
                if (!matches) return value;

                let resolved = value;
                for (const match of matches) {
                    const variableKey = match.replace(/[{}]/g, '').trim();
                    const foundValue = await this.variableService.getVariableValue(`{{${variableKey}}}`, previousOutputs);

                    let replacementValue = foundValue;
                    // 👇 If it's a string and not already quoted, add quotes
                    // if (typeof foundValue === 'string' && !/^".*"$/.test(foundValue)) {
                    //     replacementValue = `"${foundValue}"`;
                    // }

                    resolved = resolved.replace(match, replacementValue ?? '""');
                }
                return resolved;
            };


            const results = await Promise.all(conditions.map(async (cond: any) => {
                console.log('condtion', cond);
                const parentOutputData = parentOutput
                    .map(output => Array.isArray(output.output?.data) ? output.output.data : [])
                    .flat();
                console.log('parentOutputData', parentOutputData);
                let fieldValue: any;

                const data = parentOutputData;
                if (Array.isArray(data)) {
                    console.log('data', data);
                    const found = data.find((item) => item.variableName === cond.field);
                    console.log('found 1', found);
                    fieldValue = found?.variableValue;
                }
                // Case 2: If data is an object
                else if (data && typeof data === 'object') {
                    console.log('entered 1');
                    fieldValue = data[cond.field];
                }

                // Fallback: undefined
                else {
                    console.log('entered 2');
                    fieldValue = undefined;
                }

                const dynamicResolvedValue = await resolveDynamicValue(cond.value);
                const resolvedValue = this.resolveValue(dynamicResolvedValue, previousOutputs);

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
                        // const actualDate = fieldValue ? new Date(fieldValue) : null;
                        const actualDate = fieldValue ? new Date(fieldValue) : null;
                        let expectedDate = null;

                        if (typeof resolvedValue === 'string') {
                            const lowerValue = resolvedValue.trim().toLowerCase();
                            console.log('lowered value', lowerValue);
                            if (lowerValue === 'current') {
                                expectedDate = new Date(); // ✅ Current date/time
                                console.log('expectedDate', expectedDate);
                            } else if (!isNaN(Date.parse(resolvedValue))) {
                                expectedDate = new Date(resolvedValue); // ✅ Valid date string
                                console.log('expectedDate final', expectedDate);

                            }
                        } else if (resolvedValue instanceof Date) {
                            expectedDate = resolvedValue; // ✅ Already a Date object
                            console.log('here');
                        }

                        console.log('compare', actualDate, expectedDate);
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
            }));

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

import {
    stringConditions,
    numberConditions,
    booleanConditions,
    arrayConditions,
} from "../../utils/conditionCheckers";

type StringConditionKey = keyof typeof stringConditions;
type NumberConditionKey = keyof typeof numberConditions;
type BooleanConditionKey = keyof typeof booleanConditions;
type ArrayConditionKey = keyof typeof arrayConditions;

export class CaseService {
    constructor() { }

    async caseFunction(data: any, previousOutputs: any[], workflowInstanceData: any) {
        try {
            const currentNode = workflowInstanceData?.workflow?.workflowBlueprint?.nodes
                ?.find((node: any) => node?.id === data?.id);

            const parentNodeId = currentNode?.data?.parentNode?.id;

            console.log('parent node id', parentNodeId);

            console.log('previous outputs', previousOutputs);
            const parentOutput = previousOutputs.find(
                (out) => out.nodeId === parentNodeId
            );

            if (!parentOutput) {
                return { success: false, reason: "Missing parent output" };
            }

            const { field, condition, value } = data.component || {};
            const fieldValue = parentOutput?.output?.data?.[field];

            let isConditionMet = false;

            if (typeof fieldValue === "string" && condition in stringConditions) {
                isConditionMet = stringConditions[condition as StringConditionKey](fieldValue, value);
            } else if (typeof fieldValue === "number" && condition in numberConditions) {
                if (typeof fieldValue === "number") {
                    if (condition === "between") {
                        const [min, max] = String(value).split(",").map(Number);
                        isConditionMet = numberConditions.between(fieldValue, [min, max]);
                    } else {
                        const cond = condition as Exclude<NumberConditionKey, "between">;
                        isConditionMet = numberConditions[cond](fieldValue, Number(value));
                    }
                }
            } else if (typeof fieldValue === "boolean" && condition in booleanConditions) {
                isConditionMet = booleanConditions[condition as BooleanConditionKey](fieldValue);
            } else if (Array.isArray(fieldValue) && condition in arrayConditions) {
                isConditionMet = arrayConditions[condition as ArrayConditionKey](
                    fieldValue,
                    isNaN(Number(value)) ? value : Number(value)
                );
            } else if (typeof fieldValue === "object" && fieldValue !== null) {
                switch (condition) {
                    case "exists":
                        isConditionMet = fieldValue !== null && fieldValue !== undefined;
                        break;
                    case "not exists":
                        isConditionMet = fieldValue === null || fieldValue === undefined;
                        break;
                    case "is empty":
                        isConditionMet = Object.keys(fieldValue).length === 0;
                        break;
                    case "is not empty":
                        isConditionMet = Object.keys(fieldValue).length > 0;
                        break;
                    case "has key":
                        isConditionMet = value in fieldValue;
                        break;
                    case "has keys":
                        const keys = String(value).split(",").map(k => k.trim());
                        isConditionMet = keys.every(k => k in fieldValue);
                        break;
                    default:
                        console.warn(`Unsupported object condition: ${condition}`);
                        break;
                }
            } else {
                console.warn(`Unsupported condition: ${condition}`);
            }

            data = {
                success: isConditionMet,
                nodeId: data.id,
                parentNodeId,
                evaluated: { field, condition, expected: value, actual: fieldValue },
            };

            return {
                status: "success",
                timestamp: new Date().toISOString(),
                input: data
            }
        } catch (error) {
            throw error;
        }
    }
}

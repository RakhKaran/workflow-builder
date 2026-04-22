// utils/conditionCheckers.ts
export const stringConditions = {
    equals: (a: string, b: string) => a === b,
    "not equals": (a: string, b: string) => a !== b,
    contains: (a: string, b: string) => a.includes(b),
    "starts with": (a: string, b: string) => a.startsWith(b),
    "ends with": (a: string, b: string) => a.endsWith(b),
};

type NumberConditionKey =
  | "equals"
  | "not equals"
  | "greater than"
  | "less than"
  | "between";
  
export const numberConditions: Record<Exclude<NumberConditionKey, "between">, (a: number, b: number) => boolean> & {
    between: (a: number, range: [number, number]) => boolean;
} = {
    equals: (a, b) => a === b,
    "not equals": (a, b) => a !== b,
    "greater than": (a, b) => a > b,
    "less than": (a, b) => a < b,
    between: (a, range) => a >= range[0] && a <= range[1],
};

export const booleanConditions = {
    "is true": (a: boolean) => a === true,
    "is false": (a: boolean) => a === false,
};

export const arrayConditions = {
    contains: (a: any[], b: any) => a.includes(b),
    "not contains": (a: any[], b: any) => !a.includes(b),
    "length equals": (a: any[], b: number) => a.length === b,
    "length greater then": (a: any[], b: number) => a.length > b,
    "length less then": (a: any[], b: number) => a.length < b,
};

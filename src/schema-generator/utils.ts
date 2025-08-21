import type { SchemaObject, ReferenceObject } from "openapi3-ts/oas31";

/**
 * Effective type after resolving union types and inference
 */
export type EffectiveType =
  | "string"
  | "number"
  | "integer"
  | "boolean"
  | "array"
  | "object"
  | string[]
  | undefined;

/**
 * Type guard to check if an object is a SchemaObject (not a ReferenceObject)
 *
 * @example
 * ```javascript
 * const schema1 = { type: 'string' };
 * const schema2 = { $ref: '#/components/schemas/User' };
 *
 * isSchemaObject(schema1); // returns true
 * isSchemaObject(schema2); // returns false
 * ```
 */
export function isSchemaObject(
  obj: SchemaObject | ReferenceObject
): obj is SchemaObject {
  return !("$ref" in obj);
}

/**
 * Determine the type of a schema when it's not explicitly defined
 */
export function inferEffectiveType(schema: SchemaObject): EffectiveType {
  let effectiveType = schema.type as EffectiveType;
  if (!effectiveType) {
    if (schema.properties || schema.additionalProperties) {
      effectiveType = "object";
    } else if (schema.items) {
      effectiveType = "array";
    }
  }
  return effectiveType;
}

/**
 * Check if a schema has nullable property (OpenAPI 3.0 style)
 */
export function isNullable(schema: SchemaObject): boolean {
  return "nullable" in schema && (schema as any).nullable === true;
}

/**
 * Create a clone of schema without the nullable property
 */
export function cloneWithoutNullable(schema: SchemaObject): SchemaObject {
  const clone = { ...schema };
  delete (clone as any).nullable;
  return clone;
}

/**
 * Check if a type array represents a nullable type (e.g., ["string", "null"])
 */
export function analyzeTypeArray(types: string[]): {
  isNullable: boolean;
  nonNullTypes: string[];
} {
  const nonNullTypes = types.filter((t: string) => t !== "null");
  const isNullable = types.includes("null");

  return {
    isNullable,
    nonNullTypes,
  };
}

/**
 * Add default value to zod code if present in schema
 */
export function addDefaultValue(code: string, defaultValue: any): string {
  if (defaultValue === undefined) {
    return code;
  }

  const serializedDefault =
    typeof defaultValue === "string"
      ? JSON.stringify(defaultValue)
      : JSON.stringify(defaultValue);

  return `${code}.default(${serializedDefault})`;
}

/**
 * Merge import sets
 */
export function mergeImports(
  target: Set<string>,
  ...sources: Set<string>[]
): void {
  for (const source of sources) {
    for (const item of source) {
      target.add(item);
    }
  }
}

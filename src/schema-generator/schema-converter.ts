import type { SchemaObject, ReferenceObject } from "openapi3-ts/oas31";

/**
 * Result of converting an OpenAPI schema to Zod code
 *
 * @example
 * ```javascript
 * const result: ZodSchemaResult = {
 *   code: "z.object({ name: z.string(), age: z.number().optional() })",
 *   imports: new Set(['UserType', 'AddressSchema'])
 * };
 * ```
 */
export interface ZodSchemaResult {
  code: string;
  imports: Set<string>;
  extensibleEnumValues?: any[];
}

/**
 * Options for zodSchemaToCode function
 */
export interface ZodSchemaCodeOptions {
  imports?: Set<string>;
  isTopLevel?: boolean;
}

/**
 * Union type for OpenAPI schema types
 */
export type OpenAPISchema = SchemaObject | ReferenceObject;
import { isSchemaObject } from "openapi3-ts/oas31";
import {
  inferEffectiveType,
  isNullable,
  cloneWithoutNullable,
  analyzeTypeArray,
  mergeImports,
} from "./utils.js";
import { handleReference } from "./reference-handlers.js";
import { handleRegularEnum } from "./enum-handlers.js";
import {
  handleStringType,
  handleNumberType,
  handleBooleanType,
  handleArrayType,
} from "./primitive-types.js";
import { handleObjectType } from "./object-types.js";
import { handleAllOfSchema, handleUnionSchema } from "./union-types.js";

/**
 * Converts an OpenAPI schema object to Zod validation code
 */
export function zodSchemaToCode(
  schema: SchemaObject | ReferenceObject,
  options: ZodSchemaCodeOptions = {}
): ZodSchemaResult {
  const { imports } = options;
  const result: ZodSchemaResult = {
    code: "",
    imports: imports || new Set<string>(),
  };

  // Handle reference objects
  if (!isSchemaObject(schema)) {
    return handleReference(schema, result);
  }

  // Handle OpenAPI 3.1.0 union types, e.g., type: ["string", "null"]
  const effectiveType = inferEffectiveType(schema);

  if (Array.isArray(effectiveType)) {
    const { isNullable: hasNull, nonNullTypes } =
      analyzeTypeArray(effectiveType);

    if (nonNullTypes.length === 1 && hasNull) {
      // e.g., type: ["string", "null"]
      const clone = { ...schema, type: nonNullTypes[0] };
      const subResult = zodSchemaToCode(clone as SchemaObject, {
        imports: result.imports,
      });
      result.code = `(${subResult.code}).nullable()`;
      mergeImports(result.imports, subResult.imports);
      return result;
    } else {
      // e.g., type: ["string", "number"]
      const subResults = effectiveType.map((t: string) =>
        zodSchemaToCode({ ...schema, type: t } as SchemaObject, {
          imports: result.imports,
        })
      );
      const schemas = subResults.map((r: ZodSchemaResult) => r.code);
      subResults.forEach((r: ZodSchemaResult) => {
        mergeImports(result.imports, r.imports);
      });
      result.code = `z.union([${schemas.join(", ")}])`;
      return result;
    }
  }

  // Handle enum before type-specific logic, but only if not a string (strings need special extensible enum handling)
  if (schema.enum && Array.isArray(schema.enum) && effectiveType !== "string") {
    result.code = handleRegularEnum(schema.enum, schema.default);
    return result;
  }

  // Handle nullable (OpenAPI 3.0 style)
  if (isNullable(schema)) {
    const clone = cloneWithoutNullable(schema);
    const subResult = zodSchemaToCode(clone, {
      imports: result.imports,
    });
    result.code = `(${subResult.code}).nullable()`;
    mergeImports(result.imports, subResult.imports);
    return result;
  }

  // Handle composition schemas
  if (schema.allOf) {
    return handleAllOfSchema(schema.allOf, result, zodSchemaToCode);
  }

  if (schema.anyOf) {
    return handleUnionSchema(
      schema.anyOf,
      "anyOf",
      result,
      zodSchemaToCode,
      schema.discriminator
    );
  }

  if (schema.oneOf) {
    return handleUnionSchema(
      schema.oneOf,
      "oneOf",
      result,
      zodSchemaToCode,
      schema.discriminator
    );
  }

  // Handle primitive types
  if (effectiveType === "string") {
    return handleStringType(schema, result);
  }

  if (effectiveType === "number" || effectiveType === "integer") {
    return handleNumberType(schema, result);
  }

  if (effectiveType === "boolean") {
    return handleBooleanType(schema, result);
  }

  if (effectiveType === "array") {
    return handleArrayType(schema, result, zodSchemaToCode);
  }

  if (effectiveType === "object") {
    return handleObjectType(schema, result, zodSchemaToCode);
  }

  // Fallback
  result.code = "z.unknown()";
  return result;
}

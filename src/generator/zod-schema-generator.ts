import type { SchemaObject, ReferenceObject } from "openapi3-ts/oas31";
export function zodSchemaToCode(
  schema: SchemaObject | ReferenceObject
): string {
  if (!isSchemaObject(schema)) {
    // $ref: not supported in this generator (should be dereferenced before)
    return "z.any()";
  }

  // Handle OpenAPI 3.1.0 union types, e.g., type: ["string", "null"]
  if (Array.isArray(schema.type)) {
    const types = schema.type;
    const nonNullTypes = types.filter((t) => t !== "null");
    if (nonNullTypes.length === 1 && types.includes("null")) {
      // e.g., type: ["string", "null"]
      const clone = { ...schema, type: nonNullTypes[0] };
      return `(${zodSchemaToCode(clone as SchemaObject)}).nullable()`;
    } else {
      // e.g., type: ["string", "number"]
      const schemas = types.map((t) =>
        zodSchemaToCode({ ...schema, type: t } as SchemaObject)
      );
      return `z.union([${schemas.join(", ")}])`;
    }
  }

  if ("nullable" in schema && (schema as any).nullable) {
    const clone = { ...schema };
    delete (clone as any).nullable;
    return `(${zodSchemaToCode(clone as SchemaObject)}).nullable()`;
  }

  if (schema.allOf) {
    const schemas = schema.allOf
      .filter(isSchemaObject)
      .map((s) => zodSchemaToCode(s));
    if (schemas.length === 0) return "z.any()";
    if (schemas.length === 1) return schemas[0];
    // If all are objects, merge; else intersection
    return schemas.reduce((acc, curr) => `z.intersection(${acc}, ${curr})`);
  }

  if (schema.anyOf) {
    const schemas = schema.anyOf
      .filter(isSchemaObject)
      .map((s) => zodSchemaToCode(s));
    if (schemas.length === 0) return "z.any()";
    if (schemas.length === 1) return schemas[0];
    return `z.union([${schemas.join(", ")}])`;
  }

  if (schema.oneOf) {
    const schemas = schema.oneOf
      .filter(isSchemaObject)
      .map((s) => zodSchemaToCode(s));
    if (schemas.length === 0) return "z.any()";
    if (schemas.length === 1) return schemas[0];
    // Note: superRefine for oneOf uniqueness is not representable as code string
    return `z.union([${schemas.join(", ")}])`;
  }

  if (schema.type === "string") {
    let code = "z.string()";
    if (schema.pattern)
      code += `.regex(new RegExp(${JSON.stringify(schema.pattern)}))`;
    if (schema.format === "email") code += ".email()";
    if (schema.format === "uuid") code = "z.uuid()";
    if (schema.format === "uri") code += ".url()";
    if (schema.enum)
      code = `z.enum([${schema.enum.map((e) => JSON.stringify(e)).join(", ")}])`;
    return code;
  }

  if (schema.type === "number" || schema.type === "integer") {
    let code = "z.number()";
    if (schema.minimum !== undefined) code += `.min(${schema.minimum})`;
    if (schema.maximum !== undefined) code += `.max(${schema.maximum})`;
    if (schema.exclusiveMinimum) code += `.gt(${schema.minimum})`;
    if (schema.exclusiveMaximum) code += `.lt(${schema.maximum})`;
    if (schema.type === "integer") code += ".int()";
    return code;
  }

  if (schema.type === "boolean") {
    return "z.boolean()";
  }

  if (schema.type === "array") {
    if (!schema.items) return "z.array(z.any())";
    let code = `z.array(${zodSchemaToCode(schema.items as SchemaObject)})`;
    if (schema.minItems !== undefined) code += `.min(${schema.minItems})`;
    if (schema.maxItems !== undefined) code += `.max(${schema.maxItems})`;
    // uniqueItems not representable in code string
    return code;
  }

  if (schema.type === "object") {
    const shape: string[] = [];
    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        shape.push(
          `${JSON.stringify(key)}: ${zodSchemaToCode(propSchema as SchemaObject)}`
        );
      }
    }
    let code = `z.object({${shape.join(", ")}})`;
    if (schema.additionalProperties) {
      if (typeof schema.additionalProperties === "boolean") {
        code += ".catchall(z.any())";
      } else {
        code += `.catchall(${zodSchemaToCode(schema.additionalProperties as SchemaObject)})`;
      }
    }
    return code;
  }

  return "z.any()";
}

function isSchemaObject(
  obj: SchemaObject | ReferenceObject
): obj is SchemaObject {
  return !("$ref" in obj);
}

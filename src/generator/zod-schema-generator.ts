import type { SchemaObject, ReferenceObject } from "openapi3-ts/oas31";

export interface ZodSchemaResult {
  code: string;
  imports: Set<string>;
}

export function zodSchemaToCode(
  schema: SchemaObject | ReferenceObject,
  imports?: Set<string>
): ZodSchemaResult {
  const result: ZodSchemaResult = {
    code: "",
    imports: imports || new Set<string>(),
  };

  if (!isSchemaObject(schema)) {
    // Handle local $ref references
    if ("$ref" in schema && schema.$ref) {
      const ref = schema.$ref;
      // Check if it's a local reference to components/schemas
      if (ref.startsWith("#/components/schemas/")) {
        const schemaName = ref.replace("#/components/schemas/", "");
        result.imports.add(schemaName);
        result.code = schemaName;
        return result;
      }
    }
    // For non-local refs or other cases, fall back to z.unknown()
    result.code = "z.unknown()";
    return result;
  }

  // Handle OpenAPI 3.1.0 union types, e.g., type: ["string", "null"]
  // Infer type if missing: object if properties/additionalProperties, array if items
  let effectiveType = schema.type;
  if (!effectiveType) {
    if (schema.properties || schema.additionalProperties) {
      effectiveType = "object";
    } else if (schema.items) {
      effectiveType = "array";
    }
  }

  if (Array.isArray(effectiveType)) {
    const types = effectiveType;
    const nonNullTypes = types.filter((t: string) => t !== "null");
    if (nonNullTypes.length === 1 && types.includes("null")) {
      // e.g., type: ["string", "null"]
      const clone = { ...schema, type: nonNullTypes[0] };
      const subResult = zodSchemaToCode(clone as SchemaObject, result.imports);
      result.code = `(${subResult.code}).nullable()`;
      result.imports = new Set([...result.imports, ...subResult.imports]);
      return result;
    } else {
      // e.g., type: ["string", "number"]
      const subResults = types.map((t: string) =>
        zodSchemaToCode({ ...schema, type: t } as SchemaObject, result.imports)
      );
      const schemas = subResults.map((r: ZodSchemaResult) => r.code);
      subResults.forEach((r: ZodSchemaResult) => {
        result.imports = new Set([...result.imports, ...r.imports]);
      });
      result.code = `z.union([${schemas.join(", ")}])`;
      return result;
    }
  }

  if ("nullable" in schema && (schema as any).nullable) {
    const clone = { ...schema };
    delete (clone as any).nullable;
    const subResult = zodSchemaToCode(clone as SchemaObject, result.imports);
    result.code = `(${subResult.code}).nullable()`;
    result.imports = new Set([...result.imports, ...subResult.imports]);
    return result;
  }

  if (schema.allOf) {
    const subResults = schema.allOf.map((s) =>
      zodSchemaToCode(s, result.imports)
    );
    const schemas = subResults.map((r) => r.code);
    subResults.forEach((r) => {
      result.imports = new Set([...result.imports, ...r.imports]);
    });

    if (schemas.length === 0) {
      result.code = "z.unknown()";
      return result;
    }
    if (schemas.length === 1) {
      result.code = schemas[0];
      return result;
    }
    // If all are objects, merge; else intersection
    result.code = schemas.reduce(
      (acc, curr) => `z.intersection(${acc}, ${curr})`
    );
    return result;
  }

  if (schema.anyOf) {
    const subResults = schema.anyOf.map((s) =>
      zodSchemaToCode(s, result.imports)
    );
    const schemas = subResults.map((r) => r.code);
    subResults.forEach((r) => {
      result.imports = new Set([...result.imports, ...r.imports]);
    });

    if (schemas.length === 0) {
      result.code = "z.unknown()";
      return result;
    }
    if (schemas.length === 1) {
      result.code = schemas[0];
      return result;
    }
    result.code = `z.union([${schemas.join(", ")}])`;
    return result;
  }

  if (schema.oneOf) {
    const subResults = schema.oneOf.map((s) =>
      zodSchemaToCode(s, result.imports)
    );
    const schemas = subResults.map((r) => r.code);
    subResults.forEach((r) => {
      result.imports = new Set([...result.imports, ...r.imports]);
    });

    if (schemas.length === 0) {
      result.code = "z.unknown()";
      return result;
    }
    if (schemas.length === 1) {
      result.code = schemas[0];
      return result;
    }
    // Note: superRefine for oneOf uniqueness is not representable as code string
    result.code = `z.union([${schemas.join(", ")}])`;
    return result;
  }

  if (effectiveType === "string") {
    let code = "z.string()";

    // include minLength
    if (schema.minLength !== undefined) code += `.min(${schema.minLength})`;
    if (schema.maxLength !== undefined) code += `.max(${schema.maxLength})`;

    if (schema.pattern)
      code += `.regex(new RegExp(${JSON.stringify(schema.pattern)}))`;
    if (schema.format === "email") code += ".email()";
    if (schema.format === "uuid") code = "z.uuid()";
    if (schema.format === "uri") code += ".url()";
    if (schema.enum)
      code = `z.enum([${schema.enum.map((e) => JSON.stringify(e)).join(", ")}])`;

    result.code = code;
    return result;
  }

  if (effectiveType === "number" || effectiveType === "integer") {
    let code = "z.number()";
    if (schema.minimum !== undefined) code += `.min(${schema.minimum})`;
    if (schema.maximum !== undefined) code += `.max(${schema.maximum})`;
    if (schema.exclusiveMinimum !== undefined)
      code += `.gt(${schema.exclusiveMinimum})`;
    if (schema.exclusiveMaximum !== undefined)
      code += `.lt(${schema.exclusiveMaximum})`;
    if (schema.type === "integer") code += ".int()";

    result.code = code;
    return result;
  }

  if (effectiveType === "boolean") {
    result.code = "z.boolean()";
    return result;
  }

  if (effectiveType === "array") {
    if (!schema.items) {
      result.code = "z.array(z.unknown())";
      return result;
    }
    const itemsResult = zodSchemaToCode(
      schema.items as SchemaObject,
      result.imports
    );
    let code = `z.array(${itemsResult.code})`;
    result.imports = new Set([...result.imports, ...itemsResult.imports]);

    if (schema.minItems !== undefined) code += `.min(${schema.minItems})`;
    if (schema.maxItems !== undefined) code += `.max(${schema.maxItems})`;
    // uniqueItems not representable in code string

    result.code = code;
    return result;
  }

  if (effectiveType === "object") {
    const shape: string[] = [];
    const requiredFields = schema.required || [];

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propResult = zodSchemaToCode(
          propSchema as SchemaObject,
          result.imports
        );
        result.imports = new Set([...result.imports, ...propResult.imports]);

        const isRequired = requiredFields.includes(key);
        const propCode = isRequired
          ? propResult.code
          : `${propResult.code}.optional()`;

        shape.push(`${JSON.stringify(key)}: ${propCode}`);
      }
    }
    let code = `z.object({${shape.join(", ")}})`;
    if (schema.additionalProperties) {
      if (typeof schema.additionalProperties === "boolean") {
        code += ".catchall(z.unknown())";
      } else {
        const additionalResult = zodSchemaToCode(
          schema.additionalProperties as SchemaObject,
          result.imports
        );
        result.imports = new Set([
          ...result.imports,
          ...additionalResult.imports,
        ]);
        code += `.catchall(${additionalResult.code})`;
      }
    }

    result.code = code;
    return result;
  }

  result.code = "z.unknown()";
  return result;
}

function isSchemaObject(
  obj: SchemaObject | ReferenceObject
): obj is SchemaObject {
  return !("$ref" in obj);
}

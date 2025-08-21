import type { SchemaObject, ReferenceObject } from "openapi3-ts/oas31";
import { format } from "prettier";

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
 * Schema file generation result
 */
export interface SchemaFileResult {
  content: string;
  fileName: string;
}

/**
 * Options for zodSchemaToCode function
 */
export interface ZodSchemaCodeOptions {
  imports?: Set<string>;
  isTopLevel?: boolean;
}

/**
 * Handles x-extensible-enum for string schemas
 * Always generates inline array format for consistency
 */
function handleExtensibleEnum(schema: SchemaObject): {
  code: string;
  enumValues: any[];
} | null {
  const extensibleEnum = (schema as any)["x-extensible-enum"];
  if (!extensibleEnum || !Array.isArray(extensibleEnum)) {
    return null;
  }

  // Always use inline array format
  const enumValues = extensibleEnum
    .map((e: any) => JSON.stringify(e))
    .join(", ");
  let code = `z.enum([${enumValues}]).or(z.string())`;

  // Add default value if present
  if (schema.default !== undefined) {
    code += `.default(${JSON.stringify(schema.default)})`;
  }

  return {
    code,
    enumValues: extensibleEnum,
  };
}

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
      const subResult = zodSchemaToCode(clone as SchemaObject, {
        imports: result.imports,
      });
      result.code = `(${subResult.code}).nullable()`;
      result.imports = new Set([...result.imports, ...subResult.imports]);
      return result;
    } else {
      // e.g., type: ["string", "number"]
      const subResults = types.map((t: string) =>
        zodSchemaToCode({ ...schema, type: t } as SchemaObject, {
          imports: result.imports,
        })
      );
      const schemas = subResults.map((r: ZodSchemaResult) => r.code);
      subResults.forEach((r: ZodSchemaResult) => {
        result.imports = new Set([...result.imports, ...r.imports]);
      });
      result.code = `z.union([${schemas.join(", ")}])`;
      return result;
    }
  }

  // Handle enum before type-specific logic
  if (schema.enum && Array.isArray(schema.enum)) {
    // Single enum value should be a literal
    if (schema.enum.length === 1) {
      const value = schema.enum[0];
      let code = `z.literal(${typeof value === "string" ? JSON.stringify(value) : value})`;

      // Add default value if present
      if (schema.default !== undefined) {
        code += `.default(${typeof schema.default === "string" ? JSON.stringify(schema.default) : schema.default})`;
      }

      result.code = code;
      return result;
    }
    // Multiple enum values - handle in type-specific sections below
  }

  if ("nullable" in schema && (schema as any).nullable) {
    const clone = { ...schema };
    delete (clone as any).nullable;
    const subResult = zodSchemaToCode(clone as SchemaObject, {
      imports: result.imports,
    });
    result.code = `(${subResult.code}).nullable()`;
    result.imports = new Set([...result.imports, ...subResult.imports]);
    return result;
  }

  if (schema.allOf) {
    const subResults = schema.allOf.map((s) =>
      zodSchemaToCode(s, { imports: result.imports })
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

  // Helper function to handle anyOf/oneOf with shared logic
  const handleUnionSchema = (
    schemas: (SchemaObject | ReferenceObject)[],
    unionType: "anyOf" | "oneOf",
    discriminator?: { propertyName: string }
  ) => {
    // Check if discriminator is present for discriminated unions
    if (discriminator && discriminator.propertyName) {
      const discriminatorProperty = discriminator.propertyName;
      const subResults = schemas.map((s) =>
        zodSchemaToCode(s, { imports: result.imports })
      );
      const schemasCodes = subResults.map((r) => r.code);
      subResults.forEach((r) => {
        result.imports = new Set([...result.imports, ...r.imports]);
      });

      if (schemasCodes.length === 0) {
        result.code = "z.unknown()";
        return result;
      }
      if (schemasCodes.length === 1) {
        result.code = schemasCodes[0];
        return result;
      }

      // Generate discriminated union - works for both anyOf and oneOf with discriminator
      result.code = `z.discriminatedUnion("${discriminatorProperty}", [${schemasCodes.join(", ")}])`;
      return result;
    }

    // Regular union without discriminator
    const subResults = schemas.map((s) =>
      zodSchemaToCode(s, { imports: result.imports })
    );
    const schemasCodes = subResults.map((r) => r.code);
    subResults.forEach((r) => {
      result.imports = new Set([...result.imports, ...r.imports]);
    });

    if (schemasCodes.length === 0) {
      result.code = "z.unknown()";
      return result;
    }
    if (schemasCodes.length === 1) {
      result.code = schemasCodes[0];
      return result;
    }

    if (unionType === "anyOf") {
      // anyOf: accepts values that match any of the schemas
      result.code = `z.union([${schemasCodes.join(", ")}])`;
    } else {
      // oneOf: must match exactly one schema - use superRefine for validation
      result.code = `z.any().superRefine((x, ctx) => {
  const schemas = [${schemasCodes.join(", ")}];
  const errors = schemas.reduce<z.ZodError[]>(
    (errors, schema) =>
      ((result) => (result.error ? [...errors, result.error] : errors))(
        schema.safeParse(x),
      ),
    [],
  );
  if (schemas.length - errors.length !== 1) {
    ctx.addIssue({
      code: "invalid_union",
      errors: errors.map(error => error.issues),
      message: "Invalid input: Should pass exactly one schema",
    });
  }
})`;
    }
    return result;
  };

  if (schema.anyOf) {
    return handleUnionSchema(schema.anyOf, "anyOf", schema.discriminator);
  }

  if (schema.oneOf) {
    return handleUnionSchema(schema.oneOf, "oneOf", schema.discriminator);
  }

  if (effectiveType === "string") {
    // Handle x-extensible-enum first, as it takes precedence over regular enum
    const extensibleEnumResult = handleExtensibleEnum(schema);
    if (extensibleEnumResult) {
      result.code = extensibleEnumResult.code;
      result.extensibleEnumValues = extensibleEnumResult.enumValues;
      return result;
    }

    let code = "z.string()";

    // include minLength
    if (schema.minLength !== undefined) code += `.min(${schema.minLength})`;
    if (schema.maxLength !== undefined) code += `.max(${schema.maxLength})`;

    if (schema.pattern)
      code += `.regex(new RegExp(${JSON.stringify(schema.pattern)}))`;
    if (schema.format === "email") code = "z.email()";
    if (schema.format === "uuid") code = "z.uuid()";
    if (schema.format === "uri") code = "z.url()";
    if (schema.format === "date") code = "z.iso.date()";
    if (schema.format === "date-time") code = "z.iso.datetime()";
    if (schema.format === "time") code = "z.iso.time()";
    if (schema.format === "duration") code = "z.iso.duration()";

    // Although Blob and File (which extends Blob) can be used interchangeably,
    // it is recommended to use a File instance when uploading files.
    // Using File ensures the uploaded file retains its original name;
    // otherwise, the server will assign a default name.
    // When downloading files, browsers typically return a File instance,
    // while in Node.js, fetch returns a Blob instance.
    if (schema.format === "binary") code = "z.instanceof(Blob)";

    // Handle multi-value enums for strings
    if (schema.enum && schema.enum.length > 1)
      code = `z.enum([${schema.enum.map((e) => JSON.stringify(e)).join(", ")}])`;

    // Add default value if present
    if (schema.default !== undefined) {
      code += `.default(${JSON.stringify(schema.default)})`;
    }

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

    // Handle multi-value enums for numbers
    if (schema.enum && schema.enum.length > 1) {
      code = `z.enum([${schema.enum.map((e) => JSON.stringify(e)).join(", ")}])`;
    }

    // Add default value if present
    if (schema.default !== undefined) {
      code += `.default(${schema.default})`;
    }

    result.code = code;
    return result;
  }

  if (effectiveType === "boolean") {
    let code = "z.boolean()";

    // Handle multi-value enums for booleans (though rare)
    if (schema.enum && schema.enum.length > 1) {
      code = `z.enum([${schema.enum.map((e) => JSON.stringify(e)).join(", ")}])`;
    }

    // Add default value if present
    if (schema.default !== undefined) {
      code += `.default(${schema.default})`;
    }

    result.code = code;
    return result;
  }

  if (effectiveType === "array") {
    if (!schema.items) {
      let code = "z.array(z.unknown())";

      // Add default value if present
      if (schema.default !== undefined) {
        code += `.default(${JSON.stringify(schema.default)})`;
      }

      result.code = code;
      return result;
    }
    const itemsResult = zodSchemaToCode(schema.items, {
      imports: result.imports,
    });
    let code = `z.array(${itemsResult.code})`;
    result.imports = new Set([...result.imports, ...itemsResult.imports]);

    if (schema.minItems !== undefined) code += `.min(${schema.minItems})`;
    if (schema.maxItems !== undefined) code += `.max(${schema.maxItems})`;
    // uniqueItems not representable in code string

    // Add default value if present
    if (schema.default !== undefined) {
      code += `.default(${JSON.stringify(schema.default)})`;
    }

    result.code = code;
    return result;
  }

  if (effectiveType === "object") {
    const shape: string[] = [];
    const requiredFields = schema.required || [];

    if (schema.properties) {
      for (const [key, propSchema] of Object.entries(schema.properties)) {
        const propResult = zodSchemaToCode(propSchema, {
          imports: result.imports,
        });
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
        const additionalResult = zodSchemaToCode(schema.additionalProperties, {
          imports: result.imports,
        });
        result.imports = new Set([
          ...result.imports,
          ...additionalResult.imports,
        ]);
        code += `.catchall(${additionalResult.code})`;
      }
    }

    // Add default value if present
    if (schema.default !== undefined) {
      code += `.default(${JSON.stringify(schema.default)})`;
    }

    result.code = code;
    return result;
  }

  result.code = "z.unknown()";
  return result;
}

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
function isSchemaObject(
  obj: SchemaObject | ReferenceObject
): obj is SchemaObject {
  return !("$ref" in obj);
}

/**
 * Generates file content for a schema with extensible enum support
 */
export async function generateSchemaFile(
  name: string,
  schema: SchemaObject,
  description?: string
): Promise<SchemaFileResult> {
  const schemaResult = zodSchemaToCode(schema, { isTopLevel: true });

  // Generate comment if description exists
  const commentSection = description
    ? `/**\n * ${description
        .replace(/\*\//g, "*\\/") // Escape */ to prevent breaking comment blocks
        .split("\n")
        .map((line) => line.trim())
        .join("\n * ")}\n */\n`
    : "";

  // Generate imports for dependencies
  const imports = Array.from(schemaResult.imports)
    .filter((importName) => importName !== name) // Don't import self
    .map((importName) => `import { ${importName} } from "./${importName}.js";`)
    .join("\n");

  const importsSection = imports ? `${imports}\n` : "";

  let content: string;

  // Handle extensible enum case
  if (schemaResult.extensibleEnumValues) {
    const enumValues = schemaResult.extensibleEnumValues
      .map((e: any) => JSON.stringify(e))
      .join(" | ");
    const typeContent = `export type ${name} = ${enumValues} | (string & {});`;
    const schemaContent = `${commentSection}export const ${name} = ${schemaResult.code};`;

    content = `import { z } from 'zod';\n${importsSection}\n${schemaContent}\n${typeContent}`;
  } else {
    const schemaContent = `${commentSection}export const ${name} = ${schemaResult.code};`;
    const typeContent = `export type ${name} = z.infer<typeof ${name}>;`;

    content = `import { z } from 'zod';\n${importsSection}\n${schemaContent}\n${typeContent}`;
  }

  const formattedContent = await format(content, {
    parser: "typescript",
  });

  return {
    content: formattedContent,
    fileName: `${name}.ts`,
  };
}

/**
 * Generates file content for a request schema
 */
export async function generateRequestSchemaFile(
  name: string,
  schema: SchemaObject
): Promise<SchemaFileResult> {
  const schemaVar = `${name.charAt(0).toUpperCase() + name.slice(1)}`;
  const description = `Request schema for ${name.replace("Request", "")} operation`;

  return generateSchemaFile(schemaVar, schema, description);
}

/**
 * Generates file content for a response schema
 */
export async function generateResponseSchemaFile(
  name: string,
  schema: SchemaObject
): Promise<SchemaFileResult> {
  const description = `Response schema for ${name.replace(/Response$/, "").replace(/\d+Response/, " operation")}`;

  return generateSchemaFile(name, schema, description);
}

import type { SchemaObject } from "openapi3-ts/oas31";
import { addDefaultValue } from "./utils.js";

// Import from schema-converter to avoid circular dependencies
interface ZodSchemaResult {
  code: string;
  imports: Set<string>;
  extensibleEnumValues?: any[];
}

interface ZodSchemaCodeOptions {
  imports?: Set<string>;
  isTopLevel?: boolean;
}

/**
 * Handle object type conversion
 */
export function handleObjectType(
  schema: SchemaObject,
  result: ZodSchemaResult,
  zodSchemaToCode: (
    schema: any,
    options?: ZodSchemaCodeOptions
  ) => ZodSchemaResult
): ZodSchemaResult {
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
  code = addDefaultValue(code, schema.default);

  result.code = code;
  return result;
}

import { promises as fs } from "fs";
import path from "path";
import type {
  SchemaObject,
  OperationObject,
  RequestBodyObject,
} from "openapi3-ts/oas31";
import { parseOpenAPI } from "./parser.js";
import { zodSchemaToCode } from "./zod-schema-generator.js";
import { generateOperations } from "./client-generator.js";
import { format } from "prettier";
import $RefParser from "@apidevtools/json-schema-ref-parser";

export interface GenerationOptions {
  input: string;
  output: string;
  generateClient: boolean;
  validateRequest: boolean;
}

// Helper function to extract request schemas from operations
function extractRequestSchemas(openApiDoc: any): Map<string, SchemaObject> {
  const requestSchemas = new Map<string, SchemaObject>();

  if (!openApiDoc.paths) {
    return requestSchemas;
  }

  for (const [, pathItem] of Object.entries(openApiDoc.paths)) {
    for (const [method, operation] of Object.entries(pathItem as any)) {
      if (
        ["get", "post", "put", "delete", "patch"].includes(method) &&
        (operation as OperationObject).operationId &&
        (operation as OperationObject).requestBody
      ) {
        const operationObj = operation as OperationObject;
        const requestBody = operationObj.requestBody as RequestBodyObject;

        // Look for application/json content
        const jsonContent = requestBody.content?.["application/json"];
        if (jsonContent?.schema && !jsonContent.schema["$ref"]) {
          // Only extract inline schemas, not $ref schemas
          const requestTypeName = `${operationObj.operationId}Request`;
          requestSchemas.set(
            requestTypeName,
            jsonContent.schema as SchemaObject
          );
        }
      }
    }
  }

  return requestSchemas;
}

export async function generate(options: GenerationOptions): Promise<void> {
  const { input, output, generateClient: genClient } = options;

  await fs.mkdir(output, { recursive: true });

  // Parse the OpenAPI document first
  let openApiDoc = await parseOpenAPI(input);

  // Pre-process: Resolve external $ref pointers using json-schema-ref-parser
  // Only resolve external references, keep internal references intact
  try {
    openApiDoc = await $RefParser.bundle(openApiDoc, {
      mutateInputSchema: false, // Don't modify the original
    });
    console.log("✅ Successfully resolved external $ref pointers");
  } catch (error) {
    console.warn("⚠️ Failed to resolve external $ref pointers:", error);
    // Continue with original document if dereferencing fails
  }

  if (openApiDoc.components?.schemas) {
    const schemasDir = path.join(output, "schemas");
    await fs.mkdir(schemasDir, { recursive: true });

    function isPlainSchemaObject(obj: any): obj is SchemaObject {
      // Must be a plain object, not a Zod object, and not null
      if (!obj || typeof obj !== "object") return false;
      if (typeof obj.safeParse === "function" || obj._def) return false; // Zod instance
      // Must have at least one OpenAPI schema property
      return (
        "type" in obj ||
        "allOf" in obj ||
        "anyOf" in obj ||
        "oneOf" in obj ||
        "properties" in obj ||
        "additionalProperties" in obj ||
        "array" in obj
      );
    }

    // Generate schemas from components/schemas
    for (const [name, schema] of Object.entries(
      openApiDoc.components.schemas
    )) {
      if (!isPlainSchemaObject(schema)) {
        console.warn(
          `⚠️ Skipping ${name}: not a plain OpenAPI schema object. Value:`,
          schema
        );
        continue;
      }

      const schemaVar = `${name}`;
      const schemaResult = zodSchemaToCode(schema);

      // Extract description from schema for comment
      const description = schema.description ? schema.description.trim() : null;

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
        .map(
          (importName) => `import { ${importName} } from "./${importName}.js";`
        )
        .join("\n");

      const importsSection = imports ? `${imports}\n` : "";
      const schemaContent = `${commentSection}export const ${schemaVar} = ${schemaResult.code};`;
      const typeContent = `export type ${schemaVar} = z.infer<typeof ${schemaVar}>;`;

      const filePath = path.join(schemasDir, `${name}.ts`);
      const formattedContent = await format(
        `import { z } from 'zod';\n${importsSection}\n${schemaContent}\n${typeContent}`,
        {
          parser: "typescript",
        }
      );
      await fs.writeFile(filePath, formattedContent);
    }

    // Generate request schemas from operations
    const requestSchemas = extractRequestSchemas(openApiDoc);
    for (const [name, schema] of requestSchemas) {
      const schemaVar = `${name}`;
      const schemaResult = zodSchemaToCode(schema);

      // Generate comment for request schema
      const commentSection = `/**\n * Request schema for ${name.replace("Request", "")} operation\n */\n`;

      // Generate imports for dependencies
      const imports = Array.from(schemaResult.imports)
        .filter((importName) => importName !== name) // Don't import self
        .map(
          (importName) => `import { ${importName} } from "./${importName}.js";`
        )
        .join("\n");

      const importsSection = imports ? `${imports}\n` : "";
      const schemaContent = `${commentSection}export const ${schemaVar} = ${schemaResult.code};`;
      const typeContent = `export type ${schemaVar} = z.infer<typeof ${schemaVar}>;`;

      const filePath = path.join(schemasDir, `${name}.ts`);
      const formattedContent = await format(
        `import { z } from 'zod';\n${importsSection}\n${schemaContent}\n${typeContent}`,
        {
          parser: "typescript",
        }
      );
      await fs.writeFile(filePath, formattedContent);
    }
  }

  if (genClient) {
    await generateOperations(openApiDoc, output);
  }

  const packageJsonContent = {
    name: "generated-client",
    version: "1.0.0",
    type: "module",
    dependencies: {
      zod: "^3.0.0",
    },
  };
  const packageJsonPath = path.join(output, "package.json");
  await fs.writeFile(
    packageJsonPath,
    JSON.stringify(packageJsonContent, null, 2)
  );
}

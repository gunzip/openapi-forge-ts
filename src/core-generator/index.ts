import { promises as fs } from "fs";
import path from "path";
import type {
  SchemaObject,
  OperationObject,
  RequestBodyObject,
  ResponseObject,
} from "openapi3-ts/oas31";
import { parseOpenAPI } from "./parser.js";
import {
  generateSchemaFile,
  generateRequestSchemaFile,
  generateResponseSchemaFile,
} from "../schema-generator/index.js";
import { generateOperations } from "../client-generator/index.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";
import $RefParser from "@apidevtools/json-schema-ref-parser";

/**
 * Configuration options for code generation
 *
 * @example
 * ```javascript
 * const options: GenerationOptions = {
 *   input: './openapi.yaml',
 *   output: './generated',
 *   generateClient: true
 * };
 * ```
 */
export interface GenerationOptions {
  input: string;
  output: string;
  generateClient: boolean;
}

/**
 * Extracts request schemas from operations for inline request body schemas
 *
 * @example
 * ```javascript
 * const openApiDoc = {
 *   paths: {
 *     '/users': {
 *       post: {
 *         operationId: 'createUser',
 *         requestBody: {
 *           content: {
 *             'application/json': {
 *               schema: {
 *                 type: 'object',
 *                 properties: { name: { type: 'string' } }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * };
 *
 * const schemas = extractRequestSchemas(openApiDoc);
 * // Result: Map with entry 'CreateUserRequest' -> schema object
 * ```
 */
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

        const supportedContentTypes = [
          "application/json",
          "multipart/form-data",
          "application/x-www-form-urlencoded",
        ];

        for (const contentType of supportedContentTypes) {
          const content = requestBody.content?.[contentType];
          if (content?.schema && !content.schema["$ref"]) {
            // Only extract inline schemas, not $ref schemas
            const requestTypeName = `${sanitizeIdentifier(operationObj.operationId!)}Request`;
            requestSchemas.set(requestTypeName, content.schema as SchemaObject);
            break; // Only process the first matching content type
          }
        }
      }
    }
  }

  return requestSchemas;
}

/**
 * Extracts response schemas from operations for inline response schemas
 *
 * @example
 * ```javascript
 * const openApiDoc = {
 *   paths: {
 *     '/users/{id}': {
 *       get: {
 *         operationId: 'getUser',
 *         responses: {
 *           '200': {
 *             content: {
 *               'application/json': {
 *                 schema: {
 *                   type: 'object',
 *                   properties: { id: { type: 'string' }, name: { type: 'string' } }
 *                 }
 *               }
 *             }
 *           }
 *         }
 *       }
 *     }
 *   }
 * };
 *
 * const schemas = extractResponseSchemas(openApiDoc);
 * // Result: Map with entry 'GetUser200Response' -> schema object
 * ```
 */
function extractResponseSchemas(openApiDoc: any): Map<string, SchemaObject> {
  const responseSchemas = new Map<string, SchemaObject>();

  if (!openApiDoc.paths) {
    return responseSchemas;
  }

  for (const [, pathItem] of Object.entries(openApiDoc.paths)) {
    for (const [method, operation] of Object.entries(pathItem as any)) {
      if (
        ["get", "post", "put", "delete", "patch"].includes(method) &&
        (operation as OperationObject).operationId &&
        (operation as OperationObject).responses
      ) {
        const operationObj = operation as OperationObject;
        const operationId = operationObj.operationId!; // We already checked it exists above

        for (const [statusCode, response] of Object.entries(
          operationObj.responses!
        )) {
          if (statusCode === "default") continue;

          const responseObj = response as ResponseObject;
          if (!responseObj.content) continue;

          // Check for various content types
          const supportedContentTypes = [
            "application/json",
            "application/problem+json",
            "application/octet-stream",
            "multipart/form-data",
          ];

          for (const contentType of Object.keys(responseObj.content)) {
            if (
              supportedContentTypes.includes(contentType) ||
              contentType.includes("+json")
            ) {
              const content = responseObj.content[contentType];
              if (content?.schema && !content.schema["$ref"]) {
                // Only extract inline schemas, not $ref schemas
                const sanitizedOperationId = sanitizeIdentifier(operationId);
                const responseTypeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${statusCode}Response`;
                responseSchemas.set(
                  responseTypeName,
                  content.schema as SchemaObject
                );
              }
              break; // Only process the first matching content type
            }
          }
        }
      }
    }
  }

  return responseSchemas;
}

/**
 * Generates TypeScript schemas and optional API client from OpenAPI specification
 */
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

      const sanitizedName = sanitizeIdentifier(name);

      const description = schema.description
        ? schema.description.trim()
        : undefined;
      const schemaFile = await generateSchemaFile(
        sanitizedName,
        schema,
        description
      );
      const filePath = path.join(schemasDir, schemaFile.fileName);
      await fs.writeFile(filePath, schemaFile.content);
    }

    // Generate request schemas from operations
    const requestSchemas = extractRequestSchemas(openApiDoc);
    for (const [name, schema] of requestSchemas) {
      const schemaFile = await generateRequestSchemaFile(name, schema);
      const filePath = path.join(schemasDir, schemaFile.fileName);
      await fs.writeFile(filePath, schemaFile.content);
    }

    // Generate response schemas from operations
    const responseSchemas = extractResponseSchemas(openApiDoc);
    for (const [name, schema] of responseSchemas) {
      const schemaFile = await generateResponseSchemaFile(name, schema);
      const filePath = path.join(schemasDir, schemaFile.fileName);
      await fs.writeFile(filePath, schemaFile.content);
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

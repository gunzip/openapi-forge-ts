import type { OpenAPIObject } from "openapi3-ts/oas31";
import { extractAllOperations, extractBaseURL } from "./operation-extractor.js";
import { extractAuthHeaders } from "./security.js";
import { generateOperationFunction } from "./operation-function-generator.js";
import {
  createOperationsDirectory,
  writeOperationFile,
  writeConfigFile,
  writeIndexFile,
} from "./file-writer.js";

/**
 * Processes and writes operation files
 */
async function processOperations(
  doc: OpenAPIObject,
  operationsDir: string
): Promise<import("./types.js").OperationMetadata[]> {
  const operations = extractAllOperations(doc);

  for (const {
    pathKey,
    method,
    operation,
    pathLevelParameters,
    operationId,
  } of operations) {
    const { functionCode, typeImports } = generateOperationFunction(
      pathKey,
      method,
      operation,
      pathLevelParameters,
      doc
    );

    await writeOperationFile(
      operationId,
      functionCode,
      typeImports,
      operationsDir
    );
  }

  return operations;
}

/**
 * Generates individual operation files and configuration
 */
export async function generateOperations(
  doc: OpenAPIObject,
  outputDir: string
): Promise<void> {
  const operationsDir = await createOperationsDirectory(outputDir);

  // Extract auth headers for configuration types
  const authHeaders = extractAuthHeaders(doc);
  const baseURL = extractBaseURL(doc);

  // Process all operations and write files
  const operations = await processOperations(doc, operationsDir);

  // Write configuration file
  await writeConfigFile(authHeaders, baseURL, operationsDir);

  // Write index file that exports all operations
  await writeIndexFile(operations, operationsDir);
}

// Legacy function for backwards compatibility - now generates operations instead
export async function generateClient(doc: OpenAPIObject): Promise<string> {
  // This is now a dummy function that would need the output directory
  // The actual generation happens in generateOperations
  throw new Error("Use generateOperations instead of generateClient");
}

// Re-export key types and functions for external use
export type {
  OperationMetadata,
  ParameterGroups,
  RequestBodyTypeInfo,
  SecurityHeader,
} from "./types.js";

export { extractAllOperations, extractBaseURL } from "./operation-extractor.js";

export { extractAuthHeaders } from "./security.js";

export { generateOperationFunction } from "./operation-function-generator.js";

export { toCamelCase, toValidVariableName } from "./utils.js";

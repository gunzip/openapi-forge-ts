import { promises as fs } from "fs";
import path from "path";
import {
  writeFormattedFile,
  buildOperationFileContent,
} from "../core-generator/file-writer.js";
import { generateConfigTypes } from "./config-generator.js";
import type { OperationMetadata } from "./types.js";

/**
 * Writes a single operation file to disk
 */
export async function writeOperationFile(
  operationId: string,
  functionCode: string,
  typeImports: Set<string>,
  operationsDir: string
): Promise<void> {
  const operationContent = buildOperationFileContent(typeImports, functionCode);
  const operationPath = path.join(operationsDir, `${operationId}.ts`);
  await writeFormattedFile(operationPath, operationContent);
}

/**
 * Writes the configuration file
 */
export async function writeConfigFile(
  authHeaders: string[],
  baseURL: string,
  operationsDir: string
): Promise<void> {
  const configContent = generateConfigTypes(authHeaders, baseURL);
  const configPath = path.join(operationsDir, "config.ts");
  await writeFormattedFile(configPath, configContent);
}

/**
 * Writes the index file that exports all operations
 */
export async function writeIndexFile(
  operations: OperationMetadata[],
  operationsDir: string
): Promise<void> {
  const operationImports: string[] = [];
  const operationExports: string[] = [];

  for (const { operationId } of operations) {
    operationImports.push(
      `import { ${operationId} } from './${operationId}.js';`
    );
    operationExports.push(operationId);
  }

  const indexContent = `${operationImports.join("\n")}

export {
  ${operationExports.join(",\n  ")},
};`;
  const indexPath = path.join(operationsDir, "index.ts");
  await writeFormattedFile(indexPath, indexContent);
}

/**
 * Creates the operations directory if it doesn't exist
 */
export async function createOperationsDirectory(
  outputDir: string
): Promise<string> {
  const operationsDir = path.join(outputDir, "operations");
  await fs.mkdir(operationsDir, { recursive: true });
  return operationsDir;
}

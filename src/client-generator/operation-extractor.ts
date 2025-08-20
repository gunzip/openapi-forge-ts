import type {
  OpenAPIObject,
  PathItemObject,
  ParameterObject,
} from "openapi3-ts/oas31";
import type { OperationMetadata } from "./types.js";

/**
 * Extracts base URL from the first server in OpenAPI spec
 */
export function extractBaseURL(doc: OpenAPIObject): string {
  if (doc.servers && doc.servers.length > 0) {
    return doc.servers[0].url || "";
  }
  return "";
}

/**
 * Extracts all operations from the OpenAPI document
 */
export function extractAllOperations(doc: OpenAPIObject): OperationMetadata[] {
  const operations: OperationMetadata[] = [];

  if (doc.paths) {
    for (const [pathKey, pathItem] of Object.entries(doc.paths)) {
      const pathItemObj = pathItem as PathItemObject;
      const pathLevelParameters = (pathItemObj.parameters ||
        []) as ParameterObject[];

      for (const [method, operation] of Object.entries(pathItemObj)) {
        if (
          ["get", "post", "put", "delete", "patch"].includes(method) &&
          (operation as any).operationId
        ) {
          operations.push({
            pathKey,
            method,
            operation: operation as any,
            pathLevelParameters,
            operationId: (operation as any).operationId!,
          });
        }
      }
    }
  }

  return operations;
}

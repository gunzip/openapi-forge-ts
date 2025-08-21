import type {
  OpenAPIObject,
  PathItemObject,
  ParameterObject,
  OperationObject,
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

      // Define the HTTP methods we support with their corresponding operations
      const httpMethods: Array<{
        method: string;
        operation: OperationObject | undefined;
      }> = [
        { method: "get", operation: pathItemObj.get },
        { method: "post", operation: pathItemObj.post },
        { method: "put", operation: pathItemObj.put },
        { method: "delete", operation: pathItemObj.delete },
        { method: "patch", operation: pathItemObj.patch },
      ];

      for (const { method, operation } of httpMethods) {
        if (operation && operation.operationId) {
          const operationId = operation.operationId;

          // Skip operations that result in empty sanitized IDs
          operations.push({
            pathKey,
            method,
            operation,
            pathLevelParameters,
            operationId,
          });
        }
      }
    }
  }

  return operations;
}

import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  RequestBodyObject,
} from "openapi3-ts/oas31";
import { extractParameterGroups } from "./parameters.js";
import {
  buildParameterInterface,
  buildDestructuredParameters,
} from "./parameters.js";
import { generateResponseHandlers } from "./responses.js";
import { resolveRequestBodyType } from "./request-body.js";
import {
  getOperationSecuritySchemes,
  hasSecurityOverride,
  extractAuthHeaders,
} from "./security.js";
import { generateFunctionBody } from "./code-generation.js";
import { sanitizeIdentifier } from "../schema-generator/utils.js";
import type { GeneratedFunction } from "./types.js";

/**
 * Generates a single operation function
 * Returns: { functionCode: string, typeImports: Set<string> }
 */
export function generateOperationFunction(
  pathKey: string,
  method: string,
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | { $ref: string })[] = [],
  doc: OpenAPIObject
): GeneratedFunction {
  const functionName: string = sanitizeIdentifier(operation.operationId!);

  const summary = operation.summary ? `/** ${operation.summary} */\n` : "";
  const typeImports = new Set<string>();

  // Extract parameter groups
  const parameterGroups = extractParameterGroups(
    operation,
    pathLevelParameters,
    doc
  );
  const hasBody = !!operation.requestBody;

  // Get operation-specific security headers
  const operationSecurityHeaders = getOperationSecuritySchemes(operation, doc);

  // Build parameter interface
  let bodyTypeInfo;
  let requestContentType: string | undefined;

  if (hasBody) {
    const requestBody = operation.requestBody as RequestBodyObject;
    bodyTypeInfo = resolveRequestBodyType(requestBody, functionName, doc);
    requestContentType = bodyTypeInfo.contentType;
    bodyTypeInfo.typeImports.forEach((imp) => typeImports.add(imp));
  }

  // Build parameter interface for types
  const paramsInterface = buildParameterInterface(
    parameterGroups,
    hasBody,
    bodyTypeInfo,
    operationSecurityHeaders
  );

  // Build destructured parameters for function signature
  const destructuredParams = buildDestructuredParameters(
    parameterGroups,
    hasBody,
    bodyTypeInfo,
    operationSecurityHeaders
  );

  // Generate response handlers and return type
  const { returnType, responseHandlers } = generateResponseHandlers(
    operation,
    typeImports
  );

  // Check if operation overrides security (empty or specific schemes)
  const overridesSecurity = hasSecurityOverride(operation);
  const authHeaders = extractAuthHeaders(doc);

  // Generate function body with content type information
  const functionBodyCode = generateFunctionBody(
    pathKey,
    method,
    parameterGroups,
    hasBody,
    responseHandlers,
    requestContentType,
    operationSecurityHeaders,
    overridesSecurity,
    authHeaders
  );

  // Handle empty parameters case - use simple destructuring with default
  let parameterDeclaration;

  if (destructuredParams === "{}" && paramsInterface === "{}") {
    // For functions with no parameters, use simple empty object destructuring with default
    parameterDeclaration = "{}: {} = {}";
  } else {
    parameterDeclaration = `${destructuredParams}: ${paramsInterface}`;
  }

  const functionStr = `${summary}export async function ${functionName}(
  ${parameterDeclaration},
  config: GlobalConfig = globalConfig
): Promise<${returnType}> {
  ${functionBodyCode}
}`;

  return { functionCode: functionStr, typeImports };
}

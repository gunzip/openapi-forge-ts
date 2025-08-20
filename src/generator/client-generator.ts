import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  PathItemObject,
  RequestBodyObject,
  ResponseObject,
  SecuritySchemeObject,
} from "openapi3-ts/oas31";
import { format } from "prettier";
import { promises as fs } from "fs";
import path from "path";
import {
  writeFormattedFile,
  ensureDirectory,
  buildOperationFileContent,
} from "./file-writer.js";

// Helper function to convert kebab-case to camelCase
function toCamelCase(str: string): string {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

// Helper function to resolve parameter references
function resolveParameterReference(
  param: ParameterObject | { $ref: string },
  doc: OpenAPIObject
): ParameterObject {
  if ("$ref" in param && param.$ref) {
    const refPath = param.$ref.replace("#/", "").split("/");
    let resolved = doc as any;
    for (const segment of refPath) {
      resolved = resolved[segment];
    }
    return resolved as ParameterObject;
  }
  return param as ParameterObject;
}

// Type definitions for better structure
interface OperationMetadata {
  pathKey: string;
  method: string;
  operation: OperationObject;
  pathLevelParameters: ParameterObject[];
  operationId: string;
}

interface ParameterGroups {
  pathParams: ParameterObject[];
  queryParams: ParameterObject[];
  headerParams: ParameterObject[];
}

interface ResponseTypeInfo {
  typeName: string | null;
  typeImports: Set<string>;
  responseHandlers: string[];
}

interface RequestBodyTypeInfo {
  typeName: string | null;
  isRequired: boolean;
  typeImports: Set<string>;
  contentType: string;
}

interface ParameterInterfaceResult {
  interfaceCode: string;
  hasParameters: boolean;
}

/**
 * Extracts and groups parameters from operation and path-level definitions
 */
function extractParameterGroups(
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | { $ref: string })[],
  doc: OpenAPIObject
): ParameterGroups {
  // Resolve parameter references and combine path-level and operation-level parameters
  const resolvedPathLevelParams = pathLevelParameters.map((p) =>
    resolveParameterReference(p, doc)
  );
  const resolvedOperationParams = (operation.parameters || []).map((p) =>
    resolveParameterReference(p as ParameterObject | { $ref: string }, doc)
  );
  const allParameters = [
    ...resolvedPathLevelParams,
    ...resolvedOperationParams,
  ];

  return {
    pathParams: allParameters.filter(
      (p) => p.in === "path"
    ) as ParameterObject[],
    queryParams: allParameters.filter(
      (p) => p.in === "query"
    ) as ParameterObject[],
    headerParams: allParameters.filter(
      (p) => p.in === "header"
    ) as ParameterObject[],
  };
}

/**
 * Builds the parameter interface string for a function
 */
function buildParameterInterface(
  parameterGroups: ParameterGroups,
  hasBody: boolean,
  bodyTypeInfo?: RequestBodyTypeInfo
): string {
  const { pathParams, queryParams, headerParams } = parameterGroups;
  const parameterProperties: string[] = [];

  // Path parameters (always required)
  for (const param of pathParams) {
    parameterProperties.push(`${toCamelCase(param.name)}: string`);
  }

  // Query parameters
  for (const param of queryParams) {
    const isRequired = param.required === true;
    parameterProperties.push(
      `${toCamelCase(param.name)}${isRequired ? "" : "?"}: string`
    );
  }

  // Header parameters
  for (const param of headerParams) {
    const isRequired = param.required === true;
    parameterProperties.push(
      `${toCamelCase(param.name)}${isRequired ? "" : "?"}: string`
    );
  }

  // Body parameter
  if (hasBody && bodyTypeInfo) {
    if (bodyTypeInfo.typeName) {
      parameterProperties.push(
        `body${bodyTypeInfo.isRequired ? "" : "?"}: ${bodyTypeInfo.typeName}`
      );
    } else {
      parameterProperties.push(`body?: any`);
    }
  }

  return parameterProperties.length > 0
    ? `params: {\n    ${parameterProperties.join(";\n    ")};\n  }`
    : "params?: {}";
}

/**
 * Generates URL path with parameter interpolation
 */
function generatePathInterpolation(
  pathKey: string,
  pathParams: ParameterObject[]
): string {
  let finalPath = pathKey;
  for (const param of pathParams) {
    finalPath = finalPath.replace(
      `{${param.name}}`,
      `\${params.${toCamelCase(param.name)}}`
    );
  }
  return finalPath;
}

/**
 * Generates query parameter handling code
 */
function generateQueryParamHandling(queryParams: ParameterObject[]): string {
  return queryParams
    .map(
      (p) =>
        `if (params.${toCamelCase(p.name)} !== undefined) url.searchParams.append('${p.name}', String(params.${toCamelCase(p.name)}));`
    )
    .join("\n    ");
}

/**
 * Generates header parameter handling code
 */
function generateHeaderParamHandling(headerParams: ParameterObject[]): string {
  return headerParams
    .map(
      (p) =>
        `if (params.${toCamelCase(p.name)} !== undefined) finalHeaders['${p.name}'] = String(params.${toCamelCase(p.name)});`
    )
    .join("\n    ");
}

/**
 * Determines if a response content type should be parsed as JSON
 */
function getResponseContentType(response: ResponseObject): string | null {
  if (!response.content) return null;

  // Check for JSON content types in order of preference
  const jsonTypes = ["application/json", "application/problem+json"];
  for (const type of jsonTypes) {
    if (response.content[type]) return type;
  }

  // Check for other JSON-like content types
  for (const [contentType] of Object.entries(response.content)) {
    if (contentType.includes("+json")) return contentType;
  }

  // Return the first content type if no JSON found
  const contentTypes = Object.keys(response.content);
  return contentTypes.length > 0 ? contentTypes[0] : null;
}

/**
 * Generates response handling code and determines return type using discriminated unions
 */
function generateResponseHandlers(
  operation: OperationObject,
  typeImports: Set<string>
): { returnType: string; responseHandlers: string[] } {
  const responseHandlers: string[] = [];
  const unionTypes: string[] = [];

  if (operation.responses) {
    // Sort all response codes (both success and error)
    const responseCodes = Object.keys(operation.responses).filter(
      (code) => code !== "default"
    );
    responseCodes.sort((a, b) => parseInt(a) - parseInt(b));

    for (const code of responseCodes) {
      const response = operation.responses[code] as ResponseObject;
      const contentType = getResponseContentType(response);

      let typeName: string | null = null;
      let parseCode = "undefined";

      if (contentType && response.content?.[contentType]?.schema) {
        const schema = response.content[contentType].schema;

        if (schema["$ref"]) {
          // Use referenced schema
          typeName = schema["$ref"].split("/").pop()!;
          typeImports.add(typeName);

          if (contentType.includes("json")) {
            parseCode = `${typeName}.parse(await parseResponseBody(response))`;
          } else {
            parseCode = `await parseResponseBody(response) as ${typeName}`;
          }
        } else {
          // Use generated response schema for inline schemas
          const operationId = operation.operationId!;
          const responseTypeName = `${operationId.charAt(0).toUpperCase() + operationId.slice(1)}${code}Response`;
          typeName = responseTypeName;
          typeImports.add(typeName);

          if (contentType.includes("json")) {
            parseCode = `${typeName}.parse(await parseResponseBody(response))`;
          } else {
            parseCode = `await parseResponseBody(response) as ${typeName}`;
          }
        }
      }

      // Build the discriminated union type
      const dataType = typeName || (contentType ? "unknown" : "void");
      unionTypes.push(`ApiResponse<${code}, ${dataType}>`);

      // Generate the response handler with status as const to help with discrimination
      if (typeName || contentType) {
        responseHandlers.push(`    case ${code}: {
      const data = ${parseCode};
      return { status: ${code} as const, data, response };
    }`);
      } else {
        responseHandlers.push(`    case ${code}:
      return { status: ${code} as const, data: undefined, response };`);
      }
    }
  }

  // Don't add a catch-all to the union type to ensure proper narrowing
  const returnType =
    unionTypes.length > 0
      ? unionTypes.join(" | ")
      : "ApiResponse<number, unknown>";

  return { returnType, responseHandlers };
}

/**
 * Extracts the request body content type from the OpenAPI spec
 *
 * NOTE: Currently, we only support a single content type per request body.
 * If multiple content types are specified in the OpenAPI spec, we select
 * one based on priority order. This is a known limitation.
 *
 * @param requestBody - The OpenAPI request body object
 * @returns The selected content type string
 */
function getRequestBodyContentType(requestBody: RequestBodyObject): string {
  if (!requestBody.content) {
    return "application/json"; // fallback default
  }

  // LIMITATION: We don't support multiple content types for the same request.
  // We prioritize common content types and select the first available one.
  const preferredTypes = [
    "application/json",
    "application/x-www-form-urlencoded",
    "multipart/form-data",
    "text/plain",
    "application/xml",
    "application/octet-stream",
  ];

  // Check if any of the preferred types are available
  for (const type of preferredTypes) {
    if (requestBody.content[type]) {
      return type;
    }
  }

  // Return the first available content type
  const availableTypes = Object.keys(requestBody.content);
  return availableTypes[0] || "application/json";
}

/**
 * Resolves request body schema and extracts type information
 */
function resolveRequestBodyType(
  requestBody: RequestBodyObject,
  operationId: string,
  doc: OpenAPIObject
): {
  typeName: string | null;
  isRequired: boolean;
  typeImports: Set<string>;
  contentType: string;
} {
  // Check if request body is required (default is false)
  const isRequired = requestBody.required === true;
  const contentType = getRequestBodyContentType(requestBody);

  // Look for the determined content type
  const content = requestBody.content?.[contentType];
  if (!content?.schema) {
    return {
      typeName: null,
      isRequired,
      typeImports: new Set<string>(),
      contentType,
    };
  }

  const schema = content.schema;

  // If it's a reference to a schema, use that as the type name
  if (schema["$ref"]) {
    const typeName = schema["$ref"].split("/").pop();
    return {
      typeName: typeName || null,
      isRequired,
      typeImports: new Set([typeName || ""]),
      contentType,
    };
  }

  // For inline schemas, use the pre-generated request schema
  // The request schema will be generated as {operationId}Request in the main generator
  const requestTypeName = `${operationId.charAt(0).toUpperCase() + operationId.slice(1)}Request`;
  return {
    typeName: requestTypeName,
    isRequired,
    typeImports: new Set([requestTypeName]),
    contentType,
  };
}

/**
 * Extracts auth header names from security schemes
 */
function extractAuthHeaders(doc: OpenAPIObject): string[] {
  const authHeaders: string[] = [];

  if (doc.components?.securitySchemes) {
    for (const [name, scheme] of Object.entries(
      doc.components.securitySchemes
    )) {
      const securityScheme = scheme as SecuritySchemeObject;
      if (
        securityScheme.type === "apiKey" &&
        securityScheme.in === "header" &&
        securityScheme.name
      ) {
        authHeaders.push(securityScheme.name);
      } else if (
        securityScheme.type === "http" &&
        securityScheme.scheme === "bearer"
      ) {
        authHeaders.push("Authorization");
      }
    }
  }

  return [...new Set(authHeaders)]; // Remove duplicates
}

/**
 * Extracts base URL from the first server in OpenAPI spec
 */
function extractBaseURL(doc: OpenAPIObject): string {
  if (doc.servers && doc.servers.length > 0) {
    return doc.servers[0].url || "";
  }
  return "";
}

/**
 * Extracts all operations from the OpenAPI document
 */
function extractAllOperations(doc: OpenAPIObject): OperationMetadata[] {
  const operations: OperationMetadata[] = [];

  if (doc.paths) {
    for (const [pathKey, pathItem] of Object.entries(doc.paths)) {
      const pathItemObj = pathItem as PathItemObject;
      const pathLevelParameters = (pathItemObj.parameters ||
        []) as ParameterObject[];

      for (const [method, operation] of Object.entries(pathItemObj)) {
        if (
          ["get", "post", "put", "delete", "patch"].includes(method) &&
          (operation as OperationObject).operationId
        ) {
          operations.push({
            pathKey,
            method,
            operation: operation as OperationObject,
            pathLevelParameters,
            operationId: (operation as OperationObject).operationId!,
          });
        }
      }
    }
  }

  return operations;
}

/**
 * Generates the configuration file content
 */
function generateConfigFileContent(
  authHeaders: string[],
  baseURL: string
): string {
  return generateConfigTypes(authHeaders, baseURL);
}

/**
 * Generate configuration types
 */
function generateConfigTypes(authHeaders: string[], baseURL: string): string {
  const authHeadersType =
    authHeaders.length > 0
      ? authHeaders.map((h) => `'${h}'`).join(" | ")
      : "string";

  return `
// Configuration types
export interface GlobalConfig {
  baseURL: string;
  fetch: typeof fetch;
  headers: {
    [K in ${authHeaders.length > 0 ? `AuthHeaders` : "string"}]?: string;
  } & Record<string, string>;
}

${authHeaders.length > 0 ? `export type AuthHeaders = ${authHeadersType};` : ""}

// Default global configuration - immutable
export const globalConfig: GlobalConfig = {
  baseURL: '${baseURL}',
  fetch: fetch,
  headers: {}
};

/**
 * Represents a generic API response for the new discriminated union pattern.
 * @template S The HTTP status code.
 * @template T The response body type.
 */
export type ApiResponse<S extends number, T> = {
  readonly status: S;
  readonly data: T;
  readonly response: Response;
};

/**
 * Type guards for response status codes
 */
export function isSuccessResponse<T>(
  result: ApiResponse<number, any>
): result is ApiResponse<number, T> {
  return result.status >= 200 && result.status < 300;
}

export function isErrorResponse<T>(
  result: ApiResponse<number, any>
): result is ApiResponse<number, T> {
  return !isSuccessResponse(result);
}

/**
 * Error thrown when receiving an unexpected response status code
 */
export class UnexpectedResponseError extends Error {
  status: number;
  data: unknown;
  response: Response;
  
  constructor(status: number, data: unknown, response: Response) {
    super(\`Unexpected response status: \${status}\`);
    this.name = 'UnexpectedResponseError';
    this.status = status;
    this.data = data;
    this.response = response;
  }
}

/**
 * Type-safe status checking function
 * Only allows checking for status codes that exist in the given response union
 */
export function isStatus<
  TResponse extends ApiResponse<number, any>,
  S extends TResponse['status'],
  T extends Extract<TResponse, { status: S }>['data']
>(
  result: TResponse,
  status: S,
): result is Extract<TResponse, { status: S }> {
  return result.status === status;
}

/**
 * Utility function to handle response with exhaustive type checking
 */
export function handleResponse<T extends ApiResponse<number, any>>(
  result: T,
  handlers: {
    [K in T['status']]?: (data: Extract<T, { status: K }>['data']) => void;
  } & {
    default?: (result: T) => void;
  }
): void {
  const handler = handlers[result.status as keyof typeof handlers];
  if (handler) {
    (handler as any)(result.data);
  } else if (handlers.default) {
    handlers.default(result);
  }
}

/**
 * Helper function to parse response body based on content type
 */
export async function parseResponseBody(response: Response): Promise<unknown | Blob | FormData | ReadableStream | Response> {
  const contentType = response.headers.get('content-type') || '';

  // Handle JSON content types
  if (contentType.includes('application/json') || 
      contentType.includes('+json')) {
    return response.json().catch(() => null);
  }

  // Handle text content types
  if (contentType.includes('text/') || 
      contentType.includes('application/xml') ||
      contentType.includes('application/xhtml+xml')) {
    return response.text().catch(() => null);
  }
  
  // Handle binary file types that should be returned as Blob
  if (contentType.includes('image/') ||
      contentType.includes('video/') ||
      contentType.includes('audio/') ||
      contentType.includes('application/pdf') ||
      contentType.includes('application/zip') ||
      contentType.includes('application/x-zip-compressed') ||
      contentType.includes('application/octet-stream') ||
      contentType.includes('application/msword') ||
      contentType.includes('application/vnd.') ||
      contentType.includes('binary')) {
    return response.blob().catch(() => null);
  }
  
  // Handle form data
  if (contentType.includes('multipart/form-data')) {
    return response.formData().catch(() => null);
  }
  
  // Handle URL encoded data
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return response.text().catch(() => null);
  }
  
  // For very large responses or streaming, you might want to return the response itself
  // to let the caller decide how to handle it
  if (contentType.includes('application/octet-stream') && 
      parseInt(response.headers.get('content-length') || '0') > 10 * 1024 * 1024) {
    // For files larger than 10MB, return the response to allow streaming
    return response;
  }
  
  // Default to text for unknown content types
  return response.text().catch(() => null);
}

// ApiError class for backwards compatibility
export class ApiError extends Error {
  status: number;
  body: unknown;
  headers: Headers;
  constructor(status: number, body: unknown, headers: Headers) {
    super(\`API Error: \${status}\`);
    this.status = status;
    this.body = body;
    this.headers = headers;
  }
}

// Utility types for operation binding
type Operation = (params: any, config?: GlobalConfig) => Promise<any>;

// Bind all operations with a specific config
export function bindAllOperationsConfig<T extends Record<string, Operation>>(
  operations: T, 
  config: GlobalConfig
): {
  [K in keyof T]: (params: Parameters<T[K]>[0]) => ReturnType<T[K]>;
} {
  const bound: Partial<Record<keyof T, any>> = {};
  for (const key in operations) {
    if (typeof operations[key] === 'function') {
      bound[key] = (params: any) => operations[key](params, config);
    }
  }
  return bound as any;
}
`;
}

/**
 * Generates the function body for an operation with explicit exhaustive handling
 *
 * NOTE: This function currently supports only a single content type per request.
 * Multiple content types in the same request body are not supported. The content
 * type is determined by the getRequestBodyContentType function which selects
 * one content type based on priority order.
 */
function generateFunctionBody(
  pathKey: string,
  method: string,
  parameterGroups: ParameterGroups,
  hasBody: boolean,
  responseHandlers: string[],
  requestContentType?: string
): string {
  const { pathParams, queryParams, headerParams } = parameterGroups;

  const finalPath = generatePathInterpolation(pathKey, pathParams);
  const queryParamLines = generateQueryParamHandling(queryParams);
  const headerParamLines = generateHeaderParamHandling(headerParams);

  let bodyContent = "";
  let contentTypeHeader = "";

  if (hasBody && requestContentType) {
    // Handle different content types appropriately
    switch (requestContentType) {
      case "application/json":
        bodyContent = `    body: params.body ? JSON.stringify(params.body) : undefined,`;
        contentTypeHeader = `    "Content-Type": "application/json",`;
        break;

      case "application/x-www-form-urlencoded":
        bodyContent = `    body: params.body ? new URLSearchParams(params.body as Record<string, string>).toString() : undefined,`;
        contentTypeHeader = `    "Content-Type": "application/x-www-form-urlencoded",`;
        break;

      case "multipart/form-data":
        // For multipart/form-data, don't set Content-Type manually
        // The browser will set it automatically with the boundary
        bodyContent = `    body: params.body as FormData,`;
        // contentTypeHeader remains empty for multipart/form-data
        break;

      case "text/plain":
        bodyContent = `    body: typeof params.body === 'string' ? params.body : String(params.body),`;
        contentTypeHeader = `    "Content-Type": "text/plain",`;
        break;

      case "application/xml":
        bodyContent = `    body: typeof params.body === 'string' ? params.body : String(params.body),`;
        contentTypeHeader = `    "Content-Type": "application/xml",`;
        break;

      case "application/octet-stream":
        bodyContent = `    body: params.body,`;
        contentTypeHeader = `    "Content-Type": "application/octet-stream",`;
        break;

      default:
        // For unknown content types, try to handle as string or fall back to JSON
        bodyContent = `    body: typeof params.body === 'string' ? params.body : JSON.stringify(params.body),`;
        contentTypeHeader = `    "Content-Type": "${requestContentType}",`;
    }
  }

  return `  const finalHeaders = {
    ...config.headers,${contentTypeHeader}
  };
  ${headerParamLines ? `  ${headerParamLines}` : ""}

  const url = new URL(\`${finalPath}\`, config.baseURL);
  ${queryParamLines ? `  ${queryParamLines}` : ""}

  const response = await config.fetch(url.toString(), {
    method: "${method.toUpperCase()}",
    headers: finalHeaders,${
      bodyContent
        ? `
${bodyContent}`
        : ""
    }
  });

  switch (response.status) {
${responseHandlers.join("\n")}
    default: {
      // Throw UnexpectedResponseError for undefined status codes
      const data = await parseResponseBody(response);
      throw new UnexpectedResponseError(response.status, data, response);
    }
  }`;
}

/**
 * Generates a single operation function
 * Returns: { functionCode: string, typeImports: Set<string> }
 */
function generateOperationFunction(
  pathKey: string,
  method: string,
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | { $ref: string })[] = [],
  doc: OpenAPIObject
): { functionCode: string; typeImports: Set<string> } {
  const functionName = operation.operationId!;
  const summary = operation.summary ? `/** ${operation.summary} */\n` : "";
  const typeImports = new Set<string>();

  // Extract parameter groups
  const parameterGroups = extractParameterGroups(
    operation,
    pathLevelParameters,
    doc
  );
  const hasBody = !!operation.requestBody;

  // Build parameter interface
  let bodyTypeInfo: RequestBodyTypeInfo | undefined;
  let requestContentType: string | undefined;

  if (hasBody) {
    const requestBody = operation.requestBody as RequestBodyObject;
    bodyTypeInfo = resolveRequestBodyType(requestBody, functionName, doc);
    requestContentType = bodyTypeInfo.contentType;
    bodyTypeInfo.typeImports.forEach((imp) => typeImports.add(imp));
  }

  const paramsInterface = buildParameterInterface(
    parameterGroups,
    hasBody,
    bodyTypeInfo
  );

  // Generate response handlers and return type
  const { returnType, responseHandlers } = generateResponseHandlers(
    operation,
    typeImports
  );

  // Generate function body with content type information
  const functionBodyCode = generateFunctionBody(
    pathKey,
    method,
    parameterGroups,
    hasBody,
    responseHandlers,
    requestContentType
  );

  const functionStr = `${summary}export async function ${functionName}(
  ${paramsInterface},
  config: GlobalConfig = globalConfig
): Promise<${returnType}> {
  ${functionBodyCode}
}`;

  return { functionCode: functionStr, typeImports };
}

/**
 * Writes a single operation file to disk
 */
async function writeOperationFile(
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
async function writeConfigFile(
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
async function writeIndexFile(
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
 * Processes and writes operation files
 */
async function processOperations(
  doc: OpenAPIObject,
  operationsDir: string
): Promise<OperationMetadata[]> {
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
  const operationsDir = path.join(outputDir, "operations");
  await fs.mkdir(operationsDir, { recursive: true });

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

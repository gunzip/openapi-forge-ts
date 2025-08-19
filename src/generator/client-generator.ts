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

// Extract auth header names from security schemes
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

// Generate configuration types
function generateConfigTypes(authHeaders: string[]): string {
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
  baseURL: '',
  fetch: fetch,
  headers: {}
};

// ApiError class
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
`;
}

// Generates a single operation function
// Returns: { functionCode: string, typeImports: Set<string> }
function generateOperationFunction(
  pathKey: string,
  method: string,
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | { $ref: string })[] = [],
  doc: OpenAPIObject
): { functionCode: string; typeImports: Set<string> } {
  const functionName = operation.operationId!;
  const summary = operation.summary ? `/** ${operation.summary} */\n` : "";

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

  // Parameters
  const pathParams = allParameters.filter(
    (p) => p.in === "path"
  ) as ParameterObject[];
  const queryParams = allParameters.filter(
    (p) => p.in === "query"
  ) as ParameterObject[];
  const headerParams = allParameters.filter(
    (p) => p.in === "header"
  ) as ParameterObject[];
  const hasBody = !!operation.requestBody;

  // Build parameter interface
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
  if (hasBody) {
    parameterProperties.push(`body?: any`);
  }

  const paramsInterface =
    parameterProperties.length > 0
      ? `params: {\n    ${parameterProperties.join(";\n    ")};\n  }`
      : "params?: {}";

  // Path interpolation - use camelCase parameter names in the template string
  let finalPath = pathKey;
  for (const p of pathParams) {
    finalPath = finalPath.replace(
      `{${p.name}}`,
      `\${params.${toCamelCase(p.name)}}`
    );
  }

  // Query param appending - use camelCase parameter names but keep original names for URL
  const queryParamLines = queryParams
    .map(
      (p) =>
        `if (params.${toCamelCase(p.name)} !== undefined) url.searchParams.append('${p.name}', String(params.${toCamelCase(p.name)}));`
    )
    .join("\n    ");

  // Header param setting
  const headerParamLines = headerParams
    .map(
      (p) =>
        `if (params.${toCamelCase(p.name)} !== undefined) finalHeaders['${p.name}'] = String(params.${toCamelCase(p.name)});`
    )
    .join("\n    ");

  // Request body
  let bodyContent = "";
  if (hasBody) {
    bodyContent =
      "body: params.body ? JSON.stringify(params.body) : undefined,";
  }

  // Find all defined 2xx responses
  let returnType = "void";
  let typeName = null;
  const typeImports = new Set<string>();
  const responseHandlers: string[] = [];
  if (operation.responses) {
    const successCodes = Object.keys(operation.responses)
      .filter((code) => /^2\d\d$/.test(code))
      .sort((a, b) => parseInt(a) - parseInt(b));
    for (const code of successCodes) {
      const response = operation.responses[code] as ResponseObject;
      const responseSchema = response.content?.["application/json"]?.schema;
      if (responseSchema && responseSchema["$ref"]) {
        typeName = responseSchema["$ref"].split("/").pop()!;
        returnType = typeName;
        typeImports.add(typeName);
        responseHandlers.push(
          `if (response.status === ${code}) { const data = await response.json(); return ${typeName}.parse(data); }`
        );
      } else {
        // If no schema, just return void
        responseHandlers.push(`if (response.status === ${code}) { return; }`);
      }
    }
  }

  // If no 2xx responses, default to void
  if (!typeName && responseHandlers.length === 0) {
    responseHandlers.push(
      `if (response.status >= 200 && response.status < 300) { return; }`
    );
  }

  const functionStr = `${summary}export async function ${functionName}(
  ${paramsInterface},
  config: GlobalConfig = globalConfig
): Promise<${typeName ? typeName : "void"}> {
  const finalHeaders = { ...config.headers };
  ${headerParamLines ? headerParamLines : ""}
  
  const url = new URL(\`${finalPath}\`, config.baseURL);
  ${queryParamLines ? queryParamLines : ""}
  
  const response = await config.fetch(url.toString(), {
    method: '${method.toUpperCase()}',
    headers: finalHeaders,${
      bodyContent
        ? `
    ${bodyContent}`
        : ""
    }
  });

  if (!response.ok) {
    const responseBody = await response.json().catch(() => null);
    throw new ApiError(response.status, responseBody, response.headers);
  }

  ${responseHandlers.join("\n  ")}

  // throw for unexpected 2xx responses
  throw new ApiError(response.status, null, response.headers);
}`;
  return { functionCode: functionStr, typeImports };
}

// Generates individual operation files and configuration
export async function generateOperations(
  doc: OpenAPIObject,
  outputDir: string
): Promise<void> {
  const operationsDir = path.join(outputDir, "operations");
  await fs.mkdir(operationsDir, { recursive: true });

  // Extract auth headers for configuration types
  const authHeaders = extractAuthHeaders(doc);

  // Generate each operation as a separate file
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
          const { functionCode, typeImports } = generateOperationFunction(
            pathKey,
            method,
            operation as OperationObject,
            pathLevelParameters,
            doc
          );

          // Build imports for the operation file - import from index.js instead of config.js
          const importLines = [
            `import { globalConfig, GlobalConfig, ApiError } from './index.js';`,
            ...Array.from(typeImports).map(
              (type) => `import { ${type} } from '../schemas/${type}.js';`
            ),
          ];

          const operationContent = `${importLines.join("\n")}\n\n${functionCode}`;
          const operationPath = path.join(
            operationsDir,
            `${(operation as OperationObject).operationId}.ts`
          );
          const formattedOperationContent = await format(operationContent, {
            parser: "typescript",
          });
          await fs.writeFile(operationPath, formattedOperationContent);
        }
      }
    }
  }

  // Generate an index file that exports all operations AND contains configuration
  const operationImports: string[] = [];
  const operationExports: string[] = [];

  if (doc.paths) {
    for (const [pathKey, pathItem] of Object.entries(doc.paths)) {
      const pathItemObj = pathItem as PathItemObject;

      for (const [method, operation] of Object.entries(pathItemObj)) {
        if (
          ["get", "post", "put", "delete", "patch"].includes(method) &&
          (operation as OperationObject).operationId
        ) {
          const operationId = (operation as OperationObject).operationId!;
          operationImports.push(
            `import { ${operationId} } from './${operationId}.js';`
          );
          operationExports.push(operationId);
        }
      }
    }
  }

  // Generate config types content
  const configContent = generateConfigTypes(authHeaders);

  const indexContent = `${configContent}\n\n${operationImports.join("\n")}\n\nexport {\n  ${operationExports.join(",\n  ")}\n};`;
  const indexPath = path.join(operationsDir, "index.ts");
  const formattedIndexContent = await format(indexContent, {
    parser: "typescript",
  });
  await fs.writeFile(indexPath, formattedIndexContent);
}

// Legacy function for backwards compatibility - now generates operations instead
export async function generateClient(doc: OpenAPIObject): Promise<string> {
  // This is now a dummy function that would need the output directory
  // The actual generation happens in generateOperations
  throw new Error("Use generateOperations instead of generateClient");
}

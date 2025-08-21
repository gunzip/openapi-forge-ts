import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
} from "openapi3-ts/oas31";
import { isReferenceObject } from "openapi3-ts/oas31";
import { toCamelCase, toValidVariableName } from "./utils.js";
import type { SecurityHeader } from "./security.js";
import type { RequestBodyTypeInfo } from "./request-body.js";

/**
 * Grouped parameters by their location
 */
export interface ParameterGroups {
  pathParams: ParameterObject[];
  queryParams: ParameterObject[];
  headerParams: ParameterObject[];
}

/**
 * Processed parameter groups with security information
 */
export interface ProcessedParameterGroup {
  pathParams: ParameterObject[];
  queryParams: ParameterObject[];
  headerParams: ParameterObject[];
  securityHeaders: {
    schemeName: string;
    headerName: string;
    isRequired: boolean;
  }[];
  isQueryOptional: boolean;
  isHeadersOptional: boolean;
}

/**
 * Resolves parameter references to actual parameter objects
 */
export function resolveParameterReference(
  param: ParameterObject | ReferenceObject,
  doc: OpenAPIObject
): ParameterObject {
  if (isReferenceObject(param)) {
    const refPath = param.$ref.replace("#/", "").split("/");
    let resolved = doc as any;
    for (const segment of refPath) {
      resolved = resolved[segment];
    }
    return resolved as ParameterObject;
  }
  return param;
}

/**
 * Extracts and groups parameters from operation and path-level definitions
 */
export function extractParameterGroups(
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[],
  doc: OpenAPIObject
): ParameterGroups {
  // Resolve parameter references and combine path-level and operation-level parameters
  const resolvedPathLevelParams = pathLevelParameters.map((p) =>
    resolveParameterReference(p, doc)
  );
  const resolvedOperationParams = (operation.parameters || []).map((p) =>
    resolveParameterReference(p, doc)
  );
  const allParameters = [
    ...resolvedPathLevelParams,
    ...resolvedOperationParams,
  ];

  return {
    pathParams: allParameters.filter((p) => p.in === "path"),
    queryParams: allParameters.filter((p) => p.in === "query"),
    headerParams: allParameters.filter((p) => p.in === "header"),
  };
}

/**
 * Processes parameter groups and security headers, determining optionality
 */
export function processParameterGroups(
  parameterGroups: ParameterGroups,
  operationSecurityHeaders?: SecurityHeader[]
): ProcessedParameterGroup {
  const { pathParams, queryParams, headerParams } = parameterGroups;
  const securityHeaders = operationSecurityHeaders || [];

  // Determine if query section is optional (all query params are optional)
  const isQueryOptional = queryParams.every((p) => p.required !== true);

  // Determine if headers section is optional (all headers are optional)
  const isHeadersOptional =
    headerParams.every((p) => p.required !== true) &&
    securityHeaders.every((h) => !h.isRequired);

  return {
    pathParams,
    queryParams,
    headerParams,
    securityHeaders,
    isQueryOptional,
    isHeadersOptional,
  };
}

/**
 * Builds the destructured parameter signature for a function
 */
export function buildDestructuredParameters(
  parameterGroups: ParameterGroups,
  hasBody: boolean,
  bodyTypeInfo?: RequestBodyTypeInfo,
  operationSecurityHeaders?: SecurityHeader[]
): string {
  const processed = processParameterGroups(
    parameterGroups,
    operationSecurityHeaders
  );
  const destructureParams: string[] = [];

  // Path parameters
  if (processed.pathParams.length > 0) {
    const pathProperties = processed.pathParams.map((param) =>
      toCamelCase(param.name)
    );
    destructureParams.push(`path: { ${pathProperties.join(", ")} }`);
  }

  // Query parameters
  if (processed.queryParams.length > 0) {
    const queryProperties = processed.queryParams.map((param) =>
      toCamelCase(param.name)
    );
    const defaultValue = processed.isQueryOptional ? " = {}" : "";
    destructureParams.push(
      `query: { ${queryProperties.join(", ")} }${defaultValue}`
    );
  }

  // Header parameters (including operation-specific security headers)
  if (
    processed.headerParams.length > 0 ||
    processed.securityHeaders.length > 0
  ) {
    const headerProperties: string[] = [];

    // Regular header parameters - handle special characters in header names
    processed.headerParams.forEach((param) => {
      const varName = toValidVariableName(param.name);
      // If the header name contains special characters, use object property syntax
      if (param.name !== varName) {
        headerProperties.push(`"${param.name}": ${varName}`);
      } else {
        headerProperties.push(toCamelCase(param.name));
      }
    });

    // Operation-specific security headers - need to handle special characters
    processed.securityHeaders.forEach((securityHeader) => {
      const varName = toValidVariableName(securityHeader.headerName);
      headerProperties.push(`"${securityHeader.headerName}": ${varName}`);
    });

    const defaultValue = processed.isHeadersOptional ? " = {}" : "";
    destructureParams.push(
      `headers: { ${headerProperties.join(", ")} }${defaultValue}`
    );
  }

  // Body parameter
  if (hasBody && bodyTypeInfo) {
    const defaultValue = bodyTypeInfo.isRequired ? "" : " = undefined";
    destructureParams.push(`body${defaultValue}`);
  }

  return destructureParams.length > 0
    ? `{ ${destructureParams.join(", ")} }`
    : "{}";
}

/**
 * Builds the parameter interface for TypeScript type checking
 */
export function buildParameterInterface(
  parameterGroups: ParameterGroups,
  hasBody: boolean,
  bodyTypeInfo?: RequestBodyTypeInfo,
  operationSecurityHeaders?: SecurityHeader[]
): string {
  const processed = processParameterGroups(
    parameterGroups,
    operationSecurityHeaders
  );
  const sections: string[] = [];

  // Path parameters section (never optional if present)
  if (processed.pathParams.length > 0) {
    const pathProperties = processed.pathParams.map(
      (param) => `${toCamelCase(param.name)}: string`
    );
    sections.push(`path: {\n    ${pathProperties.join(";\n    ")};\n  }`);
  }

  // Query parameters section
  if (processed.queryParams.length > 0) {
    const queryProperties = processed.queryParams.map((param) => {
      const isRequired = param.required === true;
      return `${toCamelCase(param.name)}${isRequired ? "" : "?"}: string`;
    });
    const optionalMarker = processed.isQueryOptional ? "?" : "";
    sections.push(
      `query${optionalMarker}: {\n    ${queryProperties.join(";\n    ")};\n  }`
    );
  }

  // Header parameters section (including operation-specific security headers)
  if (
    processed.headerParams.length > 0 ||
    processed.securityHeaders.length > 0
  ) {
    const headerProperties: string[] = [];

    // Regular header parameters - handle special characters in header names
    processed.headerParams.forEach((param) => {
      const isRequired = param.required === true;
      const varName = toValidVariableName(param.name);
      // If the header name contains special characters, use quoted property syntax
      if (param.name !== varName) {
        headerProperties.push(
          `"${param.name}"${isRequired ? "" : "?"}: string`
        );
      } else {
        headerProperties.push(
          `${toCamelCase(param.name)}${isRequired ? "" : "?"}: string`
        );
      }
    });

    // Operation-specific security headers
    processed.securityHeaders.forEach((securityHeader) => {
      const requiredMarker = securityHeader.isRequired ? "" : "?";
      headerProperties.push(
        `"${securityHeader.headerName}"${requiredMarker}: string`
      );
    });

    const optionalMarker = processed.isHeadersOptional ? "?" : "";
    sections.push(
      `headers${optionalMarker}: {\n    ${headerProperties.join(";\n    ")};\n  }`
    );
  }

  // Body parameter
  if (hasBody && bodyTypeInfo) {
    const requiredMarker = bodyTypeInfo.isRequired ? "" : "?";
    const typeName = bodyTypeInfo.typeName || "any";
    sections.push(`body${requiredMarker}: ${typeName}`);
  }

  return sections.length > 0 ? `{\n  ${sections.join(";\n  ")};\n}` : "{}";
}

/**
 * Generates query parameter handling code
 */
export function generateQueryParamHandling(
  queryParams: ParameterObject[]
): string {
  if (queryParams.length === 0) return "";

  return queryParams
    .map((p) => {
      const varName = toCamelCase(p.name);
      return `if (${varName} !== undefined) url.searchParams.append('${p.name}', String(${varName}));`;
    })
    .join("\n    ");
}

/**
 * Generates header parameter handling code
 */
export function generateHeaderParamHandling(
  headerParams: ParameterObject[]
): string {
  if (headerParams.length === 0) return "";

  return headerParams
    .map((p) => {
      const varName = toValidVariableName(p.name);
      return `if (${varName} !== undefined) finalHeaders['${p.name}'] = String(${varName});`;
    })
    .join("\n    ");
}

import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
  ReferenceObject,
} from "openapi3-ts/oas31";

import { assert } from "console";
import { isReferenceObject } from "openapi3-ts/oas31";

import type {
  ParameterAnalysis,
  ParameterGroups,
  ParameterOptionalityRules,
  ParameterStructure,
  ProcessedParameterGroup,
} from "./models/parameter-models.js";
import type { RequestBodyTypeInfo } from "./request-body.js";
import type { SecurityHeader } from "./security.js";

import {
  renderDestructuredParameters,
  renderParameterHandling,
  renderParameterInterface,
} from "./templates/parameter-templates.js";
import { toCamelCase, toValidVariableName } from "./utils.js";

/* Re-export types for backward compatibility */
export type {
  ParameterGroups,
  ProcessedParameterGroup,
} from "./models/parameter-models.js";

/**
 * Analyzes parameters and creates structured data for template generation
 */
export function analyzeParameters(
  parameterGroups: ParameterGroups,
  hasBody: boolean,
  bodyTypeInfo?: RequestBodyTypeInfo,
  operationSecurityHeaders?: SecurityHeader[],
  hasRequestMap = false,
  hasResponseMap = false,
  requestMapTypeName?: string,
  responseMapTypeName?: string,
  unknownResponseMode?: boolean,
): ParameterAnalysis {
  const structure = determineParameterStructure(
    parameterGroups,
    hasBody,
    bodyTypeInfo,
    operationSecurityHeaders,
    hasRequestMap,
    hasResponseMap,
    requestMapTypeName,
    responseMapTypeName,
    unknownResponseMode,
  );

  const optionalityRules = determineParameterOptionalityRules(structure);

  /* Analyze path parameters */
  const pathProperties = structure.processed.pathParams.map((param) =>
    toCamelCase(param.name),
  );

  /* Analyze query parameters */
  const queryProperties = structure.processed.queryParams.map((param) => ({
    isRequired: param.required === true,
    name: toCamelCase(param.name),
  }));

  /* Analyze header parameters */
  const headerProperties = structure.processed.headerParams.map((param) => {
    const varName = toValidVariableName(param.name);
    return {
      isRequired: param.required === true,
      name: param.name !== varName ? param.name : toCamelCase(param.name),
      needsQuoting: param.name !== varName,
      varName,
    };
  });

  /* Analyze security headers */
  const securityHeaderProperties = structure.processed.securityHeaders.map(
    (securityHeader) => ({
      headerName: securityHeader.headerName,
      isRequired: securityHeader.isRequired,
      varName: toValidVariableName(securityHeader.headerName),
    }),
  );

  return {
    headerProperties,
    optionalityRules,
    pathProperties,
    queryProperties,
    securityHeaderProperties,
    structure,
  };
}

/**
 * Builds the destructured parameter signature for a function
 */
export function buildDestructuredParameters(
  parameterGroups: ParameterGroups,
  hasBody: boolean,
  bodyTypeInfo?: RequestBodyTypeInfo,
  operationSecurityHeaders?: SecurityHeader[],
  hasRequestMap = false,
  hasResponseMap = false,
): string {
  const analysis = analyzeParameters(
    parameterGroups,
    hasBody,
    bodyTypeInfo,
    operationSecurityHeaders,
    hasRequestMap,
    hasResponseMap,
  );

  return renderDestructuredParameters(analysis);
}

/**
 * Builds the parameter interface for TypeScript type checking
 */
export function buildParameterInterface(
  parameterGroups: ParameterGroups,
  hasBody: boolean,
  bodyTypeInfo?: RequestBodyTypeInfo,
  operationSecurityHeaders?: SecurityHeader[],
  requestMapTypeName?: string,
  responseMapTypeName?: string,
  unknownResponseMode?: boolean,
): string {
  const analysis = analyzeParameters(
    parameterGroups,
    hasBody,
    bodyTypeInfo,
    operationSecurityHeaders,
    !!requestMapTypeName,
    !!responseMapTypeName,
    requestMapTypeName,
    responseMapTypeName,
    unknownResponseMode,
  );

  return renderParameterInterface(analysis);
}

/**
 * Determines parameter optionality rules
 */
export function determineParameterOptionalityRules(
  structure: ParameterStructure,
): ParameterOptionalityRules {
  return {
    isBodyOptional: !structure.hasBody || !structure.bodyTypeInfo?.isRequired,
    isHeadersOptional: structure.processed.isHeadersOptional,
    isQueryOptional: structure.processed.isQueryOptional,
  };
}

/**
 * Determines parameter structure information for interface and destructuring generation
 */
export function determineParameterStructure(
  parameterGroups: ParameterGroups,
  hasBody: boolean,
  bodyTypeInfo?: RequestBodyTypeInfo,
  operationSecurityHeaders?: SecurityHeader[],
  hasRequestMap = false,
  hasResponseMap = false,
  requestMapTypeName?: string,
  responseMapTypeName?: string,
  unknownResponseMode?: boolean,
): ParameterStructure {
  const processed = processParameterGroups(
    parameterGroups,
    operationSecurityHeaders,
  );

  return {
    bodyTypeInfo,
    hasBody,
    hasRequestMap,
    hasResponseMap,
    processed,
    requestMapTypeName,
    responseMapTypeName,
    unknownResponseMode,
  };
}

/**
 * Extracts and groups parameters from operation and path-level definitions
 */
export function extractParameterGroups(
  operation: OperationObject,
  pathLevelParameters: (ParameterObject | ReferenceObject)[],
  doc: OpenAPIObject,
): ParameterGroups {
  // Resolve parameter references and combine path-level and operation-level parameters
  const resolvedPathLevelParams = pathLevelParameters.map((p) =>
    resolveParameterReference(p, doc),
  );
  const resolvedOperationParams = (operation.parameters || []).map((p) =>
    resolveParameterReference(p, doc),
  );
  const allParameters = [
    ...resolvedPathLevelParams,
    ...resolvedOperationParams,
  ];

  return {
    headerParams: allParameters.filter((p) => p.in === "header"),
    pathParams: allParameters.filter((p) => p.in === "path"),
    queryParams: allParameters.filter((p) => p.in === "query"),
  };
}

/**
 * Generates header parameter handling code
 */
export function generateHeaderParamHandling(
  headerParams: ParameterObject[],
): string {
  return renderParameterHandling("header", headerParams);
}

/**
 * Generates query parameter handling code
 */
export function generateQueryParamHandling(
  queryParams: ParameterObject[],
): string {
  return renderParameterHandling("query", queryParams);
}

/**
 * Processes parameter groups and security headers, determining optionality
 */
export function processParameterGroups(
  parameterGroups: ParameterGroups,
  operationSecurityHeaders?: SecurityHeader[],
): ProcessedParameterGroup {
  const { headerParams, pathParams, queryParams } = parameterGroups;
  const securityHeaders = operationSecurityHeaders || [];

  // Determine if query section is optional (all query params are optional)
  const isQueryOptional = queryParams.every((p) => p.required !== true);

  // Determine if headers section is optional (all headers are optional)
  const isHeadersOptional =
    headerParams.every((p) => p.required !== true) &&
    securityHeaders.every((h) => !h.isRequired);

  return {
    headerParams,
    isHeadersOptional,
    isQueryOptional,
    pathParams,
    queryParams,
    securityHeaders,
  };
}

/**
 * Resolves parameter references to actual parameter objects
 */
export function resolveParameterReference(
  param: ParameterObject | ReferenceObject,
  doc: OpenAPIObject,
): ParameterObject {
  if (isReferenceObject(param)) {
    const refPath = param.$ref.replace("#/", "").split("/");
    let resolved = doc as unknown;
    for (const segment of refPath) {
      assert(
        typeof resolved === "object" && resolved !== null,
        `Missing reference: ${segment}`,
      );
      resolved = (resolved as Record<string, unknown>)[segment];
    }
    return resolved as ParameterObject;
  }
  return param;
}

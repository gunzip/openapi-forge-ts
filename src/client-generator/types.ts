import type {
  OpenAPIObject,
  OperationObject,
  ParameterObject,
} from "openapi3-ts/oas31";

/**
 * Metadata for an OpenAPI operation
 */
export interface OperationMetadata {
  pathKey: string;
  method: string;
  operation: OperationObject;
  pathLevelParameters: ParameterObject[];
  operationId: string;
}

/**
 * Grouped parameters by their location
 */
export interface ParameterGroups {
  pathParams: ParameterObject[];
  queryParams: ParameterObject[];
  headerParams: ParameterObject[];
}

/**
 * Information about response types and handlers
 */
export interface ResponseTypeInfo {
  typeName: string | null;
  typeImports: Set<string>;
  responseHandlers: string[];
}

/**
 * Information about request body types
 */
export interface RequestBodyTypeInfo {
  typeName: string | null;
  isRequired: boolean;
  typeImports: Set<string>;
  contentType: string;
}

/**
 * Result of generating parameter interface code
 */
export interface ParameterInterfaceResult {
  interfaceCode: string;
  hasParameters: boolean;
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
 * Security header information for operations
 */
export interface SecurityHeader {
  schemeName: string;
  headerName: string;
  isRequired: boolean;
}

/**
 * Result of generating a function with imports
 */
export interface GeneratedFunction {
  functionCode: string;
  typeImports: Set<string>;
}

/**
 * Result of response handler generation
 */
export interface ResponseHandlerResult {
  returnType: string;
  responseHandlers: string[];
}

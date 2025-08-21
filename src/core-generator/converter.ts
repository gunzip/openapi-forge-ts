import type { OpenAPIObject as OpenAPIV3Document } from "openapi3-ts/oas30";
import type { OpenAPIObject as OpenAPIV3_1Document } from "openapi3-ts/oas31";
import type {
  PathItemObject as V3PathItemObject,
  OperationObject as V3OperationObject,
  ParameterObject as V3ParameterObject,
  RequestBodyObject as V3RequestBodyObject,
  ResponseObject as V3ResponseObject,
  MediaTypeObject as V3MediaTypeObject,
  SchemaObject as V3SchemaObject,
  ReferenceObject as V3ReferenceObject,
  ComponentsObject as V3ComponentsObject,
} from "openapi3-ts/oas30";
import type {
  PathItemObject as V31PathItemObject,
  OperationObject as V31OperationObject,
  ParameterObject as V31ParameterObject,
  RequestBodyObject as V31RequestBodyObject,
  ResponseObject as V31ResponseObject,
  MediaTypeObject as V31MediaTypeObject,
  SchemaObject as V31SchemaObject,
  ReferenceObject as V31ReferenceObject,
} from "openapi3-ts/oas31";
import { isReferenceObject as isV3ReferenceObject } from "openapi3-ts/oas30";
import { convertObj } from "swagger2openapi";

/**
 * Converts an OpenAPI 2.0 (Swagger) specification to OpenAPI 3.0 format
 */
export async function convertOpenAPI20to30(
  swagger20: any
): Promise<OpenAPIV3Document> {
  try {
    const result = await convertObj(swagger20, {
      patch: true,
      warnOnly: true,
      resolve: true,
      source: "input.yaml",
    });
    return result.openapi as OpenAPIV3Document;
  } catch (error) {
    throw new Error(
      `Failed to convert OpenAPI 2.0 to 3.0: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

/**
 * Converts an OpenAPI specification to 3.1 format, handling both 2.0 and 3.0 inputs
 */
export async function convertToOpenAPI31(
  openapi: any
): Promise<OpenAPIV3_1Document> {
  // If it's already 3.1, return as-is
  if (isOpenAPI31(openapi)) {
    return openapi as OpenAPIV3_1Document;
  }

  // If it's 2.0, first convert to 3.0, then to 3.1
  if (isOpenAPI20(openapi)) {
    const openapi30 = await convertOpenAPI20to30(openapi);
    return convertOpenAPI30to31(openapi30);
  }

  // If it's 3.0, convert directly to 3.1
  if (isOpenAPI30(openapi)) {
    return convertOpenAPI30to31(openapi as OpenAPIV3Document);
  }

  throw new Error(
    `Unsupported OpenAPI version: ${openapi.openapi || openapi.swagger || "unknown"}`
  );
}

/**
 * Converts an OpenAPI 3.0.x specification to OpenAPI 3.1.0 format
 */
export function convertOpenAPI30to31(
  openapi30: OpenAPIV3Document
): OpenAPIV3_1Document {
  const converted = JSON.parse(
    JSON.stringify(openapi30)
  ) as OpenAPIV3_1Document;

  // Update version
  converted.openapi = "3.1.0";

  // Convert components schemas
  if (openapi30.components?.schemas) {
    const convertedSchemas: Record<
      string,
      V31SchemaObject | V31ReferenceObject
    > = {};
    for (const [schemaName, schema] of Object.entries(
      openapi30.components.schemas
    )) {
      convertedSchemas[schemaName] = convertSchema(schema);
    }
    if (converted.components) {
      converted.components.schemas = convertedSchemas;
    }
  }

  // Convert path schemas (request/response bodies, parameters)
  const convertedPaths: Record<string, V31PathItemObject> = {};
  for (const [pathName, pathItem] of Object.entries(openapi30.paths)) {
    convertedPaths[pathName] = convertPathItem(pathItem);
  }
  converted.paths = convertedPaths;

  return converted;
}

/**
 * Recursively converts a schema object from 3.0 to 3.1 format
 */
function convertSchema(
  schema: V3SchemaObject | V3ReferenceObject
): V31SchemaObject | V31ReferenceObject {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  // Handle reference objects
  if (isV3ReferenceObject(schema)) {
    return schema;
  }

  const converted = { ...schema } as V31SchemaObject;

  // 1. Convert nullable to type arrays
  if (schema.nullable === true && schema.type) {
    delete (converted as any).nullable;
    if (Array.isArray(schema.type)) {
      if (!schema.type.includes("null")) {
        converted.type = [...schema.type, "null"];
      }
    } else {
      converted.type = [schema.type, "null"];
    }
  } else if (schema.nullable === false) {
    delete (converted as any).nullable;
  }

  // 2. Convert exclusiveMinimum/exclusiveMaximum from boolean to numeric
  if (typeof schema.exclusiveMinimum === "boolean") {
    if (schema.exclusiveMinimum && typeof schema.minimum === "number") {
      converted.exclusiveMinimum = schema.minimum;
      delete converted.minimum;
    } else {
      delete converted.exclusiveMinimum;
    }
  }

  if (typeof schema.exclusiveMaximum === "boolean") {
    if (schema.exclusiveMaximum && typeof schema.maximum === "number") {
      converted.exclusiveMaximum = schema.maximum;
      delete converted.maximum;
    } else {
      delete converted.exclusiveMaximum;
    }
  }

  // 3. Convert singular example to examples array
  if (schema.example !== undefined && schema.examples === undefined) {
    converted.examples = [schema.example];
    delete converted.example;
  }

  // 4. Convert format: binary/base64 to contentEncoding/contentMediaType
  if (schema.format === "binary") {
    delete converted.format;
    converted.contentMediaType = "application/octet-stream";
  } else if (schema.format === "base64") {
    delete converted.format;
    converted.contentEncoding = "base64";
  }

  // Recursively convert nested schemas
  if (schema.properties) {
    const convertedProperties: Record<
      string,
      V31SchemaObject | V31ReferenceObject
    > = {};
    for (const [propName, propSchema] of Object.entries(schema.properties)) {
      convertedProperties[propName] = convertSchema(propSchema);
    }
    converted.properties = convertedProperties;
  }

  if (schema.items) {
    converted.items = convertSchema(schema.items);
  }

  if (
    schema.additionalProperties &&
    typeof schema.additionalProperties === "object"
  ) {
    converted.additionalProperties = convertSchema(schema.additionalProperties);
  }

  if (schema.allOf) {
    converted.allOf = schema.allOf.map(convertSchema);
  }

  if (schema.anyOf) {
    converted.anyOf = schema.anyOf.map(convertSchema);
  }

  if (schema.oneOf) {
    converted.oneOf = schema.oneOf.map(convertSchema);
  }

  if (schema.not) {
    converted.not = convertSchema(schema.not);
  }

  return converted;
}

/**
 * Converts a path item from 3.0 to 3.1 format
 */
function convertPathItem(pathItem: V3PathItemObject): V31PathItemObject {
  if (!pathItem || typeof pathItem !== "object") {
    return pathItem as V31PathItemObject;
  }

  const converted = { ...pathItem } as V31PathItemObject;

  // Convert each operation
  const methods: Array<
    keyof Pick<
      V3PathItemObject,
      "get" | "post" | "put" | "patch" | "delete" | "head" | "options" | "trace"
    >
  > = ["get", "post", "put", "patch", "delete", "head", "options", "trace"];

  for (const method of methods) {
    if (pathItem[method]) {
      converted[method] = convertOperation(pathItem[method]!);
    }
  }

  // Convert parameters
  if (pathItem.parameters) {
    converted.parameters = pathItem.parameters.map(convertParameter);
  }

  return converted;
}

/**
 * Converts an operation from 3.0 to 3.1 format
 */
function convertOperation(operation: V3OperationObject): V31OperationObject {
  if (!operation || typeof operation !== "object") {
    return operation as V31OperationObject;
  }

  const converted = { ...operation } as V31OperationObject;

  // Convert parameters
  if (operation.parameters) {
    converted.parameters = operation.parameters.map(convertParameter);
  }

  // Convert request body
  if (operation.requestBody) {
    converted.requestBody = convertRequestBody(operation.requestBody);
  }

  // Convert responses
  if (operation.responses) {
    const convertedResponses: Record<
      string,
      V31ResponseObject | V31ReferenceObject
    > = {};
    for (const [statusCode, response] of Object.entries(operation.responses)) {
      if (statusCode === "default") {
        if (response) {
          convertedResponses[statusCode] = convertResponse(response);
        }
      } else {
        convertedResponses[statusCode] = convertResponse(response);
      }
    }
    converted.responses = convertedResponses;
  }

  return converted;
}

/**
 * Converts a parameter from 3.0 to 3.1 format
 */
function convertParameter(
  parameter: V3ParameterObject | V3ReferenceObject
): V31ParameterObject | V31ReferenceObject {
  if (!parameter || typeof parameter !== "object") {
    return parameter as V31ParameterObject | V31ReferenceObject;
  }

  if (isV3ReferenceObject(parameter)) {
    return parameter as V31ReferenceObject;
  }

  const converted = { ...parameter } as V31ParameterObject;

  if (parameter.schema) {
    converted.schema = convertSchema(parameter.schema);
  }

  return converted;
}

/**
 * Converts a request body from 3.0 to 3.1 format
 */
function convertRequestBody(
  requestBody: V3RequestBodyObject | V3ReferenceObject
): V31RequestBodyObject | V31ReferenceObject {
  if (!requestBody || typeof requestBody !== "object") {
    return requestBody as V31RequestBodyObject | V31ReferenceObject;
  }

  if (isV3ReferenceObject(requestBody)) {
    return requestBody as V31ReferenceObject;
  }

  const converted = { ...requestBody } as V31RequestBodyObject;

  if (requestBody.content) {
    const convertedContent: Record<string, V31MediaTypeObject> = {};
    for (const [mediaType, mediaTypeObject] of Object.entries(
      requestBody.content
    )) {
      convertedContent[mediaType] = convertMediaType(mediaTypeObject);
    }
    converted.content = convertedContent;
  }

  return converted;
}

/**
 * Converts a response from 3.0 to 3.1 format
 */
function convertResponse(
  response: V3ResponseObject | V3ReferenceObject
): V31ResponseObject | V31ReferenceObject {
  if (!response || typeof response !== "object") {
    return response as V31ResponseObject | V31ReferenceObject;
  }

  if (isV3ReferenceObject(response)) {
    return response as V31ReferenceObject;
  }

  const converted = { ...response } as V31ResponseObject;

  if (response.content) {
    const convertedContent: Record<string, V31MediaTypeObject> = {};
    for (const [mediaType, mediaTypeObject] of Object.entries(
      response.content
    )) {
      convertedContent[mediaType] = convertMediaType(mediaTypeObject);
    }
    converted.content = convertedContent;
  }

  return converted;
}

/**
 * Converts a media type object from 3.0 to 3.1 format
 */
function convertMediaType(
  mediaTypeObject: V3MediaTypeObject
): V31MediaTypeObject {
  if (!mediaTypeObject || typeof mediaTypeObject !== "object") {
    return mediaTypeObject as V31MediaTypeObject;
  }

  const converted = { ...mediaTypeObject } as V31MediaTypeObject;

  if (mediaTypeObject.schema) {
    converted.schema = convertSchema(mediaTypeObject.schema);
  }

  return converted;
}

/**
 * Checks if an OpenAPI document is version 2.0 (Swagger)
 */
export function isOpenAPI20(openapi: any): boolean {
  return (
    typeof openapi.swagger === "string" && openapi.swagger.startsWith("2.0")
  );
}

/**
 * Checks if an OpenAPI document is version 3.0.x
 */
export function isOpenAPI30(openapi: any): boolean {
  return (
    typeof openapi.openapi === "string" && openapi.openapi.startsWith("3.0")
  );
}

/**
 * Checks if an OpenAPI document is version 3.1.x
 */
export function isOpenAPI31(openapi: any): boolean {
  return (
    typeof openapi.openapi === "string" && openapi.openapi.startsWith("3.1")
  );
}

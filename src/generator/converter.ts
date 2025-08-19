import type { OpenAPIObject as OpenAPIV3Document } from "openapi3-ts/oas30";
import type { OpenAPIObject as OpenAPIV3_1Document } from "openapi3-ts/oas31";

/**
 * Converts an OpenAPI 3.0.x specification to OpenAPI 3.1.0 format
 */
export function convertOpenAPI30to31(
  openapi30: OpenAPIV3Document
): OpenAPIV3_1Document {
  const converted = JSON.parse(JSON.stringify(openapi30)) as any;

  // Update version
  converted.openapi = "3.1.0";

  // Convert components schemas
  if (converted.components?.schemas) {
    for (const [schemaName, schema] of Object.entries(
      converted.components.schemas
    )) {
      converted.components.schemas[schemaName] = convertSchema(schema as any);
    }
  }

  // Convert path schemas (request/response bodies, parameters)
  if (converted.paths) {
    for (const [pathName, pathItem] of Object.entries(converted.paths)) {
      converted.paths[pathName] = convertPathItem(pathItem as any);
    }
  }

  return converted as OpenAPIV3_1Document;
}

/**
 * Recursively converts a schema object from 3.0 to 3.1 format
 */
function convertSchema(schema: any): any {
  if (!schema || typeof schema !== "object") {
    return schema;
  }

  // Handle reference objects
  if (schema.$ref) {
    return schema;
  }

  const converted = { ...schema };

  // 1. Convert nullable to type arrays
  if (converted.nullable === true && converted.type) {
    delete converted.nullable;
    if (Array.isArray(converted.type)) {
      if (!converted.type.includes("null")) {
        converted.type.push("null");
      }
    } else {
      converted.type = [converted.type, "null"];
    }
  } else if (converted.nullable === false) {
    delete converted.nullable;
  }

  // 2. Convert exclusiveMinimum/exclusiveMaximum from boolean to numeric
  if (typeof converted.exclusiveMinimum === "boolean") {
    if (converted.exclusiveMinimum && typeof converted.minimum === "number") {
      converted.exclusiveMinimum = converted.minimum;
      delete converted.minimum;
    } else {
      delete converted.exclusiveMinimum;
    }
  }

  if (typeof converted.exclusiveMaximum === "boolean") {
    if (converted.exclusiveMaximum && typeof converted.maximum === "number") {
      converted.exclusiveMaximum = converted.maximum;
      delete converted.maximum;
    } else {
      delete converted.exclusiveMaximum;
    }
  }

  // 3. Convert singular example to examples array
  if (converted.example !== undefined && converted.examples === undefined) {
    converted.examples = [converted.example];
    delete converted.example;
  }

  // 4. Convert format: binary/base64 to contentEncoding/contentMediaType
  if (converted.format === "binary") {
    delete converted.format;
    converted.contentMediaType = "application/octet-stream";
  } else if (converted.format === "base64") {
    delete converted.format;
    converted.contentEncoding = "base64";
  }

  // Recursively convert nested schemas
  if (converted.properties) {
    for (const [propName, propSchema] of Object.entries(converted.properties)) {
      converted.properties[propName] = convertSchema(propSchema);
    }
  }

  if (converted.items) {
    converted.items = convertSchema(converted.items);
  }

  if (
    converted.additionalProperties &&
    typeof converted.additionalProperties === "object"
  ) {
    converted.additionalProperties = convertSchema(
      converted.additionalProperties
    );
  }

  if (converted.allOf) {
    converted.allOf = converted.allOf.map(convertSchema);
  }

  if (converted.anyOf) {
    converted.anyOf = converted.anyOf.map(convertSchema);
  }

  if (converted.oneOf) {
    converted.oneOf = converted.oneOf.map(convertSchema);
  }

  if (converted.not) {
    converted.not = convertSchema(converted.not);
  }

  return converted;
}

/**
 * Converts a path item from 3.0 to 3.1 format
 */
function convertPathItem(pathItem: any): any {
  if (!pathItem || typeof pathItem !== "object") {
    return pathItem;
  }

  const converted = { ...pathItem };

  // Convert each operation
  const methods = [
    "get",
    "post",
    "put",
    "patch",
    "delete",
    "head",
    "options",
    "trace",
  ];
  for (const method of methods) {
    if (converted[method]) {
      converted[method] = convertOperation(converted[method]);
    }
  }

  // Convert parameters
  if (converted.parameters) {
    converted.parameters = converted.parameters.map(convertParameter);
  }

  return converted;
}

/**
 * Converts an operation from 3.0 to 3.1 format
 */
function convertOperation(operation: any): any {
  if (!operation || typeof operation !== "object") {
    return operation;
  }

  const converted = { ...operation };

  // Convert parameters
  if (converted.parameters) {
    converted.parameters = converted.parameters.map(convertParameter);
  }

  // Convert request body
  if (converted.requestBody) {
    converted.requestBody = convertRequestBody(converted.requestBody);
  }

  // Convert responses
  if (converted.responses) {
    for (const [statusCode, response] of Object.entries(converted.responses)) {
      converted.responses[statusCode] = convertResponse(response as any);
    }
  }

  return converted;
}

/**
 * Converts a parameter from 3.0 to 3.1 format
 */
function convertParameter(parameter: any): any {
  if (!parameter || typeof parameter !== "object") {
    return parameter;
  }

  const converted = { ...parameter };

  if (converted.schema) {
    converted.schema = convertSchema(converted.schema);
  }

  return converted;
}

/**
 * Converts a request body from 3.0 to 3.1 format
 */
function convertRequestBody(requestBody: any): any {
  if (!requestBody || typeof requestBody !== "object") {
    return requestBody;
  }

  const converted = { ...requestBody };

  if (converted.content) {
    for (const [mediaType, mediaTypeObject] of Object.entries(
      converted.content
    )) {
      converted.content[mediaType] = convertMediaType(mediaTypeObject as any);
    }
  }

  return converted;
}

/**
 * Converts a response from 3.0 to 3.1 format
 */
function convertResponse(response: any): any {
  if (!response || typeof response !== "object") {
    return response;
  }

  const converted = { ...response };

  if (converted.content) {
    for (const [mediaType, mediaTypeObject] of Object.entries(
      converted.content
    )) {
      converted.content[mediaType] = convertMediaType(mediaTypeObject as any);
    }
  }

  return converted;
}

/**
 * Converts a media type object from 3.0 to 3.1 format
 */
function convertMediaType(mediaTypeObject: any): any {
  if (!mediaTypeObject || typeof mediaTypeObject !== "object") {
    return mediaTypeObject;
  }

  const converted = { ...mediaTypeObject };

  if (converted.schema) {
    converted.schema = convertSchema(converted.schema);
  }

  return converted;
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

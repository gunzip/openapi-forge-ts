/* Pure analysis functions for response processing */

import type { OperationObject, ResponseObject } from "openapi3-ts/oas31";

import assert from "assert";
import { isReferenceObject } from "openapi3-ts/oas31";

import type {
  ContentTypeAnalysis,
  ParsingStrategy,
  ResponseAnalysis,
  ResponseAnalysisConfig,
  ResponseInfo,
} from "./models/response-models.js";

import { sanitizeIdentifier } from "../schema-generator/utils.js";
import { getResponseContentType } from "./utils.js";

/*
 * Analyzes the content type structure of a response
 */
export function analyzeContentTypes(
  response: ResponseObject,
): ContentTypeAnalysis {
  const allContentTypes = Object.keys(response.content || {});

  const hasJsonLike = allContentTypes.some(
    (ct) => ct.includes("json") || ct.includes("+json"),
  );

  const hasNonJson = allContentTypes.some(
    (ct) => !ct.includes("json") && !ct.includes("+json"),
  );

  return {
    allContentTypes,
    hasJsonLike,
    hasMixedContentTypes: hasJsonLike && hasNonJson,
    hasNonJson,
  };
}

/*
 * Analyzes the complete response structure for an operation
 */
export function analyzeResponseStructure(
  config: ResponseAnalysisConfig,
): ResponseAnalysis {
  const {
    hasResponseContentTypeMap = false,
    operation,
    typeImports,
    unknownResponseMode = false,
  } = config;
  const responses: ResponseInfo[] = [];
  const unionTypes: string[] = [];

  if (operation.responses) {
    const responseCodes = Object.keys(operation.responses).filter(
      (code) => code !== "default",
    );
    responseCodes.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

    for (const code of responseCodes) {
      const response = operation.responses[code] as ResponseObject;

      const responseInfo = buildResponseTypeInfo(
        code,
        response,
        operation,
        typeImports,
        hasResponseContentTypeMap,
      );

      responses.push(responseInfo);

      /* Build union type component */
      if (responseInfo.hasSchema && responseInfo.typeName) {
        if (
          unknownResponseMode &&
          parseInt(code, 10) >= 200 &&
          parseInt(code, 10) < 300
        ) {
          /* Use unknown for success responses in unknown response mode */
          unionTypes.push(`ApiResponse<${code}, unknown>`);
        } else {
          unionTypes.push(`ApiResponse<${code}, ${responseInfo.typeName}>`);
        }
      } else {
        const dataType =
          responseInfo.typeName ||
          (responseInfo.contentType ? "unknown" : "void");
        unionTypes.push(`ApiResponse<${code}, ${dataType}>`);
      }
    }
  }

  return {
    defaultReturnType: "ApiResponse<number, unknown>",
    responses,
    unionTypes,
  };
}

/*
 * Builds response type information for a single response
 */
export function buildResponseTypeInfo(
  statusCode: string,
  response: ResponseObject,
  operation: OperationObject,
  typeImports: Set<string>,
  hasResponseContentTypeMap: boolean,
): ResponseInfo {
  const contentType = getResponseContentType(response);
  const contentTypeAnalysis = analyzeContentTypes(response);

  let typeName: null | string = null;
  let hasSchema = false;

  if (contentType && response.content?.[contentType]?.schema) {
    hasSchema = true;
    typeName = resolveResponseTypeName(
      response.content[contentType].schema,
      operation,
      statusCode,
      typeImports,
    );
  }

  const parsingStrategy = determineParsingStrategy(
    contentType || "",
    hasSchema,
    contentTypeAnalysis,
    hasResponseContentTypeMap,
  );

  return {
    contentType,
    hasSchema,
    parsingStrategy,
    statusCode,
    typeName,
  };
}

/*
 * Determines the parsing strategy for a response based on its content type and schema
 */
export function determineParsingStrategy(
  contentType: string,
  hasSchema: boolean,
  contentTypeAnalysis: ContentTypeAnalysis,
  hasResponseContentTypeMap: boolean,
): ParsingStrategy {
  const isJsonLike =
    contentType.includes("json") || contentType.includes("+json");
  const useValidation = hasSchema && isJsonLike;
  const requiresRuntimeContentTypeCheck =
    contentTypeAnalysis.hasMixedContentTypes && hasResponseContentTypeMap;

  return {
    isJsonLike,
    requiresRuntimeContentTypeCheck,
    useValidation,
  };
}

/*
 * Resolves a schema to a TypeScript type name and updates type imports
 */
export function resolveResponseTypeName(
  schema: unknown,
  operation: OperationObject,
  statusCode: string,
  typeImports: Set<string>,
): string {
  if (isReferenceObject(schema)) {
    const ref = schema.$ref;
    assert(
      ref.startsWith("#/components/schemas/"),
      `Unsupported schema reference: ${ref}`,
    );
    const originalSchemaName = ref.split("/").pop();
    assert(originalSchemaName, "Invalid $ref in response schema");
    const typeName = sanitizeIdentifier(originalSchemaName as string);
    typeImports.add(typeName);
    return typeName;
  }

  /* Inline schema: synthesize a type name based on operationId and status code */
  assert(operation.operationId, "Invalid operationId");
  const sanitizedOperationId = sanitizeIdentifier(operation.operationId);
  const typeName = `${sanitizedOperationId.charAt(0).toUpperCase() + sanitizedOperationId.slice(1)}${statusCode}Response`;
  typeImports.add(typeName);
  return typeName;
}

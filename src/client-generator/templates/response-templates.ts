/* Response-related template functions for TypeScript code generation */

import type { ResponseInfo } from "../models/response-models.js";

/* Import shared response union utilities */
export { renderUnionType } from "../../shared/response-union-generator.js";

/*
 * Renders an ApiResponse union type component for a response
 */
export function renderApiResponseType(
  statusCode: string,
  typeName: string,
): string {
  return `ApiResponse<${statusCode}, ${typeName}>`;
}

/*
 * Renders a parse expression for a response based on its parsing strategy
 */
export function renderParseExpression(
  responseInfo: ResponseInfo,
  config: {
    forceUnknownMode?: boolean;
    hasResponseContentTypeMap: boolean;
    statusCode: string;
    typeName: string;
  },
): string {
  const { forceUnknownMode = true, statusCode, typeName } = config;
  const { parsingStrategy } = responseInfo;

  if (!responseInfo.hasSchema) {
    return "const data = undefined;";
  }

  /* Force unknown mode - avoid automatic Zod validation */
  if (forceUnknownMode) {
    return "const data = await parseResponseBody(response) as unknown;";
  }

  /* The following code is currently unreachable as forceUnknownMode is always true */
  /* We keep this for future reference, since we may want to enable it using a config option */

  /* Handle mixed content types with runtime checking */
  if (
    parsingStrategy.requiresRuntimeContentTypeCheck &&
    config.hasResponseContentTypeMap
  ) {
    return `let data: ${typeName};
      if (finalResponseContentType.includes("json") || finalResponseContentType.includes("+json")) {
        const parseResult = ${typeName}.safeParse(await parseResponseBody(response));
        if (!parseResult.success) {
          return { status: ${statusCode} as const, error: parseResult.error, response };
        }
        data = parseResult.data;
      } else {
        data = await parseResponseBody(response) as ${typeName};
      }`;
  }

  /* Handle JSON-like content types with validation */
  if (parsingStrategy.isJsonLike && parsingStrategy.useValidation) {
    return `const parseResult = ${typeName}.safeParse(await parseResponseBody(response));
      if (!parseResult.success) {
        return { status: ${statusCode} as const, error: parseResult.error, response };
      }
      const data = parseResult.data;`;
  }

  /* Handle non-JSON content types without validation */
  return `const data = await parseResponseBody(response) as ${typeName};`;
}

/*
 * Renders a single response handler case for a switch statement
 */
export function renderResponseHandler(
  responseInfo: ResponseInfo,
  parseExpression: string,
  responseMapName?: string,
): string {
  const { contentType, statusCode, typeName } = responseInfo;

  if (typeName || contentType) {
    /* Ensure we actually declare data for unknown content type with no schema */
    let finalParseExpression = parseExpression;
    if (parseExpression === "undefined") {
      finalParseExpression = "const data = undefined; // data = undefined";
    }

    /*
     * The response body is consumed immediately to prevent holding onto the raw
     * response stream. A new, lightweight response object is created with only
     * the necessary properties, and headers are copied to a Map to break the
     * reference to the original response object.
     */
    const memoryOptimizedCode = `${finalParseExpression}
      const minimalResponse = {
        status: response.status,
        headers: new Map(response.headers.entries()),
      };`;

    const indentedParseCode = memoryOptimizedCode
      .split("\n")
      .map((l) => (l ? `      ${l}` : l))
      .join("\n");

    /* Add parse method if we have a schema and response map */
    /* If we have a response map, derive the per-operation deserializer map type name.
     * Convention: <OperationName>ResponseMap => <OperationName>DeserializerMap
     */
    const deserializerMapTypeName = responseMapName
      ? responseMapName.replace(/Map$/u, "DeserializerMap")
      : undefined;

    /* Use string-literal indexing for numeric HTTP status codes to preserve literal key types */
    /* Pass minimalResponse instead of response to prevent memory leaks */
    const parseMethod =
      responseInfo.hasSchema && responseMapName
        ? `,
        parse: (deserializerMap?: ${deserializerMapTypeName}) =>
          parseApiResponseUnknownData(minimalResponse, data, ${responseMapName}["${statusCode}"], deserializerMap as import("./config.js").DeserializerMap),`
        : "";

    return `    case ${statusCode}: {
${indentedParseCode}
      return { status: ${statusCode} as const, data, response${parseMethod} };
    }`;
  }

  return `    case ${statusCode}:
      return { status: ${statusCode} as const, data: undefined, response };`;
}

/*
 * Renders the complete response handlers array as switch-case statements
 */
export function renderResponseHandlers(
  responses: ResponseInfo[],
  responseMapName?: string,
): string[] {
  const handlers: string[] = [];

  for (const responseInfo of responses) {
    const parseExpression = renderParseExpression(responseInfo, {
      forceUnknownMode: true,
      hasResponseContentTypeMap:
        responseInfo.parsingStrategy.requiresRuntimeContentTypeCheck,
      statusCode: responseInfo.statusCode,
      typeName: responseInfo.typeName || "",
    });

    const handler = renderResponseHandler(
      responseInfo,
      parseExpression,
      responseMapName,
    );
    handlers.push(handler);
  }

  return handlers;
}

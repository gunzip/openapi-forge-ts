/* Response-related template functions for TypeScript code generation */

import type { ResponseInfo } from "../models/response-models.js";

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
    hasResponseContentTypeMap: boolean;
    statusCode: string;
    typeName: string;
    unknownResponseMode?: boolean;
  },
): string {
  const { statusCode, typeName, unknownResponseMode } = config;
  const { parsingStrategy } = responseInfo;

  if (!responseInfo.hasSchema) {
    return "const data = undefined;";
  }

  /* For unknown response mode, return unknown without validation */
  if (unknownResponseMode) {
    return "const data = await parseResponseBody(response);";
  }

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
  options?: {
    responseMapName?: string;
    unknownResponseMode?: boolean;
  },
): string {
  const { contentType, statusCode, typeName } = responseInfo;

  if (typeName || contentType) {
    /* Ensure we actually declare data for unknown content type with no schema */
    let finalParseExpression = parseExpression;
    if (parseExpression === "undefined") {
      finalParseExpression = "const data = undefined; // data = undefined";
    }

    const indentedParseCode = finalParseExpression
      .split("\n")
      .map((l) => (l ? `      ${l}` : l))
      .join("\n");

    /* Add parse method for unknown response mode */
    const parseMethod =
      options?.unknownResponseMode &&
      options?.responseMapName &&
      responseInfo.hasSchema
        ? `,
        parse: () =>
          parseApiResponseUnknownData(response, data, ${options.responseMapName}),`
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
  options?: {
    responseMapName?: string;
    unknownResponseMode?: boolean;
  },
): string[] {
  const handlers: string[] = [];

  for (const responseInfo of responses) {
    const parseExpression = renderParseExpression(responseInfo, {
      hasResponseContentTypeMap:
        responseInfo.parsingStrategy.requiresRuntimeContentTypeCheck,
      statusCode: responseInfo.statusCode,
      typeName: responseInfo.typeName || "",
      unknownResponseMode: options?.unknownResponseMode,
    });

    const handler = renderResponseHandler(
      responseInfo,
      parseExpression,
      options,
    );
    handlers.push(handler);
  }

  return handlers;
}

/*
 * Renders a TypeScript union type string from union type components
 */
export function renderUnionType(
  unionTypes: string[],
  defaultType = "ApiResponse<number, unknown>",
): string {
  return unionTypes.length > 0 ? unionTypes.join(" | ") : defaultType;
}

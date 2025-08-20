import type { ParameterObject } from "openapi3-ts/oas31";
import { generatePathInterpolation } from "./utils.js";
import {
  generateQueryParamHandling,
  generateHeaderParamHandling,
} from "./parameters.js";
import { generateSecurityHeaderHandling } from "./security.js";
import { generateRequestBodyHandling } from "./request-body.js";
import type { ParameterGroups, SecurityHeader } from "./types.js";

/**
 * Generates the function body for an operation with explicit exhaustive handling
 *
 * NOTE: This function currently supports only a single content type per request.
 * Multiple content types in the same request body are not supported. The content
 * type is determined by the getRequestBodyContentType function which selects
 * one content type based on priority order.
 */
export function generateFunctionBody(
  pathKey: string,
  method: string,
  parameterGroups: ParameterGroups,
  hasBody: boolean,
  responseHandlers: string[],
  requestContentType?: string,
  operationSecurityHeaders?: SecurityHeader[],
  overridesSecurity?: boolean,
  authHeaders?: string[]
): string {
  const { pathParams, queryParams, headerParams } = parameterGroups;

  const finalPath = generatePathInterpolation(pathKey, pathParams);
  const queryParamLines = generateQueryParamHandling(queryParams);
  const headerParamLines = generateHeaderParamHandling(headerParams);
  const securityHeaderLines =
    operationSecurityHeaders && operationSecurityHeaders.length > 0
      ? generateSecurityHeaderHandling(operationSecurityHeaders)
      : "";

  const { bodyContent, contentTypeHeader } = generateRequestBodyHandling(
    hasBody,
    requestContentType
  );

  return `  const finalHeaders = {
    ${
      overridesSecurity && authHeaders && authHeaders.length > 0
        ? `...Object.fromEntries(
      Object.entries(config.headers).filter(([key]) => 
        !['${authHeaders.join("', '")}'].includes(key)
      )
    ),`
        : "...config.headers,"
    }${contentTypeHeader}
  };
  ${headerParamLines ? `  ${headerParamLines}` : ""}${securityHeaderLines ? `  ${securityHeaderLines}` : ""}

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

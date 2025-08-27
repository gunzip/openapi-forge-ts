import { describe, expect, it } from "vitest";
import {
  generateResponseHandlers,
  type ResponseAnalysis,
} from "../../src/client-generator/responses.js";
import type { OperationObject } from "openapi3-ts/oas31";

describe("Memory leak prevention", () => {
  it("should create minimalResponse objects to prevent memory leaks", () => {
    const operation: OperationObject = {
      operationId: "testMemoryLeak",
      responses: {
        "200": {
          description: "Success",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/User",
              },
            },
          },
        },
      },
    };

    const typeImports = new Set<string>();
    const result = generateResponseHandlers(
      operation,
      typeImports,
      true,
      "TestMemoryLeakResponseMap",
    );

    /* Verify that minimalResponse is created */
    expect(result.responseHandlers[0]).toContain("const minimalResponse = {");
    expect(result.responseHandlers[0]).toContain("status: response.status,");
    expect(result.responseHandlers[0]).toContain(
      "headers: new Map(response.headers.entries()),",
    );

    /* Verify that minimalResponse is passed to parseApiResponseUnknownData instead of response */
    expect(result.responseHandlers[0]).toContain(
      "parseApiResponseUnknownData(minimalResponse, data,",
    );
    expect(result.responseHandlers[0]).not.toContain(
      "parseApiResponseUnknownData(response, data,",
    );

    /* Verify that original response is still available in the returned object */
    expect(result.responseHandlers[0]).toContain(
      "return { status: 200 as const, data, response,",
    );
  });

  it("should include memory optimization pattern", () => {
    const operation: OperationObject = {
      operationId: "testMemoryLeakComments",
      responses: {
        "201": {
          description: "Created",
          content: {
            "application/json": {
              schema: {
                $ref: "#/components/schemas/NewItem",
              },
            },
          },
        },
      },
    };

    const typeImports = new Set<string>();
    const result = generateResponseHandlers(
      operation,
      typeImports,
      true,
      "TestMemoryLeakCommentsResponseMap",
    );

    /* Verify that the memory optimization pattern is present */
    expect(result.responseHandlers[0]).toContain("const minimalResponse = {");
    expect(result.responseHandlers[0]).toContain(
      "new Map(response.headers.entries())",
    );
    expect(result.responseHandlers[0]).toContain(
      "parseApiResponseUnknownData(minimalResponse,",
    );
  });
});

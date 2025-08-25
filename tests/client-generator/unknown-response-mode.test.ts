/* Test for unknown response mode functionality */

import { describe, expect, it } from "vitest";

import { generateOperationFunction } from "../../src/client-generator/operation-function-generator.js";

describe("Unknown Response Mode", () => {
  const operation = {
    operationId: "updatePet",
    requestBody: {
      required: true,
      content: {
        "application/json": {
          schema: { $ref: "#/components/schemas/Pet" },
        },
        "application/xml": {
          schema: { $ref: "#/components/schemas/Pet" },
        },
      },
    },
    responses: {
      "200": {
        description: "Successful operation",
        content: {
          "application/json": {
            schema: { $ref: "#/components/schemas/Pet" },
          },
          "application/xml": {
            schema: { $ref: "#/components/schemas/Pet" },
          },
        },
      },
      "400": {
        description: "Invalid input",
      },
    },
  };

  const doc = {
    info: { title: "Test API", version: "1.0.0" },
    openapi: "3.1.0",
    paths: {},
  };

  it("should generate unknown response data type", () => {
    const result = generateOperationFunction(
      "/pet",
      "put",
      operation,
      [],
      doc,
      { unknownResponseMode: true },
    );

    /* Should generate response map with schema references */
    expect(result.functionCode).toContain(
      "export const UpdatePetResponseMap = {",
    );
    expect(result.functionCode).toContain('"application/json": Pet,');
    expect(result.functionCode).toContain('"application/xml": Pet,');

    /* Should not generate Zod validation */
    expect(result.functionCode).not.toContain(".safeParse(");

    /* Should use unknown data type */
    expect(result.functionCode).toContain(
      "const data = await parseResponseBody(response);",
    );
  });

  it("should include parse method for success responses with schemas", () => {
    const result = generateOperationFunction(
      "/pet",
      "put",
      operation,
      [],
      doc,
      { unknownResponseMode: true },
    );

    /* Should include parse method binding */
    expect(result.functionCode).toContain("parse: () =>");
    expect(result.functionCode).toContain(
      "parseApiResponseUnknownData(response, data, UpdatePetResponseMap)",
    );
  });

  it("should handle Accept header as array", () => {
    const result = generateOperationFunction(
      "/pet",
      "put",
      operation,
      [],
      doc,
      { unknownResponseMode: true },
    );

    /* Should support array of response content types */
    expect(result.functionCode).toContain(
      "const requestedResponseTypes = contentType?.response",
    );
    expect(result.functionCode).toContain(
      "Array.isArray(contentType.response)",
    );
    expect(result.functionCode).toContain(
      'const acceptHeader = requestedResponseTypes.join(", ");',
    );
    expect(result.functionCode).toContain("Accept: acceptHeader,");
  });

  it("should default Accept header to first declared media type", () => {
    const result = generateOperationFunction(
      "/pet",
      "put",
      operation,
      [],
      doc,
      { unknownResponseMode: true },
    );

    /* Should default to first content type from response spec */
    expect(result.functionCode).toContain(
      'const defaultResponseContentType = "application/json";',
    );
  });

  it("should support contentType parameter with response array", () => {
    const result = generateOperationFunction(
      "/pet",
      "put",
      operation,
      [],
      doc,
      { unknownResponseMode: true },
    );

    /* Should include response content type in parameter interface */
    expect(result.functionCode).toContain(
      "response?: UpdatePetResponseContentType | UpdatePetResponseContentType[]",
    );
  });

  it("should generate correct type definitions", () => {
    const result = generateOperationFunction(
      "/pet",
      "put",
      operation,
      [],
      doc,
      { unknownResponseMode: true },
    );

    /* Should generate response content type alias */
    expect(result.functionCode).toContain(
      "export type UpdatePetResponseContentType = keyof typeof UpdatePetResponseMap;",
    );
  });

  it("should not include parse method for responses without schema", () => {
    const result = generateOperationFunction(
      "/pet",
      "put",
      operation,
      [],
      doc,
      { unknownResponseMode: true },
    );

    /* 400 response has no schema, so should not have parse method */
    const case400Match = result.functionCode.match(
      /case 400:[\s\S]*?return[^}]+}/,
    );
    expect(case400Match).toBeTruthy();
    if (case400Match) {
      expect(case400Match[0]).not.toContain("parse:");
    }
  });
});

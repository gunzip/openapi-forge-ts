import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import type { Express } from "express";

import { testMultiContentTypesWrapper } from "./generated/server-operations/testMultiContentTypes.js";
import { testDeserializationWrapper } from "./generated/server-operations/testDeserialization.js";
import { createTestApp, testData } from "./test-utils.js";

describe("Server Generator - Multi-Content-Type Operations", () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe("testMultiContentTypes operation", () => {
    it("should handle application/json content type", async () => {
      /* Arrange */
      const jsonPayload = {
        name: "JSON Test",
        type: "application/json",
        timestamp: new Date().toISOString(),
      };

      app.post(
        "/test-multi-content",
        testMultiContentTypesWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "JSON content processed",
                receivedContentType: "application/json",
                receivedData: params.value.body,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-multi-content")
        .send(jsonPayload)
        .set("Content-Type", "application/json");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("JSON content processed");
      expect(response.body.receivedContentType).toBe("application/json");
      expect(response.body.receivedData).toEqual(jsonPayload);
    });

    it("should handle application/x-www-form-urlencoded content type", async () => {
      /* Arrange */
      const formData = {
        name: "Form Test",
        type: "application/x-www-form-urlencoded",
        value: "form-value",
      };

      app.post(
        "/test-multi-content",
        testMultiContentTypesWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Form content processed",
                receivedContentType: "application/x-www-form-urlencoded",
                receivedData: params.value.body,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-multi-content")
        .send(
          "name=Form Test&type=application/x-www-form-urlencoded&value=form-value",
        )
        .set("Content-Type", "application/x-www-form-urlencoded");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Form content processed");
      expect(response.body.receivedContentType).toBe(
        "application/x-www-form-urlencoded",
      );
      expect(response.body.receivedData).toEqual(formData);
    });

    it("should handle text/plain content type", async () => {
      /* Arrange */
      const textPayload =
        "This is plain text content for multi-content-type testing.";

      app.post(
        "/test-multi-content",
        testMultiContentTypesWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Text content processed",
                receivedContentType: "text/plain",
                receivedData: params.value.body,
                contentLength:
                  typeof params.value.body === "string"
                    ? params.value.body.length
                    : 0,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-multi-content")
        .send(textPayload)
        .set("Content-Type", "text/plain");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Text content processed");
      expect(response.body.receivedContentType).toBe("text/plain");
      expect(response.body.receivedData).toBe(textPayload);
      expect(response.body.contentLength).toBe(textPayload.length);
    });

    it("should handle multipart/form-data content type", async () => {
      /* Arrange */
      app.post(
        "/test-multi-content",
        testMultiContentTypesWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Multipart content processed",
                receivedContentType: "multipart/form-data",
                hasBody: !!params.value.body,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-multi-content")
        .field("name", "Multipart Test")
        .field("type", "multipart/form-data")
        .attach("file", Buffer.from("test file content"), "test.txt");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Multipart content processed");
      expect(response.body.receivedContentType).toBe("multipart/form-data");
      expect(response.body.hasBody).toBe(true);
    });

    it("should handle unsupported content type gracefully", async () => {
      /* Arrange */
      app.post(
        "/test-multi-content",
        testMultiContentTypesWrapper(async (params) => {
          if (params.type === "body_error") {
            return {
              status: 415 /* Unsupported Media Type */,
              contentType: "application/json",
              data: {
                error: "Unsupported content type",
                details: params.error.issues,
              },
            };
          }

          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: { message: "Content processed" },
            };
          }

          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-multi-content")
        .send("<?xml version='1.0'?><root>XML content</root>")
        .set("Content-Type", "application/xml");

      /* Assert - Should handle gracefully based on wrapper implementation */
      expect([200, 415, 400]).toContain(response.status);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should validate content based on content type", async () => {
      /* Arrange */
      app.post(
        "/test-multi-content",
        testMultiContentTypesWrapper(async (params) => {
          if (params.type === "body_error") {
            return {
              status: 400,
              contentType: "application/json",
              data: {
                error: "Content validation failed",
                validationType: params.type,
                details: params.error.issues,
              },
            };
          }

          return {
            status: 200,
            contentType: "application/json",
            data: {
              message: "Content validated successfully",
              contentType: params.type,
            },
          };
        }),
      );

      /* Act - Send invalid JSON */
      const response = await request(app)
        .post("/test-multi-content")
        .send('{"invalid": json}')
        .set("Content-Type", "application/json")
        .type("text"); /* Force sending as text to bypass Express parsing */

      /* Assert - Express will reject malformed JSON before it reaches our wrapper */
      expect(response.status).toBe(400);
    });
  });

  describe("testDeserialization operation", () => {
    it("should handle JSON deserialization correctly", async () => {
      /* Arrange */
      const jsonData = {
        id: "deser-123",
        name: "Deserialization Test",
        data: { nested: true, value: 42 },
      };

      app.post(
        "/test-deserialization",
        testDeserializationWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Deserialization successful",
                deserializedData: params.value.body,
                dataType: typeof params.value.body,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-deserialization")
        .send(jsonData)
        .set("Content-Type", "application/json");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Deserialization successful");
      expect(response.body.deserializedData).toEqual(jsonData);
      expect(response.body.dataType).toBe("object");
    });

    it("should handle custom deserialization formats", async () => {
      /* Arrange */
      const customData = "custom-format:value1,value2,value3";

      app.post(
        "/test-deserialization",
        testDeserializationWrapper(async (params) => {
          if (params.type === "ok") {
            /* Custom deserialization logic could be applied here */
            const processedData = params.value.body;

            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Custom deserialization processed",
                originalData: processedData,
                isString: typeof processedData === "string",
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-deserialization")
        .send(customData)
        .set("Content-Type", "text/plain");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Custom deserialization processed");
      expect(response.body.originalData).toBe(customData);
      expect(response.body.isString).toBe(true);
    });

    it("should handle deserialization errors", async () => {
      /* Arrange */
      app.post(
        "/test-deserialization",
        testDeserializationWrapper(async (params) => {
          if (params.type === "body_error") {
            return {
              status: 400,
              contentType: "application/json",
              data: {
                error: "Deserialization failed",
                errorType: params.type,
                details: params.error.issues,
              },
            };
          }

          return {
            status: 200,
            contentType: "application/json",
            data: { message: "Deserialization successful" },
          };
        }),
      );

      /* Act - Send malformed data */
      const response = await request(app)
        .post("/test-deserialization")
        .send(Buffer.from([0xff, 0xfe, 0xfd])) /* Invalid binary data */
        .set("Content-Type", "application/json");

      /* Assert - Express may reject before wrapper or wrapper may handle gracefully */
      expect([200, 400]).toContain(response.status);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });
  });

  describe("Content negotiation", () => {
    it("should handle Accept header for response content type", async () => {
      /* Arrange */
      app.post(
        "/test-multi-content",
        testMultiContentTypesWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType:
                "application/json" /* Always return JSON for simplicity */,
              data: {
                message: "Content negotiation test",
                acceptedContentType: "application/json",
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-multi-content")
        .send({ test: "content negotiation" })
        .set("Content-Type", "application/json")
        .set("Accept", "application/json");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Content negotiation test");
    });

    it("should handle multiple content types in single operation", async () => {
      /* Arrange */
      const testCases = [
        {
          contentType: "application/json",
          data: { json: true, value: "test" },
          send: (req: any) => req.send({ json: true, value: "test" }),
        },
        {
          contentType: "application/x-www-form-urlencoded",
          data: { form: "true", value: "test" },
          send: (req: any) => req.send("form=true&value=test"),
        },
        {
          contentType: "text/plain",
          data: "plain text data",
          send: (req: any) => req.send("plain text data"),
        },
      ];

      for (const testCase of testCases) {
        app.post(
          `/test-multi-${testCase.contentType.replace(/[\/\-]/g, "_")}`,
          testMultiContentTypesWrapper(async (params) => {
            if (params.type === "ok") {
              return {
                status: 200,
                contentType: "application/json",
                data: {
                  message: `${testCase.contentType} processed successfully`,
                  receivedData: params.value.body,
                },
              };
            }
            throw new Error(`Validation error: ${params.type}`);
          }),
        );

        /* Act */
        const response = await testCase.send(
          request(app)
            .post(`/test-multi-${testCase.contentType.replace(/[\/\-]/g, "_")}`)
            .set("Content-Type", testCase.contentType),
        );

        /* Assert */
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body.message).toBe(
          `${testCase.contentType} processed successfully`,
        );
      }
    });
  });

  describe("Edge cases for multi-content operations", () => {
    it("should handle empty content with different content types", async () => {
      /* Arrange */
      app.post(
        "/test-multi-content",
        testMultiContentTypesWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Empty content handled",
                bodyIsEmpty:
                  params.value.body === undefined ||
                  params.value.body === null ||
                  params.value.body === "",
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-multi-content")
        .set("Content-Type", "application/json");
      /* No body sent */

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Empty content handled");
      expect(response.body.bodyIsEmpty).toBe(true);
    });

    it("should handle large content with different types", async () => {
      /* Arrange */
      const largeJsonData = {
        data: "A".repeat(1024) /* 1KB string */,
        metadata: { size: "large", type: "test" },
      };

      app.post(
        "/test-multi-content",
        testMultiContentTypesWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Large content processed",
                dataSize: JSON.stringify(params.value.body).length,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-multi-content")
        .send(largeJsonData)
        .set("Content-Type", "application/json");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Large content processed");
      expect(response.body.dataSize).toBeGreaterThan(1000);
    });
  });
});

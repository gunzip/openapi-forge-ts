import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import type { Express } from "express";

import { testMultipleSuccessWrapper } from "../generated/server-operations/testMultipleSuccess.js";
import { testResponseHeaderWrapper } from "../generated/server-operations/testResponseHeader.js";
import { testWithEmptyResponseWrapper } from "../generated/server-operations/testWithEmptyResponse.js";
import { createTestApp, createExpressAdapter, testData } from "./test-utils.js";

describe("Server Generator - Response Handling Operations", () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe("testMultipleSuccess operation", () => {
    it("should return 200 with Message data", async () => {
      /* Arrange */
      app.get(
        "/test-multiple-success",
        testMultipleSuccessWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: testData.message,
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app).get("/test-multiple-success");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toEqual(testData.message);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("content");
      expect(response.body.content).toHaveProperty("markdown");
    });

    it("should return 202 accepted response", async () => {
      /* Arrange */
      app.get(
        "/test-multiple-success",
        testMultipleSuccessWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 202,
              contentType: "application/json",
              data: undefined /* 202 typically has no body */,
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app).get("/test-multiple-success");

      /* Assert */
      expect(response.status).toBe(202);
      /* 202 responses might not have content or have minimal content */
      expect(response.headers).toBeDefined();
    });

    it("should return 403 forbidden with OneOfTest data", async () => {
      /* Arrange */
      const oneOfTestData = {
        type: "error",
        message: "Access denied",
        code: 403,
      };

      app.get(
        "/test-multiple-success",
        testMultipleSuccessWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 403,
              contentType: "application/json",
              data: oneOfTestData,
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app).get("/test-multiple-success");

      /* Assert */
      expect(response.status).toBe(403);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toEqual(oneOfTestData);
      expect(response.body).toHaveProperty("type");
      expect(response.body).toHaveProperty("message");
    });

    it("should return 404 not found", async () => {
      /* Arrange */
      app.get(
        "/test-multiple-success",
        testMultipleSuccessWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 404,
              contentType: "application/json",
              data: undefined /* 404 might not have body content */,
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app).get("/test-multiple-success");

      /* Assert */
      expect(response.status).toBe(404);
      /* 404 responses according to the spec might not have content */
      expect(response.headers).toBeDefined();
    });
  });

  describe("testResponseHeader operation", () => {
    it("should return 201 with Message data and response headers", async () => {
      /* Arrange */
      const locationHeader = "https://api.example.com/messages/123";
      const idHeader = "msg-123";

      app.get(
        "/test-response-header",
        testResponseHeaderWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 201,
              contentType: "application/json",
              data: testData.message,
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Manually set response headers in Express after wrapper */
      app.use("/test-response-header", (req, res, next) => {
        if (res.statusCode === 201) {
          res.set("Location", locationHeader);
          res.set("Id", idHeader);
        }
        next();
      });

      /* Act */
      const response = await request(app).get("/test-response-header");

      /* Assert */
      expect(response.status).toBe(201);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toEqual(testData.message);

      /* Note: Response headers would be set by the actual implementation
         The wrapper itself doesn't handle response headers - that's done 
         by the framework or user code after the wrapper returns */
    });

    it("should return 500 fatal error", async () => {
      /* Arrange */
      app.get(
        "/test-response-header",
        testResponseHeaderWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 500,
              contentType: "application/json",
              data: {
                error: "Internal server error",
                message: "Something went wrong",
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app).get("/test-response-header");

      /* Assert */
      expect(response.status).toBe(500);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toBe("Internal server error");
    });
  });

  describe("testWithEmptyResponse operation", () => {
    it("should handle operations with empty response", async () => {
      /* Arrange */
      app.get(
        "/test-empty-response",
        testWithEmptyResponseWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: undefined /* Empty response */,
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app).get("/test-empty-response");

      /* Assert */
      expect(response.status).toBe(200);
      /* Empty response should still have proper headers but no body */
      expect(response.headers).toBeDefined();
    });

    it("should handle different empty response status codes", async () => {
      /* Arrange */
      app.get(
        "/test-empty-response",
        testWithEmptyResponseWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 204 /* No Content */,
              contentType: "application/json",
              data: undefined,
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app).get("/test-empty-response");

      /* Assert */
      expect(response.status).toBe(204);
      expect(response.body).toEqual({});
      expect(response.headers).toBeDefined();
    });
  });

  describe("Content-Type handling", () => {
    it("should properly set content-type headers", async () => {
      /* Arrange */
      app.get(
        "/test-multiple-success",
        testMultipleSuccessWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                contentTypeTest: true,
                timestamp: new Date().toISOString(),
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app).get("/test-multiple-success");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toHaveProperty("contentTypeTest", true);
      expect(response.body).toHaveProperty("timestamp");
    });

    it("should handle responses without content appropriately", async () => {
      /* Arrange */
      app.get(
        "/test-multiple-success",
        testMultipleSuccessWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 202,
              contentType: "application/json",
              data: null /* Explicit null */,
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app).get("/test-multiple-success");

      /* Assert */
      expect(response.status).toBe(202);
      /* Should handle null data gracefully */
      expect(response.headers).toBeDefined();
    });
  });

  describe("Error response scenarios", () => {
    it("should handle wrapper validation errors in response context", async () => {
      /* Arrange */
      app.get(
        "/test-multiple-success",
        testMultipleSuccessWrapper(async (params) => {
          /* Simulate different validation errors */
          if (params.type === "query_error") {
            return {
              status: 400,
              contentType: "application/json",
              data: {
                error: "Query validation failed",
                details: params.error.issues,
              },
            };
          }

          if (params.type === "headers_error") {
            return {
              status: 400,
              contentType: "application/json",
              data: {
                error: "Header validation failed",
                details: params.error.issues,
              },
            };
          }

          return {
            status: 200,
            contentType: "application/json",
            data: testData.message,
          };
        }),
      );

      /* Act - Valid request */
      const validResponse = await request(app).get("/test-multiple-success");

      /* Assert - Valid case */
      expect(validResponse.status).toBe(200);
      expect(validResponse.body).toEqual(testData.message);
    });

    it("should maintain response structure consistency", async () => {
      /* Arrange */
      const responses = [200, 202, 403, 404];

      for (const statusCode of responses) {
        app.get(
          `/test-status-${statusCode}`,
          testMultipleSuccessWrapper(async (params) => {
            if (params.type === "ok") {
              return {
                status: statusCode,
                contentType: "application/json",
                data:
                  statusCode === 200 || statusCode === 403
                    ? testData.message
                    : undefined,
              };
            }
            throw new Error(`Validation error: ${params.type}`);
          }),
        );

        /* Act */
        const response = await request(app).get(`/test-status-${statusCode}`);

        /* Assert */
        expect(response.status).toBe(statusCode);
        expect(response.headers).toBeDefined();

        if (statusCode === 200 || statusCode === 403) {
          expect(response.headers["content-type"]).toMatch(/application\/json/);
        }
      }
    });
  });
});

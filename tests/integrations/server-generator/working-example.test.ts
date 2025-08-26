import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import type { Express } from "express";

import { testAuthBearerWrapper } from "../generated/server-operations/testAuthBearer.js";
import { createTestApp, createExpressAdapter, testData } from "./test-utils.js";

describe("Server Generator - Working Example", () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe("testAuthBearer operation", () => {
    it("should return 200 with valid Person when all required parameters are provided", async () => {
      /* Arrange */
      const adapter = createExpressAdapter(testAuthBearerWrapper);
      app.get(
        "/test-auth-bearer",
        adapter(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: testData.person,
            };
          }
          /* Handle validation errors by returning appropriate error response */
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .get("/test-auth-bearer")
        .query({
          qr: testData.queryParams.qr,
          qo: testData.queryParams
            .qo /* Note: Generated schema treats this as required */,
          cursor: testData.queryParams.cursor,
        })
        .set("Authorization", testData.headers.Authorization);

      /* Assert */
      console.log("Response status:", response.status);
      console.log("Response body:", response.body);
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toEqual(testData.person);
    });

    it("should handle missing required query parameter 'qr'", async () => {
      /* Arrange */
      const adapter = createExpressAdapter(testAuthBearerWrapper);
      app.get(
        "/test-auth-bearer",
        adapter(async (params) => {
          if (params.type === "query_error") {
            return {
              status: 400,
              contentType: "application/json",
              data: {
                error: "Invalid query parameters",
                details: params.error.issues,
              },
            };
          }
          return {
            status: 200,
            contentType: "application/json",
            data: testData.person,
          };
        }),
      );

      /* Act */
      const response = await request(app)
        .get("/test-auth-bearer")
        .query({
          qo: testData.queryParams.qo,
          cursor: testData.queryParams.cursor,
          /* Missing required 'qr' parameter */
        })
        .set("Authorization", testData.headers.Authorization);

      /* Assert */
      expect(response.status).toBe(400);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toHaveProperty("error");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: expect.arrayContaining(["qr"]),
            code: "invalid_type",
          }),
        ]),
      );
    });

    it("should handle invalid cursor parameter (too short)", async () => {
      /* Arrange */
      const adapter = createExpressAdapter(testAuthBearerWrapper);
      app.get(
        "/test-auth-bearer",
        adapter(async (params) => {
          if (params.type === "query_error") {
            return {
              status: 400,
              contentType: "application/json",
              data: {
                error: "Invalid query parameters",
                details: params.error.issues,
              },
            };
          }
          return {
            status: 200,
            contentType: "application/json",
            data: testData.person,
          };
        }),
      );

      /* Act */
      const response = await request(app)
        .get("/test-auth-bearer")
        .query({
          qr: testData.queryParams.qr,
          qo: testData.queryParams.qo,
          cursor: "" /* Empty cursor violates minLength: 1 */,
        })
        .set("Authorization", testData.headers.Authorization);

      /* Assert */
      expect(response.status).toBe(400);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toHaveProperty("error");
      expect(response.body.details).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: expect.arrayContaining(["cursor"]),
            code: "too_small",
          }),
        ]),
      );
    });

    it("should validate that parameters are properly parsed and passed to handler", async () => {
      /* Arrange */
      const testParams = {
        qr: "test-required-value",
        qo: "test-optional-value",
        cursor: "test-cursor-123",
      };

      let receivedParams: any;
      const adapter = createExpressAdapter(testAuthBearerWrapper);
      app.get(
        "/test-auth-bearer",
        adapter(async (params) => {
          receivedParams = params;
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Parameters validated",
                receivedQuery: params.value.query,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .get("/test-auth-bearer")
        .query(testParams)
        .set("Authorization", testData.headers.Authorization);

      /* Assert */
      expect(response.status).toBe(200);
      expect(receivedParams.type).toBe("ok");
      expect(receivedParams.value.query).toEqual(testParams);
      expect(response.body.message).toBe("Parameters validated");
      expect(response.body.receivedQuery).toEqual(testParams);
    });

    it("should demonstrate the complete server-generator integration pattern", async () => {
      /* Arrange - This test shows the complete pattern for using server-generator wrappers */
      const adapter = createExpressAdapter(testAuthBearerWrapper);

      app.get(
        "/test-auth-bearer",
        adapter(async (params) => {
          /* The wrapper provides validated parameters or validation errors */
          switch (params.type) {
            case "ok":
              /* All validation passed - use the validated data */
              return {
                status: 200,
                contentType: "application/json",
                data: {
                  message: "Server-generator integration working",
                  validatedData: {
                    query: params.value.query,
                    path: params.value.path,
                    headers: Object.keys(params.value.headers).length,
                    body: params.value.body,
                  },
                  generatedTypes: "fully-typed with Zod validation",
                },
              };

            case "query_error":
              return {
                status: 400,
                contentType: "application/json",
                data: {
                  error: "Query validation failed",
                  issues: params.error.issues,
                },
              };

            case "path_error":
              return {
                status: 400,
                contentType: "application/json",
                data: {
                  error: "Path validation failed",
                  issues: params.error.issues,
                },
              };

            case "headers_error":
              return {
                status: 400,
                contentType: "application/json",
                data: {
                  error: "Headers validation failed",
                  issues: params.error.issues,
                },
              };

            case "body_error":
              return {
                status: 400,
                contentType: "application/json",
                data: {
                  error: "Body validation failed",
                  issues: params.error.issues,
                },
              };

            default:
              return {
                status: 500,
                contentType: "application/json",
                data: { error: "Unknown validation error type" },
              };
          }
        }),
      );

      /* Act */
      const response = await request(app)
        .get("/test-auth-bearer")
        .query({
          qr: "required-param",
          qo: "optional-param",
          cursor: "valid-cursor",
        })
        .set("Authorization", "Bearer test-token");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        "Server-generator integration working",
      );
      expect(response.body.validatedData.query).toEqual({
        qr: "required-param",
        qo: "optional-param",
        cursor: "valid-cursor",
      });
      expect(response.body.generatedTypes).toBe(
        "fully-typed with Zod validation",
      );
    });
  });
});

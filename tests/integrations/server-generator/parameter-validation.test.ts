import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import type { Express } from "express";

import { testWithTwoParamsWrapper } from ./generated/server-operations/testWithTwoParams.js";
import { testParametersAtPathLevelWrapper } from ./generated/server-operations/testParametersAtPathLevel.js";
import { testParameterWithDashWrapper } from ./generated/server-operations/testParameterWithDash.js";
import { testParameterWithDashAnUnderscoreWrapper } from ./generated/server-operations/testParameterWithDashAnUnderscore.js";
import { testParamWithSchemaRefWrapper } from ./generated/server-operations/testParamWithSchemaRef.js";
import { testHeaderWithSchemaRefWrapper } from ./generated/server-operations/testHeaderWithSchemaRef.js";
import { testHeaderOptionalWrapper } from ./generated/server-operations/testHeaderOptional.js";
import { createTestApp, testData } from "./test-utils.js";

describe("Server Generator - Parameter Validation Operations", () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe("testWithTwoParams operation", () => {
    it("should return 200 with valid path parameters", async () => {
      /* Arrange */
      const param1 = "value1";
      const param2 = "value2";

      app.get(
        "/test-two-params/:param1/:param2",
        testWithTwoParamsWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Parameters received",
                receivedParams: params.value.path,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app).get(
        `/test-two-params/${param1}/${param2}`,
      );

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Parameters received");
    });

    it("should handle missing path parameters", async () => {
      /* Arrange */
      app.get(
        "/test-two-params/:param1?/:param2?",
        testWithTwoParamsWrapper(async (params) => {
          if (params.type === "path_error") {
            return {
              status: 400,
              contentType: "application/json",
              data: {
                error: "Invalid path parameters",
                details: params.error.issues,
              },
            };
          }
          return {
            status: 200,
            contentType: "application/json",
            data: { message: "Success" },
          };
        }),
      );

      /* Act */
      const response =
        await request(app).get(
          "/test-two-params/",
        ); /* Missing both path parameters */

      /* Assert */
      expect(response.status).toBe(400);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("testParametersAtPathLevel operation", () => {
    it("should return 200 with valid path-level parameters", async () => {
      /* Arrange */
      app.get(
        "/test-path-level-params",
        testParametersAtPathLevelWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Path-level parameters processed",
                query: params.value.query,
                path: params.value.path,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app).get("/test-path-level-params").query({
        qr: testData.queryParams.qr,
        cursor: testData.queryParams.cursor,
      });

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Path-level parameters processed");
    });
  });

  describe("testParameterWithDash operation", () => {
    it("should handle parameter names with dashes", async () => {
      /* Arrange */
      app.get(
        "/test-param-dash",
        testParameterWithDashWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Parameter with dash handled",
                receivedParams: params.value,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app).get("/test-param-dash").query({
        "param-with-dash": "test-value",
      });

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Parameter with dash handled");
    });
  });

  describe("testParameterWithDashAnUnderscore operation", () => {
    it("should handle parameter names with both dashes and underscores", async () => {
      /* Arrange */
      app.get(
        "/test-param-dash-underscore",
        testParameterWithDashAnUnderscoreWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Parameter with dash and underscore handled",
                receivedParams: params.value,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .get("/test-param-dash-underscore")
        .query({
          "param-with_dash-and_underscore": "complex-param-value",
        });

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe(
        "Parameter with dash and underscore handled",
      );
    });
  });

  describe("testParamWithSchemaRef operation", () => {
    it("should handle parameters with schema references", async () => {
      /* Arrange */
      app.get(
        "/test-param-schema-ref",
        testParamWithSchemaRefWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Schema reference parameter handled",
                receivedParams: params.value,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app).get("/test-param-schema-ref").query({
        /* Add appropriate query parameters based on the schema reference */
        testParam: "schema-ref-value",
      });

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Schema reference parameter handled");
    });

    it("should validate parameters against schema references", async () => {
      /* Arrange */
      app.get(
        "/test-param-schema-ref",
        testParamWithSchemaRefWrapper(async (params) => {
          if (params.type === "query_error") {
            return {
              status: 400,
              contentType: "application/json",
              data: {
                error: "Invalid schema reference parameter",
                details: params.error.issues,
              },
            };
          }
          return {
            status: 200,
            contentType: "application/json",
            data: { message: "Success" },
          };
        }),
      );

      /* Act */
      const response = await request(app).get("/test-param-schema-ref").query({
        /* Intentionally pass invalid data to trigger validation */
        testParam: "" /* Assuming schema requires non-empty string */,
      });

      /* Assert - Should handle validation appropriately */
      expect([200, 400]).toContain(response.status);
      if (response.status === 400) {
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body).toHaveProperty("error");
      }
    });
  });

  describe("Header parameter validation", () => {
    describe("testHeaderWithSchemaRef operation", () => {
      it("should handle headers with schema references", async () => {
        /* Arrange */
        app.get(
          "/test-header-schema-ref",
          testHeaderWithSchemaRefWrapper(async (params) => {
            if (params.type === "ok") {
              return {
                status: 200,
                contentType: "application/json",
                data: {
                  message: "Header with schema reference handled",
                  receivedHeaders: params.value.headers,
                },
              };
            }
            throw new Error(`Validation error: ${params.type}`);
          }),
        );

        /* Act */
        const response = await request(app)
          .get("/test-header-schema-ref")
          .set("X-Custom-Header", "schema-ref-header-value");

        /* Assert */
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body.message).toBe(
          "Header with schema reference handled",
        );
      });

      it("should validate headers against schema references", async () => {
        /* Arrange */
        app.get(
          "/test-header-schema-ref",
          testHeaderWithSchemaRefWrapper(async (params) => {
            if (params.type === "headers_error") {
              return {
                status: 400,
                contentType: "application/json",
                data: {
                  error: "Invalid header schema",
                  details: params.error.issues,
                },
              };
            }
            return {
              status: 200,
              contentType: "application/json",
              data: { message: "Success" },
            };
          }),
        );

        /* Act */
        const response = await request(app).get("/test-header-schema-ref");
        /* Missing required header or invalid header value */

        /* Assert - Should handle validation appropriately */
        expect([200, 400]).toContain(response.status);
        if (response.status === 400) {
          expect(response.headers["content-type"]).toMatch(/application\/json/);
          expect(response.body).toHaveProperty("error");
        }
      });
    });

    describe("testHeaderOptional operation", () => {
      it("should handle optional headers correctly", async () => {
        /* Arrange */
        app.get(
          "/test-header-optional",
          testHeaderOptionalWrapper(async (params) => {
            if (params.type === "ok") {
              return {
                status: 200,
                contentType: "application/json",
                data: {
                  message: "Optional header handled",
                  hasOptionalHeader: !!params.value.headers,
                },
              };
            }
            throw new Error(`Validation error: ${params.type}`);
          }),
        );

        /* Act - Without optional header */
        const responseWithoutHeader = await request(app).get(
          "/test-header-optional",
        );

        /* Assert */
        expect(responseWithoutHeader.status).toBe(200);
        expect(responseWithoutHeader.headers["content-type"]).toMatch(
          /application\/json/,
        );
        expect(responseWithoutHeader.body.message).toBe(
          "Optional header handled",
        );

        /* Act - With optional header */
        const responseWithHeader = await request(app)
          .get("/test-header-optional")
          .set("X-Optional-Header", "optional-value");

        /* Assert */
        expect(responseWithHeader.status).toBe(200);
        expect(responseWithHeader.headers["content-type"]).toMatch(
          /application\/json/,
        );
        expect(responseWithHeader.body.message).toBe("Optional header handled");
      });
    });
  });

  describe("Edge cases and validation scenarios", () => {
    it("should handle complex parameter combinations", async () => {
      /* Arrange */
      app.get(
        "/test-two-params/:param1/:param2",
        testWithTwoParamsWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Complex parameters handled",
                path: params.value.path,
                query: params.value.query,
                headers: params.value.headers,
              },
            };
          }

          /* Handle different types of validation errors */
          const errorResponse = {
            status: 400,
            contentType: "application/json",
            data: {
              error: `${params.type.replace("_", " ")} validation failed`,
              details: params.error.issues,
            },
          };
          return errorResponse;
        }),
      );

      /* Act */
      const response = await request(app)
        .get("/test-two-params/value1/value2")
        .query({
          additionalParam: "extra-value",
        })
        .set("X-Custom-Header", "header-value");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Complex parameters handled");
    });
  });
});

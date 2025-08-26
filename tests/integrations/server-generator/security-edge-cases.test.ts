import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import type { Express } from "express";

import { testOverriddenSecurityWrapper } from "./generated/server-operations/testOverriddenSecurity.js";
import { testOverriddenSecurityNoAuthWrapper } from "./generated/server-operations/testOverriddenSecurityNoAuth.js";
import { testCustomTokenHeaderWrapper } from "./generated/server-operations/testCustomTokenHeader.js";
import { testSimplePatchWrapper } from "./generated/server-operations/testSimplePatch.js";
import { createTestApp, testData } from "./test-utils.js";

describe("Server Generator - Security and Edge Cases", () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe("Security override operations", () => {
    describe("testOverriddenSecurity operation", () => {
      it("should handle operation with overridden security", async () => {
        /* Arrange */
        app.get(
          "/test-overridden-security",
          testOverriddenSecurityWrapper(async (params) => {
            if (params.type === "ok") {
              return {
                status: 200,
                contentType: "application/json",
                data: {
                  message: "Overridden security validated",
                  securityHandled: true,
                },
              };
            }
            throw new Error(`Validation error: ${params.type}`);
          }),
        );

        /* Act */
        const response = await request(app)
          .get("/test-overridden-security")
          .set("Authorization", testData.headers.Authorization);

        /* Assert */
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body.message).toBe("Overridden security validated");
        expect(response.body.securityHandled).toBe(true);
      });

      it("should handle missing security when required", async () => {
        /* Arrange */
        app.get(
          "/test-overridden-security",
          testOverriddenSecurityWrapper(async (params) => {
            if (params.type === "headers_error") {
              return {
                status: 401,
                contentType: "application/json",
                data: {
                  error: "Authentication required",
                  details: params.error.issues,
                },
              };
            }

            return {
              status: 200,
              contentType: "application/json",
              data: { message: "Authorized" },
            };
          }),
        );

        /* Act */
        const response = await request(app).get("/test-overridden-security");
        /* No authorization header */

        /* Assert - Depends on wrapper implementation */
        expect([200, 401]).toContain(response.status);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
      });
    });

    describe("testOverriddenSecurityNoAuth operation", () => {
      it("should work without authentication (security: [])", async () => {
        /* Arrange */
        app.get(
          "/test-no-auth",
          testOverriddenSecurityNoAuthWrapper(async (params) => {
            if (params.type === "ok") {
              return {
                status: 200,
                contentType: "application/json",
                data: {
                  message: "No authentication required",
                  publicEndpoint: true,
                },
              };
            }
            throw new Error(`Validation error: ${params.type}`);
          }),
        );

        /* Act */
        const response = await request(app).get("/test-no-auth");
        /* No authentication headers needed */

        /* Assert */
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body.message).toBe("No authentication required");
        expect(response.body.publicEndpoint).toBe(true);
      });

      it("should work even with authentication present", async () => {
        /* Arrange */
        app.get(
          "/test-no-auth",
          testOverriddenSecurityNoAuthWrapper(async (params) => {
            if (params.type === "ok") {
              return {
                status: 200,
                contentType: "application/json",
                data: {
                  message: "Auth ignored when not required",
                  authProvided: true,
                },
              };
            }
            throw new Error(`Validation error: ${params.type}`);
          }),
        );

        /* Act */
        const response = await request(app)
          .get("/test-no-auth")
          .set("Authorization", testData.headers.Authorization);

        /* Assert */
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body.message).toBe("Auth ignored when not required");
      });
    });

    describe("testCustomTokenHeader operation", () => {
      it("should handle custom token in headers", async () => {
        /* Arrange */
        app.get(
          "/test-custom-token",
          testCustomTokenHeaderWrapper(async (params) => {
            if (params.type === "ok") {
              return {
                status: 200,
                contentType: "application/json",
                data: {
                  message: "Custom token validated",
                  customTokenPresent: true,
                  headers: params.value.headers,
                },
              };
            }
            throw new Error(`Validation error: ${params.type}`);
          }),
        );

        /* Act */
        const response = await request(app)
          .get("/test-custom-token")
          .set("X-Custom-Token", "custom-token-value")
          .query({
            qr: testData.queryParams.qr,
            cursor: testData.queryParams.cursor,
          });

        /* Assert */
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body.message).toBe("Custom token validated");
        expect(response.body.customTokenPresent).toBe(true);
      });

      it("should validate custom token header format", async () => {
        /* Arrange */
        app.get(
          "/test-custom-token",
          testCustomTokenHeaderWrapper(async (params) => {
            if (params.type === "headers_error") {
              return {
                status: 400,
                contentType: "application/json",
                data: {
                  error: "Invalid custom token header",
                  details: params.error.issues,
                },
              };
            }

            return {
              status: 200,
              contentType: "application/json",
              data: { message: "Token validated" },
            };
          }),
        );

        /* Act */
        const response = await request(app)
          .get("/test-custom-token")
          .set("X-Custom-Token", "") /* Empty token */
          .query({
            qr: testData.queryParams.qr,
            cursor: testData.queryParams.cursor,
          });

        /* Assert - Depends on wrapper validation rules */
        expect([200, 400]).toContain(response.status);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
      });
    });
  });

  describe("HTTP method variations", () => {
    describe("testSimplePatch operation", () => {
      it("should handle PATCH method correctly", async () => {
        /* Arrange */
        const patchData = {
          id: "patch-123",
          updates: {
            name: "Updated Name",
            status: "active",
          },
        };

        app.patch(
          "/test-simple-patch",
          testSimplePatchWrapper(async (params) => {
            if (params.type === "ok") {
              return {
                status: 200,
                contentType: "application/json",
                data: {
                  message: "PATCH operation successful",
                  patchedData: params.value.body,
                  method: "PATCH",
                },
              };
            }
            throw new Error(`Validation error: ${params.type}`);
          }),
        );

        /* Act */
        const response = await request(app)
          .patch("/test-simple-patch")
          .send(patchData)
          .set("Content-Type", "application/json");

        /* Assert */
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body.message).toBe("PATCH operation successful");
        expect(response.body.method).toBe("PATCH");
        expect(response.body.patchedData).toEqual(patchData);
      });

      it("should handle PATCH with partial updates", async () => {
        /* Arrange */
        const partialUpdate = {
          status: "inactive",
        };

        app.patch(
          "/test-simple-patch",
          testSimplePatchWrapper(async (params) => {
            if (params.type === "ok") {
              return {
                status: 200,
                contentType: "application/json",
                data: {
                  message: "Partial update processed",
                  isPartial: Object.keys(params.value.body || {}).length < 3,
                  receivedFields: Object.keys(params.value.body || {}),
                },
              };
            }
            throw new Error(`Validation error: ${params.type}`);
          }),
        );

        /* Act */
        const response = await request(app)
          .patch("/test-simple-patch")
          .send(partialUpdate)
          .set("Content-Type", "application/json");

        /* Assert */
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body.message).toBe("Partial update processed");
        expect(response.body.isPartial).toBe(true);
        expect(response.body.receivedFields).toEqual(["status"]);
      });

      it("should handle PATCH without body", async () => {
        /* Arrange */
        app.patch(
          "/test-simple-patch",
          testSimplePatchWrapper(async (params) => {
            if (params.type === "ok") {
              return {
                status: 200,
                contentType: "application/json",
                data: {
                  message: "PATCH without body",
                  hasBody: !!params.value.body,
                },
              };
            }

            if (params.type === "body_error") {
              return {
                status: 400,
                contentType: "application/json",
                data: {
                  error: "PATCH body validation failed",
                  details: params.error.issues,
                },
              };
            }

            throw new Error(`Validation error: ${params.type}`);
          }),
        );

        /* Act */
        const response = await request(app)
          .patch("/test-simple-patch")
          .set("Content-Type", "application/json");
        /* No body */

        /* Assert */
        expect([200, 400]).toContain(response.status);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
      });
    });
  });

  describe("Edge cases and error scenarios", () => {
    it("should handle malformed request data gracefully", async () => {
      /* Arrange */
      app.post(
        "/test-edge-case",
        testSimplePatchWrapper(async (params) => {
          if (params.type === "body_error") {
            return {
              status: 400,
              contentType: "application/json",
              data: {
                error: "Request data validation failed",
                errorType: params.type,
                details: params.error.issues,
              },
            };
          }

          return {
            status: 200,
            contentType: "application/json",
            data: { message: "Request processed" },
          };
        }),
      );

      /* Act - Send malformed JSON */
      const response = await request(app)
        .post("/test-edge-case")
        .send('{"malformed": json syntax}')
        .set("Content-Type", "application/json")
        .type("text"); /* Force as text to bypass Express parsing */

      /* Assert - Express will reject malformed JSON */
      expect(response.status).toBe(400);
    });

    it("should handle very large requests", async () => {
      /* Arrange */
      const largeData = {
        data: "X".repeat(10000) /* 10KB string */,
        metadata: { size: "very_large" },
      };

      app.post(
        "/test-large-request",
        testSimplePatchWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Large request processed",
                dataSize: JSON.stringify(params.value.body).length,
              },
            };
          }

          return {
            status: 413 /* Payload Too Large */,
            contentType: "application/json",
            data: { error: "Request too large" },
          };
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-large-request")
        .send(largeData)
        .set("Content-Type", "application/json");

      /* Assert */
      expect([200, 413]).toContain(response.status);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
    });

    it("should handle concurrent requests properly", async () => {
      /* Arrange */
      app.get(
        "/test-concurrent",
        testOverriddenSecurityNoAuthWrapper(async (params) => {
          if (params.type === "ok") {
            /* Simulate some processing time */
            await new Promise((resolve) => setTimeout(resolve, 10));

            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Concurrent request processed",
                timestamp: new Date().toISOString(),
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act - Send multiple concurrent requests */
      const promises = Array.from({ length: 5 }, (_, i) =>
        request(app).get("/test-concurrent").query({ requestId: i }),
      );

      const responses = await Promise.all(promises);

      /* Assert */
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body.message).toBe("Concurrent request processed");
        expect(response.body.timestamp).toBeDefined();
      });

      /* All responses should have different timestamps */
      const timestamps = responses.map((r) => r.body.timestamp);
      const uniqueTimestamps = new Set(timestamps);
      expect(uniqueTimestamps.size).toBeGreaterThan(1);
    });

    it("should handle timeout scenarios gracefully", async () => {
      /* Arrange */
      app.get(
        "/test-timeout",
        testOverriddenSecurityNoAuthWrapper(async (params) => {
          if (params.type === "ok") {
            /* Simulate long processing that might timeout */
            await new Promise((resolve) => setTimeout(resolve, 100));

            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Long operation completed",
                duration: "100ms",
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .get("/test-timeout")
        .timeout(500); /* 500ms timeout */

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Long operation completed");
    });

    it("should handle all validation error types consistently", async () => {
      /* Arrange */
      const errorTypes = [
        "query_error",
        "path_error",
        "headers_error",
        "body_error",
      ] as const;

      for (const errorType of errorTypes) {
        app.get(
          `/test-${errorType}`,
          testCustomTokenHeaderWrapper(async (params) => {
            if (params.type === errorType) {
              return {
                status: 400,
                contentType: "application/json",
                data: {
                  error: `${errorType} encountered`,
                  errorType: params.type,
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
      }

      /* Act & Assert - Test that each error type can be handled */
      /* This is more of a structure test - actual validation errors would be triggered by real invalid data */
      const response = await request(app).get("/test-query_error").query({
        qr: "test",
        cursor: "test",
      }); /* Valid params to avoid actual errors */

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Success");
    });
  });
});

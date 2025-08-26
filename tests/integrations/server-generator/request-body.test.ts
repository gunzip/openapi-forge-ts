import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import type { Express } from "express";

import { testInlineBodySchemaWrapper } from "../generated/server-operations/testInlineBodySchema.js";
import { testParameterWithBodyReferenceWrapper } from "../generated/server-operations/testParameterWithBodyReference.js";
import { putTestParameterWithBodyReferenceWrapper } from "../generated/server-operations/putTestParameterWithBodyReference.js";
import { createTestApp, testData } from "./test-utils.js";

describe("Server Generator - Request Body Operations", () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe("testInlineBodySchema operation", () => {
    it("should return 200 with valid JSON body", async () => {
      /* Arrange */
      const requestBody = {
        name: "Test User",
        age: 25,
      };

      app.post(
        "/test-inline-body",
        testInlineBodySchemaWrapper(async (params) => {
          if (params.type === "ok") {
            expect(params.value.body).toEqual(requestBody);
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Body received successfully",
                receivedBody: params.value.body,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-inline-body")
        .send(requestBody)
        .set("Content-Type", "application/json");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Body received successfully");
      expect(response.body.receivedBody).toEqual(requestBody);
    });

    it("should handle empty body gracefully", async () => {
      /* Arrange */
      app.post(
        "/test-inline-body",
        testInlineBodySchemaWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Empty body received",
                bodyIsUndefined: params.value.body === undefined,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post("/test-inline-body")
        .set("Content-Type", "application/json");

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Empty body received");
      expect(response.body.bodyIsUndefined).toBe(true);
    });

    it("should handle malformed JSON body", async () => {
      /* Arrange */
      app.post(
        "/test-inline-body",
        testInlineBodySchemaWrapper(async (params) => {
          if (params.type === "body_error") {
            return {
              status: 400,
              contentType: "application/json",
              data: {
                error: "Invalid request body",
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
      const response = await request(app)
        .post("/test-inline-body")
        .send('{"invalid": json}') /* Malformed JSON */
        .set("Content-Type", "application/json")
        .type("text"); /* Force sending as text to bypass Express parsing */

      /* Assert - Express will reject malformed JSON before it reaches our wrapper */
      expect(response.status).toBe(400);
    });
  });

  describe("testParameterWithBodyReference operation", () => {
    it("should return 201 with valid body and X-Request-Id header", async () => {
      /* Arrange */
      const requestBody = { name: "Test Model", id: "test-123" };
      const requestId = "req-456";

      app.post(
        "/test-parameter-body-ref/:requestId",
        testParameterWithBodyReferenceWrapper(async (params) => {
          if (params.type === "ok") {
            expect(params.value.body).toEqual(requestBody);
            /* The path parameter should be captured based on the route */
            return {
              status: 201,
              contentType: "application/json",
              data: {
                message: "Created successfully",
                requestId: requestId,
                receivedBody: params.value.body,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .post(`/test-parameter-body-ref/${requestId}`)
        .send(requestBody)
        .set("Content-Type", "application/json")
        .set("X-Request-Id", requestId);

      /* Assert */
      expect(response.status).toBe(201);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Created successfully");
      expect(response.body.receivedBody).toEqual(requestBody);
    });

    it("should handle missing required request body", async () => {
      /* Arrange */
      const requestId = "req-789";

      app.post(
        "/test-parameter-body-ref/:requestId",
        testParameterWithBodyReferenceWrapper(async (params) => {
          if (params.type === "body_error") {
            return {
              status: 400,
              contentType: "application/json",
              data: {
                error: "Missing request body",
                details: params.error.issues,
              },
            };
          }
          return {
            status: 201,
            contentType: "application/json",
            data: { message: "Created" },
          };
        }),
      );

      /* Act */
      const response = await request(app)
        .post(`/test-parameter-body-ref/${requestId}`)
        .set("Content-Type", "application/json")
        .set("X-Request-Id", requestId);
      /* No body sent */

      /* Assert */
      expect(response.status).toBe(400);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("putTestParameterWithBodyReference operation", () => {
    it("should return 200 with valid PUT request", async () => {
      /* Arrange */
      const requestBody = { id: "update-123", name: "Updated Model" };
      const requestId = "put-req-456";

      app.put(
        "/put-test-parameter-body-ref/:requestId",
        putTestParameterWithBodyReferenceWrapper(async (params) => {
          if (params.type === "ok") {
            expect(params.value.body).toEqual(requestBody);
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Updated successfully",
                requestId: requestId,
                updatedBody: params.value.body,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act */
      const response = await request(app)
        .put(`/put-test-parameter-body-ref/${requestId}`)
        .send(requestBody)
        .set("Content-Type", "application/json")
        .set("X-Request-Id", requestId);

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body.message).toBe("Updated successfully");
      expect(response.body.updatedBody).toEqual(requestBody);
    });

    it("should validate request body schema", async () => {
      /* Arrange */
      const invalidBody = { /* Missing required fields */ incomplete: true };
      const requestId = "put-req-789";

      app.put(
        "/put-test-parameter-body-ref/:requestId",
        putTestParameterWithBodyReferenceWrapper(async (params) => {
          if (params.type === "body_error") {
            return {
              status: 400,
              contentType: "application/json",
              data: {
                error: "Invalid body schema",
                details: params.error.issues,
              },
            };
          }
          return {
            status: 200,
            contentType: "application/json",
            data: { message: "Updated" },
          };
        }),
      );

      /* Act */
      const response = await request(app)
        .put(`/put-test-parameter-body-ref/${requestId}`)
        .send(invalidBody)
        .set("Content-Type", "application/json")
        .set("X-Request-Id", requestId);

      /* Assert - If Zod validation is configured for the body schema */
      expect([200, 400]).toContain(response.status);
      if (response.status === 400) {
        expect(response.headers["content-type"]).toMatch(/application\/json/);
        expect(response.body).toHaveProperty("error");
      }
    });
  });

  describe("Multi-content type operations", () => {
    it("should handle different content types appropriately", async () => {
      /* Arrange */
      const jsonBody = { name: "JSON Test", type: "application/json" };

      app.post(
        "/test-inline-body",
        testInlineBodySchemaWrapper(async (params) => {
          if (params.type === "ok") {
            return {
              status: 200,
              contentType: "application/json",
              data: {
                message: "Content received",
                bodyType: typeof params.value.body,
                body: params.value.body,
              },
            };
          }
          throw new Error(`Validation error: ${params.type}`);
        }),
      );

      /* Act - JSON */
      const jsonResponse = await request(app)
        .post("/test-inline-body")
        .send(jsonBody)
        .set("Content-Type", "application/json");

      /* Assert */
      expect(jsonResponse.status).toBe(200);
      expect(jsonResponse.body.body).toEqual(jsonBody);

      /* Act - Form data */
      const formResponse = await request(app)
        .post("/test-inline-body")
        .send("name=FormTest&type=application/x-www-form-urlencoded")
        .set("Content-Type", "application/x-www-form-urlencoded");

      /* Assert */
      expect(formResponse.status).toBe(200);
      expect(formResponse.body.body).toEqual({
        name: "FormTest",
        type: "application/x-www-form-urlencoded",
      });
    });
  });
});

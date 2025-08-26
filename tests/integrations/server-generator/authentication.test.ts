import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import type { Express } from "express";

import { testAuthBearerWrapper } from "./generated/server-operations/testAuthBearer.js";
import { testAuthBearerHttpWrapper } from "./generated/server-operations/testAuthBearerHttp.js";
import { testSimpleTokenWrapper } from "./generated/server-operations/testSimpleToken.js";
import { createTestApp, createExpressAdapter, testData } from "./test-utils.js";

describe("Server Generator - Authentication Operations", () => {
  let app: Express;

  beforeEach(() => {
    app = createTestApp();
  });

  describe("testAuthBearer operation", () => {
    it("should return 200 with valid Person when all required parameters are provided", async () => {
      /* Arrange */
      const adapter = createExpressAdapter(testAuthBearerWrapper);
      app.get("/test-auth-bearer", adapter(async (params) => {
        if (params.type === "ok") {
          return {
            status: 200,
            contentType: "application/json",
            data: testData.person,
          };
        }
        /* Handle validation errors by returning appropriate error response */
        throw new Error(`Validation error: ${params.type}`);
      }));

      /* Act */
      const response = await request(app)
        .get("/test-auth-bearer")
        .query({
          qr: testData.queryParams.qr,
          qo: testData.queryParams.qo,
          cursor: testData.queryParams.cursor,
        })
        .set("Authorization", testData.headers.Authorization);

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toEqual(testData.person);
    });

    it("should handle missing required query parameter", async () => {
      /* Arrange */
      const adapter = createExpressAdapter(testAuthBearerWrapper);
      app.get("/test-auth-bearer", adapter(async (params) => {
        if (params.type === "query_error") {
          return {
            status: 400,
            contentType: "application/json",
            data: { error: "Invalid query parameters", details: params.error.issues },
          };
        }
        return {
          status: 200,
          contentType: "application/json",
          data: testData.person,
        };
      }));

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
        ])
      );
    });

    it("should handle invalid cursor parameter (too short)", async () => {
      /* Arrange */
      const adapter = createExpressAdapter(testAuthBearerWrapper);
      app.get("/test-auth-bearer", adapter(async (params) => {
        if (params.type === "query_error") {
          return {
            status: 400,
            contentType: "application/json",
            data: { error: "Invalid query parameters", details: params.error.issues },
          };
        }
        return {
          status: 200,
          contentType: "application/json",
          data: testData.person,
        };
      }));

      /* Act */
      const response = await request(app)
        .get("/test-auth-bearer")
        .query({
          qr: testData.queryParams.qr,
          qo: testData.queryParams.qo,
          cursor: "", /* Empty cursor violates minLength: 1 */
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
        ])
      );
    });
  });

  describe("testAuthBearerHttp operation", () => {
    it("should return 200 with valid response when authenticated", async () => {
      /* Arrange */
      app.get("/test-auth-bearer-http", testAuthBearerHttpWrapper(async (params) => {
        if (params.type === "ok") {
          return {
            status: 200,
            contentType: "application/json",
            data: testData.person,
          };
        }
        throw new Error(`Validation error: ${params.type}`);
      }));

      /* Act */
      const response = await request(app)
        .get("/test-auth-bearer-http")
        .query({
          qr: testData.queryParams.qr,
          qo: testData.queryParams.qo,
          cursor: testData.queryParams.cursor,
        })
        .set("Authorization", testData.headers.Authorization);

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toEqual(testData.person);
    });
  });

  describe("testSimpleToken operation", () => {
    it("should return 200 with valid response when using custom token header", async () => {
      /* Arrange */
      app.get("/test-simple-token", testSimpleTokenWrapper(async (params) => {
        if (params.type === "ok") {
          return {
            status: 200,
            contentType: "application/json",
            data: testData.person,
          };
        }
        throw new Error(`Validation error: ${params.type}`);
      }));

      /* Act */
      const response = await request(app)
        .get("/test-simple-token")
        .query({
          qr: testData.queryParams.qr,
          qo: testData.queryParams.qo,
          cursor: testData.queryParams.cursor,
        })
        .set("X-Functions-Key", testData.headers["X-Functions-Key"]);

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toEqual(testData.person);
    });

    it("should handle missing query parameters gracefully", async () => {
      /* Arrange */
      app.get("/test-simple-token", testSimpleTokenWrapper(async (params) => {
        if (params.type === "query_error") {
          return {
            status: 400,
            contentType: "application/json",
            data: { error: "Missing required parameters", details: params.error.issues },
          };
        }
        return {
          status: 200,
          contentType: "application/json",
          data: testData.person,
        };
      }));

      /* Act */
      const response = await request(app)
        .get("/test-simple-token")
        .query({
          /* Missing all required parameters */
        })
        .set("X-Functions-Key", testData.headers["X-Functions-Key"]);

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
        ])
      );
    });
  });
});
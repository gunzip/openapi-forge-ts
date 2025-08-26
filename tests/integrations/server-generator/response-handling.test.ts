import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";

import { testMultipleSuccessWrapper } from./generated/server-operations/testMultipleSuccess.js";
import { testResponseHeaderWrapper } from./generated/server-operations/testResponseHeader.js";
import {
  createTestApp,
  createExpressAdapter,
  testData,
  setupTestRoutes,
} from "./test-utils.js";

describe("Server Generator - Response Handling Operations (Fixed)", () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
    setupTestRoutes(app);

    // Setup testMultipleSuccess routes
    app.get(
      "/test-multiple-success-200",
      createExpressAdapter(testMultipleSuccessWrapper)(async (params) => {
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

    app.get(
      "/test-multiple-success-202",
      createExpressAdapter(testMultipleSuccessWrapper)(async (params) => {
        if (params.type === "ok") {
          return {
            status: 202,
            contentType: "text/plain",
            data: undefined, // 202 has void data according to the spec
          };
        }
        throw new Error(`Validation error: ${params.type}`);
      }),
    );

    app.get(
      "/test-multiple-success-403",
      createExpressAdapter(testMultipleSuccessWrapper)(async (params) => {
        if (params.type === "ok") {
          const oneOfTestData = {
            type: "error",
            message: "Access denied",
            code: 403,
          };
          return {
            status: 403,
            contentType: "application/json",
            data: oneOfTestData,
          };
        }
        throw new Error(`Validation error: ${params.type}`);
      }),
    );

    app.get(
      "/test-multiple-success-404",
      createExpressAdapter(testMultipleSuccessWrapper)(async (params) => {
        if (params.type === "ok") {
          return {
            status: 404,
            contentType: "text/plain",
            data: undefined, // 404 has void data according to the spec
          };
        }
        throw new Error(`Validation error: ${params.type}`);
      }),
    );

    // Setup testResponseHeader routes
    app.get(
      "/test-response-header-201",
      createExpressAdapter(testResponseHeaderWrapper)(async (params) => {
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
  });

  describe("testMultipleSuccess operation", () => {
    it("should return 200 with Message data", async () => {
      const response = await request(app).get("/test-multiple-success-200");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toEqual(testData.message);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("content");
      expect(response.body.content).toHaveProperty("markdown");
    });

    it("should return 202 accepted response", async () => {
      const response = await request(app).get("/test-multiple-success-202");

      expect(response.status).toBe(202);
      expect(response.headers["content-type"]).toMatch(/text\/plain/);
      expect(response.text).toBe(""); // void data should result in empty body
    });

    it("should return 403 forbidden with OneOfTest data", async () => {
      const response = await request(app).get("/test-multiple-success-403");

      expect(response.status).toBe(403);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toHaveProperty("type", "error");
      expect(response.body).toHaveProperty("message", "Access denied");
      expect(response.body).toHaveProperty("code", 403);
    });

    it("should return 404 not found", async () => {
      const response = await request(app).get("/test-multiple-success-404");

      expect(response.status).toBe(404);
      expect(response.headers["content-type"]).toMatch(/text\/plain/);
      expect(response.text).toBe(""); // void data should result in empty body
    });
  });

  describe("testResponseHeader operation", () => {
    it("should return 201 with Message data and response headers", async () => {
      const response = await request(app).get("/test-response-header-201");

      expect(response.status).toBe(201);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toEqual(testData.message);
      expect(response.body).toHaveProperty("id");
      expect(response.body).toHaveProperty("content");
    });
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";

import { testMultiContentTypesWrapper } from../generated/server-operations/testMultiContentTypes.js";
import {
  createTestApp,
  createExpressAdapter,
  setupTestRoutes,
} from "./test-utils.js";

describe("Server Generator - Multi-Content-Type Operations (Fixed)", () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
    setupTestRoutes(app);

    // Setup testMultiContentTypes route
    app.post(
      "/test-multi-content-types",
      createExpressAdapter(testMultiContentTypesWrapper)(async (params) => {
        if (params.type === "ok") {
          // Echo back the received data with some metadata matching NewModel schema
          const responseData = {
            id: "generated-id-" + Date.now(),
            name: "Response from server",
            description: "Content type test successful",
            timestamp: new Date().toISOString(),
            receivedData: params.value.body,
          };

          return {
            status: 200,
            contentType: "application/json",
            data: responseData,
          };
        }

        // Handle validation errors
        if (params.type === "body_error") {
          throw new Error(`Body validation error: ${params.error.message}`);
        }

        throw new Error(`Validation error: ${params.type}`);
      }),
    );
  });

  describe("testMultiContentTypes operation", () => {
    it("should handle application/json content type", async () => {
      const jsonPayload = {
        name: "JSON Test",
        description: "Testing JSON content type",
        timestamp: new Date().toISOString(),
      };

      const response = await request(app)
        .post("/test-multi-content-types")
        .send(jsonPayload)
        .set("Content-Type", "application/json");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toHaveProperty("name", "Response from server");
      expect(response.body).toHaveProperty(
        "description",
        "Content type test successful",
      );
      expect(response.body).toHaveProperty("receivedData");
      expect(response.body.receivedData).toEqual(jsonPayload);
    });

    it("should handle application/x-www-form-urlencoded content type", async () => {
      const formData = {
        field1: "value1",
        field2: "value2",
        field3: "value3",
      };

      const response = await request(app)
        .post("/test-multi-content-types")
        .send(formData)
        .set("Content-Type", "application/x-www-form-urlencoded");

      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toHaveProperty("name", "Response from server");
      expect(response.body).toHaveProperty(
        "description",
        "Content type test successful",
      );
      expect(response.body).toHaveProperty("receivedData");
      expect(response.body.receivedData).toEqual(formData);
    });
  });
});

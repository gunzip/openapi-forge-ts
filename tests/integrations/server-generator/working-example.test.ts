import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import type { Express } from "express";

import { testAuthBearerWrapper } from./generated/server-operations/testAuthBearer.js";
import {
  createTestApp,
  createExpressAdapter,
  testData,
  setupTestRoutes,
  setupTestAuthBearerRoutes,
} from "./test-utils.js";

describe("Server Generator - Working Example (Clean)", () => {
  let app: Express;

  beforeAll(() => {
    app = createTestApp();
    setupTestRoutes(app);
    setupTestAuthBearerRoutes(app);
  });

  describe("testAuthBearer operation", () => {
    it("should return 200 with valid Person when all required parameters are provided", async () => {
      /* Act - Test simple endpoint first */
      const simpleResponse = await request(app).get("/simple-test");

      /* Act - Then test our actual endpoint */
      const response = await request(app)
        .get("/test-auth-bearer")
        .query(testData.queryParams)
        .set("Authorization", testData.headers.Authorization);

      /* Assert */
      expect(response.status).toBe(200);
      expect(response.headers["content-type"]).toMatch(/application\/json/);
      expect(response.body).toEqual(testData.person);

      /* Test the 403 endpoint to verify our fix */
      const response403 = await request(app)
        .get("/test-auth-bearer-403")
        .query(testData.queryParams)
        .set("Authorization", testData.headers.Authorization);

      /* Verify 403 works */
      expect(response403.status).toBe(403);
      expect(response403.text).toBe(""); // void data should result in empty body
    });

    it("should handle missing required query parameter 'qr'", async () => {
      /* Act - test with missing required parameter */
      const response = await request(app)
        .get("/test-auth-bearer")
        .query({
          qo: testData.queryParams.qo,
          cursor: testData.queryParams.cursor,
          /* Missing required 'qr' parameter */
        })
        .set("Authorization", testData.headers.Authorization);

      /* Assert - should return 403 for validation error */
      expect(response.status).toBe(403);
      expect(response.text).toBe(""); // void data should result in empty body
    });

    it("should handle invalid cursor parameter (too short)", async () => {
      /* Act - test with invalid cursor */
      const response = await request(app)
        .get("/test-auth-bearer")
        .query({
          qr: testData.queryParams.qr,
          qo: testData.queryParams.qo,
          cursor: "", // Too short - should fail min(1) validation
        })
        .set("Authorization", testData.headers.Authorization);

      /* Assert - should return 403 for validation error */
      expect(response.status).toBe(403);
      expect(response.text).toBe(""); // void data should result in empty body
    });
  });
});

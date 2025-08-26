import { describe, it, expect } from "vitest";

import { testAuthBearerWrapper } from "../generated/server-operations/testAuthBearer.js";
import { testInlineBodySchemaWrapper } from "../generated/server-operations/testInlineBodySchema.js";
import { testOverriddenSecurityNoAuthWrapper } from "../generated/server-operations/testOverriddenSecurityNoAuth.js";

describe("Server Generator Integration Summary", () => {
  describe("Wrapper Function Generation", () => {
    it("should generate wrapper functions for all operations", () => {
      /* Assert that all wrapper functions are generated and callable */
      expect(testAuthBearerWrapper).toBeInstanceOf(Function);
      expect(testInlineBodySchemaWrapper).toBeInstanceOf(Function);
      expect(testOverriddenSecurityNoAuthWrapper).toBeInstanceOf(Function);
    });

    it("should validate parameters using Zod schemas", async () => {
      /* Arrange */
      let receivedParams: any;
      const handler = async (params: any) => {
        receivedParams = params;
        return {
          status: 200,
          contentType: "application/json",
          data: { success: true },
        };
      };

      const wrapper = testAuthBearerWrapper(handler);

      /* Act - Valid parameters */
      const validResult = await wrapper({
        query: { qr: "required", qo: "optional", cursor: "test" },
        path: {},
        headers: {},
        body: undefined,
      });

      /* Assert */
      expect(receivedParams.type).toBe("ok");
      expect(receivedParams.value.query).toEqual({
        qr: "required",
        qo: "optional",
        cursor: "test",
      });
      expect(validResult.status).toBe(200);
    });

    it("should handle validation errors properly", async () => {
      /* Arrange */
      let receivedParams: any;
      const handler = async (params: any) => {
        receivedParams = params;
        return {
          status: params.type === "ok" ? 200 : 400,
          contentType: "application/json",
          data: {
            error: params.type !== "ok" ? params.error.issues : undefined,
          },
        };
      };

      const wrapper = testAuthBearerWrapper(handler);

      /* Act - Invalid parameters (missing required 'qr') */
      const invalidResult = await wrapper({
        query: { qo: "optional", cursor: "test" } /* Missing 'qr' */,
        path: {},
        headers: {},
        body: undefined,
      });

      /* Assert */
      expect(receivedParams.type).toBe("query_error");
      expect(receivedParams.error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            path: expect.arrayContaining(["qr"]),
            code: "invalid_type",
          }),
        ]),
      );
      expect(invalidResult.status).toBe(400);
    });

    it("should handle request bodies correctly", async () => {
      /* Arrange */
      let receivedParams: any;
      const handler = async (params: any) => {
        receivedParams = params;
        return {
          status: 200,
          contentType: "application/json",
          data: { received: params.value?.body },
        };
      };

      const wrapper = testInlineBodySchemaWrapper(handler);
      const testBody = { name: "Test", age: 30 };

      /* Act */
      const result = await wrapper({
        query: {},
        path: {},
        headers: {},
        body: testBody,
      });

      /* Assert */
      expect(receivedParams.type).toBe("ok");
      expect(receivedParams.value.body).toEqual(testBody);
      expect(result.status).toBe(200);
    });

    it("should demonstrate the complete server-generator pattern", async () => {
      /* Arrange - This test demonstrates the complete integration pattern */
      const operations = [
        {
          name: "Authentication Operation",
          wrapper: testAuthBearerWrapper,
          request: {
            query: { qr: "required", qo: "optional", cursor: "test" },
            path: {},
            headers: {},
            body: undefined,
          },
        },
        {
          name: "Body Operation",
          wrapper: testInlineBodySchemaWrapper,
          request: {
            query: {},
            path: {},
            headers: {},
            body: { name: "Test", value: 123 },
          },
        },
        {
          name: "No Auth Operation",
          wrapper: testOverriddenSecurityNoAuthWrapper,
          request: {
            query: {},
            path: {},
            headers: {},
            body: undefined,
          },
        },
      ];

      /* Act & Assert - Test each operation type */
      for (const operation of operations) {
        const handler = async (params: any) => {
          return {
            status: params.type === "ok" ? 200 : 400,
            contentType: "application/json",
            data: {
              operation: operation.name,
              validationResult: params.type,
              data: params.type === "ok" ? params.value : undefined,
            },
          };
        };

        const wrapper = operation.wrapper(handler);
        const result = await wrapper(operation.request);

        expect(result.status).toBe(200);
        expect(result.data.operation).toBe(operation.name);
        expect(result.data.validationResult).toBe("ok");
      }
    });
  });

  describe("Type Safety and Runtime Validation", () => {
    it("should provide fully typed interfaces", () => {
      /* This test demonstrates the type safety provided by server-generator */

      /* Wrapper functions are properly typed */
      const wrapper = testAuthBearerWrapper(async (params) => {
        /* TypeScript ensures proper handling of all validation cases */
        switch (params.type) {
          case "ok":
            /* params.value is properly typed with validated parameters */
            expect(typeof params.value.query.qr).toBe("string");
            expect(typeof params.value.query.cursor).toBe("string");
            break;
          case "query_error":
          case "path_error":
          case "headers_error":
          case "body_error":
            /* params.error contains Zod validation errors */
            expect(params.error.issues).toBeInstanceOf(Array);
            break;
        }

        return {
          status: 200,
          contentType: "application/json",
          data: { success: true },
        };
      });

      expect(wrapper).toBeInstanceOf(Function);
    });

    it("should integrate seamlessly with Express.js patterns", async () => {
      /* This test shows how the wrappers integrate with Express */

      /* Mock Express request/response pattern */
      const mockExpressReq = {
        query: { qr: "test", qo: "optional", cursor: "cursor" },
        params: {},
        headers: {},
        body: undefined,
      };

      const handler = async (params: any) => {
        if (params.type === "ok") {
          return {
            status: 200,
            contentType: "application/json",
            data: {
              message: "Express integration working",
              receivedQuery: params.value.query,
            },
          };
        }
        throw new Error("Validation failed");
      };

      const wrapper = testAuthBearerWrapper(handler);

      /* Convert Express request to wrapper format */
      const wrapperRequest = {
        query: mockExpressReq.query,
        path: mockExpressReq.params,
        headers: mockExpressReq.headers,
        body: mockExpressReq.body,
      };

      /* Call wrapper */
      const result = await wrapper(wrapperRequest);

      /* Assert Express-compatible response */
      expect(result.status).toBe(200);
      expect(result.contentType).toBe("application/json");
      expect(result.data.message).toBe("Express integration working");
      expect(result.data.receivedQuery).toEqual(mockExpressReq.query);
    });
  });
});

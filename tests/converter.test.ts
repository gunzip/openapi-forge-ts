import { describe, expect, it } from "vitest";

import {
  convertOpenAPI20to30,
  convertOpenAPI30to31,
  convertToOpenAPI31,
  isOpenAPI20,
  isOpenAPI30,
  isOpenAPI31,
} from "../src/core-generator/converter.js";

describe("OpenAPI Converter", () => {
  describe("Version detection", () => {
    it("should detect OpenAPI specification versions correctly", () => {
      const swagger20 = {
        info: { title: "Test", version: "1.0.0" },
        swagger: "2.0",
      };
      const openapi30 = {
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.0.1",
      };
      const openapi31 = {
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.1.0",
      };

      // Test OpenAPI 2.0 detection
      expect(isOpenAPI20(swagger20)).toBe(true);
      expect(isOpenAPI30(swagger20)).toBe(false);
      expect(isOpenAPI31(swagger20)).toBe(false);

      // Test OpenAPI 3.0 detection
      expect(isOpenAPI20(openapi30)).toBe(false);
      expect(isOpenAPI30(openapi30)).toBe(true);
      expect(isOpenAPI31(openapi30)).toBe(false);

      // Test OpenAPI 3.1 detection
      expect(isOpenAPI20(openapi31)).toBe(false);
      expect(isOpenAPI30(openapi31)).toBe(false);
      expect(isOpenAPI31(openapi31)).toBe(true);
    });
  });

  describe("OpenAPI 3.0 to 3.1 conversion", () => {
    it("should convert nullable properties to type arrays", () => {
      const openapi30 = {
        components: {
          schemas: {
            User: {
              properties: {
                age: { nullable: false, type: "integer" },
                name: { nullable: true, type: "string" },
              },
              type: "object",
            },
          },
        },
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.0.1",
        paths: {},
      };

      const result = convertOpenAPI30to31(openapi30 as any);

      expect(result.openapi).toBe("3.1.0");
      const userSchema = result.components?.schemas?.User as any;
      expect(userSchema.properties.name.type).toEqual(["string", "null"]);
      expect(userSchema.properties.name.nullable).toBeUndefined();
      expect(userSchema.properties.age.nullable).toBeUndefined();
    });

    it("should convert exclusiveMinimum/Maximum from boolean to numeric", () => {
      const openapi30 = {
        components: {
          schemas: {
            NumberTest: {
              exclusiveMaximum: true,
              exclusiveMinimum: true,
              maximum: 100,
              minimum: 0,
              type: "number",
            },
          },
        },
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.0.1",
        paths: {},
      };

      const result = convertOpenAPI30to31(openapi30 as any);
      const schema = result.components?.schemas?.NumberTest as any;

      expect(schema.exclusiveMinimum).toBe(0);
      expect(schema.minimum).toBeUndefined();
      expect(schema.exclusiveMaximum).toBe(100);
      expect(schema.maximum).toBeUndefined();
    });

    it("should convert example to examples array", () => {
      const openapi30 = {
        components: {
          schemas: {
            StringTest: {
              example: "test value",
              type: "string",
            },
          },
        },
        info: { title: "Test", version: "1.0.0" },
        openapi: "3.0.1",
        paths: {},
      };

      const result = convertOpenAPI30to31(openapi30 as any);
      const schema = result.components?.schemas?.StringTest as any;

      expect(schema.examples).toEqual(["test value"]);
      expect(schema.example).toBeUndefined();
    });
  });

  describe("Swagger 2.0 to OpenAPI 3.0 conversion", () => {
    it("should convert Swagger 2.0 to OpenAPI 3.0", async () => {
      const swagger20 = {
        basePath: "/v1",
        host: "api.example.com",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/users": {
            get: {
              responses: {
                "200": {
                  description: "Success",
                  schema: { items: { type: "string" }, type: "array" },
                },
              },
              summary: "Get users",
            },
          },
        },
        schemes: ["https"],
        swagger: "2.0",
      };

      const result = await convertOpenAPI20to30(swagger20);

      expect(result.openapi).toBe("3.0.0");
      expect(result.servers).toBeDefined();
      expect(result.servers?.[0]?.url).toBe("https://api.example.com/v1");
      expect(
        (result.paths as any)["/users"].get.responses["200"].content,
      ).toBeDefined();
    });
  });

  describe("Universal conversion", () => {
    it("should convert OpenAPI 2.0 to 3.1 through convertToOpenAPI31", async () => {
      const swagger20 = {
        host: "api.example.com",
        info: { title: "Test API", version: "1.0.0" },
        paths: {
          "/test": {
            get: {
              responses: {
                "200": {
                  description: "Success",
                  schema: { nullable: true, type: "string" },
                },
              },
            },
          },
        },
        swagger: "2.0",
      };

      const result = await convertToOpenAPI31(swagger20);

      expect(result.openapi).toBe("3.1.0");
      expect(result.servers).toBeDefined();

      // Check that nullable was converted properly during the 2.0 -> 3.0 -> 3.1 chain
      const responseSchema = (result.paths as any)["/test"].get.responses["200"]
        .content["*/*"].schema;
      expect(responseSchema.type).toEqual(["string", "null"]);
    });

    it("should pass through OpenAPI 3.1 unchanged", async () => {
      const openapi31 = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "3.1.0",
        paths: {},
      };

      const result = await convertToOpenAPI31(openapi31);

      expect(result).toBe(openapi31); // Should be the same object
    });

    it("should throw error for unsupported versions", async () => {
      const unsupported = {
        info: { title: "Test API", version: "1.0.0" },
        openapi: "4.0.0",
      };

      await expect(convertToOpenAPI31(unsupported)).rejects.toThrow(
        "Unsupported OpenAPI version: 4.0.0",
      );
    });
  });
});

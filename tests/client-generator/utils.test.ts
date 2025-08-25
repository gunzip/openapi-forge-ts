import type { ParameterObject, ResponseObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import {
  generatePathInterpolation,
  getResponseContentType,
  toCamelCase,
  toValidVariableName,
} from "../../src/client-generator/utils.js";

describe("client-generator utils", () => {
  describe("toCamelCase", () => {
    it("should convert kebab-case to camelCase", () => {
      expect(toCamelCase("hello-world")).toBe("helloWorld");
      expect(toCamelCase("user-profile-data")).toBe("userProfileData");
      expect(toCamelCase("api-key")).toBe("apiKey");
    });

    it("should handle edge cases", () => {
      expect(toCamelCase("hello")).toBe("hello"); // single word
      expect(toCamelCase("")).toBe(""); // empty string
      expect(toCamelCase("alreadyCamelCase")).toBe("alreadyCamelCase"); // no hyphens
      expect(toCamelCase("test--case")).toBe("testCase"); // multiple consecutive hyphens
      expect(toCamelCase("-test-case-")).toBe("testCase"); // hyphens at start/end
      expect(toCamelCase("test-Case")).toBe("testCase"); // uppercase after hyphens
      expect(toCamelCase("TEST-CASE")).toBe("testCase"); // all uppercase
      expect(toCamelCase("test-123-case")).toBe("test123Case"); // numbers
      expect(toCamelCase("---")).toBe(""); // only separators
    });
  });

  describe("toValidVariableName", () => {
    it("should convert special characters to valid variable name", () => {
      expect(toValidVariableName("hello@world.com")).toBe("helloWorldCom");
      expect(toValidVariableName("test#name!")).toBe("testName");
    });

    it("should handle various character types", () => {
      expect(toValidVariableName("hello world")).toBe("helloWorld"); // spaces
      expect(toValidVariableName("test  multiple   spaces")).toBe(
        "testMultipleSpaces",
      ); // multiple spaces
      expect(toValidVariableName("test123")).toBe("test123"); // numbers
      expect(toValidVariableName("123test")).toBe("123test"); // numbers at start
      expect(toValidVariableName("test-name_123@domain.com")).toBe(
        "testName_123DomainCom",
      ); // mixed characters
    });

    it("should handle edge cases", () => {
      expect(toValidVariableName("@#$%")).toBe(""); // only special characters
      expect(toValidVariableName("")).toBe(""); // empty string
      expect(toValidVariableName("test___name")).toBe("testName"); // multiple consecutive underscores
      expect(toValidVariableName("_test_name_")).toBe("testName"); // leading/trailing underscores
      expect(toValidVariableName("test_user_profile")).toBe("testUserProfile"); // camelCase after underscores
    });
  });

  describe("generatePathInterpolation", () => {
    it("should interpolate path parameters", () => {
      const singleParam: ParameterObject[] = [
        { in: "path", name: "userId", required: true },
      ];
      expect(generatePathInterpolation("/users/{userId}", singleParam)).toBe(
        "/users/${userId}",
      );

      const multipleParams: ParameterObject[] = [
        { in: "path", name: "userId", required: true },
        { in: "path", name: "postId", required: true },
      ];
      expect(
        generatePathInterpolation(
          "/users/{userId}/posts/{postId}",
          multipleParams,
        ),
      ).toBe("/users/${userId}/posts/${postId}");
    });

    it("should convert parameter names to camelCase", () => {
      const kebabParams: ParameterObject[] = [
        { in: "path", name: "user-id", required: true },
        { in: "path", name: "post-id", required: true },
      ];
      expect(
        generatePathInterpolation(
          "/users/{user-id}/posts/{post-id}",
          kebabParams,
        ),
      ).toBe("/users/${userId}/posts/${postId}");

      const complexParams: ParameterObject[] = [
        { in: "path", name: "user_id", required: true },
        { in: "path", name: "complex-param-name", required: true },
      ];
      expect(
        generatePathInterpolation(
          "/users/{user_id}/data/{complex-param-name}",
          complexParams,
        ),
      ).toBe("/users/${userId}/data/${complexParamName}");
    });

    it("should handle edge cases", () => {
      expect(generatePathInterpolation("/users", [])).toBe("/users"); // no parameters
      expect(generatePathInterpolation("", [])).toBe(""); // empty path

      const nonExistentParam: ParameterObject[] = [
        { in: "path", name: "nonExistent", required: true },
      ];
      expect(
        generatePathInterpolation("/users/{userId}", nonExistentParam),
      ).toBe("/users/{userId}"); // parameter not in path
    });
  });

  describe("getResponseContentType", () => {
    it("should return application/json when available", () => {
      const response: ResponseObject = {
        content: {
          "application/json": { schema: { type: "object" } },
          "text/plain": { schema: { type: "string" } },
        },
        description: "Success",
      };

      const result = getResponseContentType(response);
      expect(result).toBe("application/json");
    });

    it("should return application/problem+json when application/json not available", () => {
      const response: ResponseObject = {
        content: {
          "application/problem+json": { schema: { type: "object" } },
          "text/plain": { schema: { type: "string" } },
        },
        description: "Error",
      };

      const result = getResponseContentType(response);
      expect(result).toBe("application/problem+json");
    });

    it("should return other +json content types", () => {
      const response: ResponseObject = {
        content: {
          "application/vnd.api+json": { schema: { type: "object" } },
          "text/plain": { schema: { type: "string" } },
        },
        description: "Success",
      };

      const result = getResponseContentType(response);
      expect(result).toBe("application/vnd.api+json");
    });

    it("should return first content type when no JSON types available", () => {
      const response: ResponseObject = {
        content: {
          "application/xml": { schema: { type: "object" } },
          "text/plain": { schema: { type: "string" } },
        },
        description: "Success",
      };

      const result = getResponseContentType(response);
      expect(result).toBe("application/xml"); // Should be first in object keys
    });

    it("should return null when no content defined", () => {
      const response: ResponseObject = {
        description: "No content",
      };

      const result = getResponseContentType(response);
      expect(result).toBeNull();
    });

    it("should return null when content is empty object", () => {
      const response: ResponseObject = {
        content: {},
        description: "Empty content",
      };

      const result = getResponseContentType(response);
      expect(result).toBeNull();
    });

    it("should prefer application/json over application/problem+json", () => {
      const response: ResponseObject = {
        content: {
          "application/json": { schema: { type: "object" } },
          "application/problem+json": { schema: { type: "object" } },
        },
        description: "Success",
      };

      const result = getResponseContentType(response);
      expect(result).toBe("application/json");
    });

    it("should handle custom JSON content types", () => {
      const response: ResponseObject = {
        content: {
          "application/vnd.custom+json": { schema: { type: "object" } },
          "text/plain": { schema: { type: "string" } },
        },
        description: "Success",
      };

      const result = getResponseContentType(response);
      expect(result).toBe("application/vnd.custom+json");
    });
  });
});

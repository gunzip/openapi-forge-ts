/* Tests for template index module and coordination functionality */

import { describe, expect, it } from "vitest";
import {
  createTemplateContext,
  getAllTemplateFunctions,
  getTemplateCategory,
  getTemplateStats,
  renderModule,
  TEMPLATE_REGISTRY,
  validateAllTemplates,
} from "../../src/client-generator/templates/index.js";

describe("Template Index", () => {
  describe("TEMPLATE_REGISTRY", () => {
    it("should export all template categories", () => {
      expect(TEMPLATE_REGISTRY).toBeDefined();
      expect(TEMPLATE_REGISTRY.config).toBeDefined();
      expect(TEMPLATE_REGISTRY.contentType).toBeDefined();
      expect(TEMPLATE_REGISTRY.functionBody).toBeDefined();
      expect(TEMPLATE_REGISTRY.operation).toBeDefined();
      expect(TEMPLATE_REGISTRY.parameter).toBeDefined();
      expect(TEMPLATE_REGISTRY.requestBody).toBeDefined();
      expect(TEMPLATE_REGISTRY.response).toBeDefined();
      expect(TEMPLATE_REGISTRY.security).toBeDefined();
    });

    it("should contain template functions in each category", () => {
      /* Check config templates */
      expect(typeof TEMPLATE_REGISTRY.config.renderApiResponseTypes).toBe("function");
      expect(typeof TEMPLATE_REGISTRY.config.renderConfigInterface).toBe("function");

      /* Check response templates */
      expect(typeof TEMPLATE_REGISTRY.response.renderApiResponseType).toBe("function");
      expect(typeof TEMPLATE_REGISTRY.response.renderUnionType).toBe("function");

      /* Check operation templates */
      expect(typeof TEMPLATE_REGISTRY.operation.renderOperationFunction).toBe("function");
      expect(typeof TEMPLATE_REGISTRY.operation.buildParameterDeclaration).toBe("function");
    });
  });

  describe("getTemplateCategory", () => {
    it("should return correct template category", () => {
      const configCategory = getTemplateCategory("config");
      expect(configCategory).toBe(TEMPLATE_REGISTRY.config);

      const responseCategory = getTemplateCategory("response");
      expect(responseCategory).toBe(TEMPLATE_REGISTRY.response);
    });
  });

  describe("getAllTemplateFunctions", () => {
    it("should return all template functions with namespaced names", () => {
      const allFunctions = getAllTemplateFunctions();
      
      expect(allFunctions).toBeDefined();
      expect(typeof allFunctions).toBe("object");
      
      /* Check for specific functions */
      expect(allFunctions["config.renderApiResponseTypes"]).toBeDefined();
      expect(allFunctions["response.renderApiResponseType"]).toBeDefined();
      expect(allFunctions["operation.renderOperationFunction"]).toBeDefined();
      
      /* Ensure functions are actually functions */
      expect(typeof allFunctions["config.renderApiResponseTypes"]).toBe("function");
    });

    it("should include functions from all categories", () => {
      const allFunctions = getAllTemplateFunctions();
      const functionNames = Object.keys(allFunctions);
      
      /* Check that we have functions from each category */
      const hasConfigFunctions = functionNames.some(name => name.startsWith("config."));
      const hasResponseFunctions = functionNames.some(name => name.startsWith("response."));
      const hasOperationFunctions = functionNames.some(name => name.startsWith("operation."));
      
      expect(hasConfigFunctions).toBe(true);
      expect(hasResponseFunctions).toBe(true);
      expect(hasOperationFunctions).toBe(true);
    });
  });

  describe("validateAllTemplates", () => {
    it("should validate all templates in the registry", () => {
      const { results, overallValid } = validateAllTemplates();
      
      expect(results).toBeDefined();
      expect(typeof overallValid).toBe("boolean");
      expect(Object.keys(results).length).toBeGreaterThan(0);
      
      /* Check structure of results */
      for (const [templateName, result] of Object.entries(results)) {
        expect(templateName).toContain(".");
        expect(result).toHaveProperty("isValid");
        expect(result).toHaveProperty("errors");
        expect(result).toHaveProperty("warnings");
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
      }
    });

    it("should handle template functions that require specific input", () => {
      /* This test ensures that template validation handles functions 
         that might throw when called with empty input */
      const { results } = validateAllTemplates();
      
      /* Should have results even if some templates failed validation */
      expect(Object.keys(results).length).toBeGreaterThan(0);
      
      /* Each result should have the expected structure */
      for (const result of Object.values(results)) {
        expect(result).toHaveProperty("isValid");
        expect(typeof result.isValid).toBe("boolean");
      }
    });
  });

  describe("renderModule", () => {
    it("should combine templates into a module", () => {
      const templates = [
        "const first = 'template';",
        "const second = 'template';",
      ];
      
      const result = renderModule(templates);
      expect(result).toContain("const first");
      expect(result).toContain("const second");
      expect(result).toContain("\n\n");
    });

    it("should add module header and footer", () => {
      const templates = ["const content = 'test';"];
      const options = {
        moduleFooter: "/* End of module */",
        moduleHeader: "/* Generated module */",
      };
      
      const result = renderModule(templates, options);
      expect(result).toContain("/* Generated module */");
      expect(result).toContain("/* End of module */");
      expect(result).toContain("const content");
    });

    it("should add imports and exports", () => {
      const templates = ["const value = 42;"];
      const options = {
        exports: ["export { value };"],
        imports: ["import { helper } from './helper';"],
      };
      
      const result = renderModule(templates, options);
      expect(result).toContain("import { helper }");
      expect(result).toContain("export { value }");
      expect(result).toContain("const value = 42");
    });
  });

  describe("createTemplateContext", () => {
    it("should create a template execution context with error handling", () => {
      const mockTemplate = (input: string) => `processed: ${input}`;
      const contextTemplate = createTemplateContext(mockTemplate, "test-template");
      
      const result = contextTemplate("hello");
      expect(result).toBe("processed: hello");
    });

    it("should handle template execution errors", () => {
      const failingTemplate = () => {
        throw new Error("Template error");
      };
      
      const contextTemplate = createTemplateContext(failingTemplate, "failing-template");
      
      expect(() => contextTemplate("input")).toThrow("Template execution failed for failing-template");
    });

    it("should validate template output", () => {
      const validTemplate = () => "export function test() { return true; }";
      const contextTemplate = createTemplateContext(validTemplate, "valid-template");
      
      /* Should not throw and should return the template output */
      const result = contextTemplate("input");
      expect(result).toContain("export function test");
    });
  });

  describe("getTemplateStats", () => {
    it("should return comprehensive template statistics", () => {
      const stats = getTemplateStats();
      
      expect(stats).toHaveProperty("totalTemplates");
      expect(stats).toHaveProperty("categoriesCount");
      expect(stats).toHaveProperty("validationResults");
      
      expect(typeof stats.totalTemplates).toBe("number");
      expect(typeof stats.categoriesCount).toBe("number");
      expect(typeof stats.validationResults).toBe("object");
      
      expect(stats.totalTemplates).toBeGreaterThan(0);
      expect(stats.categoriesCount).toBe(8); /* config, contentType, functionBody, operation, parameter, requestBody, response, security */
    });

    it("should have validation results for all templates", () => {
      const stats = getTemplateStats();
      const { validationResults } = stats;
      
      expect(Object.keys(validationResults).length).toBeGreaterThan(0);
      
      /* Check structure of validation results */
      for (const [templateName, result] of Object.entries(validationResults)) {
        expect(templateName).toContain(".");
        expect(result).toHaveProperty("isValid");
        expect(result).toHaveProperty("errors");
        expect(result).toHaveProperty("warnings");
      }
    });
  });

  describe("Template Integration", () => {
    it("should allow access to existing template functions through the registry", () => {
      /* Test that we can access and call existing template functions */
      const configTemplates = TEMPLATE_REGISTRY.config;
      
      /* Call a known template function */
      const apiResponseTypes = configTemplates.renderApiResponseTypes();
      expect(typeof apiResponseTypes).toBe("string");
      expect(apiResponseTypes).toContain("ApiResponse");
      expect(apiResponseTypes).toContain("export type");
    });

    it("should maintain backward compatibility with existing templates", () => {
      /* Test that specific template functions work as expected */
      const responseTemplates = TEMPLATE_REGISTRY.response;
      
      const unionType = responseTemplates.renderUnionType(["string", "number"]);
      expect(unionType).toBe("string | number");
      
      const apiResponseType = responseTemplates.renderApiResponseType("200", "User");
      expect(apiResponseType).toBe("ApiResponse<200, User>");
    });
  });
});
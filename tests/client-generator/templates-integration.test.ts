import { describe, expect, it } from "vitest";

import {
  TEMPLATE_MODULES,
  TEMPLATE_FUNCTIONS,
  // Test that all exports are available
  buildGenericParams,
  buildParameterDeclaration,
  buildTypeAliases,
  renderOperationFunction,
  createIndent,
  indentCode,
  validateTypeScriptSyntax,
  createDefaultRenderContext,
  type CodeFormattingOptions,
  type TemplateRenderContext,
  type OperationFunctionRenderConfig,
} from "../../src/client-generator/templates/index.js";

describe("templates/index", () => {
  describe("TEMPLATE_MODULES registry", () => {
    it("should export all template module constants", () => {
      expect(TEMPLATE_MODULES.OPERATION).toBe("operation-templates");
      expect(TEMPLATE_MODULES.TYPES).toBe("template-types");
      expect(TEMPLATE_MODULES.UTILS).toBe("template-utils");
    });
  });

  describe("TEMPLATE_FUNCTIONS registry", () => {
    it("should export all template function names", () => {
      expect(TEMPLATE_FUNCTIONS.buildGenericParams).toBe("buildGenericParams");
      expect(TEMPLATE_FUNCTIONS.createIndent).toBe("createIndent");
      expect(TEMPLATE_FUNCTIONS.validateTypeScriptSyntax).toBe(
        "validateTypeScriptSyntax",
      );
    });
  });

  describe("re-exported functions", () => {
    it("should re-export operation template functions", () => {
      expect(typeof buildGenericParams).toBe("function");
      expect(typeof buildParameterDeclaration).toBe("function");
      expect(typeof buildTypeAliases).toBe("function");
      expect(typeof renderOperationFunction).toBe("function");
    });

    it("should re-export template utilities", () => {
      expect(typeof createIndent).toBe("function");
      expect(typeof indentCode).toBe("function");
      expect(typeof validateTypeScriptSyntax).toBe("function");
      expect(typeof createDefaultRenderContext).toBe("function");
    });
  });

  describe("type availability", () => {
    it("should make types available for use", () => {
      /* This tests that types are properly exported and can be used */
      const formatOptions: CodeFormattingOptions = {
        includeTrailingNewline: true,
        preserveEmptyLines: true,
      };
      
      const renderContext: TemplateRenderContext = createDefaultRenderContext();
      
      const operationConfig: OperationFunctionRenderConfig = {
        functionName: "test",
        summary: "",
        genericParams: "",
        parameterDeclaration: "{}: {} = {}",
        updatedReturnType: "void",
        functionBodyCode: "return;",
        typeAliases: "",
      };

      /* If these compile without errors, the types are properly exported */
      expect(formatOptions.includeTrailingNewline).toBe(true);
      expect(renderContext.indentLevel).toBe(0);
      expect(operationConfig.functionName).toBe("test");
    });
  });

  describe("integration", () => {
    it("should allow coordinated use of template functions", () => {
      /* Test that functions from different modules work together */
      const indentedCode = indentCode("test code", 2);
      expect(indentedCode).toBe("    test code");
      
      const validation = validateTypeScriptSyntax(indentedCode);
      expect(validation.isValid).toBe(true);
      
      const renderConfig: OperationFunctionRenderConfig = {
        functionName: "testFunction",
        summary: "/** Test function */\n",
        genericParams: "",
        parameterDeclaration: "{}: {} = {}",
        updatedReturnType: "void",
        functionBodyCode: indentedCode,
        typeAliases: "",
      };
      
      const result = renderOperationFunction(renderConfig);
      expect(result).toContain("export async function testFunction");
      expect(result).toContain("    test code");
    });
  });
});
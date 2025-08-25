/* Tests for template types and interfaces */

import { describe, expect, it } from "vitest";
import type {
  FunctionDeclarationConfig,
  InterfaceDeclarationConfig,
  TemplateFunction,
  TemplateRenderConfig,
  TypeDeclarationConfig,
  TypeScriptCodeConfig,
} from "../../src/client-generator/templates/template-types.js";

describe("Template Types", () => {
  describe("TemplateRenderConfig", () => {
    it("should define optional rendering configuration", () => {
      const config: TemplateRenderConfig = {
        indentLevel: 2,
        spacesPerIndent: 4,
        useSpaces: true,
      };

      expect(config.indentLevel).toBe(2);
      expect(config.spacesPerIndent).toBe(4);
      expect(config.useSpaces).toBe(true);
    });

    it("should allow empty configuration", () => {
      const config: TemplateRenderConfig = {};
      expect(config).toBeDefined();
    });
  });

  describe("TemplateFunction", () => {
    it("should define standard template function interface", () => {
      const templateFn: TemplateFunction<string, string> = (
        input: string,
        config?: TemplateRenderConfig,
      ) => {
        return `Processed: ${input} with config: ${JSON.stringify(config)}`;
      };

      const result = templateFn("test", { indentLevel: 1 });
      expect(result).toContain("test");
      expect(result).toContain("indentLevel");
    });
  });

  describe("TypeScriptCodeConfig", () => {
    it("should extend TemplateRenderConfig with TypeScript options", () => {
      const config: TypeScriptCodeConfig = {
        constKeyword: true,
        exportKeyword: true,
        indentLevel: 1,
        readonly: true,
        useSpaces: true,
      };

      expect(config.exportKeyword).toBe(true);
      expect(config.constKeyword).toBe(true);
      expect(config.readonly).toBe(true);
    });
  });

  describe("FunctionDeclarationConfig", () => {
    it("should define function declaration configuration", () => {
      const config: FunctionDeclarationConfig = {
        body: "return true;",
        functionName: "testFunction",
        isAsync: true,
        parameters: "input: string",
        returnType: "Promise<boolean>",
        summary: "Test function",
      };

      expect(config.functionName).toBe("testFunction");
      expect(config.isAsync).toBe(true);
      expect(config.body).toContain("return");
    });
  });

  describe("TypeDeclarationConfig", () => {
    it("should define type declaration configuration", () => {
      const config: TypeDeclarationConfig = {
        exportKeyword: true,
        typeDefinition: "string | number",
        typeName: "TestType",
      };

      expect(config.typeName).toBe("TestType");
      expect(config.typeDefinition).toBe("string | number");
    });
  });

  describe("InterfaceDeclarationConfig", () => {
    it("should define interface declaration configuration", () => {
      const config: InterfaceDeclarationConfig = {
        interfaceName: "TestInterface",
        properties: [
          {
            name: "id",
            optional: false,
            readonly: true,
            type: "string",
          },
          {
            name: "value",
            optional: true,
            type: "number",
          },
        ],
      };

      expect(config.interfaceName).toBe("TestInterface");
      expect(config.properties).toHaveLength(2);
      expect(config.properties[0].readonly).toBe(true);
      expect(config.properties[1].optional).toBe(true);
    });
  });
});
/* Tests for template utilities and helper functions */

import { describe, expect, it } from "vitest";
import {
  combineTemplates,
  createExportStatement,
  createIndentation,
  DEFAULT_TEMPLATE_CONFIG,
  escapeTemplateString,
  formatTypeScriptCode,
  indentLines,
  renderFunctionDeclaration,
  renderInterfaceDeclaration,
  renderTypeDeclaration,
  renderUnionType,
  validateTemplate,
  wrapInTemplateLiteral,
} from "../../src/client-generator/templates/template-utils.js";

describe("Template Utils", () => {
  describe("DEFAULT_TEMPLATE_CONFIG", () => {
    it("should provide sensible defaults", () => {
      expect(DEFAULT_TEMPLATE_CONFIG.indentLevel).toBe(0);
      expect(DEFAULT_TEMPLATE_CONFIG.useSpaces).toBe(true);
      expect(DEFAULT_TEMPLATE_CONFIG.spacesPerIndent).toBe(2);
    });
  });

  describe("createIndentation", () => {
    it("should create correct indentation with spaces", () => {
      const result = createIndentation({ indentLevel: 2, useSpaces: true, spacesPerIndent: 2 });
      expect(result).toBe("    ");
    });

    it("should create correct indentation with tabs", () => {
      const result = createIndentation({ indentLevel: 2, useSpaces: false });
      expect(result).toBe("\t\t");
    });

    it("should return empty string for zero indentation", () => {
      const result = createIndentation({ indentLevel: 0 });
      expect(result).toBe("");
    });

    it("should handle negative indentation", () => {
      const result = createIndentation({ indentLevel: -1 });
      expect(result).toBe("");
    });
  });

  describe("indentLines", () => {
    it("should indent each line correctly", () => {
      const text = "line1\nline2\nline3";
      const result = indentLines(text, { indentLevel: 1 });
      expect(result).toBe("  line1\n  line2\n  line3");
    });

    it("should preserve empty lines", () => {
      const text = "line1\n\nline2";
      const result = indentLines(text, { indentLevel: 1 });
      expect(result).toBe("  line1\n\n  line2");
    });

    it("should handle no indentation", () => {
      const text = "line1\nline2";
      const result = indentLines(text, { indentLevel: 0 });
      expect(result).toBe(text);
    });
  });

  describe("renderFunctionDeclaration", () => {
    it("should render a basic function", () => {
      const config = {
        body: "return 'test';",
        functionName: "testFunc",
        parameters: "",
      };

      const result = renderFunctionDeclaration(config);
      expect(result).toContain("function testFunc");
      expect(result).toContain("return 'test';");
    });

    it("should render an exported async function with types", () => {
      const config = {
        body: "return await fetch('/api');",
        exportKeyword: true,
        functionName: "fetchData",
        genericParams: "T",
        isAsync: true,
        parameters: "url: string",
        returnType: "Promise<T>",
        summary: "Fetches data from API",
      };

      const result = renderFunctionDeclaration(config);
      expect(result).toContain("/* Fetches data from API */");
      expect(result).toContain("export async function fetchData<T>");
      expect(result).toContain("url: string");
      expect(result).toContain(": Promise<T>");
      expect(result).toContain("return await fetch");
    });
  });

  describe("renderTypeDeclaration", () => {
    it("should render a basic type", () => {
      const config = {
        typeDefinition: "string | number",
        typeName: "TestType",
      };

      const result = renderTypeDeclaration(config);
      expect(result).toBe("type TestType = string | number;");
    });

    it("should render an exported generic type with summary", () => {
      const config = {
        exportKeyword: true,
        genericParams: "T",
        summary: "Generic test type",
        typeDefinition: "T | null",
        typeName: "Nullable",
      };

      const result = renderTypeDeclaration(config);
      expect(result).toContain("/* Generic test type */");
      expect(result).toContain("export type Nullable<T> = T | null;");
    });
  });

  describe("renderInterfaceDeclaration", () => {
    it("should render a basic interface", () => {
      const config = {
        interfaceName: "User",
        properties: [
          { name: "id", type: "string" },
          { name: "name", optional: true, type: "string" },
        ],
      };

      const result = renderInterfaceDeclaration(config);
      expect(result).toContain("interface User {");
      expect(result).toContain("id: string;");
      expect(result).toContain("name?: string;");
    });

    it("should render an exported interface with readonly properties", () => {
      const config = {
        exportKeyword: true,
        interfaceName: "Config",
        properties: [
          { name: "apiKey", readonly: true, type: "string" },
          { name: "timeout", optional: true, readonly: true, type: "number" },
        ],
        summary: "Configuration interface",
      };

      const result = renderInterfaceDeclaration(config);
      expect(result).toContain("/* Configuration interface */");
      expect(result).toContain("export interface Config {");
      expect(result).toContain("readonly apiKey: string;");
      expect(result).toContain("readonly timeout?: number;");
    });

    it("should handle interface inheritance", () => {
      const config = {
        extends: ["BaseConfig", "Serializable"],
        interfaceName: "ExtendedConfig",
        properties: [{ name: "extra", type: "boolean" }],
      };

      const result = renderInterfaceDeclaration(config);
      expect(result).toContain("interface ExtendedConfig extends BaseConfig, Serializable {");
    });
  });

  describe("renderUnionType", () => {
    it("should handle empty array", () => {
      const result = renderUnionType([]);
      expect(result).toBe("never");
    });

    it("should handle single type", () => {
      const result = renderUnionType(["string"]);
      expect(result).toBe("string");
    });

    it("should handle short unions", () => {
      const result = renderUnionType(["string", "number", "boolean"]);
      expect(result).toBe("string | number | boolean");
    });

    it("should handle long unions with multi-line format", () => {
      const types = ["string", "number", "boolean", "null", "undefined"];
      const result = renderUnionType(types);
      expect(result).toContain("|");
      expect(result).toContain("\n");
    });
  });

  describe("wrapInTemplateLiteral", () => {
    it("should wrap content in template literal", () => {
      const result = wrapInTemplateLiteral("Hello World");
      expect(result).toBe("`Hello World`");
    });

    it("should escape backticks and template expressions", () => {
      const content = "Hello `world` ${name}";
      const result = wrapInTemplateLiteral(content);
      expect(result).toBe("`Hello \\`world\\` \\${name}`");
    });
  });

  describe("escapeTemplateString", () => {
    it("should escape special characters", () => {
      const input = "Line 1\nLine 2\tTabbed\r\nBackslash\\";
      const result = escapeTemplateString(input);
      expect(result).toContain("\\n");
      expect(result).toContain("\\t");
      expect(result).toContain("\\r");
      expect(result).toContain("\\\\");
    });
  });

  describe("validateTemplate", () => {
    it("should validate a correct template", () => {
      const template = "export function test() { return 'hello'; }";
      const result = validateTemplate(template);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect unmatched backticks", () => {
      const template = "const str = `unmatched;";
      const result = validateTemplate(template, "test");
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Unmatched template literal backticks in test");
    });

    it("should warn about potential template injection", () => {
      const template = "const str = `Hello ${userInput}`;";
      const result = validateTemplate(template);
      expect(result.warnings).toContain(
        "Potential template injection vulnerability in unknown",
      );
    });

    it("should warn about long lines", () => {
      const longLine = "x".repeat(150);
      const result = validateTemplate(longLine);
      expect(result.warnings).toContain("Lines exceeding 120 characters found in unknown");
    });

    it("should warn about missing export keywords", () => {
      const template = "function test() {}";
      const result = validateTemplate(template);
      expect(result.warnings).toContain("Missing export keyword for functions in unknown");
    });
  });

  describe("formatTypeScriptCode", () => {
    it("should format basic TypeScript code", () => {
      const code = "interface Test{prop:string;other:number;}";
      const result = formatTypeScriptCode(code);
      expect(result).toContain("{\n");
      expect(result).toContain(";\n");
    });

    it("should handle empty objects", () => {
      const code = "interface Empty { }";
      const result = formatTypeScriptCode(code);
      expect(result).toContain("{}");
    });
  });

  describe("combineTemplates", () => {
    it("should combine templates with default separator", () => {
      const templates = ["template1", "template2", "template3"];
      const result = combineTemplates(templates);
      expect(result).toBe("template1\n\ntemplate2\n\ntemplate3");
    });

    it("should use custom separator", () => {
      const templates = ["a", "b", "c"];
      const result = combineTemplates(templates, " | ");
      expect(result).toBe("a | b | c");
    });

    it("should filter out empty templates", () => {
      const templates = ["template1", "", "  ", "template2"];
      const result = combineTemplates(templates);
      expect(result).toBe("template1\n\ntemplate2");
    });
  });

  describe("createExportStatement", () => {
    it("should create function export", () => {
      const result = createExportStatement("myFunction", "function");
      expect(result).toBe("export { myFunction };");
    });

    it("should create type export", () => {
      const result = createExportStatement("MyType", "type");
      expect(result).toBe("export type { MyType };");
    });

    it("should create interface export", () => {
      const result = createExportStatement("MyInterface", "interface");
      expect(result).toBe("export type { MyInterface };");
    });

    it("should create const export", () => {
      const result = createExportStatement("myConst", "const");
      expect(result).toBe("export { myConst };");
    });

    it("should default to function export", () => {
      const result = createExportStatement("defaultExport");
      expect(result).toBe("export { defaultExport };");
    });
  });
});
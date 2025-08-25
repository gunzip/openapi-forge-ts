import { describe, expect, it } from "vitest";

import {
  createIndent,
  indentCode,
  dedentCode,
  wrapInInterface,
  wrapInTypeAlias,
  wrapInFunction,
  createJSDoc,
  validateTypeScriptSyntax,
  validateTemplateConfig,
  formatGeneratedCode,
  createDefaultRenderContext,
} from "../../src/client-generator/templates/template-utils.js";

describe("template-utils", () => {
  describe("createIndent", () => {
    it("should create correct indentation for given level", () => {
      expect(createIndent(0)).toBe("");
      expect(createIndent(1)).toBe("  ");
      expect(createIndent(2)).toBe("    ");
      expect(createIndent(3)).toBe("      ");
    });

    it("should respect custom spaces per level", () => {
      expect(createIndent(1, 4)).toBe("    ");
      expect(createIndent(2, 4)).toBe("        ");
      expect(createIndent(1, 1)).toBe(" ");
    });
  });

  describe("indentCode", () => {
    it("should indent single line", () => {
      const input = "const x = 1;";
      const result = indentCode(input, 1);
      expect(result).toBe("  const x = 1;");
    });

    it("should indent multiple lines", () => {
      const input = "function test() {\n  return 1;\n}";
      const result = indentCode(input, 1);
      expect(result).toBe("  function test() {\n    return 1;\n  }");
    });

    it("should preserve empty lines by default", () => {
      const input = "line1\n\nline3";
      const result = indentCode(input, 1);
      expect(result).toBe("  line1\n\n  line3");
    });

    it("should handle empty lines when preserveEmptyLines is false", () => {
      const input = "line1\n\nline3";
      const result = indentCode(input, 1, 2, false);
      expect(result).toBe("  line1\n\n  line3");
    });

    it("should respect custom spaces per level", () => {
      const input = "test";
      const result = indentCode(input, 2, 4);
      expect(result).toBe("        test");
    });
  });

  describe("dedentCode", () => {
    it("should remove common leading whitespace", () => {
      const input = "    line1\n    line2\n    line3";
      const result = dedentCode(input);
      expect(result).toBe("line1\nline2\nline3");
    });

    it("should handle mixed indentation", () => {
      const input = "  line1\n    line2\n  line3";
      const result = dedentCode(input);
      expect(result).toBe("line1\n  line2\nline3");
    });

    it("should preserve lines with no common indentation", () => {
      const input = "line1\n  line2\nline3";
      const result = dedentCode(input);
      expect(result).toBe("line1\n  line2\nline3");
    });

    it("should handle empty lines", () => {
      const input = "  line1\n\n  line3";
      const result = dedentCode(input);
      expect(result).toBe("line1\n\nline3");
    });
  });

  describe("wrapInInterface", () => {
    it("should create exported interface by default", () => {
      const properties = "name: string;\nage: number;";
      const result = wrapInInterface("User", properties);
      expect(result).toBe(
        "export interface User {\n  name: string;\n  age: number;\n}",
      );
    });

    it("should create non-exported interface when specified", () => {
      const properties = "id: string;";
      const result = wrapInInterface("Internal", properties, false);
      expect(result).toBe("interface Internal {\n  id: string;\n}");
    });

    it("should handle empty properties", () => {
      const result = wrapInInterface("Empty", "");
      expect(result).toBe("export interface Empty {\n\n}");
    });
  });

  describe("wrapInTypeAlias", () => {
    it("should create exported type alias by default", () => {
      const result = wrapInTypeAlias("UserId", "string");
      expect(result).toBe("export type UserId = string;");
    });

    it("should create non-exported type alias when specified", () => {
      const result = wrapInTypeAlias("Internal", "number", false);
      expect(result).toBe("type Internal = number;");
    });

    it("should handle complex type definitions", () => {
      const definition = "{ id: string; name: string; }";
      const result = wrapInTypeAlias("User", definition);
      expect(result).toBe("export type User = { id: string; name: string; };");
    });
  });

  describe("wrapInFunction", () => {
    it("should create basic function", () => {
      const result = wrapInFunction(
        "test",
        "x: number",
        "number",
        "return x * 2;",
      );
      expect(result).toBe(
        "export function test(\n  x: number\n): number {\n  return x * 2;\n}",
      );
    });

    it("should create async function", () => {
      const result = wrapInFunction(
        "fetchData",
        "url: string",
        "Promise<string>",
        "return fetch(url);",
        { isAsync: true },
      );
      expect(result).toBe(
        "export async function fetchData(\n  url: string\n): Promise<string> {\n  return fetch(url);\n}",
      );
    });

    it("should create non-exported function", () => {
      const result = wrapInFunction(
        "helper",
        "x: number",
        "number",
        "return x;",
        { isExported: false },
      );
      expect(result).toBe(
        "function helper(\n  x: number\n): number {\n  return x;\n}",
      );
    });

    it("should include generic parameters", () => {
      const result = wrapInFunction(
        "identity",
        "x: T",
        "T",
        "return x;",
        { genericParams: "<T>" },
      );
      expect(result).toBe(
        "export function identity<T>(\n  x: T\n): T {\n  return x;\n}",
      );
    });

    it("should include JSDoc", () => {
      const jsdoc = "/** Test function */";
      const result = wrapInFunction(
        "test",
        "x: number",
        "number",
        "return x;",
        { jsdoc },
      );
      expect(result).toBe(
        "/** Test function */\nexport function test(\n  x: number\n): number {\n  return x;\n}",
      );
    });
  });

  describe("createJSDoc", () => {
    it("should create basic JSDoc", () => {
      const result = createJSDoc("Test function");
      expect(result).toBe("/**\n * Test function\n */");
    });

    it("should include parameters", () => {
      const params = [
        { name: "x", description: "The input number" },
        { name: "y", description: "Another number" },
      ];
      const result = createJSDoc("Adds two numbers", params);
      expect(result).toBe(
        "/**\n * Adds two numbers\n *\n * @param x - The input number\n * @param y - Another number\n */",
      );
    });

    it("should include return description", () => {
      const result = createJSDoc("Test function", [], "The result");
      expect(result).toBe(
        "/**\n * Test function\n *\n * @returns The result\n */",
      );
    });

    it("should include both parameters and return", () => {
      const params = [{ name: "x", description: "Input" }];
      const result = createJSDoc("Test function", params, "Output");
      expect(result).toBe(
        "/**\n * Test function\n *\n * @param x - Input\n *\n * @returns Output\n */",
      );
    });
  });

  describe("validateTypeScriptSyntax", () => {
    it("should pass valid TypeScript code", () => {
      const code = "export function test(): string { return 'hello'; }";
      const result = validateTypeScriptSyntax(code);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect unmatched braces", () => {
      const code = "function test() { return 1;";
      const result = validateTypeScriptSyntax(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Unmatched braces: missing closing brace(s)",
      );
    });

    it("should detect unmatched parentheses", () => {
      const code = "function test( { return 1; }";
      const result = validateTypeScriptSyntax(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Unmatched parentheses: missing closing parenthesis(es)",
      );
    });

    it("should detect duplicate export keywords", () => {
      const code = "export export function test() {}";
      const result = validateTypeScriptSyntax(code);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Line 1: Duplicate export keyword");
    });

    it("should warn about double semicolons", () => {
      const code = "const x = 1;;";
      const result = validateTypeScriptSyntax(code);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain("Line 1: Double semicolon found");
    });
  });

  describe("validateTemplateConfig", () => {
    it("should pass valid config", () => {
      const config = createDefaultRenderContext();
      const result = validateTemplateConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should reject negative indentation", () => {
      const config = createDefaultRenderContext({ indentLevel: -1 });
      const result = validateTemplateConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain("Indentation level cannot be negative");
    });

    it("should warn about deep indentation", () => {
      const config = createDefaultRenderContext({ indentLevel: 15 });
      const result = validateTemplateConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(
        "Very deep indentation level detected (>10)",
      );
    });

    it("should reject invalid base indentation", () => {
      const config = createDefaultRenderContext({
        formatting: { indentation: { baseIndent: 0, level: 0 } },
      });
      const result = validateTemplateConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(
        "Base indentation must be at least 1 space",
      );
    });
  });

  describe("formatGeneratedCode", () => {
    it("should apply indentation", () => {
      const code = "function test() {\nreturn 1;\n}";
      const result = formatGeneratedCode(code, {
        indentation: { level: 1, baseIndent: 2 },
        includeTrailingNewline: false,
      });
      expect(result).toBe("  function test() {\n  return 1;\n  }");
    });

    it("should add trailing newline when requested", () => {
      const code = "test";
      const result = formatGeneratedCode(code, {
        includeTrailingNewline: true,
      });
      expect(result).toBe("test\n");
    });

    it("should remove trailing newline when not requested", () => {
      const code = "test\n";
      const result = formatGeneratedCode(code, {
        includeTrailingNewline: false,
      });
      expect(result).toBe("test");
    });

    it("should preserve empty lines", () => {
      const code = "line1\n\nline3";
      const result = formatGeneratedCode(code, {
        preserveEmptyLines: true,
        indentation: { level: 1, baseIndent: 2 },
        includeTrailingNewline: false,
      });
      expect(result).toBe("  line1\n\n  line3");
    });
  });

  describe("createDefaultRenderContext", () => {
    it("should create default context", () => {
      const result = createDefaultRenderContext();
      expect(result.indentLevel).toBe(0);
      expect(result.formatting.includeTrailingNewline).toBe(true);
      expect(result.formatting.indentation?.baseIndent).toBe(2);
      expect(result.syntax.includeJSDoc).toBe(true);
      expect(result.syntax.exportStyle).toBe("named");
    });

    it("should apply overrides", () => {
      const result = createDefaultRenderContext({
        indentLevel: 2,
        syntax: { includeJSDoc: false },
      });
      expect(result.indentLevel).toBe(2);
      expect(result.syntax.includeJSDoc).toBe(false);
      expect(result.syntax.exportStyle).toBe("named"); // Should preserve default
    });
  });
});
import { describe, it, expect } from "vitest";
import { zodSchemaToCode } from "../generator/zod-schema-generator";
import { SchemaObject } from "openapi3-ts/oas31";

// Helper to eval generated code
function evalZod(code: string) {
  // eslint-disable-next-line no-new-func
  return new Function("z", `return ${code}`)(require("zod"));
}

describe("zodSchemaToCode", () => {
  it("should generate code for a simple string", () => {
    const schema: SchemaObject = { type: "string" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.string()");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("hello").success).toBe(true);
    expect(zodSchema.safeParse(123).success).toBe(false);
  });

  it("should generate code for a string with a pattern", () => {
    const schema: SchemaObject = { type: "string", pattern: "^[a-z]+$" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("regex");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("abc").success).toBe(true);
    expect(zodSchema.safeParse("ABC").success).toBe(false);
  });

  it("should generate code for an email", () => {
    const schema: SchemaObject = { type: "string", format: "email" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("email");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("test@example.com").success).toBe(true);
    expect(zodSchema.safeParse("not-an-email").success).toBe(false);
  });

  it("should generate code for a simple number", () => {
    const schema: SchemaObject = { type: "number" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.number()");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(123).success).toBe(true);
    expect(zodSchema.safeParse("hello").success).toBe(false);
  });

  it("should generate code for a number with min and max", () => {
    const schema: SchemaObject = { type: "number", minimum: 10, maximum: 20 };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("min");
    expect(result.code).toContain("max");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(15).success).toBe(true);
    expect(zodSchema.safeParse(5).success).toBe(false);
    expect(zodSchema.safeParse(25).success).toBe(false);
  });

  it("should generate code for a simple boolean", () => {
    const schema: SchemaObject = { type: "boolean" };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.boolean()");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(true).success).toBe(true);
    expect(zodSchema.safeParse(false).success).toBe(true);
    expect(zodSchema.safeParse("true").success).toBe(false);
  });

  it("should generate code for a simple array", () => {
    const schema: SchemaObject = { type: "array", items: { type: "string" } };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("array");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse(["a", "b", "c"]).success).toBe(true);
    expect(zodSchema.safeParse([1, 2, 3]).success).toBe(false);
  });

  it("should generate code for a simple object", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
        age: { type: "number" },
      },
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("object");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse({ name: "John", age: 30 }).success).toBe(true);
    expect(zodSchema.safeParse({ name: "John", age: "30" }).success).toBe(
      false
    );
  });

  it("should handle nullable properties", () => {
    const schema: SchemaObject = { type: ["string", "null"] };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("nullable");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.safeParse("hello").success).toBe(true);
    expect(zodSchema.safeParse(null).success).toBe(true);
    expect(zodSchema.safeParse(undefined).success).toBe(false);
  });

  it("should handle local $ref references", () => {
    const refSchema = { $ref: "#/components/schemas/Profile" };
    const result = zodSchemaToCode(refSchema);
    expect(result.code).toBe("Profile");
    expect(result.imports.has("Profile")).toBe(true);
  });

  it("should handle allOf with $ref references", () => {
    const schema: SchemaObject = {
      allOf: [
        { $ref: "#/components/schemas/Profile" },
        {
          type: "object",
          properties: {
            status: { type: "string" },
          },
        },
      ],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toContain("Profile");
    expect(result.code).toContain("intersection");
    expect(result.imports.has("Profile")).toBe(true);
  });

  it("should handle default values for boolean schemas", () => {
    const schema: SchemaObject = {
      type: "boolean",
      default: false,
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.boolean().default(false)");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(true)).toBe(true);
    expect(zodSchema.parse(false)).toBe(false);
    expect(zodSchema.parse(undefined)).toBe(false); // default value
  });

  it("should handle default values for string schemas", () => {
    const schema: SchemaObject = {
      type: "string",
      default: "hello world",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe('z.string().default("hello world")');
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse("test")).toBe("test");
    expect(zodSchema.parse(undefined)).toBe("hello world"); // default value
  });

  it("should handle default values for number schemas", () => {
    const schema: SchemaObject = {
      type: "number",
      default: 42,
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.number().default(42)");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(100)).toBe(100);
    expect(zodSchema.parse(undefined)).toBe(42); // default value
  });

  it("should handle default values for integer schemas", () => {
    const schema: SchemaObject = {
      type: "integer",
      default: 10,
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe("z.number().int().default(10)");
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(5)).toBe(5);
    expect(zodSchema.parse(undefined)).toBe(10); // default value
  });

  it("should handle default values for array schemas", () => {
    const schema: SchemaObject = {
      type: "array",
      items: { type: "string" },
      default: ["default", "values"],
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.array(z.string()).default(["default","values"])'
    );
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse(["test"])).toEqual(["test"]);
    expect(zodSchema.parse(undefined)).toEqual(["default", "values"]); // default value
  });

  it("should handle default values for object schemas", () => {
    const schema: SchemaObject = {
      type: "object",
      properties: {
        name: { type: "string" },
      },
      default: { name: "default name" },
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.object({"name": z.string().optional()}).default({"name":"default name"})'
    );
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse({ name: "test" })).toEqual({ name: "test" });
    expect(zodSchema.parse(undefined)).toEqual({ name: "default name" }); // default value
  });

  it("should handle default values with other constraints", () => {
    const schema: SchemaObject = {
      type: "string",
      minLength: 5,
      maxLength: 20,
      default: "hello",
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe('z.string().min(5).max(20).default("hello")');
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse("test string")).toBe("test string");
    expect(zodSchema.parse(undefined)).toBe("hello"); // default value
  });

  it("should handle complex default values", () => {
    const schema: SchemaObject = {
      type: "object",
      additionalProperties: {
        type: "array",
        items: { type: "number" },
      },
      default: { test: [1000] },
    };
    const result = zodSchemaToCode(schema);
    expect(result.code).toBe(
      'z.object({}).catchall(z.array(z.number())).default({"test":[1000]})'
    );
    const zodSchema = evalZod(result.code);
    expect(zodSchema.parse({ other: [1, 2, 3] })).toEqual({ other: [1, 2, 3] });
    expect(zodSchema.parse(undefined)).toEqual({ test: [1000] }); // default value
  });
});

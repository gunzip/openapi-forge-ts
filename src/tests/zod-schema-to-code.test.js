import { describe, it, expect } from "vitest";
import { zodSchemaToCode } from "../src/generator/zod-schema-generator";
// Helper to eval generated code
function evalZod(code) {
    // eslint-disable-next-line no-new-func
    return new Function("z", `return ${code}`)(require("zod"));
}
describe("zodSchemaToCode", () => {
    it("should generate code for a simple string", () => {
        const schema = { type: "string" };
        const code = zodSchemaToCode(schema);
        expect(code).toBe("z.string()");
        const zodSchema = evalZod(code);
        expect(zodSchema.safeParse("hello").success).toBe(true);
        expect(zodSchema.safeParse(123).success).toBe(false);
    });
    it("should generate code for a string with a pattern", () => {
        const schema = { type: "string", pattern: "^[a-z]+$" };
        const code = zodSchemaToCode(schema);
        expect(code).toContain("regex");
        const zodSchema = evalZod(code);
        expect(zodSchema.safeParse("abc").success).toBe(true);
        expect(zodSchema.safeParse("ABC").success).toBe(false);
    });
    it("should generate code for an email", () => {
        const schema = { type: "string", format: "email" };
        const code = zodSchemaToCode(schema);
        expect(code).toContain("email");
        const zodSchema = evalZod(code);
        expect(zodSchema.safeParse("test@example.com").success).toBe(true);
        expect(zodSchema.safeParse("not-an-email").success).toBe(false);
    });
    it("should generate code for a simple number", () => {
        const schema = { type: "number" };
        const code = zodSchemaToCode(schema);
        expect(code).toBe("z.number()");
        const zodSchema = evalZod(code);
        expect(zodSchema.safeParse(123).success).toBe(true);
        expect(zodSchema.safeParse("hello").success).toBe(false);
    });
    it("should generate code for a number with min and max", () => {
        const schema = { type: "number", minimum: 10, maximum: 20 };
        const code = zodSchemaToCode(schema);
        expect(code).toContain("min");
        expect(code).toContain("max");
        const zodSchema = evalZod(code);
        expect(zodSchema.safeParse(15).success).toBe(true);
        expect(zodSchema.safeParse(5).success).toBe(false);
        expect(zodSchema.safeParse(25).success).toBe(false);
    });
    it("should generate code for a simple boolean", () => {
        const schema = { type: "boolean" };
        const code = zodSchemaToCode(schema);
        expect(code).toBe("z.boolean()");
        const zodSchema = evalZod(code);
        expect(zodSchema.safeParse(true).success).toBe(true);
        expect(zodSchema.safeParse(false).success).toBe(true);
        expect(zodSchema.safeParse("true").success).toBe(false);
    });
    it("should generate code for a simple array", () => {
        const schema = { type: "array", items: { type: "string" } };
        const code = zodSchemaToCode(schema);
        expect(code).toContain("array");
        const zodSchema = evalZod(code);
        expect(zodSchema.safeParse(["a", "b", "c"]).success).toBe(true);
        expect(zodSchema.safeParse([1, 2, 3]).success).toBe(false);
    });
    it("should generate code for a simple object", () => {
        const schema = {
            type: "object",
            properties: {
                name: { type: "string" },
                age: { type: "number" },
            },
        };
        const code = zodSchemaToCode(schema);
        expect(code).toContain("object");
        const zodSchema = evalZod(code);
        expect(zodSchema.safeParse({ name: "John", age: 30 }).success).toBe(true);
        expect(zodSchema.safeParse({ name: "John", age: "30" }).success).toBe(false);
    });
    it("should handle nullable properties", () => {
        const schema = { type: ["string", "null"] };
        const code = zodSchemaToCode(schema);
        expect(code).toContain("nullable");
        const zodSchema = evalZod(code);
        expect(zodSchema.safeParse("hello").success).toBe(true);
        expect(zodSchema.safeParse(null).success).toBe(true);
        expect(zodSchema.safeParse(undefined).success).toBe(false);
    });
});

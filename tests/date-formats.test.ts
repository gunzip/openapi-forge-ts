import type { SchemaObject } from "openapi3-ts/oas31";

import { describe, expect, it } from "vitest";

import { zodSchemaToCode } from "../src/schema-generator";

describe("Date format handling", () => {
  it("should generate correct Zod schemas for date/time formats", () => {
    expect(zodSchemaToCode({ format: "date", type: "string" }).code).toBe(
      "z.iso.date()",
    );
    expect(zodSchemaToCode({ format: "date-time", type: "string" }).code).toBe(
      "z.iso.datetime()",
    );
    expect(zodSchemaToCode({ format: "time", type: "string" }).code).toBe(
      "z.iso.time()",
    );
    expect(zodSchemaToCode({ format: "duration", type: "string" }).code).toBe(
      "z.iso.duration()",
    );
  });

  it("should handle date/time formats with default values", () => {
    const dateSchema: SchemaObject = {
      default: "2023-12-25",
      format: "date",
      type: "string",
    };
    expect(zodSchemaToCode(dateSchema).code).toBe(
      'z.iso.date().default("2023-12-25")',
    );

    const datetimeSchema: SchemaObject = {
      default: "2023-12-25T10:30:00Z",
      format: "date-time",
      type: "string",
    };
    expect(zodSchemaToCode(datetimeSchema).code).toBe(
      'z.iso.datetime().default("2023-12-25T10:30:00Z")',
    );
  });

  it("should handle other string formats correctly", () => {
    expect(zodSchemaToCode({ format: "email", type: "string" }).code).toBe(
      "z.email()",
    );
    expect(zodSchemaToCode({ format: "uuid", type: "string" }).code).toBe(
      "z.uuid()",
    );
    expect(zodSchemaToCode({ format: "uri", type: "string" }).code).toBe(
      "z.url()",
    );
  });
});

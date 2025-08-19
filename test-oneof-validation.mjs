import { zodSchemaToCode } from "./dist/generator/zod-schema-generator.js";

// Test case: oneOf with overlapping schemas (NormalUser vs AdminUser)
const oneOfSchema = {
  oneOf: [
    {
      type: "object",
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
      },
      required: ["id", "name"],
    },
    {
      type: "object",
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        secret: { type: "string" },
      },
      required: ["id", "name", "secret"],
    },
  ],
};

const result = zodSchemaToCode(oneOfSchema);
console.log("Generated oneOf schema:");
console.log(result.code);
console.log("\nImports:", Array.from(result.imports));

// Test case: anyOf for comparison
const anyOfSchema = {
  anyOf: [
    {
      type: "object",
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
      },
      required: ["id", "name"],
    },
    {
      type: "object",
      properties: {
        id: { type: "integer" },
        name: { type: "string" },
        secret: { type: "string" },
      },
      required: ["id", "name", "secret"],
    },
  ],
};

const anyOfResult = zodSchemaToCode(anyOfSchema);
console.log("\n\nGenerated anyOf schema:");
console.log(anyOfResult.code);

// Test case: oneOf with discriminator
const discriminatedOneOfSchema = {
  oneOf: [
    {
      type: "object",
      properties: {
        type: { enum: ["normal"] },
        id: { type: "integer" },
        name: { type: "string" },
      },
      required: ["type", "id", "name"],
    },
    {
      type: "object",
      properties: {
        type: { enum: ["admin"] },
        id: { type: "integer" },
        name: { type: "string" },
        secret: { type: "string" },
      },
      required: ["type", "id", "name", "secret"],
    },
  ],
  discriminator: {
    propertyName: "type",
  },
};

const discriminatedResult = zodSchemaToCode(discriminatedOneOfSchema);
console.log("\n\nGenerated discriminated oneOf schema:");
console.log(discriminatedResult.code);

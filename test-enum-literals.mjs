import { zodSchemaToCode } from "./dist/generator/zod-schema-generator.js";

// Test cases for single-value enums that should become literals
const testCases = [
  {
    name: "ConstantIntegerTest",
    schema: {
      title: "ConstantIntegerTest",
      type: "integer",
      enum: [100],
    },
    expected: "z.literal(100)",
  },
  {
    name: "DisabledUserTest.enabled",
    schema: {
      type: "boolean",
      enum: [false],
    },
    expected: "z.literal(false)",
  },
  {
    name: "StringLiteral",
    schema: {
      type: "string",
      enum: ["test"],
    },
    expected: 'z.literal("test")',
  },
  {
    name: "MultipleStringEnum",
    schema: {
      type: "string",
      enum: ["a", "b", "c"],
    },
    expected: 'z.enum(["a", "b", "c"])',
  },
  {
    name: "MultipleNumberEnum",
    schema: {
      type: "number",
      enum: [1, 2, 3],
    },
    expected: 'z.enum(["1", "2", "3"])',
  },
];

console.log("Testing enum to literal conversion...\n");

for (const testCase of testCases) {
  try {
    const result = zodSchemaToCode(testCase.schema);
    const success = result.code === testCase.expected;

    console.log(`${testCase.name}: ${success ? "✅" : "❌"}`);
    console.log(`  Schema: ${JSON.stringify(testCase.schema)}`);
    console.log(`  Expected: ${testCase.expected}`);
    console.log(`  Got:      ${result.code}`);

    if (!success) {
      console.log(`  ❌ MISMATCH!`);
    }
    console.log("");
  } catch (error) {
    console.log(`${testCase.name}: ❌ ERROR`);
    console.log(`  Error: ${error.message}`);
    console.log("");
  }
}

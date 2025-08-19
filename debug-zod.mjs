import { readFileSync } from "fs";
import { zodSchemaToCode } from "./dist/generator/zod-schema-generator.js";

// Simple YAML parser for our use case
function parseYaml(content) {
  // For now, just use JSON.parse on the content (this is a hack for debugging)
  // In practice, we'd need a proper YAML parser
  return JSON.parse(
    JSON.stringify(
      eval(
        "(" +
          content
            .replace(/:\s*([^"'\[\{].*)/g, ': "$1"')
            .replace(/"/g, '\\"')
            .replace(/\\": \\"/g, '": "') +
          ")"
      )
    )
  );
}

// Read the OpenAPI spec as JSON for simplicity
const yamlContent = readFileSync("test.yaml", "utf8");

// Let's manually extract what we need
const testOperation = {
  operationId: "testParameterWithBodyReference",
  requestBody: {
    content: {
      "application/json": {
        schema: {
          $ref: "#/components/schemas/NewModel",
        },
      },
    },
  },
};

console.log("Testing with manual operation structure...");

const jsonContent = testOperation.requestBody.content?.["application/json"];
if (jsonContent?.schema) {
  console.log("Schema:", JSON.stringify(jsonContent.schema, null, 2));

  const zodResult = zodSchemaToCode(jsonContent.schema);
  console.log("Zod result:", zodResult);

  if (jsonContent.schema["$ref"]) {
    const typeName = jsonContent.schema["$ref"].split("/").pop();
    console.log("Extracted type name:", typeName);
  }
}

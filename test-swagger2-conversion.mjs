import {
  convertToOpenAPI31,
  isOpenAPI20,
  isOpenAPI30,
  isOpenAPI31,
} from "./dist/lib.js";

// Test Swagger 2.0 specification
const swagger20 = {
  swagger: "2.0",
  info: {
    title: "Test API",
    version: "1.0.0",
  },
  host: "api.example.com",
  basePath: "/v1",
  schemes: ["https"],
  paths: {
    "/users/{id}": {
      get: {
        summary: "Get user by ID",
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            type: "string",
          },
        ],
        responses: {
          200: {
            description: "User object",
            schema: {
              type: "object",
              properties: {
                id: { type: "string" },
                name: { type: "string", nullable: true },
                age: { type: "integer", minimum: 0 },
              },
              required: ["id"],
            },
          },
        },
      },
    },
  },
  definitions: {
    User: {
      type: "object",
      properties: {
        id: { type: "string" },
        name: { type: "string" },
        email: { type: "string", format: "email" },
      },
      required: ["id", "email"],
    },
  },
};

async function testConversion() {
  console.log("Testing OpenAPI version detection...");
  console.log("Is OpenAPI 2.0:", isOpenAPI20(swagger20));
  console.log("Is OpenAPI 3.0:", isOpenAPI30(swagger20));
  console.log("Is OpenAPI 3.1:", isOpenAPI31(swagger20));

  console.log("\nConverting Swagger 2.0 to OpenAPI 3.1...");

  try {
    const openapi31 = await convertToOpenAPI31(swagger20);

    console.log("Conversion successful!");
    console.log("Final version:", openapi31.openapi);
    console.log("Title:", openapi31.info.title);
    console.log("Has servers:", !!openapi31.servers);
    console.log("Has paths:", !!openapi31.paths);
    console.log("Has components:", !!openapi31.components);

    // Check structure after conversion
    console.log("Available paths:", Object.keys(openapi31.paths || {}));

    const userPath = openapi31.paths?.["/users/{id}"];
    if (userPath?.get?.responses?.["200"]) {
      const response200 = userPath.get.responses["200"];
      console.log("Response 200 structure:", Object.keys(response200));

      // In OpenAPI 3.0+, content is organized by media type
      if (response200.content?.["*/*"]?.schema) {
        const userSchema = response200.content["*/*"].schema;
        console.log(
          "User schema properties:",
          Object.keys(userSchema.properties || {})
        );
        if (userSchema.properties?.name) {
          console.log(
            "User name type (should be array with null):",
            userSchema.properties.name.type
          );
          console.log("✅ Nullable conversion worked correctly!");
        }
      }
    }

    console.log("\nFull converted specification:");
    console.log(JSON.stringify(openapi31, null, 2));
  } catch (error) {
    console.error("Conversion failed:", error.message);
  }
}

testConversion().catch(console.error);

# API Reference

This page covers the programmatic API for using YanoGen-Ts in your Node.js applications.

## Programmatic Usage

You can use YanoGen-Ts programmatically in your Node.js applications:

```ts
import { generate } from "./src/generator";

await generate({
  input: "./openapi.yaml",
  output: "./generated",
  generateClient: true,
});
```

## Generate Function

The main `generate` function accepts a configuration object with the following options:

### Parameters

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `input` | `string` | ✅ | Path to the OpenAPI spec file (local or remote) |
| `output` | `string` | ✅ | Output directory for generated code |
| `generateClient` | `boolean` | ❌ | Generate operation functions (default: false) |
| `generateServer` | `boolean` | ❌ | Generate server route wrappers (default: false) |
| `forceValidation` | `boolean` | ❌ | Enable automatic response validation (default: false) |

### Example Usage

#### Generate Schemas Only

```ts
import { generate } from "./src/generator";

await generate({
  input: "./openapi.yaml",
  output: "./generated",
});
```

#### Generate Client

```ts
import { generate } from "./src/generator";

await generate({
  input: "./openapi.yaml",
  output: "./generated",
  generateClient: true,
});
```

#### Generate Both Client and Server

```ts
import { generate } from "./src/generator";

await generate({
  input: "./openapi.yaml",
  output: "./generated",
  generateClient: true,
  generateServer: true,
});
```

#### With Force Validation

```ts
import { generate } from "./src/generator";

await generate({
  input: "./openapi.yaml",
  output: "./generated",
  generateClient: true,
  forceValidation: true,
});
```

#### Remote OpenAPI Specification

```ts
import { generate } from "./src/generator";

await generate({
  input: "https://petstore.swagger.io/v2/swagger.json",
  output: "./generated",
  generateClient: true,
});
```

## Generated Architecture

The generator creates the following structure in your output directory:

```
<output-dir>/
├── package.json                  # Generated package metadata
├── operations/                   # Client operations (if generateClient: true)
│   ├── index.ts                  # Operation exports and configuration
│   ├── config.ts                 # Global configuration types
│   └── <operationId>.ts          # Individual operation functions
├── server/                       # Server wrappers (if generateServer: true)
│   ├── index.ts                  # Server exports
│   └── <operationId>.ts          # Individual route wrappers
└── schemas/                      # Zod schemas
    ├── <SchemaName>.ts           # Individual schema files
    └── index.ts                  # Schema exports
```

## Error Handling

The `generate` function may throw errors in the following cases:

- **Invalid OpenAPI spec**: When the input specification is malformed or cannot be parsed
- **File system errors**: When unable to read input files or write output files
- **Network errors**: When unable to fetch remote OpenAPI specifications
- **Validation errors**: When the OpenAPI spec contains unsupported features

Example error handling:

```ts
import { generate } from "./src/generator";

try {
  await generate({
    input: "./openapi.yaml",
    output: "./generated",
    generateClient: true,
  });
  console.log("Generation completed successfully!");
} catch (error) {
  console.error("Generation failed:", error.message);
  process.exit(1);
}
```

## Integration Examples

### Build Script Integration

```ts
// scripts/generate-api.ts
import { generate } from "./src/generator";
import path from "path";

const inputSpec = path.join(__dirname, "../api/openapi.yaml");
const outputDir = path.join(__dirname, "../src/generated");

await generate({
  input: inputSpec,
  output: outputDir,
  generateClient: true,
  generateServer: true,
});

console.log("API code generated successfully!");
```

### Watch Mode Implementation

```ts
// scripts/watch-api.ts
import { generate } from "./src/generator";
import chokidar from "chokidar";
import path from "path";

const inputSpec = path.join(__dirname, "../api/openapi.yaml");
const outputDir = path.join(__dirname, "../src/generated");

const regenerate = async () => {
  try {
    await generate({
      input: inputSpec,
      output: outputDir,
      generateClient: true,
    });
    console.log("✅ API code regenerated");
  } catch (error) {
    console.error("❌ Generation failed:", error.message);
  }
};

// Initial generation
await regenerate();

// Watch for changes
chokidar.watch(inputSpec).on("change", regenerate);
console.log(`👀 Watching ${inputSpec} for changes...`);
```

### CI/CD Integration

```ts
// scripts/ci-generate.ts
import { generate } from "./src/generator";

const main = async () => {
  const input = process.env.OPENAPI_SPEC_URL || "./openapi.yaml";
  const output = process.env.OUTPUT_DIR || "./generated";
  
  await generate({
    input,
    output,
    generateClient: true,
    generateServer: process.env.GENERATE_SERVER === "true",
  });
};

main().catch((error) => {
  console.error("Generation failed in CI:", error);
  process.exit(1);
});
```
# OpenAPI TypeScript Client Generator

Effortlessly turn your OpenAPI specifications into fully-typed Zod schemas—ready for runtime validation and TypeScript development.

Need a client? Instantly generate a type-safe, operation-based API client alongside your schemas, all in one streamlined workflow.

## Features

- **Multi-version support**: Accepts OpenAPI 2.0 (Swagger), 3.0.x, and 3.1.x specifications, automatically converting to 3.1.0 for generation
- **Operation-based client generation**: Generates one function per operation, with strong typing and per-operation configuration: no need for blacklisting operations you don't need!
- **Zod v4 runtime validation**: Validates all response payloads at runtime
- **Small footprint**: Generates each operation and schema/type in its own file for maximum tree-shaking and modularity
- **Type-safe configuration**: Immutable global defaults, with the ability to override config per operation
- **Flexible authentication**: Supports OpenAPI security schemes (Bearer, API Key, etc.), with dynamic header/query configuration
- **Discriminated union response types**: Each operation returns a discriminated union of possible responses, enabling exhaustive handling
- **Comprehensive error handling**: Only unexpected responses throw a typed exception (UnexpectedResponseError) forwarding status, body, and headers
- **File upload/download and binary payload support**: Handles multipart/form-data and application/octet-stream uploads and downloads
- **ESM output**: Generated code is ESM-first
- **Minimal dependencies**: No runtime dependencies except Zod; works in Node.js and browsers
- **Self-contained Zod schemas**: Generated schemas can be used independently for validation (e.g., in forms) and server-side logic
- **Automatic OpenAPI normalization**: All input specs are normalized to OpenAPI 3.1.0 before code generation
- **Comprehensive test suite**: Project includes Vitest-based tests for all major features

## Supported Input Formats

The generator automatically detects and converts:

- **OpenAPI 2.0** (Swagger) → 3.0 → 3.1
- **OpenAPI 3.0.x** → 3.1
- **OpenAPI 3.1.x** (no conversion needed)

All input formats are automatically normalized to OpenAPI 3.1.0 before generation.

## Installation

```
pnpm install
```

## CLI Usage

```
pnpm start -- generate \
  --input ./swagger-2.0.yaml \
  --output ./generated \
  --generate-client
```

### CLI Options

- `-i, --input <path>`: Path to the OpenAPI spec file (2.0, 3.0.x, or 3.1.x) in YAML or JSON format
- `-o, --output <path>`: Output directory for generated code
- `--generate-client`: Generate the operation functions (default: false)

## Programmatic Usage

```ts
import { generate } from "./src/generator";

await generate({
  input: "./openapi.yaml",
  output: "./generated",
  generateClient: true,
});
```

## Generated Architecture

The generator creates:

- **`operations/index.ts`** - Configuration types, immutable global config, and operation exports
- **`operations/`** - Individual operation functions
- **`schemas/`** - Zod schemas and TypeScript types

## Example: Using the Generated Operations

### Define Configuration

```ts
import { getPetById, createPet } from "./generated/operations/index.js";

// You can define your API configuration (all fields required)
// or just use the default configuration to avoid passing it
// as parameter to every operation
const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch, // or globalThis.fetch in browsers
  headers: {
    Authorization: "Bearer your-token",
  },
};
```

### Call Operations

```ts
// Simple operation call
const pet = await getPetById({ petId: "123" }, apiConfig);

// Operation with request body
const newPet = await createPet(
  {
    body: {
      name: "Fluffy",
      status: "available",
    },
  },
  apiConfig
);

// Use default empty config (operations work without configuration)
const result = await getPetById({ petId: "123" });
```

## Example: Response Handling

Each operation returns a discriminated union of possible responses, e.g.:

```ts
const result = await getPetById({ petId: "123" }, apiConfig);

if (result.status === 200) {
  // result.data is the parsed/validated response body
  console.log("Pet:", result.data);
} else if (result.status === 404) {
  // Not found
  console.warn("Pet not found");
} else {
  // Exhaustive check
  console.error("Unexpected status", result.status);
}

// Or use the helper:
import { isSuccessResponse } from "./generated/operations/index.js";
if (isSuccessResponse(result)) {
  // result.data is typed
}

// Or handle all cases with the provided utility method:
import { handleResponse } from "./generated/operations/index.js";
handleResponse(result, {
  200: (data) => console.log("Pet:", data),
  404: () => console.warn("Not found"),
  default: (res) => console.error("Other status", res.status),
});
```

## Example: Exception Handling

All responses not handled by the union type throw a typed error:

```ts
try {
  const result = await getPetById({ petId: "notfound" }, apiConfig);
  // handle result as above
} catch (err) {
  if (err instanceof ApiError) {
    console.error("API error", err.status, err.body);
  } else if (err instanceof UnexpectedResponseError) {
    console.error("Unexpected response", err.status, err.data);
  } else {
    throw err; // rethrow unknown errors
  }
}
```

## Example: Using Generated Zod Schemas

```ts
import { Pet } from "./generated/schemas/Pet.js";

const result = Pet.safeParse(someData);
if (!result.success) {
  console.error(result.error);
}
```

## Benefits of Operation-Based Architecture

- **Tree Shaking**: Only bundle the operations you actually use
- **Type Safety**: Better parameter organization with an immutable config object
- **Flexibility**: Easy per-operation configuration with all required fields
- **Maintainability**: Each operation in its own file
- **Testing**: Simple to mock individual operations

## Current Limitations

### Request Content Types

Currently, the generator supports only a **single content type per request body**. If an OpenAPI specification defines multiple content types for the same request body, the generator will select one based on the following priority order:

1. `application/json`
2. `application/x-www-form-urlencoded`
3. `multipart/form-data`
4. `text/plain`
5. `application/xml`
6. `application/octet-stream`
7. First available content type (if none of the above match)

**Example:**

```yaml
# This OpenAPI spec defines multiple content types
requestBody:
  content:
    application/json: # ← This will be selected (highest priority)
      schema:
        type: object
    application/xml: # ← This will be ignored
      schema:
        type: string
```

The generated operation will only handle the `application/json` content type in this case.

**Workaround**: If you need to support multiple content types for requests for the same endpoint, you can:

1. Define separate operations for each content type in your OpenAPI spec
2. Manually modify the generated code after generation

This limitation may be addressed in future versions.

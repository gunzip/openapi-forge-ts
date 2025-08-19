# OpenAPI TypeScript Client Generator

Generate a TypeScript API client from OpenAPI specifications, with automatic conversion to 3.1.0, Zod validation, and operation-based architecture.

## Features

- **Multi-version support**: Automatically converts OpenAPI 2.0 (Swagger), 3.0.x, and 3.1.x specifications to 3.1.0
- **Operation-based client generation** from OpenAPI 3.1.0 (one function per operation)
- **Zod v4 runtime validation** for response (and optionally request) payloads
- **Modular output**: generate schemas/types and operations in separate files
- **Type-safe configuration** with immutable global defaults and per-operation configuration
- **Tree-shakeable**: only import the operations you use
- **Flexible authentication and error handling**
- **ESM output, minimal dependencies**

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

The tool automatically detects the OpenAPI version and converts as needed:

- Swagger 2.0 files are converted to OpenAPI 3.0, then to 3.1
- OpenAPI 3.0.x files are converted directly to 3.1
- OpenAPI 3.1.x files are used as-is

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

````ts
import { testAuthBearer, testMultipleSuccess } from "./generated/operations/index.js";

```ts
// Define your API configuration (all fields required)
const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch,
  headers: {
    Authorization: "Bearer your-token"
  }
};
````

````

### Call Operations

```ts
// Simple operation call
const pet = await getPetById({ petId: "123" }, apiConfig);

// Operation with request body
const newPet = await createPet({
  body: {
    name: "Fluffy",
    status: "available"
  }
}, apiConfig);

// Use default empty config (operations work without configuration)
const result = await someOperation({ param: "value" });
````

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
- **Type Safety**: Better parameter organization with single config object
- **Flexibility**: Easy per-operation configuration with all required fields
- **Maintainability**: Each operation in its own file
- **Testing**: Simple to mock individual operations

## Migration from Class-Based Clients

See [NEW_API_DOCUMENTATION.md](./NEW_API_DOCUMENTATION.md) for detailed migration guide and advanced usage examples.

## Requirements

- Node.js 18+
- pnpm

## License

MIT

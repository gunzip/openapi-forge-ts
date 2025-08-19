# OpenAPI TypeScript Client Generator

Generate a TypeScript API client from an OpenAPI 3.1.0 specification, with Zod validation and operation-based architecture.

## Features

- **Operation-based client generation** from OpenAPI 3.1.0 (one function per operation)
- **Zod v4 runtime validation** for response (and optionally request) payloads  
- **Modular output**: generate schemas/types in separate files
- **Type-safe configuration** with immutable global defaults and per-operation configuration
- **Tree-shakeable**: only import the operations you use
- **Flexible authentication and error handling**
- **ESM output, minimal dependencies**

## Installation

```
pnpm install
```

## CLI Usage

```
pnpm start -- generate \
  --input ./openapi.yaml \
  --output ./generated \
  --generate-client \
  --validate-request \
  --loose-interfaces \
  --modular
```

### CLI Options

- `-i, --input <path>`: Path to the OpenAPI 3.1.0 spec file (YAML or JSON)
- `-o, --output <path>`: Output directory for generated code
- `--generate-client`: Generate the operation functions (default: false)
- `--validate-request`: Generate Zod schemas for request validation (default: false)
- `--loose-interfaces`: Generate loose interfaces for runtime checks (default: false)
- `--modular`: Generate each Zod schema and type in its own file (default: false)

## Programmatic Usage

```ts
import { generate } from "./src/generator";

await generate({
  input: "./openapi.yaml",
  output: "./generated",
  generateClient: true,
  validateRequest: false,
  looseInterfaces: false,
  modular: false,
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
```
```

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

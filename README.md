# OpenAPI TypeScript Client Generator

Generate a TypeScript API client from an OpenAPI 3.1.0 specification, with Zod validation and modular output.

## Features

- TypeScript client generation from OpenAPI 3.1.0
- Zod v4 runtime validation for response (and optionally request) payloads
- Modular output: generate schemas/types in separate files
- Flexible authentication and error handling
- ESM output, minimal dependencies

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
- `--generate-client`: Generate the full HTTP client (default: false)
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

## Example: Using the Generated Client

```ts
import { MyApiClient } from "./generated/client";

const client = new MyApiClient({
  baseURL: "https://api.example.com/v1",
  fetch: globalThis.fetch,
});

const data = await client.getPetById({ petId: "123" });
console.log(data);
```

## Example: Using Generated Zod Schemas

```ts
import { PetSchema } from "./generated/schemas";

const result = PetSchema.safeParse(someData);
if (!result.success) {
  console.error(result.error);
}
```

## Requirements

- Node.js 18+
- pnpm

## License

MIT

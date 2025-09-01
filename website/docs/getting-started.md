# Getting Started

Welcome to **YanoGen-Ts** - Yet Another OpenAPI to TypeScript Generator that creates fully-typed Zod v4 schemas and type-safe REST API clients from OpenAPI specifications.

> **Disclaimer:** This project is currently in an early stage. Breaking changes may occur at any time. The first stable release will be version **0.1.0**. Nevertheless, it's already solid and you can still use it in your projects, but be prepared for potential changes in the API.

## What is YanoGen-Ts?

We all like the developer experience of [tRPC](https://trpc.io/), but not always we're in control of the backend. OpenAPI specifications provide a powerful way to define your API contracts, and with YanoGen-Ts, you can easily generate TypeScript code that strictly adheres to those contracts, all while enjoying a seamless developer experience.

✨ Effortlessly turn your OpenAPI specifications into **fully-typed Zod v4 schemas** ready for runtime (client or server) validation and TypeScript development.

Need a **client**? 🚀 Instantly generate a type-safe, low-footprint, operation-based REST API client alongside your schemas.

Need to **validate server requests and return typed responses**? 🛡️ We've got you covered with built-in support for request and response validation using Zod schemas.

## Quick Start

### Installation

You can use YanoGen-Ts directly with `npx` without installation:

```bash
npx yanogen-ts generate \
  --generate-client \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o generated
```

Or install it globally:

```bash
npm install -g yanogen-ts
```

### Basic Usage

Generate schemas and client from an OpenAPI spec:

```bash
pnpx yanogen-ts generate \
  --generate-server \
  --generate-client \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o generated
```

### Watch Mode

You can run the CLI in watch mode to automatically regenerate code on file changes:

```bash
pnpx chokidar-cli openapi.yaml -c \
  "yanogen-ts generate \
  --generate-server \
  --generate-client \
  -i openapi.yaml \
  -o generated"
```

## Supported Input Formats

The generator automatically detects and converts:

- **OpenAPI 2.0** (Swagger) → 3.0 → 3.1
- **OpenAPI 3.0.x** → 3.1
- **OpenAPI 3.1.x** (no conversion needed)

All input formats (local or remote yaml or JSON) are automatically normalized to OpenAPI 3.1.0 before generation.

## Generated Architecture

The generator creates:

- **`server/`** - Typed handler wrappers
- **`client/`** - Individual operation functions for each API endpoint
- **`schemas/`** - Zod schemas and TypeScript types

## Why Choose YanoGen-Ts?

Why choose this generator against alternatives? See our [comparison with alternative libraries](/docs/comparison) for more details.

See our [examples](/docs/examples) for comprehensive information about all capabilities.
  -o ./generated
```

### Your First Generated Client

After generation, you can use your type-safe client like this:

```typescript
import { getPetById, createPet } from './generated/operations/index.js';

// Define your API configuration
const apiConfig = {
  baseURL: 'https://api.example.com/v1',
  fetch: fetch,
  headers: {
    Authorization: 'Bearer your-token',
  },
};

// Call operations with full type safety
const pet = await getPetById({ petId: '123' }, apiConfig);

if (pet.status === 200) {
  // pet.data is typed according to your OpenAPI spec
  console.log('Pet name:', pet.data.name);
} else if (pet.status === 404) {
  console.log('Pet not found');
}
```

## Next Steps

- Learn about [CLI Usage](./cli-usage) for advanced options
- Explore [Client Generation](./client-generation) for detailed client usage
- Check out [Server Generation](./server-generation) for building type-safe servers
- See [Examples](./examples) for real-world usage patterns

## Need Help?

- Check out our [GitHub repository](https://github.com/gunzip/yanogen-ts)
- Browse the [API Reference](./api-reference)
- See the [Comparison](./comparison) with other tools
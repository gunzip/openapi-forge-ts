# Getting Started

Welcome to **YanoGen-Ts** - the type-safe OpenAPI to TypeScript generator that creates fully-typed Zod v4 schemas and operation-based REST API clients.

## What is YanoGen-Ts?

YanoGen-Ts is a powerful code generator that transforms your OpenAPI specifications into:

- **Fully-typed Zod v4 schemas** ready for runtime validation
- **Type-safe, operation-based REST API clients** with comprehensive error handling
- **Server route wrappers** for building type-safe HTTP servers
- **Tree-shakable output** where each operation is in its own file

## Why Choose YanoGen-Ts?

✨ **Developer Experience**: Enjoy a tRPC-like experience while staying true to OpenAPI standards

🛡️ **Type Safety**: Strong TypeScript typing with comprehensive support for multiple response types

🚀 **Performance**: Minimal runtime dependencies (only Zod) and optimized for fast generation

🔧 **Flexibility**: Works with OpenAPI 2.0, 3.0.x, and 3.1.x specifications

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
yanogen-ts generate \
  --generate-client \
  -i your-openapi-spec.yaml \
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
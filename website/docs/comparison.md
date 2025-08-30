# Comparison with Other Tools

After [evaluating several libraries](https://github.com/gunzip/openapi-generator-benchmark), we found that each has its strengths and weaknesses. Here's how YanoGen-Ts compares to popular alternatives.

## Feature Comparison

| Feature / Limitation | **YanoGen-Ts** | openapi-codegen-ts | openapi-zod-client | openapi-ts |
|---------------------|:--------------:|:------------------:|:------------------:|:----------:|
| **Output structure** | Modular | Monolithic | Monolithic | Monolithic |
| **Dependency footprint** | Minimal (Zod only) | io-ts, @pagopa/ts-commons, fp-ts | zodios + others | Minimal (Zod only) |
| **Runtime validation** | Zod v4 | io-ts | Zod v3 | Zod v4 |
| **OpenAPI version support** | 2.0, 3.0.x, 3.1.x (auto-normalized) | 2.0, 3.0.x | 3.0.x, 3.1.x | 3.0.x, 3.1.x |
| **Error handling** | Strongly Typed | Typed, exhaustive | Basic | Basic |
| **Generation Speed** | Faster | Slow on big specs | Fast | Fast |
| **Schema Quality** | Very good | Very good | Loose | Good |
| **Multiple success responses** | ✅ | ✅ | ❌ | ✅ |
| **Multiple content types** | ✅ | ❌ | ❌ | ❌ |
| **Security header support** | ✅ | ✅ | ❌ | ✅ |
| **File download response** | ✅ | ✅ | ❌ | ✅ |
| **Tree-shaking friendly** | ✅ | ❌ | ❌ | ❌ |
| **Per-operation overrides** | ✅ | ✅ | ❌ | ✅ |
| **File upload support** | ✅ | ✅ | ✅ | ✅ |
| **Server Validation** | ✅ | ❌ | ❌ | ❌ |

## Detailed Comparison

### YanoGen-Ts

**Strengths:**
- ✅ **Operation-based architecture** - Each operation is tree-shakable
- ✅ **Comprehensive OpenAPI support** - Handles all versions and edge cases
- ✅ **Minimal runtime dependencies** - Only Zod required
- ✅ **Both client and server generation** - Full-stack type safety
- ✅ **Excellent error handling** - Discriminated unions for all responses
- ✅ **Fast generation** - Optimized for large specifications
- ✅ **Multiple content types** - Full support for various request/response formats

**Use Cases:**
- Full-stack TypeScript applications
- Large-scale APIs with many operations
- Applications requiring strong type safety
- Teams wanting minimal dependencies
- Projects needing both client and server validation

### openapi-codegen-ts

**Strengths:**
- ✅ **Very robust validation** with io-ts
- ✅ **Exhaustive error handling**
- ✅ **Good TypeScript integration**

**Limitations:**
- ❌ **Heavy dependencies** (io-ts, fp-ts, @pagopa/ts-commons)
- ❌ **Monolithic output** - less tree-shakable
- ❌ **Slower generation** on large specs
- ❌ **Limited content type support**
- ❌ **No server-side generation**

**Best for:**
- Projects already using functional programming libraries
- Applications requiring io-ts validation
- Smaller APIs where bundle size isn't critical

### openapi-zod-client

**Strengths:**
- ✅ **Uses Zod** for validation
- ✅ **Fast generation**
- ✅ **Good for simple use cases**

**Limitations:**
- ❌ **Uses older Zod v3**
- ❌ **Limited error handling**
- ❌ **No multiple response support**
- ❌ **Basic schema generation**
- ❌ **Limited content type support**
- ❌ **Additional dependencies** (zodios)

**Best for:**
- Simple APIs with basic requirements
- Quick prototyping
- Projects using zodios

### openapi-ts (hey-api)

**Strengths:**
- ✅ **Modern Zod v4 support**
- ✅ **Minimal dependencies**
- ✅ **Good performance**
- ✅ **Active development**

**Limitations:**
- ❌ **Monolithic output structure**
- ❌ **Basic error handling**
- ❌ **No server-side generation**
- ❌ **Limited multiple content type support**

**Best for:**
- Client-only applications
- Teams wanting modern tooling
- Projects prioritizing simplicity

## Migration Guide

### From openapi-zod-client

YanoGen-Ts provides a more robust alternative with better type safety:

```typescript
// openapi-zod-client
import { createApiClient } from 'openapi-zod-client';

// YanoGen-Ts
import { getPetById, createPet } from './generated/operations/index.js';
import { configureOperations } from './generated/operations/index.js';

const config = {
  baseURL: 'https://api.example.com',
  fetch: fetch,
};

const client = configureOperations({ getPetById, createPet }, config);
```

**Benefits after migration:**
- Better tree-shaking
- Stronger error handling
- Multiple response type support
- Server-side validation options

### From openapi-ts

YanoGen-Ts offers operation-based architecture for better modularity:

```typescript
// openapi-ts (monolithic)
import { ApiClient } from './generated/client.js';

// YanoGen-Ts (modular)
import { getPetById } from './generated/operations/getPetById.js';
import { createPet } from './generated/operations/createPet.js';

// Only bundle what you use
const pet = await getPetById({ petId: '123' }, config);
```

**Benefits after migration:**
- Smaller bundle sizes
- Better error handling
- Server generation capabilities
- More flexible configuration

### From openapi-codegen-ts

YanoGen-Ts provides similar robustness with fewer dependencies:

```typescript
// openapi-codegen-ts (io-ts)
import * as t from 'io-ts';
import { pipe } from 'fp-ts/function';

// YanoGen-Ts (Zod)
import { getPetById } from './generated/operations/index.js';

const result = await getPetById({ petId: '123' }, config);

if (result.status === 200) {
  // Strongly typed without fp-ts ceremony
  console.log(result.data.name);
}
```

**Benefits after migration:**
- Simpler dependency management
- Faster build times
- More familiar Zod validation
- Tree-shakable operations

## Performance Comparison

### Bundle Size Impact

| Library | Runtime Dependencies | Typical Bundle Addition |
|---------|---------------------|------------------------|
| **YanoGen-Ts** | zod | ~50KB (tree-shakable) |
| openapi-codegen-ts | io-ts, fp-ts, @pagopa/ts-commons | ~200KB+ |
| openapi-zod-client | zod, zodios, axios | ~150KB+ |
| openapi-ts | zod | ~50KB |

### Generation Speed

Based on testing with a 500-operation OpenAPI spec:

| Library | Generation Time | Memory Usage |
|---------|----------------|--------------|
| **YanoGen-Ts** | ~2-3 seconds | ~200MB |
| openapi-codegen-ts | ~15-20 seconds | ~400MB |
| openapi-zod-client | ~3-4 seconds | ~250MB |
| openapi-ts | ~3-4 seconds | ~200MB |

## When to Choose YanoGen-Ts

### ✅ Choose YanoGen-Ts when:

- **Building full-stack applications** that need both client and server validation
- **Working with large APIs** where tree-shaking and modularity matter
- **Requiring strong error handling** with discriminated union responses
- **Using multiple content types** in requests/responses
- **Prioritizing minimal dependencies** and fast builds
- **Needing multiple OpenAPI versions** support with auto-normalization
- **Want operation-based architecture** for better maintainability

### ❌ Consider alternatives when:

- **Already heavily invested** in io-ts/fp-ts ecosystem (use openapi-codegen-ts)
- **Building simple client-only apps** with basic requirements (any tool works)
- **Using zodios extensively** and prefer its patterns (use openapi-zod-client)
- **Prioritizing extreme simplicity** over features (use openapi-ts)

## Conclusion

YanoGen-Ts was designed to address specific limitations we found in existing tools:

1. **Modular Architecture**: Tree-shakable operations vs. monolithic clients
2. **Comprehensive Error Handling**: Discriminated unions vs. basic error handling  
3. **Full-Stack Support**: Both client and server generation
4. **Modern Standards**: Latest OpenAPI 3.1.x support with auto-normalization
5. **Developer Experience**: tRPC-like ergonomics with OpenAPI standards

Our goal is to eliminate runtime errors through strong TypeScript typing while providing an exceptional developer experience that's both powerful and easy to use.

## Further Reading

- [Getting Started](./getting-started) with YanoGen-Ts
- [Client Generation](./client-generation) detailed guide
- [Server Generation](./server-generation) for full-stack development
- [Examples](./examples) showing real-world usage patterns
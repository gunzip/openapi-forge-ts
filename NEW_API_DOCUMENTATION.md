# New Operation-Based API Documentation

The OpenAPI client generator has been refactored to generate standalone operation functions instead of a class-based client. This provides more flexibility and better tree-shaking support.

## Input Format Support

The generator now supports automatic conversion of multiple OpenAPI formats:

- **OpenAPI 2.0 (Swagger)**: Automatically converted to 3.0, then to 3.1
- **OpenAPI 3.0.x**: Automatically converted to 3.1
- **OpenAPI 3.1.x**: Used directly without conversion

All conversions preserve semantics while updating format:

- `nullable: true` → `type: ["string", "null"]`
- Boolean `exclusiveMinimum/Maximum` → numeric values
- `example` → `examples` array
- Swagger 2.0 `host`/`basePath` → OpenAPI 3.x `servers`

## Architecture Overview

### Files Generated

1. **`operations/index.ts`** - Configuration types, global config, and operation exports
2. **`operations/`** - Directory containing individual operation files
3. **`schemas/`** - Generated Zod schemas (unchanged)

### Configuration System

#### Immutable Global Configuration

The global configuration is immutable and serves as the default for all operations:

```typescript
import { globalConfig } from "./operations/index.js";

// Global config is immutable - you cannot modify it
console.log(globalConfig.baseURL); // ""
console.log(globalConfig.headers); // {}
```

#### Per-Operation Configuration

Each operation accepts a configuration object that replaces the global defaults:

```typescript
import { testAuthBearer } from "./operations/testAuthBearer.js";

// Use default global config (empty baseURL, no headers)
await testAuthBearer({ qr: "required-value" });

// Override with custom configuration
await testAuthBearer(
  { qr: "required-value", qo: "optional-value" },
  {
    baseURL: "https://api.example.com",
    fetch: fetch,
    headers: {
      Authorization: "Bearer token",
    },
  }
);
```

## Operation Function Signatures

Each operation is a standalone async function with this signature:

```typescript
export async function operationName(
  params: OperationParams,
  config: GlobalConfig = globalConfig
): Promise<ReturnType>;
```

The configuration parameter has a default value of `globalConfig`, making it optional. All fields in the configuration are required.

### Parameter Types

Parameters are organized in a single object with typed properties:

#### Path Parameters

- Always required
- Converted to camelCase for the parameter object
- Original names preserved in URL construction

#### Query Parameters

- Optional unless specified as required in OpenAPI spec
- Converted to camelCase for the parameter object
- Original names preserved in URL construction

#### Header Parameters

- Optional unless specified as required in OpenAPI spec
- Converted to camelCase for the parameter object
- Original names preserved in HTTP headers

#### Request Body

- Available as `body` when operation accepts a request body

### Utility: bindAllOperationsConfig

The generator provides a utility to bind all operation functions to a specific configuration, so you don't need to pass the config object to every call:

```ts
import { bindAllOperationsConfig } from "./generated/operations/config.js";
import * as operations from "./generated/operations/index.js";

const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch,
  headers: {
    Authorization: "Bearer your-token",
  },
};

const bound = bindAllOperationsConfig(operations, apiConfig);

// Now you can call operations without passing config each time:
const pet = await bound.getPetById({ petId: "123" });
```

- All operation functions are bound to the provided config.
- The returned object has the same keys as the input operations object.
- Each function takes only the operation parameters.
- You can override the config for individual calls when needed.

#### Override configuration object

You may want to override the configuration object for specific requests
in order to customize the behavior of individual API calls setting:

- HTTP headers
- baseURL
- fetch instance

```typescript
import { testAuthBearer } from "./operations/testAuthBearer.js";
import { globalConfig } from "./operations/config.js";

await testAuthBearer(
  {
    qr: "required-value",
    qo: "optional-value",
  },
  {
    headers: {
      Authorization: "Bearer your-token",
    },
    ...globalConfig,
  }
);
```

### Examples

#### Simple GET with query parameters:

```typescript
import { testAuthBearer } from "./operations/testAuthBearer.js";

await testAuthBearer({
  qr: "required-param", // required query param
  qo: "optional-param", // optional query param
  cursor: "pagination-cursor", // optional query param
});
```

#### POST with request body:

```typescript
import { testParameterWithBodyReference } from "./operations/testParameterWithBodyReference.js";

await testParameterWithBodyReference({
  body: {
    id: "some-id",
    name: "some-name",
  },
});
```

#### Operation with path parameters:

```typescript
import { testParameterWithDash } from "./operations/testParameterWithDash.js";

await testParameterWithDash({
  pathParam: "path-value", // required path parameter
  fooBar: "query-value", // optional query parameter
  headerInlineParam: "header-value", // required header parameter
});
```

#### Operation with path-level parameters:

```typescript
import { testParametersAtPathLevel } from "./operations/testParametersAtPathLevel.js";

await testParametersAtPathLevel({
  requestId: "req-123", // required query param from path-level
  cursor: "page-cursor", // optional query param from path-level
});
```

## Type Safety

### Auth Headers

The configuration system automatically extracts authentication header names from the OpenAPI security schemes:

```typescript
// Generated from security schemes in OpenAPI spec
export type AuthHeaders = "Authorization" | "X-Functions-Key" | "custom-token";

export interface GlobalConfig {
  baseURL: string;
  fetch: typeof fetch;
  headers: {
    [K in AuthHeaders]?: string; // Typed auth headers
  } & Record<string, string>; // Plus any additional headers
}
```

### Return Types

Operations return properly typed responses based on the OpenAPI schema:

```typescript
import { testMultipleSuccess } from "./operations/testMultipleSuccess.js";
import type { Message } from "./schemas/Message.js";

const message: Message = await testMultipleSuccess();
```

## Error Handling

All operations use the same `ApiError` class:

```typescript
import { ApiError } from "./config.js";

try {
  await someOperation(params);
} catch (error) {
  if (error instanceof ApiError) {
    console.log("Status:", error.status);
    console.log("Body:", error.body);
    console.log("Headers:", error.headers);
  }
}
```

## Migration from Class-Based Client

### Before (Class-based):

```typescript
import { ApiClient } from "./client.js";

const client = new ApiClient({
  baseURL: "https://api.example.com",
  fetch: fetch,
  headers: { Authorization: "Bearer token" },
});

await client.testAuthBearer("optional", "required", "cursor");
```

### After (Operation-based):

```typescript
import { testAuthBearer } from "./operations/testAuthBearer.js";

// Define your configuration
const config = {
  baseURL: "https://api.example.com",
  headers: { Authorization: "Bearer token" },
};

await testAuthBearer(
  {
    qo: "optional",
    qr: "required",
    cursor: "cursor",
  },
  config
);
```

## Benefits

1. **Tree Shaking**: Only import the operations you actually use
2. **Type Safety**: Better parameter organization and typing
3. **Flexibility**: Easy to override configuration per operation
4. **Maintainability**: Each operation is in its own file
5. **Testing**: Easy to mock individual operations
6. **Bundle Size**: Smaller bundles when not all operations are used

## Advanced Usage

### Reusable Configuration Objects

```typescript
import { testAuthBearer, testMultipleSuccess } from "./operations/index.js";

// Define reusable configs
const prodConfig = {
  baseURL: "https://api.example.com",
  headers: { Authorization: "Bearer prod-token" },
};

const stagingConfig = {
  baseURL: "https://staging-api.example.com",
  headers: { Authorization: "Bearer staging-token" },
};

// Use with different operations
await testAuthBearer({ qr: "required" }, prodConfig);
await testMultipleSuccess({}, stagingConfig);
```

### Custom Fetch Implementation

```typescript
import { testAuthBearer } from "./operations/testAuthBearer.js";

const configWithCustomFetch = {
  baseURL: "https://api.example.com",
  fetch: async (url, options) => {
    // Add custom logging, retries, etc.
    console.log("Fetching:", url);
    return fetch(url, options);
  },
  headers: { Authorization: "Bearer token" },
};

await testAuthBearer({ qr: "required" }, configWithCustomFetch);
```

### Operation-Specific Overrides

```typescript
import { testAuthBearer } from "./operations/testAuthBearer.js";

// Base configuration
const baseConfig = {
  baseURL: "https://api.example.com",
  headers: { Authorization: "Bearer token" },
};

// Override for specific call
await testAuthBearer(
  { qr: "required" },
  {
    ...baseConfig,
    baseURL: "https://staging-api.example.com", // Different URL for this call
    headers: {
      ...baseConfig.headers,
      "X-Debug": "true", // Additional header
    },
  }
);
```

# API Reference

Complete reference for YanoGen-Ts CLI, configuration options, and programmatic usage.

## CLI Reference

### `yanogen-ts generate`

Generate TypeScript code from OpenAPI specifications.

```bash
yanogen-ts generate [options]
```

#### Required Options

| Option | Alias | Description | Example |
|--------|-------|-------------|---------|
| `--input <path>` | `-i` | Path to OpenAPI spec file or URL | `-i openapi.yaml` |
| `--output <path>` | `-o` | Output directory for generated code | `-o ./generated` |

#### Generation Options

| Option | Description | Default | Example |
|--------|-------------|---------|---------|
| `--generate-client` | Generate operation functions | `false` | `--generate-client` |
| `--generate-server` | Generate server route wrappers | `false` | `--generate-server` |
| `--force-validation` | Automatically validate responses with Zod | `false` | `--force-validation` |

#### Input Format Support

| Format | Extensions | Description |
|--------|------------|-------------|
| OpenAPI 2.0 | `.json`, `.yaml`, `.yml` | Swagger specifications (auto-converted) |
| OpenAPI 3.0.x | `.json`, `.yaml`, `.yml` | OpenAPI 3.0 specifications (auto-converted) |
| OpenAPI 3.1.x | `.json`, `.yaml`, `.yml` | OpenAPI 3.1 specifications (used directly) |
| Remote URLs | Any | HTTP/HTTPS URLs returning YAML or JSON |

#### Examples

```bash
# Generate schemas only
yanogen-ts generate -i openapi.yaml -o ./generated

# Generate client operations
yanogen-ts generate --generate-client -i openapi.yaml -o ./generated

# Generate both client and server
yanogen-ts generate --generate-client --generate-server -i openapi.yaml -o ./generated

# With automatic validation
yanogen-ts generate --generate-client --force-validation -i openapi.yaml -o ./generated

# From remote URL
yanogen-ts generate --generate-client -i https://api.example.com/openapi.json -o ./generated
```

## Programmatic API

### `generate()` Function

Generate code programmatically from Node.js applications.

```typescript
import { generate } from 'yanogen-ts';

await generate(options);
```

#### Options Interface

```typescript
interface GenerateOptions {
  /** Path to OpenAPI spec file or URL */
  input: string;
  
  /** Output directory for generated code */
  output: string;
  
  /** Generate operation functions (default: false) */
  generateClient?: boolean;
  
  /** Generate server route wrappers (default: false) */  
  generateServer?: boolean;
  
  /** Automatically validate responses with Zod (default: false) */
  forceValidation?: boolean;
}
```

#### Example Usage

```typescript
import { generate } from 'yanogen-ts';

// Basic usage
await generate({
  input: './openapi.yaml',
  output: './generated',
  generateClient: true,
});

// Full configuration
await generate({
  input: 'https://api.example.com/openapi.json',
  output: './src/api',
  generateClient: true,
  generateServer: true,
  forceValidation: false,
});
```

## Generated Code Structure

### Output Directory Layout

```
<output-dir>/
├── package.json              # Generated package metadata
├── operations/               # Client operations (if --generate-client)
│   ├── index.ts              # Operation exports and configuration
│   ├── config.ts             # Global configuration types
│   └── <operationId>.ts      # Individual operation functions
├── server/                   # Server wrappers (if --generate-server)
│   ├── index.ts              # Server exports
│   └── <operationId>.ts      # Individual route wrappers
└── schemas/                  # Zod schemas
    ├── <SchemaName>.ts       # Individual schema files
    └── index.ts              # Schema exports
```

### Generated Package.json

```json
{
  "name": "generated-api",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "zod": "^4.0.0"
  }
}
```

## Client Configuration

### Configuration Object

```typescript
interface ApiConfiguration {
  /** Base URL for API requests */
  baseURL: string;
  
  /** Fetch implementation (node-fetch, browser fetch, etc.) */
  fetch: typeof fetch;
  
  /** Default headers for all requests */
  headers?: Record<string, string>;
  
  /** Custom deserializers for specific content types */
  deserializerMap?: DeserializerMap;
}
```

#### Example Configuration

```typescript
const config: ApiConfiguration = {
  baseURL: 'https://api.example.com/v1',
  fetch: fetch,
  headers: {
    'Authorization': 'Bearer token',
    'User-Agent': 'MyApp/1.0',
  },
  deserializerMap: {
    'application/xml': (xml: string) => parseXml(xml),
    'text/csv': (csv: string) => parseCSV(csv),
  },
};
```

### Deserializer Functions

```typescript
type Deserializer = (data: unknown, contentType?: string) => unknown;
type DeserializerMap = Record<string, Deserializer>;
```

#### Built-in Content Type Support

| Content Type | Default Handling | Custom Deserializer |
|--------------|------------------|---------------------|
| `application/json` | Automatic JSON parsing | Optional override |
| `application/x-www-form-urlencoded` | Automatic parsing | Optional override |
| `multipart/form-data` | FormData handling | Optional override |
| `application/octet-stream` | Blob/ArrayBuffer | Recommended |
| `text/plain` | String | Optional |
| `application/xml` | Raw string | Recommended |
| `text/csv` | Raw string | Recommended |

## Operation Functions

### Function Signature

```typescript
type OperationFunction<TParams, TResponse> = (
  params: TParams,
  config?: ApiConfiguration
) => Promise<TResponse>;
```

### Parameter Types

#### Path Parameters

```typescript
interface PathParams {
  [key: string]: string | number;
}
```

#### Query Parameters

```typescript
interface QueryParams {
  [key: string]: string | number | boolean | Array<string | number>;
}
```

#### Request Body

```typescript
interface RequestBody {
  body: unknown;
  contentType?: {
    request?: string;
    response?: string;
  };
}
```

#### Headers

```typescript
interface HeaderParams {
  [key: string]: string;
}
```

### Response Types

#### Success Response

```typescript
interface SuccessResponse<T> {
  status: 200 | 201 | 202 | 204; // etc.
  data: T;
  headers: Record<string, string>;
  parse(): ParseResult<T>;
}
```

#### Error Response

```typescript
interface ErrorResponse<T> {
  status: 400 | 401 | 403 | 404 | 500; // etc.
  data: T;
  headers: Record<string, string>;
  parse(): ParseResult<T>;
}
```

#### Parse Results

```typescript
type ParseResult<T> = 
  | { contentType: string; parsed: T }
  | { contentType: string; parseError: ZodError }
  | { contentType: string; deserializationError: Error }
  | { contentType: string; missingSchema: true; deserialized: unknown };
```

### Helper Functions

#### `configureOperations()`

Bind configuration to multiple operations.

```typescript
function configureOperations<T extends Record<string, Function>>(
  operations: T,
  config: ApiConfiguration
): T;
```

#### `isParsed()`

Type guard for successful parsing.

```typescript
function isParsed<T>(result: ParseResult<T>): result is { contentType: string; parsed: T };
```

## Server Handler Types

### Handler Function Signature

```typescript
type Handler<TParams, TResponse> = (
  params: HandlerParams<TParams>
) => Promise<HandlerResponse<TResponse>>;
```

### Handler Parameters

```typescript
type HandlerParams<T> = 
  | { type: 'ok'; value: T }
  | { type: 'path_error'; error: ZodError }
  | { type: 'query_error'; error: ZodError }
  | { type: 'header_error'; error: ZodError }
  | { type: 'body_error'; error: ZodError };
```

### Handler Response

```typescript
interface HandlerResponse<T = unknown> {
  status: number;
  contentType: string;
  data: T;
}
```

### Wrapper Function

```typescript
type WrapperFunction<TParams, TResponse> = (
  handler: Handler<TParams, TResponse>
) => (params: TParams) => Promise<HandlerResponse<TResponse>>;
```

## Error Handling

### `UnexpectedResponseError`

Thrown for responses not defined in the OpenAPI specification.

```typescript
class UnexpectedResponseError extends Error {
  status: number;
  data: unknown;
  headers: Record<string, string>;
  url: string;
}
```

#### Usage

```typescript
try {
  const result = await getPetById({ petId: 'invalid' });
} catch (error) {
  if (error instanceof UnexpectedResponseError) {
    console.error('Unexpected response:', {
      status: error.status,
      data: error.data,
      url: error.url,
    });
  }
}
```

## Schema Generation

### Zod Schema Export

All generated schemas are exported as Zod schemas:

```typescript
// Generated schema file
import { z } from 'zod';

export const Pet = z.object({
  id: z.number().int(),
  name: z.string(),
  status: z.enum(['available', 'pending', 'sold']),
  category: z.object({
    id: z.number().int(),
    name: z.string(),
  }).optional(),
  photoUrls: z.array(z.string()),
  tags: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
  })).optional(),
});

export type Pet = z.infer<typeof Pet>;
```

### Schema Features

| OpenAPI Feature | Zod Equivalent | Notes |
|------------------|----------------|-------|
| `type: string` | `z.string()` | Basic string validation |
| `type: number` | `z.number()` | Numeric validation |
| `type: integer` | `z.number().int()` | Integer validation |
| `type: boolean` | `z.boolean()` | Boolean validation |
| `type: array` | `z.array()` | Array validation |
| `type: object` | `z.object()` | Object validation |
| `enum` | `z.enum()` | Enumeration validation |
| `format: email` | `z.string().email()` | Email format validation |
| `format: date-time` | `z.string().datetime()` | ISO datetime validation |
| `minimum/maximum` | `z.number().min().max()` | Numeric range validation |
| `minLength/maxLength` | `z.string().min().max()` | String length validation |
| `pattern` | `z.string().regex()` | Regex pattern validation |
| `required` | Required fields | Optional vs required properties |
| `nullable` | `z.nullable()` | Null value support |
| `allOf` | `z.intersection()` | Schema composition |
| `oneOf/anyOf` | `z.union()` | Union types |
| `$ref` | Direct reference | Schema references |

## Advanced Configuration

### Custom Fetch Implementation

```typescript
// Custom fetch with timeout
function createFetchWithTimeout(timeoutMs: number) {
  return async (url: string, init?: RequestInit): Promise<Response> => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  };
}

// Usage
const config = {
  baseURL: 'https://api.example.com',
  fetch: createFetchWithTimeout(30000), // 30 second timeout
};
```

### Request/Response Interceptors

```typescript
function createInterceptedConfig(baseConfig: ApiConfiguration) {
  const originalFetch = baseConfig.fetch;
  
  return {
    ...baseConfig,
    fetch: async (url: string, init?: RequestInit) => {
      // Request interceptor
      console.log('→', init?.method || 'GET', url);
      
      const response = await originalFetch(url, init);
      
      // Response interceptor
      console.log('←', response.status, url);
      
      return response;
    },
  };
}
```

## Type Utilities

### Extracting Types

```typescript
// Extract operation parameter types
type GetPetByIdParams = Parameters<typeof getPetById>[0];

// Extract operation response types  
type GetPetByIdResponse = Awaited<ReturnType<typeof getPetById>>;

// Extract successful response data type
type PetData = GetPetByIdResponse extends { status: 200; data: infer T } 
  ? T 
  : never;
```

### Configuration Helpers

```typescript
// Create typed configuration
function createApiConfig<T extends ApiConfiguration>(config: T): T {
  return config;
}

// Usage with IntelliSense
const config = createApiConfig({
  baseURL: 'https://api.example.com',
  fetch: fetch,
  headers: {
    'Authorization': 'Bearer token',
  },
});
```

## Migration and Compatibility

### Version Compatibility

| YanoGen-Ts Version | Zod Version | OpenAPI Support | Node.js Version |
|--------------------|-------------|-----------------|-----------------|
| 0.0.x | ^4.0.0 | 2.0, 3.0.x, 3.1.x | >=20.0.0 |

### Breaking Changes

When upgrading YanoGen-Ts, regenerate your code to ensure compatibility:

```bash
# Clean and regenerate
rm -rf ./generated
yanogen-ts generate --generate-client -i openapi.yaml -o ./generated
```

This API reference covers all aspects of YanoGen-Ts usage. For additional examples and patterns, see the [Examples](./examples) page.
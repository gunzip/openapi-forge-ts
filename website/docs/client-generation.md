# Client Generation

YanoGen-Ts generates type-safe, operation-based REST API clients from your OpenAPI specifications. Each operation becomes a standalone function with full TypeScript typing and optional Zod validation.

## Key Features

- 🚀 **Operation-based architecture**: Each API endpoint becomes a tree-shakable function
- 🔒 **Type-safe configuration**: Immutable config objects with per-operation overrides
- 🧩 **Discriminated union responses**: Exhaustive handling of all possible response types
- ⚠️ **Comprehensive error handling**: Only unexpected responses throw exceptions
- 📁 **File upload/download support**: Handles multipart and binary data
- 🪶 **Zero dependencies**: Only requires Zod at runtime

## Basic Usage

### 1. Generate the Client

```bash
yanogen-ts generate \
  --generate-client \
  -i openapi.yaml \
  -o ./generated
```

### 2. Import Operations

```typescript
import { getPetById, createPet } from './generated/operations/index.js';
```

### 3. Define Configuration

```typescript
const apiConfig = {
  baseURL: 'https://api.example.com/v1',
  fetch: fetch, // or globalThis.fetch in browsers
  headers: {
    Authorization: 'Bearer your-token',
  },
};
```

### 4. Call Operations

```typescript
// Simple operation call
const pet = await getPetById({ petId: '123' }, apiConfig);

// Operation with request body
const newPet = await createPet(
  {
    body: {
      name: 'Fluffy',
      status: 'available',
    },
  },
  apiConfig,
);
```

## Configuration Management

### Global Configuration

You can bind configuration to all operations to avoid passing it repeatedly:

```typescript
import * as operations from './generated/operations/index.js';
import { configureOperations } from './generated/operations/index.js';

const apiConfig = {
  baseURL: 'https://api.example.com/v1',
  fetch: fetch,
  headers: {
    Authorization: 'Bearer your-token',
  },
};

const client = configureOperations(operations, apiConfig);

// Now call operations without passing config
const pet = await client.getPetById({ petId: '123' });
```

### Per-Operation Configuration

You can override configuration for specific operations:

```typescript
// Use different base URL for a specific operation
const result = await getPetById(
  { petId: '123' },
  {
    ...apiConfig,
    baseURL: 'https://legacy-api.example.com/v1',
  }
);
```

## Response Handling

Each operation returns a discriminated union of possible responses:

```typescript
const result = await getPetById({ petId: '123' });

if (result.status === 200) {
  // result.data contains the pet data (unvalidated by default)
  console.log('Pet:', result.data);
} else if (result.status === 404) {
  console.log('Pet not found');
} else if (result.status === 500) {
  console.error('Server error:', result.data);
} else {
  // TypeScript ensures exhaustive handling
  const _exhaustive: never = result;
}
```

## Runtime Validation

### Manual Validation (Default)

By default, operations return raw data. Use the `parse()` method for validation:

```typescript
const result = await getUserProfile({ userId: '123' });

if (result.status === 200) {
  const outcome = result.parse();
  
  if (isParsed(outcome)) {
    // Validated and typed data
    console.log('User:', outcome.parsed.name, outcome.parsed.email);
  } else if ('parseError' in outcome) {
    console.error('Validation failed:', outcome.parseError);
  } else {
    console.log('Raw data:', result.data);
  }
}
```

### Automatic Validation

Generate with `--force-validation` for automatic validation:

```bash
yanogen-ts generate \
  --generate-client \
  --force-validation \
  -i openapi.yaml \
  -o ./generated
```

```typescript
const result = await getUserProfile({ userId: '123' });

if (result.status === 200) {
  if ('parsed' in result) {
    // Automatically validated data
    console.log('User:', result.parsed.name);
  } else if ('parseError' in result) {
    console.error('Validation failed:', result.parseError);
  }
}
```

### Why Manual Validation?

Manual validation provides several advantages:

- **Performance**: Skip validation for non-critical calls
- **Robustness**: Handle unexpected but harmless API changes
- **Integration**: Work with existing validation systems
- **Flexibility**: Choose when to validate based on your needs

## Exception Handling

Only unexpected responses (not defined in OpenAPI spec) throw exceptions:

```typescript
try {
  const result = await getPetById({ petId: 'invalid' });
  // Handle expected responses (200, 404, etc.)
} catch (err) {
  if (err instanceof UnexpectedResponseError) {
    console.error('Unexpected response:', err.status, err.data);
    // err.headers also available
  } else {
    throw err; // Re-throw unknown errors
  }
}
```

## File Upload and Download

### File Upload

```typescript
// Create FormData for file upload
const formData = new FormData();
formData.append('file', fileBlob, 'document.pdf');
formData.append('metadata', JSON.stringify({ type: 'document' }));

const result = await uploadFile({
  body: formData,
});
```

### File Download

```typescript
const result = await downloadFile({ fileId: '123' });

if (result.status === 200) {
  // result.data is a Blob
  const url = URL.createObjectURL(result.data);
  // Use the URL for download or display
}
```

## Multiple Content Types

### Request Content Types

Handle endpoints that accept multiple content types:

```typescript
// Send as JSON (default)
await createPet({
  body: { name: 'Fluffy', status: 'available' },
});

// Send as form-urlencoded
await createPet({
  body: { name: 'Fluffy', status: 'available' },
  contentType: { request: 'application/x-www-form-urlencoded' },
});
```

### Response Content Types

Handle endpoints that return multiple content types:

```typescript
const result = await getDocument({
  docId: '123',
  contentType: { response: 'application/xml' },
});

if (result.status === 200) {
  // result.data is typed based on selected content type
  const parsed = result.parse();
  // Handle XML response with custom deserializer
}
```

## Custom Response Deserialization

For non-JSON responses or custom transformations:

```typescript
const config = {
  ...apiConfig,
  deserializerMap: {
    'application/xml': (xmlString: string) => parseXml(xmlString),
    'application/octet-stream': (blob: Blob) => ({ size: blob.size }),
    'text/csv': (csvText: string) => parseCsv(csvText),
  },
};

const result = await getReport(
  { reportId: '123', contentType: { response: 'application/xml' } },
  config
);

if (result.status === 200) {
  const outcome = result.parse();
  if (isParsed(outcome)) {
    // XML was deserialized and validated
    console.log('Report data:', outcome.parsed);
  }
}
```

## Authentication

### Bearer Token

```typescript
const config = {
  baseURL: 'https://api.example.com',
  fetch: fetch,
  headers: {
    Authorization: 'Bearer your-jwt-token',
  },
};
```

### API Key

```typescript
const config = {
  baseURL: 'https://api.example.com',
  fetch: fetch,
  headers: {
    'X-API-Key': 'your-api-key',
  },
};
```

### Dynamic Authentication

```typescript
const getAuthHeaders = async () => {
  const token = await refreshToken();
  return { Authorization: `Bearer ${token}` };
};

const result = await getPetById(
  { petId: '123' },
  {
    ...baseConfig,
    headers: {
      ...baseConfig.headers,
      ...(await getAuthHeaders()),
    },
  }
);
```

## Error Handling Patterns

### Retry Logic

```typescript
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (err) {
      if (err instanceof UnexpectedResponseError && err.status >= 500) {
        if (i === maxRetries - 1) throw err;
        await delay(1000 * Math.pow(2, i)); // Exponential backoff
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

const result = await retryOperation(() => 
  getPetById({ petId: '123' }, config)
);
```

### Centralized Error Handling

```typescript
function handleApiResponse<T>(result: T): T {
  // Log errors, track metrics, etc.
  if ('status' in result && typeof result.status === 'number') {
    if (result.status >= 400) {
      console.error('API Error:', result.status, result);
    }
  }
  return result;
}

const result = handleApiResponse(
  await getPetById({ petId: '123' }, config)
);
```

## Best Practices

1. **Use global configuration** for common settings like base URL and auth
2. **Handle all response cases** - TypeScript will help ensure exhaustive matching
3. **Validate responses** when data integrity is critical
4. **Use custom deserializers** for non-JSON content types
5. **Implement retry logic** for network resilience
6. **Tree-shake unused operations** - import only what you need
7. **Type your configurations** - leverage the generated types
8. **Handle file uploads/downloads** appropriately with proper content types

## Next Steps

- Learn about [Server Generation](./server-generation)
- Check out [Examples](./examples) for real-world patterns
- See [API Reference](./api-reference) for detailed configuration options
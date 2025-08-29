# Examples

This page provides practical examples based on the patterns shown in the [README](https://github.com/gunzip/yanogen-ts/blob/main/README.md).

## CLI Usage Examples

### Basic Generation

```bash
# Generate schemas and client from local file
pnpx yanogen-ts generate \
  --generate-client \
  -i openapi.yaml \
  -o generated
```

### Server and Client Generation

```bash
# Generate both server wrappers and client operations
pnpx yanogen-ts generate \
  --generate-server \
  --generate-client \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o generated
```

### Watch Mode for Development

```bash
# Auto-regenerate on file changes
pnpx chokidar-cli openapi.yaml -c \
  "yanogen-ts generate \
  --generate-server \
  --generate-client \
  -i openapi.yaml \
  -o generated"
```

## Client Generation Examples

### Basic API Configuration

```typescript
import { getPetById, createPet } from './generated/client/index.js';

// Define your API configuration
const apiConfig = {
  baseURL: 'https://api.example.com/v1',
  fetch: fetch,
  headers: {
    Authorization: 'Bearer your-token',
  },
};

// Simple operation call
const pet = await getPetById({ petId: '123' }, apiConfig);

// Operation with request body
const newPet = await createPet({
  body: {
    name: 'Fluffy',
    status: 'available',
  },
}, apiConfig);
```

### Binding Configuration to Operations

```typescript
import * as operations from './generated/client/index.js';
import { configureOperations } from './generated/client/index.js';

const apiConfig = {
  baseURL: 'https://api.example.com/v1',
  fetch: fetch,
  headers: {
    Authorization: 'Bearer your-token',
  },
};

// Bind configuration to all operations
const client = configureOperations(operations, apiConfig);

// Now call operations without passing config
const pet = await client.getPetById({ petId: '123' });
```

### Response Handling

```typescript
const result = await getPetById({ petId: '123' });

if (result.status === 200) {
  // result.data contains the raw response body
  console.log('Pet found:', result.data);
} else if (result.status === 404) {
  console.warn('Pet not found');
} else {
  console.error('Unexpected status:', result.status);
}
```

### Runtime Response Validation

```typescript
const result = await getUserProfile({ userId: '123' });

if (result.status === 200) {
  const outcome = result.parse();
  if (isParsed(outcome)) {
    console.log('User:', outcome.parsed.name, outcome.parsed.email);
  } else if ('parseError' in outcome) {
    console.error('Response validation failed:', outcome.parseError);
  } else {
    console.log('User (raw, unvalidated):', result.data);
  }
}
```

### Exception Handling

```typescript
try {
  const result = await getPetById({ petId: 'notfound' });
  // handle result as above
} catch (err) {
  if (err instanceof UnexpectedResponseError) {
    console.error('Unexpected response', err.status, err.data);
  } else {
    throw err; // rethrow unknown errors
  }
}
```

## Server Generation Examples

### Express.js Integration

```typescript
import express from 'express';
import {
  testAuthBearerWrapper,
  testAuthBearerHandler,
} from './generated/server/testAuthBearer.js';
import { extractRequestParams } from './test-helpers.js';

const app = express();
app.use(express.json());

const wrappedHandler = testAuthBearerWrapper(async (params) => {
  if (params.type === 'ok') {
    // Access validated and typed parameters
    const { query, path, headers, body } = params.value;
    doSomethingWithParams(query.someParam);
    
    // Return typed response
    return {
      status: 200,
      contentType: 'application/json',
      data: { message: 'Success' },
    };
  }
  
  // Handle validation errors
  return {
    status: 400,
    contentType: 'application/json',
    data: { error: 'Validation failed' },
  };
});

app.get('/test-auth-bearer', async (req, res) => {
  const result = await wrappedHandler(extractRequestParams(req));
  res.status(result.status).type(result.contentType).send(result.data);
});

app.listen(3000);
```

## Advanced Patterns from README

### Multiple Content Types

```typescript
// Request with different content types
await createPet({
  body: { name: 'Fluffy', status: 'available' },
  contentType: { request: 'application/x-www-form-urlencoded' },
});

// Response with specific content type preference
const result = await getPetById({
  petId: '123',
  contentType: { response: 'application/xml' },
}, {
  ...globalConfig,
  deserializerMap: {
    'application/xml': myXmlDeserializer,
  },
});
```

### Custom Response Deserialization

```typescript
const config = {
  baseURL: 'https://api.example.com/v1',
  fetch: fetch,
  deserializerMap: {
    'application/xml': (data: unknown) => {
      const xmlString = data as string;
      const nameMatch = /<name>([^<]+)<\/name>/u.exec(xmlString);
      return {
        name: nameMatch?.[1] || '',
      };
    },
  },
};

const res = await testMultiContentTypes({
  contentType: { response: 'application/xml' },
}, config);

if (res.status === 200) {
  const outcome = res.parse();
  if (isParsed(outcome)) {
    console.log(outcome.parsed);
  }
}
```

### Using Generated Zod Schemas

```typescript
import { Pet } from './generated/schemas/Pet.js';

const result = Pet.safeParse(someData);
if (!result.success) {
  console.error(result.error);
}
```

## Programmatic Usage

```typescript
import { generate } from './src/generator';

await generate({
  input: './openapi.yaml',
  output: './generated',
  generateClient: true,
});
```

For more detailed information and advanced use cases, see the [complete documentation](getting-started.md) and [API reference](api-reference.md).
# Server Generation

YanoGen-Ts can generate fully-typed server route wrappers that validate requests at runtime using Zod schemas and ensure type-safe responses. This enables you to build robust HTTP servers with any web framework.

## Overview

Server generation creates wrapper functions that:

- ✅ **Validate request parameters** (path, query, headers, body) using Zod schemas
- 🛡️ **Ensure type-safe responses** that match your OpenAPI specification
- 🔧 **Work with any framework** (Express, Fastify, Hono, etc.)
- ⚡ **Provide detailed validation errors** for debugging
- 🎯 **Maintain operation-based architecture** for modularity

## Generate Server Code

```bash
yanogen-ts generate \
  --generate-server \
  -i openapi.yaml \
  -o ./generated
```

This creates a `server/` directory with:

```
server/
├── index.ts              # Server exports and types
└── <operationId>.ts      # Individual route wrappers
```

## Basic Usage

### 1. Import the Generated Wrapper

```typescript
import express from 'express';
import {
  getPetByIdWrapper,
  createPetWrapper,
} from './generated/server/index.js';
```

### 2. Create Handler Functions

```typescript
import type { GetPetByIdHandler } from './generated/server/index.js';

const getPetByIdHandler: GetPetByIdHandler = async (params) => {
  if (params.type === 'ok') {
    // params.value contains validated path, query, headers, body
    const { path } = params.value;
    const petId = path.petId;
    
    // Your business logic here
    const pet = await petService.findById(petId);
    
    if (pet) {
      return {
        status: 200,
        contentType: 'application/json',
        data: pet,
      };
    } else {
      return {
        status: 404,
        contentType: 'application/json',
        data: { error: 'Pet not found' },
      };
    }
  }
  
  // Handle validation errors
  return {
    status: 400,
    contentType: 'application/json',
    data: { error: 'Validation failed', details: params.error },
  };
};
```

### 3. Wire Up with Express

```typescript
const app = express();
app.use(express.json());

// Helper function to extract request parameters
function extractRequestParams(req: express.Request) {
  return {
    path: req.params,
    query: req.query,
    headers: req.headers,
    body: req.body,
  };
}

// Create wrapped handler
const wrappedGetPetById = getPetByIdWrapper(getPetByIdHandler);

// Set up route
app.get('/pets/:petId', async (req, res) => {
  const result = await wrappedGetPetById(extractRequestParams(req));
  res.status(result.status).type(result.contentType).send(result.data);
});
```

## Handler Function Signature

Your handler receives a discriminated union parameter:

```typescript
type HandlerParams<T> = 
  | { type: 'ok'; value: T }           // Valid request
  | { type: 'path_error'; error: ZodError }    // Path validation failed
  | { type: 'query_error'; error: ZodError }   // Query validation failed
  | { type: 'header_error'; error: ZodError }  // Header validation failed
  | { type: 'body_error'; error: ZodError };   // Body validation failed
```

The handler must return:

```typescript
type HandlerResponse = {
  status: number;
  contentType: string;
  data: unknown;
};
```

## Advanced Examples

### Complete CRUD Handler

```typescript
import type { 
  CreatePetHandler,
  GetPetByIdHandler,
  UpdatePetHandler,
  DeletePetHandler 
} from './generated/server/index.js';

// Create pet
const createPetHandler: CreatePetHandler = async (params) => {
  if (params.type === 'ok') {
    const { body } = params.value;
    
    try {
      const pet = await petService.create(body);
      return {
        status: 201,
        contentType: 'application/json',
        data: pet,
      };
    } catch (error) {
      return {
        status: 500,
        contentType: 'application/json',
        data: { error: 'Failed to create pet' },
      };
    }
  }
  
  return {
    status: 400,
    contentType: 'application/json',
    data: { error: 'Invalid request', details: params.error },
  };
};

// Update pet
const updatePetHandler: UpdatePetHandler = async (params) => {
  if (params.type === 'ok') {
    const { path, body } = params.value;
    
    const pet = await petService.update(path.petId, body);
    
    if (pet) {
      return {
        status: 200,
        contentType: 'application/json',
        data: pet,
      };
    } else {
      return {
        status: 404,
        contentType: 'application/json',
        data: { error: 'Pet not found' },
      };
    }
  }
  
  return {
    status: 400,
    contentType: 'application/json',
    data: { error: 'Validation failed', details: params.error },
  };
};
```

### File Upload Handler

```typescript
import type { UploadPetPhotoHandler } from './generated/server/index.js';

const uploadPetPhotoHandler: UploadPetPhotoHandler = async (params) => {
  if (params.type === 'ok') {
    const { path, body } = params.value;
    const petId = path.petId;
    
    // body is FormData for multipart uploads
    const file = body.get('file') as File;
    
    if (file) {
      const photoUrl = await storageService.uploadFile(file, `pets/${petId}`);
      
      return {
        status: 200,
        contentType: 'application/json',
        data: { photoUrl },
      };
    }
    
    return {
      status: 400,
      contentType: 'application/json',
      data: { error: 'No file provided' },
    };
  }
  
  return {
    status: 400,
    contentType: 'application/json',
    data: { error: 'Invalid upload request', details: params.error },
  };
};
```

### Authentication Handling

```typescript
import type { GetUserProfileHandler } from './generated/server/index.js';

const getUserProfileHandler: GetUserProfileHandler = async (params) => {
  if (params.type === 'ok') {
    const { headers, path } = params.value;
    
    // Extract and validate authorization
    const authHeader = headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        status: 401,
        contentType: 'application/json',
        data: { error: 'Missing or invalid authorization header' },
      };
    }
    
    const token = authHeader.slice(7);
    const user = await authService.validateToken(token);
    
    if (!user) {
      return {
        status: 401,
        contentType: 'application/json',
        data: { error: 'Invalid token' },
      };
    }
    
    // Check if user can access the requested profile
    const userId = path.userId;
    if (user.id !== userId && !user.isAdmin) {
      return {
        status: 403,
        contentType: 'application/json',
        data: { error: 'Access denied' },
      };
    }
    
    const profile = await userService.getProfile(userId);
    
    return {
      status: 200,
      contentType: 'application/json',
      data: profile,
    };
  }
  
  return {
    status: 400,
    contentType: 'application/json',
    data: { error: 'Validation failed', details: params.error },
  };
};
```

## Framework Integration

### Express.js

```typescript
import express from 'express';
import { getAllPetsWrapper } from './generated/server/index.js';

const app = express();
app.use(express.json());

const wrappedHandler = getAllPetsWrapper(async (params) => {
  if (params.type === 'ok') {
    const { query } = params.value;
    const pets = await petService.getAll({
      limit: query.limit,
      offset: query.offset,
      status: query.status,
    });
    
    return {
      status: 200,
      contentType: 'application/json',
      data: pets,
    };
  }
  
  return {
    status: 400,
    contentType: 'application/json',
    data: { error: 'Invalid query parameters' },
  };
});

app.get('/pets', async (req, res) => {
  const result = await wrappedHandler({
    path: req.params,
    query: req.query,
    headers: req.headers,
    body: req.body,
  });
  
  res.status(result.status).type(result.contentType).send(result.data);
});
```

### Fastify

```typescript
import Fastify from 'fastify';
import { createPetWrapper } from './generated/server/index.js';

const fastify = Fastify();

const wrappedHandler = createPetWrapper(async (params) => {
  if (params.type === 'ok') {
    const { body } = params.value;
    const pet = await petService.create(body);
    
    return {
      status: 201,
      contentType: 'application/json',
      data: pet,
    };
  }
  
  return {
    status: 400,
    contentType: 'application/json',
    data: { error: 'Invalid pet data' },
  };
});

fastify.post('/pets', async (request, reply) => {
  const result = await wrappedHandler({
    path: request.params,
    query: request.query,
    headers: request.headers,
    body: request.body,
  });
  
  reply.status(result.status).type(result.contentType).send(result.data);
});
```

### Hono

```typescript
import { Hono } from 'hono';
import { getPetByIdWrapper } from './generated/server/index.js';

const app = new Hono();

const wrappedHandler = getPetByIdWrapper(async (params) => {
  if (params.type === 'ok') {
    const { path } = params.value;
    const pet = await petService.findById(path.petId);
    
    if (pet) {
      return {
        status: 200,
        contentType: 'application/json',
        data: pet,
      };
    }
    
    return {
      status: 404,
      contentType: 'application/json',
      data: { error: 'Pet not found' },
    };
  }
  
  return {
    status: 400,
    contentType: 'application/json',
    data: { error: 'Invalid request' },
  };
});

app.get('/pets/:petId', async (c) => {
  const result = await wrappedHandler({
    path: c.req.param(),
    query: c.req.query(),
    headers: Object.fromEntries(c.req.raw.headers.entries()),
    body: await c.req.json().catch(() => ({})),
  });
  
  return c.json(result.data, result.status);
});
```

## Error Handling Strategies

### Structured Error Responses

```typescript
type ErrorResponse = {
  error: string;
  code: string;
  details?: unknown;
  timestamp: string;
};

const createErrorResponse = (
  error: string,
  code: string,
  details?: unknown
): ErrorResponse => ({
  error,
  code,
  details,
  timestamp: new Date().toISOString(),
});

const handler: CreatePetHandler = async (params) => {
  if (params.type === 'ok') {
    try {
      const pet = await petService.create(params.value.body);
      return {
        status: 201,
        contentType: 'application/json',
        data: pet,
      };
    } catch (error) {
      return {
        status: 500,
        contentType: 'application/json',
        data: createErrorResponse(
          'Internal server error',
          'INTERNAL_ERROR',
          process.env.NODE_ENV === 'development' ? error : undefined
        ),
      };
    }
  }
  
  return {
    status: 400,
    contentType: 'application/json',
    data: createErrorResponse(
      'Validation failed',
      'VALIDATION_ERROR',
      params.error.issues
    ),
  };
};
```

### Logging and Monitoring

```typescript
import { logger } from './logger.js';

const createPetHandler: CreatePetHandler = async (params) => {
  const startTime = Date.now();
  const requestId = generateRequestId();
  
  logger.info('Request started', {
    requestId,
    operation: 'createPet',
    type: params.type,
  });
  
  if (params.type === 'ok') {
    try {
      const pet = await petService.create(params.value.body);
      
      logger.info('Request completed successfully', {
        requestId,
        duration: Date.now() - startTime,
        status: 201,
      });
      
      return {
        status: 201,
        contentType: 'application/json',
        data: pet,
      };
    } catch (error) {
      logger.error('Request failed', {
        requestId,
        duration: Date.now() - startTime,
        error,
      });
      
      return {
        status: 500,
        contentType: 'application/json',
        data: { error: 'Internal server error' },
      };
    }
  }
  
  logger.warn('Request validation failed', {
    requestId,
    duration: Date.now() - startTime,
    validationError: params.error,
  });
  
  return {
    status: 400,
    contentType: 'application/json',
    data: { error: 'Validation failed' },
  };
};
```

## Best Practices

1. **Handle all validation cases** - Always check `params.type` first
2. **Return appropriate HTTP status codes** - Follow REST conventions
3. **Provide meaningful error messages** - Help API consumers understand issues
4. **Implement proper logging** - Track requests, errors, and performance
5. **Use type-safe responses** - Leverage the generated types
6. **Handle file uploads correctly** - Work with FormData for multipart requests
7. **Implement authentication consistently** - Extract and validate tokens properly
8. **Structure error responses** - Use consistent error formats across operations

## Testing Server Handlers

```typescript
import { describe, it, expect } from 'vitest';
import { createPetWrapper } from './generated/server/index.js';

describe('createPet handler', () => {
  const handler = createPetWrapper(async (params) => {
    if (params.type === 'ok') {
      return {
        status: 201,
        contentType: 'application/json',
        data: { id: '123', ...params.value.body },
      };
    }
    
    return {
      status: 400,
      contentType: 'application/json',
      data: { error: 'Validation failed' },
    };
  });
  
  it('should create pet with valid data', async () => {
    const result = await handler({
      path: {},
      query: {},
      headers: {},
      body: { name: 'Fluffy', status: 'available' },
    });
    
    expect(result.status).toBe(201);
    expect(result.data).toEqual({
      id: '123',
      name: 'Fluffy',
      status: 'available',
    });
  });
  
  it('should return 400 for invalid data', async () => {
    const result = await handler({
      path: {},
      query: {},
      headers: {},
      body: { name: '' }, // Invalid: missing status
    });
    
    expect(result.status).toBe(400);
  });
});
```

## Next Steps

- Learn about [Client Generation](./client-generation) for the other side of the API
- Check out [Examples](./examples) for complete server implementations
- See [API Reference](./api-reference) for detailed configuration options
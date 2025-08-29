# Examples

This page showcases real-world usage patterns and examples for YanoGen-Ts in various scenarios.

## Quick Start Examples

### Basic Client Usage

```typescript
import { getPetById, createPet } from './generated/operations/index.js';

// Define your API configuration
const config = {
  baseURL: 'https://petstore.swagger.io/v2',
  fetch: fetch,
};

// Call an operation
async function example() {
  const result = await getPetById({ petId: '1' }, config);
  
  if (result.status === 200) {
    console.log('Pet found:', result.data.name);
  } else if (result.status === 404) {
    console.log('Pet not found');
  }
}
```

### With Authentication

```typescript
import { getPetById } from './generated/operations/index.js';

const authenticatedConfig = {
  baseURL: 'https://api.example.com/v1',
  fetch: fetch,
  headers: {
    'Authorization': 'Bearer your-jwt-token',
    'X-API-Key': 'your-api-key',
  },
};

const pet = await getPetById({ petId: '123' }, authenticatedConfig);
```

## Frontend Integration

### React Hook for API Calls

```typescript
// hooks/usePets.ts
import { useState, useEffect } from 'react';
import { getAllPets } from '../generated/operations/index.js';
import { useApiConfig } from './useApiConfig.js';

export function usePets() {
  const [pets, setPets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const config = useApiConfig();

  useEffect(() => {
    const fetchPets = async () => {
      try {
        const result = await getAllPets({}, config);
        
        if (result.status === 200) {
          setPets(result.data);
        } else {
          setError(`Failed to fetch pets: ${result.status}`);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPets();
  }, []);

  return { pets, loading, error };
}
```

### React Component with Form Submission

```typescript
// components/CreatePetForm.tsx
import React, { useState } from 'react';
import { createPet } from '../generated/operations/index.js';
import { useApiConfig } from '../hooks/useApiConfig.js';

export function CreatePetForm() {
  const [formData, setFormData] = useState({ name: '', status: 'available' });
  const [submitting, setSubmitting] = useState(false);
  const config = useApiConfig();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const result = await createPet({ body: formData }, config);
      
      if (result.status === 201) {
        // Success - redirect or show success message
        console.log('Pet created:', result.data);
        setFormData({ name: '', status: 'available' });
      } else {
        // Handle validation errors
        console.error('Failed to create pet:', result.status, result.data);
      }
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>
          Name:
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
        </label>
      </div>
      <div>
        <label>
          Status:
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
          >
            <option value="available">Available</option>
            <option value="pending">Pending</option>
            <option value="sold">Sold</option>
          </select>
        </label>
      </div>
      <button type="submit" disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Pet'}
      </button>
    </form>
  );
}
```

### Vue.js Composition API

```typescript
// composables/usePetStore.ts
import { ref, computed } from 'vue';
import { getAllPets, createPet, updatePet } from '../generated/operations/index.js';

export function usePetStore() {
  const pets = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const config = {
    baseURL: 'https://api.example.com/v1',
    fetch: fetch,
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('token')}`,
    },
  };

  const fetchPets = async () => {
    loading.value = true;
    error.value = null;

    try {
      const result = await getAllPets({}, config);
      
      if (result.status === 200) {
        pets.value = result.data;
      } else {
        error.value = `Failed to fetch pets: ${result.status}`;
      }
    } catch (err) {
      error.value = err.message;
    } finally {
      loading.value = false;
    }
  };

  const createNewPet = async (petData) => {
    const result = await createPet({ body: petData }, config);
    
    if (result.status === 201) {
      pets.value.push(result.data);
      return { success: true, pet: result.data };
    } else {
      return { success: false, error: result.data };
    }
  };

  return {
    pets: computed(() => pets.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    fetchPets,
    createNewPet,
  };
}
```

## Backend Integration

### Express.js Server

```typescript
// server.ts
import express from 'express';
import {
  getPetByIdWrapper,
  createPetWrapper,
  updatePetWrapper,
} from './generated/server/index.js';
import { PetService } from './services/PetService.js';

const app = express();
app.use(express.json());

const petService = new PetService();

// Helper to extract request parameters
function extractParams(req: express.Request) {
  return {
    path: req.params,
    query: req.query,
    headers: req.headers,
    body: req.body,
  };
}

// Get pet by ID
const getPetByIdHandler = getPetByIdWrapper(async (params) => {
  if (params.type === 'ok') {
    const { path } = params.value;
    const pet = await petService.findById(path.petId);
    
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
    data: { error: 'Invalid request', details: params.error },
  };
});

// Create pet
const createPetHandler = createPetWrapper(async (params) => {
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
        data: { error: 'Failed to create pet' },
      };
    }
  }
  
  return {
    status: 400,
    contentType: 'application/json',
    data: { error: 'Validation failed', details: params.error },
  };
});

// Routes
app.get('/pets/:petId', async (req, res) => {
  const result = await getPetByIdHandler(extractParams(req));
  res.status(result.status).type(result.contentType).send(result.data);
});

app.post('/pets', async (req, res) => {
  const result = await createPetHandler(extractParams(req));
  res.status(result.status).type(result.contentType).send(result.data);
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Fastify Server

```typescript
// fastify-server.ts
import Fastify from 'fastify';
import { createPetWrapper, getAllPetsWrapper } from './generated/server/index.js';
import { PetService } from './services/PetService.js';

const fastify = Fastify({ logger: true });
const petService = new PetService();

// Create pet handler
const createPetHandler = createPetWrapper(async (params) => {
  if (params.type === 'ok') {
    const pet = await petService.create(params.value.body);
    return {
      status: 201,
      contentType: 'application/json',
      data: pet,
    };
  }
  
  return {
    status: 400,
    contentType: 'application/json',
    data: { error: 'Invalid pet data', details: params.error },
  };
});

// Get all pets handler
const getAllPetsHandler = getAllPetsWrapper(async (params) => {
  if (params.type === 'ok') {
    const { query } = params.value;
    const pets = await petService.findAll({
      status: query.status,
      limit: query.limit || 20,
      offset: query.offset || 0,
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

// Routes
fastify.post('/pets', async (request, reply) => {
  const result = await createPetHandler({
    path: request.params,
    query: request.query,
    headers: request.headers,
    body: request.body,
  });
  
  reply.status(result.status).type(result.contentType).send(result.data);
});

fastify.get('/pets', async (request, reply) => {
  const result = await getAllPetsHandler({
    path: request.params,
    query: request.query,
    headers: request.headers,
    body: {},
  });
  
  reply.status(result.status).type(result.contentType).send(result.data);
});

const start = async () => {
  try {
    await fastify.listen({ port: 3000 });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
```

## Advanced Patterns

### Client with Retry Logic

```typescript
// utils/apiClient.ts
import { UnexpectedResponseError } from './generated/operations/index.js';

export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof UnexpectedResponseError) {
        // Retry on server errors
        if (error.status >= 500 && attempt < maxRetries) {
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
import { getPetById } from './generated/operations/index.js';

const pet = await withRetry(() => 
  getPetById({ petId: '123' }, config)
);
```

### Request/Response Interceptors

```typescript
// utils/interceptors.ts
export function createInterceptedFetch() {
  return async (url: string, init?: RequestInit) => {
    // Request interceptor
    console.log('Making request to:', url);
    const startTime = Date.now();
    
    // Add common headers
    const headers = new Headers(init?.headers);
    headers.set('X-Request-ID', generateRequestId());
    
    try {
      const response = await fetch(url, {
        ...init,
        headers,
      });
      
      // Response interceptor
      const duration = Date.now() - startTime;
      console.log(`Request completed in ${duration}ms:`, response.status);
      
      return response;
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  };
}

// Usage with YanoGen-Ts
const config = {
  baseURL: 'https://api.example.com/v1',
  fetch: createInterceptedFetch(),
  headers: {
    'Authorization': 'Bearer token',
  },
};
```

### Custom Response Validation

```typescript
// utils/validation.ts
import { z } from 'zod';

// Custom validation schema that extends the generated ones
const ExtendedPetSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['available', 'pending', 'sold']),
  // Add custom validation
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export async function validatePetResponse(pet: unknown) {
  const result = ExtendedPetSchema.safeParse(pet);
  
  if (!result.success) {
    console.warn('Pet data validation failed:', result.error);
    return null;
  }
  
  return result.data;
}

// Usage
import { getPetById } from './generated/operations/index.js';

const result = await getPetById({ petId: '123' }, config);

if (result.status === 200) {
  const validatedPet = await validatePetResponse(result.data);
  if (validatedPet) {
    console.log('Valid pet:', validatedPet);
  }
}
```

### File Upload with Progress

```typescript
// utils/fileUpload.ts
import { uploadPetPhoto } from './generated/operations/index.js';

export async function uploadFileWithProgress(
  file: File,
  petId: string,
  onProgress?: (progress: number) => void
) {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('petId', petId);

  // Custom fetch with progress tracking
  const customFetch = async (url: string, init?: RequestInit) => {
    return new Promise<Response>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          const progress = (event.loaded / event.total) * 100;
          onProgress(progress);
        }
      });
      
      xhr.addEventListener('load', () => {
        const response = new Response(xhr.response, {
          status: xhr.status,
          statusText: xhr.statusText,
        });
        resolve(response);
      });
      
      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      
      xhr.open(init?.method || 'POST', url);
      
      // Set headers
      if (init?.headers) {
        const headers = new Headers(init.headers);
        headers.forEach((value, key) => {
          xhr.setRequestHeader(key, value);
        });
      }
      
      xhr.send(init?.body);
    });
  };

  const result = await uploadPetPhoto(
    { petId, body: formData },
    { ...config, fetch: customFetch }
  );

  return result;
}
```

## Testing Patterns

### Unit Testing Operations

```typescript
// tests/operations.test.ts
import { describe, it, expect, vi } from 'vitest';
import { getPetById } from '../generated/operations/index.js';

describe('getPetById', () => {
  it('should return pet data for valid ID', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ id: '123', name: 'Fluffy' }),
    });

    const result = await getPetById(
      { petId: '123' },
      {
        baseURL: 'https://api.example.com',
        fetch: mockFetch,
      }
    );

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ id: '123', name: 'Fluffy' });
  });

  it('should handle 404 responses', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    });

    const result = await getPetById(
      { petId: 'nonexistent' },
      {
        baseURL: 'https://api.example.com',
        fetch: mockFetch,
      }
    );

    expect(result.status).toBe(404);
    expect(result.data).toEqual({ error: 'Not found' });
  });
});
```

### Integration Testing

```typescript
// tests/integration.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createPet, getPetById } from '../generated/operations/index.js';

describe('Pet API Integration', () => {
  const config = {
    baseURL: 'http://localhost:3000',
    fetch: fetch,
  };

  it('should create and retrieve a pet', async () => {
    // Create a pet
    const createResult = await createPet(
      {
        body: {
          name: 'Test Pet',
          status: 'available',
        },
      },
      config
    );

    expect(createResult.status).toBe(201);
    const createdPet = createResult.data;

    // Retrieve the pet
    const getResult = await getPetById(
      { petId: createdPet.id },
      config
    );

    expect(getResult.status).toBe(200);
    expect(getResult.data.name).toBe('Test Pet');
  });
});
```

## Production Considerations

### Error Monitoring

```typescript
// utils/monitoring.ts
import { UnexpectedResponseError } from './generated/operations/index.js';

export function setupErrorMonitoring() {
  // Monitor unexpected API errors
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason instanceof UnexpectedResponseError) {
      // Send to error tracking service
      console.error('Unexpected API Error:', {
        status: event.reason.status,
        url: event.reason.url,
        data: event.reason.data,
      });
    }
  });
}
```

### Configuration Management

```typescript
// config/api.ts
interface ApiConfig {
  baseURL: string;
  timeout: number;
  retries: number;
}

const configs: Record<string, ApiConfig> = {
  development: {
    baseURL: 'http://localhost:3000',
    timeout: 10000,
    retries: 1,
  },
  staging: {
    baseURL: 'https://staging-api.example.com',
    timeout: 15000,
    retries: 2,
  },
  production: {
    baseURL: 'https://api.example.com',
    timeout: 30000,
    retries: 3,
  },
};

export function getApiConfig() {
  const env = process.env.NODE_ENV || 'development';
  return configs[env] || configs.development;
}
```

These examples demonstrate how YanoGen-Ts integrates seamlessly into real-world applications, providing type safety and reliability across the entire development lifecycle.
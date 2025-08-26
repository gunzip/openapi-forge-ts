# Server Generator Integration Tests

This directory contains comprehensive integration tests for the `server-generator` module. These tests demonstrate how to use the generated server wrappers with Express.js to create fully-typed, validated REST API endpoints.

## Overview

The server-generator creates wrapper functions that:

- Validate request parameters using Zod schemas
- Provide type-safe interfaces for handlers
- Handle validation errors gracefully
- Support all OpenAPI parameter types (query, path, headers, body)

## Test Structure

```
tests/integrations/server-generator/
├── generated/                          # Generated server operations from test.yaml
│   ├── schemas/                        # Zod schemas
│   └── server-operations/              # Wrapper functions
├── authentication.test.ts              # Authentication and security tests
├── file-operations.test.ts             # File upload/download tests
├── multi-content-types.test.ts         # Multiple content-type handling
├── parameter-validation.test.ts        # Parameter validation tests
├── request-body.test.ts                # Request body handling tests
├── response-handling.test.ts           # Response format tests
├── security-edge-cases.test.ts         # Security and edge case tests
├── working-example.test.ts             # Complete integration examples
├── simple-debug.test.ts                # Debug utilities and basic tests
├── test-utils.ts                       # Test utilities and helpers
└── README.md                           # This file
```

## Generated Code Structure

The server-generator creates wrappers for each OpenAPI operation:

```typescript
// Generated wrapper for testAuthBearer operation
export function testAuthBearerWrapper(handler: testAuthBearerHandler) {
  return async (req: {
    query: unknown;
    path: unknown;
    headers: unknown;
    body?: unknown;
    contentType?: string;
  }): Promise<testAuthBearerResponse> => {
    // Validates parameters using Zod schemas
    // Calls handler with validated params or validation errors
  };
}
```

## Integration Pattern

### Basic Express Integration

```typescript
import express from "express";
import { testAuthBearerWrapper } from "../generated/server-operations/testAuthBearer.js";

const app = express();

app.get("/test-auth-bearer", async (req, res) => {
  const handler = async (params) => {
    if (params.type === "ok") {
      // Use validated parameters
      return {
        status: 200,
        contentType: "application/json",
        data: { message: "Success", query: params.value.query },
      };
    }

    // Handle validation errors
    if (params.type === "query_error") {
      return {
        status: 400,
        contentType: "application/json",
        data: { error: "Invalid query", details: params.error.issues },
      };
    }
  };

  const wrapper = testAuthBearerWrapper(handler);
  const wrapperReq = {
    query: req.query,
    path: req.params,
    headers: req.headers,
    body: req.body,
  };

  const result = await wrapper(wrapperReq);
  res.status(result.status).json(result.data);
});
```

## Key Features Tested

### 1. Parameter Validation

- ✅ Required vs optional parameters
- ✅ Type validation (string, number, etc.)
- ✅ Format validation (minLength, patterns, etc.)
- ✅ Path, query, header, and body parameters

### 2. Request Body Handling

- ✅ JSON request bodies
- ✅ Form data (application/x-www-form-urlencoded)
- ✅ File uploads (multipart/form-data)
- ✅ Multiple content types

### 3. Authentication & Security

- ✅ Bearer token authentication
- ✅ Custom header authentication
- ✅ Security scheme overrides
- ✅ No authentication (public endpoints)

### 4. File Operations

- ✅ File uploads with validation
- ✅ Binary file downloads
- ✅ Multiple file handling

### 5. Response Handling

- ✅ Multiple response status codes
- ✅ Different content types
- ✅ Response headers
- ✅ Empty responses

### 6. Error Scenarios

- ✅ Validation errors for each parameter type
- ✅ Missing required parameters
- ✅ Invalid parameter formats
- ✅ Unsupported content types

## Test Coverage

The tests cover all operations defined in `test.yaml`:

- `testAuthBearer` - Bearer token authentication
- `testAuthBearerHttp` - HTTP bearer authentication
- `testSimpleToken` - Custom token header
- `testMultipleSuccess` - Multiple response codes
- `testFileUpload` - File upload handling
- `testBinaryFileDownload` - Binary file serving
- `testInlineBodySchema` - JSON request bodies
- `testParameterWithReference` - Parameter references
- `testResponseHeader` - Response headers
- `testOverriddenSecurity` - Security overrides
- `testMultiContentTypes` - Multiple content types
- And many more...

## Running the Tests

```bash
# Run all server-generator integration tests
pnpm test tests/integrations/server-generator

# Run specific test file
pnpm test tests/integrations/server-generator/working-example.test.ts

# Run with coverage
pnpm test:coverage tests/integrations/server-generator
```

## Best Practices Demonstrated

### 1. Type Safety

All request/response handling is fully typed based on the OpenAPI specification.

### 2. Validation

Runtime validation using Zod ensures data integrity at the API boundary.

### 3. Error Handling

Structured error responses with detailed validation information.

### 4. Test Isolation

Each test is independent and can be run separately.

### 5. Comprehensive Coverage

Tests cover happy paths, error cases, and edge conditions.

## Integration with Real Applications

These tests serve as examples for integrating server-generator with:

- **Express.js** - Primary integration target
- **Fastify** - Similar adapter pattern can be used
- **Koa** - Middleware-based integration
- **Next.js API routes** - Serverless function integration

## Generated Files

The `generated/` directory contains:

- **Schemas**: Zod validation schemas for all data types
- **Operations**: Wrapper functions for each API endpoint
- **Types**: TypeScript types for requests and responses

## Notes

- Generated schemas may treat some optional parameters as required (this is a known behavior)
- The integration pattern can be extended to support middleware, authentication, etc.
- Tests demonstrate both successful operations and comprehensive error handling

## Future Enhancements

- Middleware integration for authentication
- Response serialization helpers
- OpenAPI documentation generation
- Performance optimizations for large APIs
- Support for streaming responses

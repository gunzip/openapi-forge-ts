# Server Routes Wrappers Generation

The generator can also produce a fully-typed server handler wrapper for your OpenAPI operations. This enables you to build type-safe HTTP servers (e.g., with Express, Fastify, or custom frameworks) that validate requests at runtime using Zod schemas and can return only responses of the expected types.

## How to Generate a Server Route Wrapper

To generate server-side code, use the CLI with the `--generate-server` flag:

```bash
pnpx yanogen-ts generate \
  --generate-server \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o generated
```

This will create a `server/` directory in your output folder, containing:

- **`server/index.ts`**: Exports the server handler wrappers and types
- **`server/<operationId>.ts`**: Individual operation handler wrappers

## Using the Wrapped Handler

The generated route wrapper is a function that takes a request handler and returns an async function that can be used with any web framework. This allows you to ensure type safety and runtime validation for your request parameters (path, query, headers) and response data.

You are responsible for extracting parameters from the framework request and passing them to the wrapper, then handling the result (status, contentType, data) in your route handler. This allows you to integrate with any web framework and customize error handling as needed.

Example usage with Express and a helper for parameter extraction:

```ts
import express from "express";
import {
  testAuthBearerWrapper,
  testAuthBearerHandler,
} from "./generated/server/testAuthBearer.js";
import { extractRequestParams } from "./test-helpers.js";

const app = express();
app.use(express.json());

const wrappedHandler = testAuthBearerWrapper(async (params) => {
  if (params.type === "ok") {
    // Here you can access validated and typed parameters
    const { query, path, headers, body } = params.value;
    // ...
    doSomethingWithParams(query.someParam);
    // Here you can return a typed response
    return {
      status: 200,
      contentType: "application/json",
      data: { message: "Success" },
    };
  }
  // Handle validation errors or other cases
  return {
    status: 400,
    contentType: "application/json",
    data: { error: "Validation failed" },
  };
});

app.get("/test-auth-bearer", async (req, res) => {
  const result = await wrappedHandler(extractRequestParams(req));
  // Now result contains the status, contentType, and data
  res.status(result.status).type(result.contentType).send(result.data);
});

app.listen(3000);
```

- The wrapper receives a single params object (containing query, path, headers, body, etc.)
- You can use a helper like `extractRequestParams` to transform Express request data into the expected format
- The handler receives validated and typed parameters, or error details if validation fails
- You control the HTTP response based on the wrapper's result

See [./examples](./examples) directory for more usage examples.

### Handler Function Signature

The handler you provide to the wrapper receives a single argument:

- For valid requests: `{ type: "ok", value: { query, path, headers, body, ... } }`
- For validation errors: `{ type: "query_error" | "body_error" | ... , error: ZodError }`

It must return an object with `{ status, contentType, data }`.

## Supported Features

- Request validation (body, query, params) using generated Zod schemas
- Response validation before sending (if you use the generated types)
- Automatic error details for validation failures
- Type-safe handler context

You can use the generated types and schemas for further custom validation or integration with other frameworks.
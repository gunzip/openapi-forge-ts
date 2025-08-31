# YanoGen-Ts - Yet Another OpenAPI to TypeScript Generator

> **Disclaimer:** This project is currently in an early stage. Breaking changes
> may occur at any time. The first stable release will be version **0.1.0**.
> Nevertheless, it's already solid and you can still use it in your
> projects, but be prepared for potential changes in the API.

We all like the developer experience of [tRPC](https://trpc.io/), but not always
we're in control of the backend. OpenAPI specifications provide a powerful way
to define your API contracts, and with YanoGen-Ts, you can easily generate
TypeScript code that strictly adheres to those contracts, all while enjoying a
seamless developer experience.

✨ Effortlessly turn your OpenAPI specifications into **fully-typed Zod v4
schemas** ready for runtime (client or server) validation and TypeScript
development.

Need a **client**? 🚀 Instantly generate a type-safe, low-footprint, operation-based REST API client alongside your schemas.

Need to **validate server requests and return typed responses**? 🛡️ We've got you covered with built-in support for request and response validation using Zod schemas.

Why choose this generator against alternatives? See
[comparison](#comparison-with-alternative-libraries) for more details.

See [supported features](#supported-features) for more information.

![Demo of OpenAPI TypeScript Generator](./demo.gif)

- [YanoGen-Ts - Yet Another OpenAPI to TypeScript
  Generator](#yanogen-ts---yet-another-openapi-to-typescript-generator)
  - [CLI Usage](#cli-usage)
    - [Watch mode](#watch-mode)
    - [CLI Options](#cli-options)
  - [Supported Input Formats](#supported-input-formats)
  - [Programmatic Usage](#programmatic-usage)
  - [Generated Architecture](#generated-architecture)
- [Client Generation](#client-generation)
  - [Using the Generated Operations](#using-the-generated-operations)
    - [Define Configuration](#define-configuration)
    - [Call Operations](#call-operations)
  - [Binding Configuration to Operations](#binding-configuration-to-operations)
  - [Response Handling](#response-handling)
  - [Error Handling](#error-handling)
  - [Runtime Response Validation (Opt-In)](#runtime-response-validation-opt-in)
  - [Why is Runtime Validation Opt-In?](#why-is-runtime-validation-opt-in)
  - [Custom Response Deserialization](#custom-response-deserialization)
    - [Why use `parse()`?](#why-use-parse)
    - [Basic Usage](#basic-usage)
    - [Deserializer Map](#deserializer-map)
    - [Returned Object Shapes](#returned-object-shapes)
    - [Common Patterns](#common-patterns)
    - [Error Handling Summary](#error-handling-summary)
    - [Best Practices](#best-practices)
  - [Handling Multiple Content Types (Request \&
    Response)](#handling-multiple-content-types-request--response)
    - [Example: Endpoint with Multiple Request Content
      Types](#example-endpoint-with-multiple-request-content-types)
    - [Example: Endpoint with Multiple Response Content
      Types](#example-endpoint-with-multiple-response-content-types)
  - [Using Generated Zod Schemas](#using-generated-zod-schemas)
- [Server Routes Wrappers Generation](#server-routes-wrappers-generation)
  - [How to Generate a Server Route
    Wrapper](#how-to-generate-a-server-route-wrapper)
  - [Using the Wrapped Handler](#using-the-wrapped-handler)
    - [Handler Function Signature](#handler-function-signature)
- [Supported Features](#supported-features)
  - [Benefits of Operation-Based
    Architecture](#benefits-of-operation-based-architecture)
- [Comparison with alternative
  libraries](#comparison-with-alternative-libraries)
  - [Conclusion](#conclusion)

## CLI Usage

```sh
pnpx yanogen-ts generate \
  --generate-server \
  --generate-client \
  -i https://petstore.swagger.io/v2/swagger.json \
  -o generated
```

### Watch mode

You can run the CLI in watch mode to automatically regenerate code on file
changes:

```sh
pnpx chokidar-cli openapi.yaml -c \
  "yanogen-ts generate \
  --generate-server \
  --generate-client \
  -i openapi.yaml \
  -o generated"
```

### CLI Options

- `-i, --input <path>`: Path to the OpenAPI spec file (2.0, 3.0.x, or 3.1.x) in
  YAML or JSON format
- `-o, --output <path>`: Output directory for generated code
- `--generate-client`: Generate the operation functions (default: false)
- `--generate-server`: Generate the operation wrapper (default: false)

## Supported Input Formats

The generator automatically detects and converts:

- **OpenAPI 2.0** (Swagger) → 3.0 → 3.1
- **OpenAPI 3.0.x** → 3.1
- **OpenAPI 3.1.x** (no conversion needed)

All input formats (local or remote yaml or JSON) are automatically normalized to
OpenAPI 3.1.0 before generation.

## Programmatic Usage

```ts
import { generate } from "./src/core-generator/index.js";

await generate({
  input: "./openapi.yaml",
  output: "./generated",
  generateClient: true,
});
```

## Generated Architecture

The generator creates:

- **`server/`** - Typed handler wrappers
- **`client/`** - Individual operation functions for each API endpoint
- **`schemas/`** - Zod schemas and TypeScript types

# Client Generation

## Using the Generated Operations

### Define Configuration

```ts
import { getPetById, createPet } from "./generated/client/index.js";

// You can define your API configuration (all fields required)
// or just use the default configuration to avoid passing it
// as parameter to every operation
const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch, // or globalThis.fetch in browsers
  headers: {
    Authorization: "Bearer your-token",
  },
  // here you can provide your custom deserializers
  // see below for examples
};
```

### Call Operations

```ts
// Simple operation call
const pet = await getPetById({ path: { petId: "123" } }, apiConfig);

// Operation with request body
const newPet = await createPet(
  {
    body: {
      name: "Fluffy",
      status: "available",
    },
  },
  apiConfig,
);

// Use default empty config (operations work without configuration)
const result = await getPetById({ path: { petId: "123" } });
```

## Binding Configuration to Operations

You can use the `configureOperations` helper to bind a configuration object to all generated operations, so you don't have to pass the config each time:

```ts
import * as operations from "./generated/client/index.js";
import { configureOperations } from "./generated/client/index.js";

const apiConfig = {
  baseURL: "https://api.example.com/v1",
  fetch: fetch,
  headers: {
    Authorization: "Bearer your-token",
  },
};

// Bind operations with manual validation (default)
const client = configureOperations(operations, apiConfig);

// Or bind operations with force validation enabled
const validatingClient = configureOperations(operations, {
  ...apiConfig,
  forceValidation: true, // Enable automatic validation for all operations
});

// Now you can call operations without passing config:
const pet = await client.getPetById({ path: { petId: "123" } });
const newPet = await client.createPet({
  body: { name: "Fluffy", status: "available" },
});

// With force validation enabled, responses are automatically validated
const validatedPet = await validatingClient.getPetById({ path: { petId: "123" } });
if (validatedPet.success && validatedPet.status === 200 && "parsed" in validatedPet) {
  // TypeScript knows the data is already validated
  console.log("Pet name:", validatedPet.parsed.parsed.name);
}
```

## Response Handling

Each operation returns a discriminated union with a `success` field: either a successful API response (with `success: true` and a `status` code) or an error object (with `success: false` and a `kind` discriminator). Validation is opt-in by default and can be controlled at runtime using the `forceValidation` config option.

Recommended pattern:

```ts
const result = await getPetById({ path: { petId: "123" } });

if (!result.success) {
  // Operation-level error (network, parsing, missing schema, etc.)
  console.error("Operation failed:", result.kind, result.error);
} else if (result.status === 200) {
  // result.data is RAW (manual validation via parse() method)
  console.log("Pet (raw):", result.data);
  
  // Optional: validate the response manually
  const parsed = result.parse();
  if ("parsed" in parsed) {
    console.log("Pet (validated):", parsed.parsed);
  }
} else if (result.status === 404) {
  console.warn("Pet not found");
} else {
  // Exhaustive fall-through for other documented statuses
  console.error("Unexpected documented status", result.status);
}
```

## Error Handling

Operations never throw exceptions. Instead, all errors are returned as part of the response union, providing a consistent and type-safe error handling experience. You distinguish errors from successful responses using the `success` boolean field.

### Error Types

All operations return a union that includes `ApiResponseError`, which is a discriminated union covering all possible error scenarios:

```ts
type ApiResponseError = {
  readonly success: false;
} & (
  | {
      readonly kind: "unexpected-error";
      readonly error: unknown;
    }
  | {
      readonly kind: "unexpected-response";
      readonly result: {
        readonly data: unknown;
        readonly status: number;
        readonly response: Response;
      };
      readonly error: string;
    }
  | {
      readonly kind: "parse-error";
      readonly result: {
        readonly data: unknown;
        readonly status: number;
        readonly response: Response;
      };
      readonly error: z.ZodError;
    }
  | {
      readonly kind: "deserialization-error";
      readonly result: {
        readonly data: unknown;
        readonly status: number;
        readonly response: Response;
      };
      readonly error: unknown;
    }
  | {
      readonly kind: "missing-schema";
      readonly result: {
        readonly data: unknown;
        readonly status: number;
        readonly response: Response;
      };
      readonly error: string;
    }
);
```

### Error Handling Patterns

```ts
const result = await getPetById({ path: { petId: "123" } });

if (!result.success) {
  // All error variants handled first
  switch (result.kind) {
    case "unexpected-error":
      console.error("Unexpected error:", result.error);
      break;
    case "unexpected-response":
      console.error("Unexpected status:", result.result.status, result.error);
      break;
    case "parse-error":
      console.error("Validation failed:", result.error);
      break;
    case "deserialization-error":
      console.error("Deserialization failed:", result.error);
      break;
    case "missing-schema":
      console.error("Schema missing:", result.error);
      break;
  }
} else if (result.status === 200) {
  console.log("Pet:", result.data);
} else if (result.status === 404) {
  console.warn("Pet not found");
} else {
  console.error("Unexpected documented status", result.status);
}
}
```

### Error Context

Different error types provide different context:

- **unexpected-error**: Network failures, connection issues, or any unexpected exception (no status, data, or response available)
- **unexpected-response**: HTTP status codes not defined in OpenAPI spec (includes status, data, response in `result` field)
- **parse-error**: Zod validation failures when using `parse()` or force validation (includes parsing details in `result` field)
- **deserialization-error**: Custom deserializer failures (includes original error and context in `result` field)
- **missing-schema**: No schema available for content type (includes attempted deserialization context in `result` field)

## Runtime Response Validation

The generator supports two validation modes that can be controlled dynamically at runtime through the `forceValidation` configuration option:

### Manual Validation (Default)

Operations return raw data by default. To perform runtime validation, explicitly call the response object's `parse()` method:

```ts
const result = await getUserProfile({ path: { userId: "123" } });

if (result.success && result.status === 200) {
  const outcome = result.parse();
  if ("parsed" in outcome) {
    console.log("User:", outcome.parsed.name, outcome.parsed.email);
  } else if (outcome.kind === "parse-error") {
    console.error("Response validation failed:", outcome.error);
  } else if (outcome.kind === "deserialization-error") {
    console.error("Deserializer failed:", outcome.error);
  } else if (outcome.kind === "missing-schema") {
    console.warn("No schema – raw data retained:", result.data);
  }
} else if (result.success && result.status === 404) {
  console.warn("User not found");
} else if (!result.success) {
  console.error("Operation failed:", result.kind, result.error);
}
```

### Force Validation Mode

Enable automatic validation by setting `forceValidation: true` in the config. When enabled, responses are automatically validated and the `parsed` field is directly available:

```ts
// Configure force validation
const apiConfig = {
  baseURL: "https://api.example.com",
  fetch: fetch,
  headers: { Authorization: "Bearer token" },
  forceValidation: true, // Enable automatic validation
};

const result = await getUserProfile(
  { path: { userId: "123" } },
  apiConfig
);

if (result.success && result.status === 200) {
  // No need to call parse() - data is already validated
  if ("parsed" in result) {
    console.log("User:", result.parsed.parsed.name);
  } else if (result.parsed.kind === "parse-error") {
    console.error("Validation failed:", result.parsed.error);
  }
} else if (!result.success) {
  console.error("Operation failed:", result.kind);
}
```

### Dynamic Force Validation with Type Safety

The `forceValidation` option supports full TypeScript type safety through generic parameters:

```ts
// Type-safe force validation
async function fetchUserWithValidation<TForceValidation extends boolean>(
  userId: string,
  forceValidation: TForceValidation
) {
  const result = await getUserProfile<TForceValidation>(
    { path: { userId } },
    { ...globalConfig, forceValidation }
  );

  if (result.success && result.status === 200) {
    // TypeScript knows the return type based on TForceValidation
    if (forceValidation) {
      // result.parsed is available (forced validation)
      return result.parsed;
    } else {
      // result.parse() method is available (manual validation)
      return result.parse();
    }
  }
  
  return null;
}

// Usage with compile-time type inference
const manualResult = await fetchUserWithValidation("123", false); // Returns parse() result
const autoResult = await fetchUserWithValidation("123", true);   // Returns parsed field
```
}
```

Non-JSON responses (like `text/plain`, `application/octet-stream`) are still
left raw unless you supply a custom deserializer in the config:

```ts
const result = await downloadFile(
  {
    fileId: "123",
  },
  {
    // You can provide custom deserializers for specific operations
    // or even in the global configuration
    deserializerMap: {
      ...globalConfig,
      "application/octet-stream": (blob: Blob) => ({ size: blob.size }),
    },
  },
);

if (result.status === 200) {
  const outcome = result.parse();
  if ("parsed" in outcome) {
    console.log("Downloaded file size:", outcome.parsed.size);
  }
For operations with mixed content types, validation applies when you call `parse()` and a schema exists for the selected content type:

```ts
const result = await getDocument({
  path: { docId: "123" },
  contentType: { response: "application/json" },
});

if (result.success && result.status === 200) {
  const outcome = result.parse();
  if ("parsed" in outcome) {
    console.log("Document:", outcome.parsed);
  }
}
```

Non-JSON responses (like `text/plain`, `application/octet-stream`) are still left raw unless you supply a custom deserializer in the config:

```ts
const result = await downloadFile(
  {
    path: { fileId: "123" },
  },
  {
    // You can provide custom deserializers for specific operations
    // or even in the global configuration
    deserializerMap: {
      "application/octet-stream": (blob: Blob) => ({ size: blob.size }),
    },
  },
);

if (result.success && result.status === 200) {
  const outcome = result.parse();
  if ("parsed" in outcome) {
    console.log("Downloaded file size:", outcome.parsed.size);
  }
}
```

## Why is Runtime Validation Configurable?

TypeScript client generator uses Zod for payload validation and parsing, but we've made this feature configurable rather than mandatory. This design choice provides several key advantages:

- **Integration with Existing Systems**: This approach allows for seamless integration with other validation mechanisms already present in your codebase. If you have existing business logic that handles data validation, disabled runtime parsing at the client level avoids redundancy and streamlines your data flow.

- **Robustness in the Real World**: API responses can be unpredictable. You might encounter non-documented fields or slight deviations from the OpenAPI specification. Making validation optional prevents the client from crashing on unexpected—but often harmless—payloads, ensuring your application remains resilient.

- **Performance**: Parsing and validating a payload comes with a computational cost. By allowing you to choose per operation call, you can decide to skip validation for non-critical API calls, leading to better performance, especially in high-volume scenarios.

- **Runtime Flexibility**: Applications can dynamically choose validation behavior based on runtime conditions (e.g., development vs production, user preferences, API trust level).

This approach gives you more control, allowing you to balance strict type-safety with the practical demands of working with real-world APIs.

### When to Use Force Validation

Enable `forceValidation: true` when:

- **Trusted APIs**: When responses always match the OpenAPI specification
- **Performance is Not Critical**: When the validation overhead is acceptable for your use case
- **Development/Testing**: When you want to catch schema mismatches early
- **Critical Operations**: When data integrity is paramount

### When to Use Manual Validation

Use the default manual validation (`forceValidation: false` or unset) when:

- **Large Payloads**: When dealing with large responses where validation overhead is a concern
- **Untrusted APIs**: When APIs may return unexpected data that shouldn't crash your application
- **Gradual Migration**: When incrementally adding validation to existing codebases
- **Custom Validation Logic**: When you need more control over validation behavior and error handling
- **Performance-Critical Paths**: When every millisecond counts

## Custom Response Deserialization

For advanced scenarios (e.g. XML parsing, vendor-specific media types, binary
post-processing) you can provide custom deserializers through the config object.
The `parse()` method will automatically use these deserializers before schema
validation occurs.

Deserializers are methods that transform the raw response data into a format
suitable for validation. They can be defined for specific content types and are
applied automatically during the parsing process.

### Why use Deserializers?

- Apply transformations (e.g. date reviver, case normalization) prior to Zod
  validation
- Decode non‑JSON types (XML → JS object, CSV → array, binary → metadata)
- Gracefully handle vendor or unknown content types without modifying generated
  code

### Example of Custom Deserializers

```ts
{
  "application/xml": (data: unknown) => {
    // Custom XML parsing logic
    const xmlString = data as string;
    const nameMatch = /<name>([^<]+)<\/name>/u.exec(xmlString);
    const ageMatch = /<age>([^<]+)<\/age>/u.exec(xmlString);
    return {
      name: nameMatch?.[1] || "",
      age: Number(ageMatch?.[1]) || 0,
    };
  },
  "application/vnd.custom+json": (data: unknown) => {
    // Custom JSON transformation
    const obj = data as Record<string, unknown>;
    return {
      ...obj,
      id: String(obj.id).toUpperCase(),
      timestamp: new Date(),
    };
  },
}
```

### Basic Usage

```ts
const res = await testMultiContentTypes(
  {
    body: { id: "123", name: "Example" },
    contentType: { response: "application/xml" },
  },
  {
    ...globalConfig,
    // this can be merged into the global config object as well
    deserializerMap: {
      "application/xml": (raw: unknown) => customXmlToJson(raw as string),
      "application/octet-stream": (blob: unknown) => ({
        size: (blob as Blob).size,
      }),
    },
  },
);

if (res.status === 200) {
  const outcome = res.parse();
  if ("parsed" in outcome) {
    console.log(outcome.parsed);
  } else if (outcome.kind === "parse-error") {
    console.error("Validation failed", outcome.error);
  } else if (outcome.kind === "deserialization-error") {
    console.error("Deserializer threw", outcome.error);
  } else if (outcome.kind === "missing-schema") {
    console.warn("No schema for content type; raw value:", res.data);
  }
}
```

### Deserializer Map

The `deserializerMap` is a property of the config object that maps content types
to deserializer functions:

```ts
type Deserializer = (data: unknown, contentType?: string) => unknown;
type DeserializerMap = Record<string, Deserializer>;
```

When provided in the config, the raw response body is passed to your function
before schema validation. Whatever you return becomes the input to schema
validation (if a schema for that content type exists).

### Returned Object Shapes

The result of `parse()` is a discriminated object you can pattern match on:

| Scenario                              | Shape                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Schema + validation success           | `{ contentType, parsed }`                                                   |
| Schema + validation failure           | `{ contentType, parseError }`                                               |
| Schema present but deserializer threw | `{ contentType, deserializationError }`                                     |
| No schema for content type            | `{ contentType, missingSchema: true, deserialized, deserializationError? }` |

Notes:

- If the deserializer throws, validation is skipped (you get
  `deserializationError`).
- If no schema exists, the transformed value is returned under `deserialized`
  and flagged with `missingSchema: true`.
- Content type normalization strips any charset parameters (e.g.
  `application/json; charset=utf-8` → `application/json`).

### Common Patterns

1. XML → JS:

```ts
const outcome = res.parse();
// Uses deserializerMap from config:
// {
//   "application/xml": (xml: unknown) => fastXmlParser.parse(xml as string),
// }
```

2. Binary metadata:

```ts
const outcome = res.parse();
// Uses deserializerMap from config:
// {
//   "application/octet-stream": (b: unknown) => ({ size: (b as Blob).size }),
// }
```

3. Vendor JSON normalization:

```ts
const outcome = res.parse();
// Uses deserializerMap from config:
// {
//   "application/vnd.custom+json": (data: any) => ({
//     ...data,
//     id: String(data.id).toUpperCase(),
//   }),
// }
```

### Error Handling Summary

| Field                         | Meaning                                             |
| ----------------------------- | --------------------------------------------------- |
| Variant / Field               | Meaning                                             |
| ----------------------        | --------------------------------------------------- |
| `parsed`                      | Successfully deserialized & schema-validated data   |
| `kind: parse-error`           | Validation failed (`error` is a `ZodError`)         |
| `kind: deserialization-error` | Custom deserializer threw an exception              |
| `kind: missing-schema`        | No schema found for that content type               |

### Best Practices

- Keep deserializers pure & fast—avoid performing network calls
- Return plain JS objects ready for validation; do not mutate globals
- Prefer adding schemas in the spec when possible (better type safety)
- Log or surface `deserializationError` for observability

## Handling Multiple Content Types (Request & Response)

This generator fully supports OpenAPI endpoints that define multiple content
types for both requests and responses. For each operation, the generated client:

- Accepts a `contentType` property in the request object, which is an object
  with optional `request` and `response` keys, to specify which content type to
  use for the request and which to prefer for the response.
- Returns a response typed according to the selected response content type.
- Validates and parses the response according to the content type actually
  returned by the server.

### Example: Endpoint with Multiple Request Content Types

Suppose your OpenAPI spec defines an operation that accepts both
`application/json` and `application/x-www-form-urlencoded` for the request body:

```yaml
requestBody:
  content:
    application/json:
      schema:
        $ref: "#/components/schemas/Pet"
    application/x-www-form-urlencoded:
      schema:
        $ref: "#/components/schemas/PetForm"
```

The generated operation function will accept a `contentType` object to select
the body and/or response format:

```ts
import { createPet } from "./generated/client/index.js";

// Send as JSON (default)
await createPet({
  body: { name: "Fluffy", status: "available" },
});

// Send as form-urlencoded
await createPet({
  body: { name: "Fluffy", status: "available" },
  contentType: { request: "application/x-www-form-urlencoded" },
});

// Send as form-urlencoded and request a custom response type
await createPet({
  body: { name: "Fluffy", status: "available" },
  contentType: {
    request: "application/x-www-form-urlencoded",
    response: "application/vnd.custom+json",
  },
});
```

### Example: Endpoint with Multiple Response Content Types

Suppose an operation returns either JSON or XML:

```yaml
responses:
  "200":
    content:
      application/json:
        schema:
          $ref: "#/components/schemas/Pet"
      application/xml:
        schema:
          $ref: "#/components/schemas/PetXml"
```

The generated response type will match the selected or default response content
type:

```ts
const result = await getPetById(
  {
    path: { petId: "123" },
    contentType: { response: "application/xml" },
  },
  {
    ...globalConfig,
    deserializerMap: {
      "application/xml": myXmlDeserializer,
    },
  },
);

if (result.success && result.status === 200) {
  const data = result.parse();
  // result.data is typed as PetXml if response: "application/xml" was selected
  // or as Pet if response: "application/json" was selected
}
```

## Using Generated Zod Schemas

```ts
import { Pet } from "./generated/schemas/Pet.js";

const result = Pet.safeParse(someData);
if (!result.success) {
  console.error(result.error);
}
```

# Server Routes Wrappers Generation

The generator can also produce a fully-typed server handler wrapper for your
OpenAPI operations. This enables you to build type-safe HTTP servers (e.g., with
Express, Fastify, or custom frameworks) that validate requests at runtime using
Zod schemas and can return only responses of the expected types.

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

The generated route wrapper is a function that takes a request handler and
returns an async function that can be used with any web framework. This allows
you to ensure type safety and runtime validation for your request parameters
(path, query, headers) and response data.

You are responsible for extracting parameters from the framework request and
passing them to the wrapper, then handling the result (status, contentType,
data) in your route handler. This allows you to integrate with any web framework
and customize error handling as needed.

Example usage with Express and a helper for parameter extraction:

```ts
import express from "express";
import { testAuthBearerWrapper } from "./generated/server/testAuthBearer.js";
import { extractRequestParams } from "./test-helpers.js";

const app = express();
app.use(express.json());

const wrappedHandler = testAuthBearerWrapper(async (params) => {
  if (params.kind === "ok") {
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

- The wrapper receives a single params object (containing query, path, headers,
  body, etc.)
- You can use a helper like `extractRequestParams` to transform Express request
  data into the expected format
- The handler receives validated and typed parameters, or error details if
  validation fails
- You control the HTTP response based on the wrapper's result

See [./examples](./examples) directory for more usage examples.

### Handler Function Signature

The handler you provide to the wrapper receives a single argument:

- For valid requests: `{ kind: "ok", value: { query, path, headers, body, ... }
}`
- For validation errors: `{ kind: "query-error" | "body-error" | ... , error:
ZodError }`

It must return an object with `{ status, contentType, data }`.

# Supported Features

- Request validation (body, query, params) using generated Zod schemas
- Response validation before sending (if you use the generated types)
- Automatic error details for validation failures
- Type-safe handler context

You can use the generated types and schemas for further custom validation or
integration with other frameworks.

- 🚀 **Multi-version support**: Accepts OpenAPI 2.0 (Swagger), 3.0.x, and 3.1.x
  specifications
- 🛠️ **Operation-based client generation**: Generates one function per
  operation, with strong typing and per-operation configuration—no need for
  blacklisting operations you don't need!
- 🛡️ **Zod v4 runtime validation (opt-in or automatic)**: Invoke `response.parse()` to
  validate payloads without throwing on validation errors, or use `--force-validation`
  for automatic validation in all operations
- 📦 **Small footprint**: Generates each operation and schema/type in its own
  file for maximum tree-shaking and modularity
- 🚀 **Fast code generation**: Optimized for quick generation times, even with
  large specs, sync types and changes in real-time
- 🔒 **Type-safe configuration**: Immutable global defaults, with the ability to
  override config per operation
- 🔑 **Flexible authentication**: Supports OpenAPI security schemes (Bearer, API
  Key, etc.), with dynamic header/query configuration
- 🧩 **Discriminated union response types**: Each operation returns a
  discriminated union of possible responses, enabling exhaustive handling
- ⚠️ **Comprehensive error handling**: No exceptions thrown - all errors (network, parsing, unexpected responses) are returned as typed error objects with detailed context
- 📁 **File upload/download & binary support**: Handles `multipart/form-data`
  and `application/octet-stream` uploads and downloads
- 📦 **ESM output**: Generated code is ESM-first
- 🪶 **Minimal dependencies**: No runtime dependencies except Zod; works in
  Node.js and browsers
- 🧪 **Self-contained Zod schemas**: Generated schemas can be used independently
  for validation (e.g., in forms) and server-side logic
- 🔄 **Automatic OpenAPI normalization**: All input specs are normalized to
  OpenAPI 3.1.0 before code generation
- ✅ **Comprehensive test suite**: Project includes Vitest-based tests for all
  major features

## Benefits of Operation-Based Architecture

- **Tree Shaking**: Only bundle the operations you actually use
- **Type Safety**: Better parameter organization with an immutable config object
- **Flexibility**: Easy per-operation configuration with all required fields
- **Maintainability**: Each operation in its own file
- **Testing**: Simple to mock individual operations

# Comparison with alternative libraries

After [evaluating several
libraries](https://github.com/gunzip/openapi-generator-benchmark), we found that
each has its [strengths and
weaknesses](https://pagopa.github.io/dx/blog/typescript-openapi-generators-0.1-alpha),
but ultimately, we chose to build this project to address specific needs and use
cases.

Here is a comparison of the key features and limitations of each library.

| Feature / Limitation           |             yanogen-ts              |        openapi-codegen-ts        | openapi-zod-client |     openapi-ts     |
| ------------------------------ | :---------------------------------: | :------------------------------: | :----------------: | :----------------: |
| **Output structure**           |               Modular               |            Monolithic            |     Monolithic     |     Monolithic     |
| **Dependency footprint**       |         Minimal (Zod only)          | io-ts, @pagopa/ts-commons, fp-ts |  zodios + others   | Minimal (Zod only) |
| **Runtime validation**         |               Zod v4                |              io-ts               |       Zod v3       |       Zod v4       |
| **OpenAPI version support**    | 2.0, 3.0.x, 3.1.x (auto-normalized) |            2.0, 3.0.x            |    3.0.x, 3.1.x    |    3.0.x, 3.1.x    |
| **Error handling**             |           Strongly Typed            |        Typed, exhaustive         |       Basic        |       Basic        |
| **Generation Speed**           |               Faster                |        Slow on big specs         |        Fast        |        Fast        |
| **Schema Quality**             |              Very good              |            Very good             |       Loose        |        Good        |
| **Multiple success responses** |                 ✅                  |                ✅                |         ❌         |         ✅         |
| **Multiple content types**     |                 ✅                  |                ❌                |         ❌         |         ❌         |
| **Security header support**    |                 ✅                  |                ✅                |         ❌         |         ✅         |
| **File download response**     |                 ✅                  |                ✅                |         ❌         |         ✅         |
| **Tree-shaking friendly**      |                 ✅                  |                ❌                |         ❌         |         ❌         |
| **Per-operation overrides**    |                 ✅                  |                ✅                |         ❌         |         ✅         |
| **File upload support**        |                 ✅                  |                ✅                |         ✅         |         ✅         |
| **Server Validation**          |                 ✅                  |                ❌                |         ❌         |         ❌         |

- https://github.com/astahmer/openapi-zod-client
- https://github.com/pagopa/openapi-codegen-ts
- https://github.com/hey-api/openapi-ts

## Conclusion

This project is designed with a clear focus on delivering an exceptional
developer experience and robust type safety. Our core goals are to:

- **Eliminate runtime errors** by leveraging _strong_ TypeScript typing and
  comprehensive support for OpenAPI specs (ie. multiple response types).
- **Offer a developer experience similar to tRPC**, but fully driven by OpenAPI
  specifications—combining the best of both worlds: type safety and open
  standards (works with _external_ specs as well).
- **Generate high-quality, reusable schemas** for both API requests and
  responses, ensuring consistency across your codebase.

During our research, we discovered that many existing tools either lacked
flexibility or forced developers into rigid workflows. By emphasizing
modularity, type safety, and ease of integration, this project aims to bridge
those gaps—empowering TypeScript developers to build reliable, maintainable APIs
with confidence.

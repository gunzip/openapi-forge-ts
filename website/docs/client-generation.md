# Client Generation

YanoGen-Ts generates type-safe, operation-based REST API clients with comprehensive error handling and runtime validation capabilities.

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
const pet = await getPetById({ petId: "123" }, apiConfig);

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
const result = await getPetById({ petId: "123" });
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

// You may consider to only pass operations you use
const client = configureOperations(operations, apiConfig);

// Now you can call operations without passing config:
const pet = await client.getPetById({ petId: "123" });
const newPet = await client.createPet({
  body: { name: "Fluffy", status: "available" },
});
```

## Response Handling

Each operation returns a discriminated union of possible responses containing the raw (unvalidated) response body in `data`. Validation is opt-in by default, but can be made automatic with the `--force-validation` flag. Example:

```ts
const result = await getPetById({ petId: "123" });

if (result.status === 200) {
  // result.data is the RAW response body (unvalidated by default)
  // or VALIDATED data when using --force-validation
  console.log("Pet (raw):", result.data);
  // But will have a parse() method bound if you want
  // to parse the returned response, see examples below
} else if (result.status === 404) {
  // Not found
  console.warn("Pet not found");
} else {
  // Exhaustive check
  console.error("Unexpected status", result.status);
}
```

## Exception Handling

All responses not present in the OpenAPI specs throw an `UnexpectedResponseError` error:

```ts
try {
  const result = await getPetById({ petId: "notfound" });
  // handle result as above
} catch (err) {
  if (err instanceof UnexpectedResponseError) {
    console.error("Unexpected response", err.status, err.data);
  } else {
    throw err; // rethrow unknown errors
  }
}
```

## Runtime Response Validation (Opt-In)

Operations return raw data by default (no automatic Zod parsing). To perform runtime validation you must explicitly call the response object's `parse()` method. Validation errors are reported in the returned object (they do NOT throw) via an `parseError` property.

```ts
const result = await getUserProfile({ userId: "123" });

if (result.status === 200) {
  const outcome = result.parse();
  if (isParsed(outcome)) {
    console.log("User:", outcome.parsed.name, outcome.parsed.email);
  } else if (outcome && "parseError" in outcome) {
    console.error("Response validation failed:", outcome.parseError);
  } else {
    console.log("User (raw, unvalidated):", result.data);
  }
} else if (result.status === 404) {
  console.warn("User not found");
}
```

For operations with mixed content types, validation only applies when you call `parse()` and a schema exists for the selected content type:

```ts
const result = await getDocument({
  docId: "123",
  contentType: { response: "application/json" },
});

if (result.status === 200) {
  const outcome = result.parse();
  if (isParsed(outcome)) {
    console.log("Document:", outcome.parsed);
  }
}
```

Non-JSON responses (like `text/plain`, `application/octet-stream`) are still left raw unless you supply a custom deserializer in the config:

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
  if (isParsed(outcome)) {
    console.log("Downloaded file size:", outcome.parsed.size);
  }
}
```

## Automatic Runtime Validation

When using the `--force-validation` CLI flag, operations automatically validate responses using Zod schemas without requiring explicit calls to `parse()`. This provides stricter type safety and validation at the cost of performance.

### Usage with Automatic Validation

```bash
# Generate with --force-validation flag
pnpx yanogen-ts generate \
  --generate-client \
  --force-validation \
  -i openapi.yaml \
  -o generated
```

```ts
// Operations now return validated data directly
const result = await getUserProfile({ userId: "123" });

if (result.status === 200) {
  // automatically validated and typed
  if ("parsed" in result) {
    const profile = result.parsed;
    console.log("User:", profile.name, profile.email);
  }
  else if ("parseError" in result) {
    console.error("User profile validation failed", result.parseError);
  }
} else if (result.status === 404) {
  console.warn("User not found");
}
```

## Why is Runtime Validation Opt-In?

TypeScript client generator uses Zod for payload validation and parsing, but we've made this feature opt-in rather than mandatory. This design choice provides several key advantages:

- **Integration with Existing Systems**: This approach allows for seamless integration with other validation mechanisms already present in your codebase. If you have existing business logic that handles data validation, disabled runtime parsing at the client level avoids redundancy and streamlines your data flow.

- **Robustness in the Real World**: APIs responses can be unpredictable. You might encounter non-documented fields or slight deviations from the OpenAPI specification. Making validation optional prevents the client from crashing on unexpected—but often harmless—payloads, ensuring your application remains resilient.

- **Performance**: Parsing and validating a payload comes with a computational cost. By allowing you to opt-in, you can decide to skip validation for non-critical API calls, leading to better performance, especially in high-volume scenarios.

This approach gives you more control, allowing you to balance strict type-safety with the practical demands of working with real-world APIs.

### When to Use Automatic Validation

Use the `--force-validation` flag when:

- **Trusted APIs**: When responses always match the OpenAPI specification
- **Performance is Not Critical**: When the validation overhead is acceptable for your use case

### When to Use Manual Validation

Use the default manual validation (without `--force-validation`) when:

- **Huge Payloads**: When dealing with large responses where validation overhead is a concern
- **Untrusted APIs**: When APIs may return unexpected data that shouldn't crash your application
- **Gradual Migration**: When incrementally adding validation to existing codebases
- **Custom Validation Logic**: When you need more control over validation behavior and error handling or you have your own validation already in place

## Custom Response Deserialization

For advanced scenarios (e.g. XML parsing, vendor-specific media types, binary post-processing) you can provide custom deserializers through the config object. The `parse()` method will automatically use these deserializers before schema validation occurs.

### Why use `parse()`?

- Apply transformations (e.g. date reviver, case normalization) prior to Zod validation
- Decode non‑JSON types (XML → JS object, CSV → array, binary → metadata)
- Gracefully handle vendor or unknown content types without modifying generated code

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

  if (isParsed(outcome)) {
    // Zod-validated & transformed data
    console.log(outcome.parsed);
  } else if ("parseError" in outcome) {
    console.error("Validation failed", outcome.parseError);
  } else if ("deserializationError" in outcome) {
    console.error("Deserializer threw", outcome.deserializationError);
  } else if ("missingSchema" in outcome) {
    console.warn(
      "No schema for content type; raw transformed value:",
      outcome.deserialized,
    );
  }
}
```

### Deserializer Map

The `deserializerMap` is a property of the config object that maps content types to deserializer functions:

```ts
type Deserializer = (data: unknown, contentType?: string) => unknown;
type DeserializerMap = Record<string, Deserializer>;
```

When provided in the config, the raw response body is passed to your function before schema validation. Whatever you return becomes the input to schema validation (if a schema for that content type exists).

### Returned Object Shapes

The result of `parse()` is a discriminated object you can pattern match on:

| Scenario                              | Shape                                                                       |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Schema + validation success           | `{ contentType, parsed }`                                                   |
| Schema + validation failure           | `{ contentType, parseError }`                                               |
| Schema present but deserializer threw | `{ contentType, deserializationError }`                                     |
| No schema for content type            | `{ contentType, missingSchema: true, deserialized, deserializationError? }` |

Notes:

- If the deserializer throws, validation is skipped (you get `deserializationError`).
- If no schema exists, the transformed value is returned under `deserialized` and flagged with `missingSchema: true`.
- Content type normalization strips any charset parameters (e.g. `application/json; charset=utf-8` → `application/json`).

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

| Field                  | Meaning                                             |
| ---------------------- | --------------------------------------------------- |
| `parsed`               | Successfully deserialized and schema-validated data |
| `parseError`           | Zod validation error object (`ZodError`)            |
| `deserializationError` | Exception thrown by your custom deserializer        |
| `missingSchema`        | No schema was generated for this content type       |
| `deserialized`         | Transformed value when no schema exists             |

### Best Practices

- Keep deserializers pure & fast—avoid performing network calls
- Return plain JS objects ready for validation; do not mutate globals
- Prefer adding schemas in the spec when possible (better type safety)
- Log or surface `deserializationError` for observability

## Handling Multiple Content Types (Request & Response)

This generator fully supports OpenAPI endpoints that define multiple content types for both requests and responses. For each operation, the generated client:

- Accepts a `contentType` property in the request object, which is an object with optional `request` and `response` keys, to specify which content type to use for the request and which to prefer for the response.
- Returns a response typed according to the selected response content type.
- Validates and parses the response according to the content type actually returned by the server.

### Example: Endpoint with Multiple Request Content Types

Suppose your OpenAPI spec defines an operation that accepts both `application/json` and `application/x-www-form-urlencoded` for the request body:

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

The generated operation function will accept a `contentType` object to select the body and/or response format:

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

The generated response type will match the selected or default response content type:

```ts
const result = await getPetById(
  {
    petId: "123",
    contentType: { response: "application/xml" },
  },
  {
    ...globalConfig,
    deserializerMap: {
      "application/xml": myXmlDeserializer,
    },
  },
);

if (result.status === 200) {
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
# Examples

This page contains practical examples showing how to use YanoGen-Ts in real-world scenarios. All examples are taken directly from the project README.

## Basic Client Usage

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

## Runtime Response Validation

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

## Custom Response Deserialization

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

## Multiple Content Types

### Multiple Request Content Types

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

### Multiple Response Content Types

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

## Server Route Wrapper

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

## Using Generated Zod Schemas

```ts
import { Pet } from "./generated/schemas/Pet.js";

const result = Pet.safeParse(someData);
if (!result.success) {
  console.error(result.error);
}
```
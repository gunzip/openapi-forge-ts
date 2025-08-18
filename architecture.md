OpenAPI TypeScript Client Generation Requirements
Objective: Generate a TypeScript API client from a given OpenAPI 3.1.0 specification.

The following are the guidelines and requirements for the code generation.

1. Core Features & Prerequisites
   Language and Validation: The client must be generated in TypeScript and must include runtime validation for response payloads to ensure consistency with the specification.

OpenAPI Version: Exclusively support OpenAPI version 3.1.0.

Reference ($ref) Resolution: The generator must assume that all internal and external $ref pointers in the specification file have already been resolved (dereferenced) by an external tool. The generator should not implement its own resolution logic.

Request Validation: Runtime validation for request payloads is disabled by default. An option should be provided to generate Zod schemas for request validation, following the same rules as response schemas.

2. Schema Generation & Typing with Zod
   Validation Library: Use Zod v4 (the latest stable version) to generate strongly-typed validation schemas for all payloads defined in the specification.

OpenAPI to Zod Type Mapping:

Correctly map OpenAPI primitive types (string, number, integer, boolean) to their Zod equivalents (z.string(), z.number(), z.boolean()).

Support OpenAPI constraints and translate them into Zod methods:

Strings: pattern (.regex()), common formats like email, uuid, uri (.email(), .uuid(), .url()).

Numbers: minimum, maximum, exclusiveMinimum, exclusiveMaximum (.min(), .max(), .gt(), .lt()).

Arrays: minItems, maxItems, uniqueItems (.min(), .max(), .superRefine() for uniqueness).

Support composite types:

allOf -> z.intersection()

anyOf -> z.union()

oneOf -> z.union() with .superRefine() or .transform() to ensure only one schema is valid (if possible, otherwise a simple union is acceptable).

Additional Properties: Correctly handle additionalProperties (both true/false and a schema) using z.object().catchall(z.any()) or more specific types.

Nullability: Correctly handle nullable values using Zod's .nullable() method.

1. Client Configuration & Usage
   Initialization: The client constructor must accept a configuration object with the following parameters:

baseURL: The base URL of the API (e.g., https://api.example.com/v1) according to the specification under the server object https://swagger.io/specification/#server-object; let the user override these values anyway.

fetch: A fetch function implementation (to support Node.js with node-fetch/undici and the browser natively). This allows for dependency injection.

headers (optional): An object for setting global HTTP headers to be sent with every request, which is anyway overridable for each tuple method+path.

Authentication: The client must provide flexible mechanisms to configure authentication based on the securitySchemes in the specification:

It should expose methods to dynamically set credential values (e.g., setApiKey(key), setBearerToken(token)).

These methods should automatically configure the correct headers (Authorization, X-API-Key, etc.) or query parameters for subsequent requests.

4. Payload & Request Handling
   API Methods: For each path and method in the specification, generate a corresponding async method. The method name should be derived from the operationId.

Binary Payloads and Files:

Support content-type like application/octet-stream for binary payloads (e.g., Buffer in Node.js, Blob in the browser).

Support multipart/form-data for file uploads.

Responses: The generated methods must return a Promise that resolves with the response data already validated by Zod, thus ensuring type safety.

Add an option to generate loose interfaces for runtime checks (instead of strict).

5. Error Handling & Documentation
   Error Handling: In case of a non-2xx status response, the client must throw a custom exception (e.g., ApiError) containing:

statusCode: The HTTP status code.

responseBody: The response body (if present).

headers: The response headers.

Documentation: The generated code must be self-documenting. Use the summary and description fields from the OpenAPI specification to generate JSDoc/TSDoc comments for each method.

6. Testing
   Test Suite: The generator's project must include a comprehensive test suite written with Vitest.

Test Coverage: The tests must verify:

The correct generation of Zod schemas for all data types, including complex cases (allOf, anyOf, oneOf, pattern, etc.).

The correct functionality of the client methods (requests, header management, authentication).

Proper response validation and error handling.

7. Code Style & Generation Options
   Generation Modes: By default, the generator should only generate Zod schemas and TypeScript types. The generation of the full HTTP client should be an optional feature.

Decoupled Schemas: The generated Zod schemas and TypeScript types must be self-contained and exportable, allowing them to be used independently from the API client (e.g., for form validation).

File Structure: Provide an option to generate each Zod schema and its corresponding type in its own file to improve modularity.

Minimal Dependencies: The generated client should rely on a minimal set of external packages. zod is required, but other dependencies should be avoided.

Promise-based Error Handling: All async methods must return a Promise. Any exceptions thrown during the request/response lifecycle must result in a rejected Promise to ensure consistent async error handling.

Output Configuration: The generator must allow the user to specify the output directory for the generated code.

ESM Package Generation: The generated code should be structured as a valid ECMAScript Module (ESM) package, including a package.json file that declares "type": "module" and lists its dependencies.

Do not try to extend existing projects, starts from scratch with parsing and generating the client code.

When writing code, aim for small, focused methods that do one thing well. This makes the code easier to read, test, and maintain. If a method is doing too much, consider breaking it up into smaller helper methods. Try to assign meaningful names to your methods and variables to make their purpose clear.

Try to explain the why behind complex logic, and provide context for future maintainers (including yourself). Do not write comment for obvious things.

Try to avoid casting to `any` as much as possible. If you must cast, do so at the boundaries of your application (e.g., when interacting with third-party libraries or APIs) and provide clear documentation for the cast.

Prefer `const` over `let`. Use `map`, `filter`, and `reduce` instead of loops where applicable. Try to keep your code functional and avoid side effects. Prefer immutable data structures.

Use pnpm as package manager.

# Discriminated Union Response Pattern Implementation

## Summary

We have successfully implemented a type-safe discriminated union response pattern for the OpenAPI TypeScript client generator. This implementation provides better type safety, eliminates exception-based error handling, and ensures proper handling of multiple response types.

## Key Features Implemented

### 1. Discriminated Union Response Type

```typescript
export type ApiResponse<S extends number, T> = {
  status: S;
  data: T;
  response: Response;
};
```

The `ApiResponse` type uses the `status` field as a discriminant, allowing TypeScript to narrow the type based on status code checks.

### 2. Type-Safe Status Checking

```typescript
export function isStatus<
  TResult extends ApiResponse<number, any>,
  TStatus extends TResult["status"],
  TExpectedData = TResult extends ApiResponse<TStatus, infer U> ? U : never
>(
  result: TResult,
  status: TStatus
): result is Extract<TResult, ApiResponse<TStatus, TExpectedData>>
```

The `isStatus` function provides compile-time type safety by:
- Only allowing status codes that exist in the actual response union
- Preventing incorrect type assertions (e.g., `isStatus<200, ProblemDetails>` when status 200 doesn't return `ProblemDetails`)
- Automatically narrowing the result type after status checking

### 3. Multiple Success Response Support

Operations can now return multiple 2xx success responses with different types:

```typescript
Promise<
  | ApiResponse<200, Message>
  | ApiResponse<202, void>
  | ApiResponse<403, OneOfTest>
  | ApiResponse<404, void>
>
```

### 4. Proper Error Handling

- **Defined Errors**: Error responses (4xx, 5xx) are properly typed in the union
- **Unexpected Responses**: Unknown status codes throw `UnexpectedResponseError` instead of using unsafe fallbacks

```typescript
export class UnexpectedResponseError extends Error {
  status: number;
  data: unknown;
  response: Response;
}
```

### 5. Content-Type Aware Parsing

The generator automatically chooses the appropriate parsing method based on content type:
- JSON responses: `response.json()`
- Text responses: `response.text()`
- Binary responses: `response.arrayBuffer()`

## Type Safety Improvements

### Before (Problematic)
```typescript
// ❌ Would compile but could fail at runtime
if (isStatus(result, 200) && result.data.type) {
  // Assuming result.data has a 'type' property
}
```

### After (Type-Safe)
```typescript
// ✅ Only compiles if status 200 actually returns the expected type
if (isStatus(result, 200)) {
  // TypeScript knows the exact type of result.data for status 200
  console.log(result.data); // Correctly typed!
}
```

## Usage Patterns

### Pattern Matching with Type Guards
```typescript
const result = await testMultipleSuccess();

if (isStatus(result, 200)) {
  // result.data is Message type
  console.log('Success:', result.data);
} else if (isStatus(result, 403)) {
  // result.data is OneOfTest type
  console.log('Forbidden:', result.data);
}
```

### Switch Statement Pattern
```typescript
switch (result.status) {
  case 200:
    // result.data is Message type
    handleMessage(result.data);
    break;
  case 403:
    // result.data is OneOfTest type
    handleForbidden(result.data);
    break;
}
```

### Error Handling
```typescript
try {
  const result = await someOperation();
  // Handle result...
} catch (error) {
  if (error instanceof UnexpectedResponseError) {
    console.error('Unexpected status:', error.status);
    console.error('Response data:', error.data);
  }
}
```

## Benefits

1. **Type Safety**: Compile-time prevention of incorrect type assertions
2. **No Exceptions for Expected Errors**: Error responses are part of the return type
3. **Exhaustive Checking**: TypeScript ensures all response types are handled
4. **Better Developer Experience**: IntelliSense shows exact types for each status
5. **Runtime Safety**: `UnexpectedResponseError` for truly unexpected responses

## Files Modified

- `/src/generator/client-generator.ts`: Core generation logic for discriminated unions
- `/src/generator/file-writer.ts`: Import management for new types
- `/generated-test/operations/config.ts`: Type definitions and utilities
- All operation files: Updated to return discriminated unions

## Testing

All existing tests pass, and the type safety has been verified through:
- Compilation checks preventing incorrect usage
- Runtime testing of all response patterns
- Error handling verification

The implementation maintains backward compatibility while providing significantly improved type safety and developer experience.

# Discriminated Union Support

This OpenAPI client generator now supports OpenAPI 3.1 discriminated unions using Zod's `discriminatedUnion` feature.

## What are Discriminated Unions?

Discriminated unions are a way to represent objects that can be one of several different types, where each type is distinguished by a specific property (the discriminator).

## OpenAPI Schema Example

```yaml
# OpenAPI 3.1 discriminated union
Shape:
  discriminator:
    propertyName: type
  oneOf:
    - $ref: "#/components/schemas/Circle"
    - $ref: "#/components/schemas/Square"
    - $ref: "#/components/schemas/Triangle"

Circle:
  type: object
  properties:
    type:
      type: string
      enum: ["circle"]
    radius:
      type: number
  required:
    - type
    - radius

Square:
  type: object
  properties:
    type:
      type: string
      enum: ["square"]
    size:
      type: number
  required:
    - type
    - size
```

## Generated Zod Schema

The generator will produce:

```typescript
import { z } from "zod";
import { Circle } from "./Circle.js";
import { Square } from "./Square.js";
import { Triangle } from "./Triangle.js";

export const Shape = z.discriminatedUnion("type", [Circle, Square, Triangle]);
export type Shape = z.infer<typeof Shape>;
```

## Benefits

1. **Better Type Safety**: TypeScript can narrow the type based on the discriminator property
2. **Better Performance**: Zod can quickly identify which schema to validate against
3. **Better Error Messages**: More specific error messages when validation fails
4. **IntelliSense Support**: Better autocomplete and type checking in IDEs

## Usage

```typescript
import { Shape } from "./schemas/Shape.js";

// Valid shapes
const circle: Shape = { type: "circle", radius: 5 };
const square: Shape = { type: "square", size: 10 };

// TypeScript will infer the correct type based on the discriminator
if (circle.type === "circle") {
  console.log(circle.radius); // TypeScript knows this is a Circle
}

// Validation
const result = Shape.safeParse({ type: "circle", radius: 5 });
if (result.success) {
  console.log("Valid shape:", result.data);
}
```

## Supported Features

- ✅ `oneOf` with discriminator
- ✅ `anyOf` with discriminator
- ✅ Schema references (`$ref`) in union members
- ✅ Inline schemas in union members
- ✅ Fallback to regular unions when no discriminator is present

## Requirements

- OpenAPI 3.1.0+ specification
- `discriminator.propertyName` must be specified
- Each union member must have the discriminator property with a literal value

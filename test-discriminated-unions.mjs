// Test discriminated union functionality
import { Shape } from "./test-discriminated-union-output/schemas/Shape.js";
import { User } from "./test-discriminated-union-output/schemas/User.js";

console.log("Testing discriminated unions...");

// Test valid shapes
const circle = { type: "circle", radius: 5, color: "blue" };
const square = { type: "square", size: 10 };
const triangle = { type: "triangle", base: 4, height: 6, color: "red" };

console.log("Testing valid shapes:");
console.log("Circle:", Shape.safeParse(circle));
console.log("Square:", Shape.safeParse(square));
console.log("Triangle:", Shape.safeParse(triangle));

// Test invalid shape (wrong discriminator)
const invalidShape = { type: "rectangle", width: 5, height: 3 };
console.log("Invalid shape:", Shape.safeParse(invalidShape));

// Test missing discriminator
const noType = { radius: 5, color: "blue" };
console.log("No type field:", Shape.safeParse(noType));

// Test valid users
const admin = { role: "admin", name: "Alice", permissions: ["read", "write"] };
const user = { role: "user", name: "Bob", department: "Engineering" };

console.log("\nTesting valid users:");
console.log("Admin:", User.safeParse(admin));
console.log("User:", User.safeParse(user));

// Test invalid user (wrong discriminator)
const invalidUser = { role: "guest", name: "Charlie" };
console.log("Invalid user role:", User.safeParse(invalidUser));

console.log("\nDiscriminated union tests completed!");

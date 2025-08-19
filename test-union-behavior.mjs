import { UserAnyOf } from "./test-overlapping-output/schemas/UserAnyOf.js";
import { UserOneOf } from "./test-overlapping-output/schemas/UserOneOf.js";

// Test data that matches NormalUser (subset)
const normalUserData = {
  id: 1,
  name: "John Doe",
};

// Test data that matches AdminUser (superset)
const adminUserData = {
  id: 2,
  name: "Jane Admin",
  secret: "top-secret",
};

// Test data that could be ambiguous - it's a valid NormalUser but missing the secret for AdminUser
const ambiguousData = {
  id: 3,
  name: "Bob",
};

console.log("=== Testing anyOf (UserAnyOf) ===");
console.log("Normal user data:", UserAnyOf.safeParse(normalUserData));
console.log("Admin user data:", UserAnyOf.safeParse(adminUserData));
console.log("Ambiguous data:", UserAnyOf.safeParse(ambiguousData));

console.log("\n=== Testing oneOf (UserOneOf) ===");
console.log("Normal user data:", UserOneOf.safeParse(normalUserData));
console.log("Admin user data:", UserOneOf.safeParse(adminUserData));
console.log("Ambiguous data:", UserOneOf.safeParse(ambiguousData));

// The key difference: with anyOf, ambiguous data will pass because it matches NormalUser
// With oneOf, we need stricter validation to ensure it matches exactly one schema

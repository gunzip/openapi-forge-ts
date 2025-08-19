// Test to verify that the separation between config and operations works correctly

import {
  globalConfig,
  GlobalConfig,
  ApiError,
} from "./generated-test/operations/config.js";
import { testAuthBearer } from "./generated-test/operations/testAuthBearer.js";
import { testSimpleToken } from "./generated-test/operations/index.js";

console.log("✅ Config import works!");
console.log("Base URL:", globalConfig.baseURL);
console.log("Config type:", typeof GlobalConfig);
console.log("Error class:", ApiError.name);

console.log("✅ Direct operation import works!");
console.log("testAuthBearer function:", typeof testAuthBearer);

console.log("✅ Operation import from index works!");
console.log("testSimpleToken function:", typeof testSimpleToken);

console.log(
  "🎉 All imports working correctly! Config separated from operations."
);

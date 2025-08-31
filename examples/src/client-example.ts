/* eslint-disable no-console */
/* Minimal client example that calls the Express server using generated client */

import {
  configureOperations,
  globalConfig,
  isParsed,
} from "../generated/client/config.js";
import { findPetsByStatus } from "../generated/client/findPetsByStatus.js";
import { getInventory } from "../generated/client/getInventory.js";
import { getPetById } from "../generated/client/getPetById.js";

/* Configure client to point to our local Express server */
const localConfig = {
  ...globalConfig,
  baseURL: "http://localhost:3000",
};

async function demonstrateClient() {
  console.log("🔌 Starting client demonstration...");
  console.log(
    "📡 Configured to call local Express server at:",
    localConfig.baseURL,
  );
  console.log("");

  const api = configureOperations(
    {
      findPetsByStatus,
      getInventory,
      getPetById,
    },
    localConfig,
  );

  /* Configure force validation for automatic response validation */
  const forceValidationApi = configureOperations(
    {
      findPetsByStatus,
      getInventory,
      getPetById,
    },
    {
      ...localConfig,
      forceValidation: true, // Enable automatic validation
    },
  );

  try {
    /* Example 1: Find pets by status with manual validation */
    console.log("1️⃣ Finding pets with status 'available' (manual validation)...");
    const petsResponse = await api.findPetsByStatus({
      query: { status: "available" },
    });

    if (!petsResponse.success) {
      console.error("❌ Operation failed:", petsResponse.kind, petsResponse.error);
    } else if (petsResponse.status === 200) {
      console.log(
        "✅ Found pets (raw):",
        JSON.stringify(petsResponse.data, null, 2),
      );

      /* Parse the response data to get type-safe access */
      const parseResult = petsResponse.parse();
      if (isParsed(parseResult)) {
        console.log(
          "🔍 Parsed data (type-safe):",
          JSON.stringify(parseResult.parsed, null, 2),
        );
        console.log(`📊 Found ${parseResult.parsed.length} pets`);
      } else if (parseResult.kind === "parse-error") {
        console.error("❌ Failed to parse response:", parseResult.error);
      }
    } else {
      console.error("❌ Failed to find pets:", petsResponse.status);
    }

    console.log("");

    /* Example 1b: Same operation with force validation */
    console.log("1️⃣b Finding pets with status 'available' (force validation)...");
    const forceValidatedPetsResponse = await forceValidationApi.findPetsByStatus({
      query: { status: "available" },
    });

    if (!forceValidatedPetsResponse.success) {
      console.error("❌ Operation failed:", forceValidatedPetsResponse.kind);
    } else if (forceValidatedPetsResponse.status === 200) {
      /* With force validation, data is automatically validated */
      if ("parsed" in forceValidatedPetsResponse) {
        console.log(
          "✅ Automatically validated pets:",
          JSON.stringify(forceValidatedPetsResponse.parsed.parsed, null, 2),
        );
        console.log(`📊 Found ${forceValidatedPetsResponse.parsed.parsed.length} pets`);
      } else if (forceValidatedPetsResponse.parsed.kind === "parse-error") {
        console.error("❌ Validation failed:", forceValidatedPetsResponse.parsed.error);
      }
    }

    console.log("");

    /* Example 2: Get specific pet by ID */
    console.log("2️⃣ Getting pet with ID 1...");
    const petResponse = await api.getPetById({
      headers: { api_key: "demo-api-key" } /* Provide a demo API key */,
      path: { petId: "1" },
    });

    if (!petResponse.success) {
      console.error("❌ Operation failed:", petResponse.kind, petResponse.error);
    } else if (petResponse.status === 200) {
      console.log("✅ Found pet:", JSON.stringify(petResponse.data, null, 2));

      /* Parse the response data */
      const parseResult = petResponse.parse();
      if ("parsed" in parseResult) {
        const pet = parseResult.parsed;
        console.log(`🐕 Pet details: ${pet.name} (${pet.status})`);
        if (pet.category) {
          console.log(`🏷️ Category: ${pet.category.name}`);
        }
      } else if (parseResult.kind === "parse-error") {
        console.error("❌ Failed to parse pet data:", parseResult.error);
      }
    } else {
      console.error("❌ Failed to get pet:", petResponse.status);
    }

    console.log("");

    /* Example 3: Get inventory */
    console.log("3️⃣ Getting store inventory...");
    const inventoryResponse = await api.getInventory({
      headers: { api_key: "demo-api-key" },
    });

    if (!inventoryResponse.success) {
      console.error("❌ Operation failed:", inventoryResponse.kind, inventoryResponse.error);
    } else if (inventoryResponse.status === 200) {
      console.log(
        "✅ Inventory:",
        JSON.stringify(inventoryResponse.data, null, 2),
      );

      /* Parse the response data */
      const parseResult = inventoryResponse.parse();
      if ("parsed" in parseResult) {
        const inventory = parseResult.parsed;
        console.log("📦 Inventory summary:");
        for (const [status, count] of Object.entries(inventory)) {
          console.log(`  ${status}: ${count}`);
        }
      } else if (parseResult.kind === "parse-error") {
        console.error("❌ Failed to parse inventory:", parseResult.error);
      }
    } else {
      console.error("❌ Failed to get inventory:", inventoryResponse.status);
    }

    console.log("");

    /* Example 4: Error handling - try to get non-existent pet */
    console.log(
      "4️⃣ Testing error handling - getting non-existent pet (ID 999)...",
    );
    const nonExistentPetResponse = await api.getPetById({
      headers: { api_key: "demo-api-key" },
      path: { petId: "999" },
    });

    if (!nonExistentPetResponse.success) {
      console.error("❌ Operation failed:", nonExistentPetResponse.kind);
    } else if (nonExistentPetResponse.status === 404) {
      console.log("✅ Correctly received 404 for non-existent pet");
    } else {
      console.log("🤔 Unexpected response:", nonExistentPetResponse.status);
    }
  } catch (error) {
    console.error("❌ Error during client demonstration:", error);

    /* Check if it's a network error */
    if (error instanceof Error && error.message.includes("ECONNREFUSED")) {
      console.log("");
      console.log("💡 It looks like the Express server is not running.");
      console.log("   Please start the server first:");
      console.log("   npx tsx src/express-server-example.ts");
    }
  }

  /* Example 5: Unexpected - send invalid parameters in getInventory */
  console.log("5️⃣ Testing error handling - sending invalid parameters...");

  // use native fetch since generated client cannot send invalid parameters
  const invalidInventoryResponse = await fetch(
    "http://localhost:3000/store/inventory?invalidParam=invalid",
    {
      method: "GET",
      headers: { foo: "demo-api-key" },
    },
  );

  // @ts-ignore
  if (invalidInventoryResponse.status === 400) {
    console.log("✅ Correctly received 400 for invalid parameters");
  } else {
    console.log("🤔 Unexpected response:", invalidInventoryResponse.status);
  }

  console.log("");
  console.log("🏁 Client demonstration completed!");
}

/* Handle graceful shutdown */
process.on("SIGINT", () => {
  console.log("\n👋 Client demonstration interrupted");
  process.exit(0);
});

/* Main execution */
demonstrateClient();

export { demonstrateClient };

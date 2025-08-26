import express from "express";
import type { Express, Request, Response } from "express";
import { testAuthBearerWrapper } from "./generated/server-operations/testAuthBearer.js";

/**
 * Test utilities for server-generator integration tests
 */

/**
 * Creates an Express app with standard middleware for testing
 */
export function createTestApp(): Express {
  const app = express();

  /* Standard middleware for parsing requests */
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  /* Ensure path params are available */
  app.use((req, res, next) => {
    req.params = req.params || {};
    next();
  });

  return app;
}

/**
 * Sets up routes for testing server operations on an Express app
 */
export function setupTestRoutes(app: Express) {
  /* Add simple test endpoint for debugging */
  app.get("/simple-test", (req, res) => {
    res.json({ message: "simple test works" });
  });
}

/**
 * Sets up testAuthBearer operation routes with different behaviors for testing
 */
export function setupTestAuthBearerRoutes(app: Express) {
  const adapter = createExpressAdapter(testAuthBearerWrapper);

  /* Main endpoint - returns 200 with Person data */
  app.get(
    "/test-auth-bearer",
    adapter(async (params) => {
      if (params.type === "ok") {
        return {
          status: 200,
          contentType: "application/json",
          data: {
            id: "test-person-123",
            name: "Test Person",
            age: 30,
          },
        };
      }
      /* For validation errors, return 403 since 400 is not in the OpenAPI spec */
      return {
        status: 403,
        contentType: "text/plain",
        data: void 0,
      };
    }),
  );

  /* Endpoint that always returns 403 to test the fix */
  app.get(
    "/test-auth-bearer-403",
    adapter(async (params) => {
      /* Always return 403 to test our fix */
      return {
        status: 403,
        contentType: "text/plain",
        data: void 0,
      };
    }),
  );
}

/**
 * Creates an Express middleware adapter for server-generator wrappers
 */
export function createExpressAdapter<T>(
  wrapper: (handler: (params: any) => Promise<T>) => (req: any) => Promise<T>,
) {
  return (handler: (params: any) => Promise<T>) => {
    const wrappedHandler = wrapper(handler);

    return async (req: Request, res: Response) => {
      try {
        /* Convert Express request to wrapper format */
        const wrapperReq = {
          query: req.query,
          path: req.params,
          headers: req.headers,
          body: req.body,
          contentType: req.get("content-type"),
        };

        /* Call the wrapper with the converted request */
        const result = await wrappedHandler(wrapperReq);

        /* Send the response */
        if (result && typeof result === "object" && "status" in result) {
          const response = result as any;
          res.status(response.status);

          if (response.contentType) {
            res.set("Content-Type", response.contentType);
          }

          /* Handle response data appropriately */
          if (response.data === undefined || response.data === null) {
            /* For void responses or empty data, send empty response */
            res.end();
          } else {
            /* For responses with actual data, send as JSON */
            res.json(response.data);
          }
        } else {
          res.status(500).json({ error: "Invalid response from handler" });
        }
      } catch (error) {
        res.status(500).json({
          error: "Internal server error",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    };
  };
}

/**
 * Creates a mock request object for server wrapper testing
 */
export function createMockRequest(options: {
  query?: Record<string, unknown>;
  path?: Record<string, unknown>;
  headers?: Record<string, unknown>;
  body?: unknown;
  contentType?: string;
}) {
  return {
    query: options.query || {},
    path: options.path || {},
    headers: options.headers || {},
    body: options.body,
    contentType: options.contentType,
  };
}

/**
 * Sample data for testing different operations
 */
export const testData = {
  person: {
    id: "test-person-123",
    name: "Test Person",
    age: 30,
  },
  message: {
    id: "test-message-456",
    content: {
      markdown: "# Test Message\nThis is a test message content.",
    },
  },
  queryParams: {
    qr: "required-param",
    qo: "optional-param",
    cursor: "test-cursor-123",
  },
  headers: {
    Authorization: "Bearer test-token-123",
    "X-Functions-Key": "test-simple-token-456",
    "Content-Type": "application/json",
  },
};

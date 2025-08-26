import express from "express";
import type { Express, Request, Response } from "express";

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
  
  /* Parse query strings */
  app.use((req, res, next) => {
    req.query = req.query || {};
    next();
  });
  
  /* Ensure path params are available */
  app.use((req, res, next) => {
    req.params = req.params || {};
    next();
  });
  
  return app;
}

/**
 * Creates an Express middleware adapter for server-generator wrappers
 */
export function createExpressAdapter<T>(
  wrapper: (handler: (params: any) => Promise<T>) => (req: any) => Promise<T>
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
          contentType: req.get('content-type'),
        };
        
        /* Call the wrapper with the converted request */
        const result = await wrappedHandler(wrapperReq);
        
        /* Send the response */
        if (result && typeof result === 'object' && 'status' in result) {
          const response = result as any;
          res.status(response.status);
          
          if (response.contentType) {
            res.set('Content-Type', response.contentType);
          }
          
          if (response.data !== undefined) {
            res.json(response.data);
          } else {
            res.end();
          }
        } else {
          res.status(500).json({ error: "Invalid response from handler" });
        }
      } catch (error) {
        console.error('Express adapter error:', error);
        res.status(500).json({ 
          error: "Internal server error", 
          message: error instanceof Error ? error.message : String(error)
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
    "Authorization": "Bearer test-token-123",
    "X-Functions-Key": "test-simple-token-456",
    "Content-Type": "application/json",
  },
};
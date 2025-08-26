import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";

import { testAuthBearerWrapper } from "./generated/server-operations/testAuthBearer.js";

describe("Simple Server Generator Test", () => {
  it("should import the wrapper successfully", () => {
    expect(testAuthBearerWrapper).toBeDefined();
    expect(typeof testAuthBearerWrapper).toBe("function");
  });

  it("should call the wrapper directly", async () => {
    const handler = async (params: any) => {
      console.log("Handler called with:", params);
      return {
        status: 200,
        contentType: "application/json",
        data: { test: true },
      };
    };
    
    const wrapper = testAuthBearerWrapper(handler);
    expect(wrapper).toBeDefined();
    
    try {
      const result = await wrapper({
        query: { qr: "test", qo: "optional", cursor: "test" }, /* Include all parameters */
        path: {},
        headers: {},
        body: undefined,
      });
      
      console.log("Direct wrapper result:", result);
      expect(result).toHaveProperty("status");
      expect(result.status).toBe(200);
    } catch (error) {
      console.error("Direct wrapper error:", error);
      throw error;
    }
  });

  it("should work with express manually", async () => {
    const app = express();
    app.use(express.json());
    
    app.get("/test", async (req, res) => {
      try {
        const handler = async (params: any) => {
          console.log("Express handler params:", params);
          return {
            status: 200,
            contentType: "application/json",
            data: { message: "success" },
          };
        };
        
        const wrapper = testAuthBearerWrapper(handler);
        const wrapperReq = {
          query: req.query,
          path: req.params,
          headers: req.headers,
          body: req.body,
        };
        
        const result = await wrapper(wrapperReq);
        console.log("Express wrapper result:", result);
        
        res.status(result.status).json(result.data);
      } catch (error) {
        console.error("Express error:", error);
        res.status(500).json({ error: String(error) });
      }
    });
    
    const response = await request(app)
      .get("/test")
      .query({ qr: "test", qo: "optional", cursor: "test" }); /* Include all parameters */
      
    console.log("Express response:", response.status, response.body);
    expect(response.status).toBe(200);
    expect(response.body.message).toBe("success");
  });
});
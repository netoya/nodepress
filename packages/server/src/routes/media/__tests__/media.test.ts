import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import mediaPlugin from "../index.js";

describe("GET /wp/v2/media", () => {
  it("returns 200 with empty array", async () => {
    const app = Fastify();
    await app.register(mediaPlugin);

    const response = await app.inject({
      method: "GET",
      url: "/wp/v2/media",
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });
});

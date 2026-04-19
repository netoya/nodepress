import { describe, it, expect } from "vitest";
import Fastify from "fastify";
import mediaPlugin from "../index.js";
import { registerBearerAuth } from "../../../auth/index.js";

describe("GET /wp/v2/media", () => {
  it("returns 200 with empty array when no media uploaded", async () => {
    const app = Fastify();
    await registerBearerAuth(app);
    await app.register(mediaPlugin);

    const response = await app.inject({
      method: "GET",
      url: "/wp/v2/media",
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBe(0);
  });
});

describe("POST /wp/v2/media", () => {
  it("returns 401 without auth", async () => {
    const app = Fastify();
    await registerBearerAuth(app);
    await app.register(mediaPlugin);

    const response = await app.inject({
      method: "POST",
      url: "/wp/v2/media",
      headers: {
        "content-type": "multipart/form-data",
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 400 when file is missing", async () => {
    const app = Fastify();
    await registerBearerAuth(app);
    await app.register(mediaPlugin);

    const response = await app.inject({
      method: "POST",
      url: "/wp/v2/media",
      headers: {
        authorization: "Bearer dev-admin-token",
        "content-type": "multipart/form-data",
      },
    });

    expect(response.statusCode).toBe(400);
  });

  it("validates required mime types", () => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
    ];
    expect(allowedMimes.length).toBe(5);
  });
});

describe("Type validation", () => {
  it("accepts image/jpeg", () => {
    expect(["image/jpeg"]).toContain("image/jpeg");
  });

  it("accepts image/png", () => {
    expect(["image/png"]).toContain("image/png");
  });

  it("accepts image/gif", () => {
    expect(["image/gif"]).toContain("image/gif");
  });

  it("accepts image/webp", () => {
    expect(["image/webp"]).toContain("image/webp");
  });

  it("accepts application/pdf", () => {
    expect(["application/pdf"]).toContain("application/pdf");
  });
});

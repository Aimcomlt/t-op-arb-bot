import { describe, it, expect } from "vitest";
import { publicClient } from "./viemClient.js";

describe("publicClient", () => {
  it("is created", () => {
    expect(publicClient).toBeTruthy();
  });
});

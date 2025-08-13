import { describe, it, expect } from "vitest";
import { publicClient } from "./viemClient";

describe("publicClient", () => {
  it("is created", () => {
    expect(publicClient).toBeTruthy();
  });
});

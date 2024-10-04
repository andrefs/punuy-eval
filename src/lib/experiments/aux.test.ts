import { describe, expect, it } from "vitest";
import { normalizeScale } from "./aux";

describe("experiments aux", () => {
  describe("normalizeScale", () => {
    it("0/10 to 0/100", () => {
      const value = 5;
      const sourceScale = { min: 0, max: 10 };
      const targetScale = { min: 0, max: 100 };
      const result = normalizeScale(value, sourceScale, targetScale);
      expect(result).toBe(50);
    });

    it("0/10 to 50/100", () => {
      const value = 5;
      const sourceScale = { min: 0, max: 10 };
      const targetScale = { min: 50, max: 100 };
      const result = normalizeScale(value, sourceScale, targetScale);
      expect(result).toBe(75);
    });

    it("0/4 to 1/5", () => {
      const value = 3;
      const sourceScale = { min: 0, max: 4 };
      const targetScale = { min: 1, max: 5 };
      const result = normalizeScale(value, sourceScale, targetScale);
      expect(result).toBe(4);
    });
  });
});

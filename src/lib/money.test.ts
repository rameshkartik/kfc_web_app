import { describe, expect, it } from "vitest";
import { formatRupees, weightLabel } from "./money";
describe("price display", () => {
  it("converts paise to formatted rupees", () => expect(formatRupees(12345)).toContain("123.45"));
  it("rejects invalid amounts", () => expect(() => formatRupees(-1)).toThrow());
  it("formats supported weight labels", () => { expect(weightLabel(500)).toBe("500 g"); expect(weightLabel(1000)).toBe("1 kg"); });
});

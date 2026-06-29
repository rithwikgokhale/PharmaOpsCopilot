import { describe, expect, it } from "vitest";
import { eventCategoryClass, formatTimeOnly, formatTimestamp } from "./time";

describe("time utils", () => {
  it("formatTimestamp returns a readable string", () => {
    const formatted = formatTimestamp("2025-06-15T08:22:00");
    expect(formatted).toMatch(/Jun/);
    expect(formatted).toMatch(/08:22/);
  });

  it("formatTimeOnly returns HH:MM", () => {
    const t = formatTimeOnly("2025-06-15T14:30:00");
    expect(t).toMatch(/14:30/);
  });

  it("eventCategoryClass includes dark mode variants", () => {
    const cls = eventCategoryClass("alarm");
    expect(cls).toContain("dark:");
    expect(cls).toContain("bg-red");
  });
});

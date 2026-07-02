import { describe, expect, it } from "vitest";
import { runEvals } from "./evalRunner";

describe("runEvals", () => {
  it("passes all 18 eval cases in deterministic mode", async () => {
    const result = await runEvals();
    expect(result.mode).toBe("deterministic");
    expect(result.total).toBe(18);
    expect(result.passed).toBe(18);
    expect(result.failed).toBe(0);
    expect(result.cases.every((c) => c.pass)).toBe(true);
  }, 30_000);
});

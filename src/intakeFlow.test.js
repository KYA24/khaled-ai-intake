import { describe, expect, it } from "vitest";
import {
  nextIntakeStep,
  previousIntakeStep,
  visibleIntakeProgress,
} from "./intakeFlow";

describe("intake flow", () => {
  it("opens the description step when the user chooses to add one", () => {
    expect(nextIntakeStep(3, "with_description")).toBe(4);
    expect(previousIntakeStep(5, "with_description")).toBe(4);
    expect(visibleIntakeProgress(5, "with_description")).toEqual({
      step: 5,
      total: 5,
    });
  });

  it("skips the removed page when the user chooses no description", () => {
    expect(nextIntakeStep(3, "without_description")).toBe(5);
    expect(previousIntakeStep(5, "without_description")).toBe(3);
    expect(visibleIntakeProgress(5, "without_description")).toEqual({
      step: 4,
      total: 4,
    });
  });
});

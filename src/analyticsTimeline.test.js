import { describe, expect, it } from "vitest";
import { focusTimeline } from "./analyticsTimeline";

const day = (key, views = 0, leads = 0) => ({ key, label: key, views, leads });

describe("focusTimeline", () => {
  it("starts at the first day with measured activity", () => {
    const result = focusTimeline([day("1"), day("2"), day("3", 4), day("4", 0, 1)]);
    expect(result.map((item) => item.key)).toEqual(["3", "4"]);
    expect(result.max).toBe(4);
  });

  it("keeps the full range when activity starts on the first day", () => {
    const source = [day("1", 2), day("2")];
    expect(focusTimeline(source)).toBe(source);
  });

  it("keeps an all-zero range intact", () => {
    const source = [day("1"), day("2")];
    expect(focusTimeline(source)).toBe(source);
  });
});


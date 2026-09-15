import { describe, expect, it } from "vitest";
import { resolveSource } from "./analytics";

describe("resolveSource", () => {
  it("keeps supported explicit sources", () => {
    expect(resolveSource("tiktok", "", "example.com")).toBe("tiktok");
    expect(resolveSource("linkedin", "", "example.com")).toBe("linkedin");
    expect(resolveSource("live", "", "example.com")).toBe("live");
  });
  it("does not guess unsupported explicit values", () => {
    expect(resolveSource("campaign-x", "", "example.com")).toBe("other");
  });
  it("uses a clear referrer and otherwise direct", () => {
    expect(resolveSource(null, "https://www.tiktok.com/", "example.com")).toBe("tiktok");
    expect(resolveSource(null, "https://www.linkedin.com/feed/", "example.com")).toBe("linkedin");
    expect(resolveSource(null, "https://another-site.com/page", "example.com")).toBe("referral");
    expect(resolveSource(null, "", "example.com")).toBe("direct");
    expect(resolveSource(null, "https://example.com/another", "example.com")).toBe("direct");
  });
});

import { describe, it, expect } from "vitest";
import { errorMessage } from "@/utils/error";

describe("errorMessage", () => {
  it("should extract string message from Error", () => {
    const error = new Error("Test error");
    expect(errorMessage(error)).toBe("Test error");
  });

  it("should handle object with message property", () => {
    const error = { message: "Object error" };
    expect(errorMessage(error)).toBe("Object error");
  });

  it("should handle string directly", () => {
    expect(errorMessage("String error")).toBe("String error");
  });

  it("should return generic message for unknown error", () => {
    expect(errorMessage({})).toBe("Unknown error occurred");
  });

  it("should handle undefined", () => {
    expect(errorMessage(undefined)).toBe("Unknown error occurred");
  });
});

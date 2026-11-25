import { describe, it, expect } from "vitest";
import { errorMessage } from "@/utils/error";

describe("errorMessage", () => {
  it("should extract string message from Error", () => {
    const error = new Error("Test error");
    expect(errorMessage(error, "Unknown error occurred")).toBe("Test error");
  });

  it("should handle object with message property", () => {
    const error = { message: "Object error" };
    expect(errorMessage(error, "Unknown error occurred")).toBe("Object error");
  });

  it("should handle string directly", () => {
    expect(errorMessage("String error", "Unknown error occurred")).toBe(
      "Unknown error occurred"
    );
  });

  it("should return generic message for unknown error", () => {
    expect(errorMessage({}, "Unknown error occurred")).toBe("Unknown error occurred");
  });

  it("should handle undefined", () => {
    expect(errorMessage(undefined, "Unknown error occurred")).toBe("Unknown error occurred");
  });
});

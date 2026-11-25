import { describe, it, expect, vi } from "vitest";
import { usePagination } from "@/hooks/usePagination";
import { renderHook, act } from "@testing-library/react";

describe("usePagination", () => {
  it("should initialize with default page size", () => {
    const { result } = renderHook(() => usePagination());
    expect(result.current.pagination.pageNum).toBe(1);
    expect(result.current.pagination.pageSize).toBe(20);
  });

  it("should initialize with custom page size", () => {
    const { result } = renderHook(() => usePagination(50));
    expect(result.current.pagination.pageSize).toBe(50);
  });

  it("should update page size and reset to first page", () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setPageNum(5);
    });
    expect(result.current.pagination.pageNum).toBe(5);

    act(() => {
      result.current.setPageSize(30);
    });
    expect(result.current.pagination.pageSize).toBe(30);
    expect(result.current.pagination.pageNum).toBe(1);
  });

  it("should reset to first page", () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setPageNum(10);
    });
    expect(result.current.pagination.pageNum).toBe(10);

    act(() => {
      result.current.resetToFirstPage();
    });
    expect(result.current.pagination.pageNum).toBe(1);
  });

  it("should not go below page 1", () => {
    const { result } = renderHook(() => usePagination());

    act(() => {
      result.current.setPageNum(0);
    });
    expect(result.current.pagination.pageNum).toBe(1);

    act(() => {
      result.current.setPageNum(-5);
    });
    expect(result.current.pagination.pageNum).toBe(1);
  });
});

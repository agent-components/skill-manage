import { useState, useCallback } from "react";

export interface PaginationState {
  pageNum: number;
  pageSize: number;
}

export function usePagination(initialSize = 20) {
  const [pagination, setPagination] = useState<PaginationState>({
    pageNum: 1,
    pageSize: initialSize,
  });

  const resetToFirstPage = useCallback(() => {
    setPagination((prev) => ({
      ...prev,
      pageNum: 1,
    }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPagination((prev) => ({
      ...prev,
      pageSize: size,
      pageNum: 1,
    }));
  }, []);

  const setPageNum = useCallback((num: number) => {
    setPagination((prev) => ({
      ...prev,
      pageNum: Math.max(1, num),
    }));
  }, []);

  return {
    pagination,
    setPageSize,
    setPageNum,
    resetToFirstPage,
  };
}

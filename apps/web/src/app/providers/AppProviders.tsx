import { ReactNode } from "react";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TRPCProvider, trpcClient } from "@/services/trpc";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </TRPCProvider>
    </BrowserRouter>
  );
}

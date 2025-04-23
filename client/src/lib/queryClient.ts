import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Prepare headers
  const headers: Record<string, string> = {
    ...(data ? { "Content-Type": "application/json" } : {}),
  };
  
  // Add JWT token if available
  const token = localStorage.getItem("auth_token");
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Include cookies for session auth
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log(`Making request to: ${queryKey[0]}`);
    
    // Prepare headers with JWT token if available
    const headers: Record<string, string> = {};
    const token = localStorage.getItem("auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
      console.log("Using auth token from localStorage");
    } else {
      console.log("No auth token found in localStorage");
    }
    
    try {
      const res = await fetch(queryKey[0] as string, {
        headers,
        credentials: "include",
      });
      
      console.log(`Response status: ${res.status} for ${queryKey[0]}`);

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Returning null for 401 on ${queryKey[0]}`);
        return null;
      }

      await throwIfResNotOk(res);
      const data = await res.json();
      console.log(`Response data for ${queryKey[0]}:`, data);
      return data;
    } catch (error) {
      console.error(`Error fetching ${queryKey[0]}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

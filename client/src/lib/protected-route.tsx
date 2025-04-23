import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { Redirect, Route, RouteProps, useLocation } from "wouter";

interface ProtectedRouteProps extends RouteProps {
  component: React.ComponentType<any>;
}

export function ProtectedRoute({
  path,
  component: Component,
  ...rest
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // This will ensure the Authorization header is included in future requests
    if (localStorage.getItem("auth_token")) {
      // Refresh the token expiration by triggering a user fetch
      fetch("/api/auth/user", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`
        }
      }).catch(error => {
        console.error("Failed to refresh auth token:", error);
      });
    }
  }, []);

  if (isLoading) {
    return (
      <Route path={path} {...rest}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path} {...rest}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  return (
    <Route path={path} {...rest}>
      <Component />
    </Route>
  );
}
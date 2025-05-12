import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

interface LogoutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  className?: string;
  showIcon?: boolean;
  children?: React.ReactNode;
}

export default function LogoutButton({ 
  variant = "default", 
  className = "", 
  showIcon = true,
  children 
}: LogoutButtonProps) {
  const { logoutMutation } = useAuth();
  const [, navigate] = useLocation();

  // Navigate after successful logout
  useEffect(() => {
    if (logoutMutation.isSuccess) {
      // Clear any cached data in localStorage
      localStorage.clear();
      // Navigate to landing page
      navigate("/");
      // Force a full page refresh to ensure all state is cleared
      window.location.reload();
    }
  }, [logoutMutation.isSuccess, navigate]);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <Button 
      variant={variant} 
      className={className} 
      onClick={handleLogout}
      disabled={logoutMutation.isPending}
    >
      {logoutMutation.isPending ? (
        "Logging out..."
      ) : (
        <>
          {showIcon && <LogOut className="h-4 w-4 mr-2" />}
          {children || "Logout"}
        </>
      )}
    </Button>
  );
}
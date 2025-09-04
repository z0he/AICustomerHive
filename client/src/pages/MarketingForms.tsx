import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import AuthHeader from "@/components/auth/AuthHeader";
import { FilePlus } from "lucide-react";

export default function MarketingForms() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div>
      <AuthHeader />
      <main className="flex-1 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Marketing Forms</h1>
            <p className="text-muted-foreground">Create and manage forms for your website</p>
          </div>
          <Button onClick={() => setIsModalOpen(true)}>
            <FilePlus className="h-4 w-4 mr-2" />
            Create Form
          </Button>
        </div>
        <div className="text-center py-8">
          <p className="text-slate-500">Marketing forms functionality coming soon...</p>
        </div>
      </main>
    </div>
  );
}

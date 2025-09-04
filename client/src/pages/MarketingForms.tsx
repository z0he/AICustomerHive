import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import AuthHeader from "@/components/auth/AuthHeader";
import { FilePlus, FileEdit, Eye, Copy, Trash2 } from "lucide-react";

export default function MarketingForms() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: forms = [] } = useQuery({
    queryKey: ["/api/marketing/forms"],
    retry: 1
  });

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
        <div className="space-y-4">
          {forms.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">No forms created yet. Create your first form to get started.</p>
            </div>
          ) : (
            forms.map((form: any) => (
              <div key={form.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{form.name}</h3>
                    <p className="text-sm text-slate-500">{form.title}</p>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button variant="outline" size="sm">
                      <Copy className="h-4 w-4 mr-1" />
                      Copy Code
                    </Button>
                    <Button variant="outline" size="sm">
                      <FileEdit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}

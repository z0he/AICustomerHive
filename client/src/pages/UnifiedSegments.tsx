import AuthHeader from "@/components/auth/AuthHeader";
import UnifiedContactSegments from "@/components/contacts/UnifiedContactSegments";

export default function UnifiedSegments() {
  return (
    <div className="flex h-screen bg-slate-50">
      <div className="flex-1 flex flex-col overflow-hidden">
        <AuthHeader />
        <main className="flex-1 overflow-y-auto p-6">
          <UnifiedContactSegments />
        </main>
      </div>
    </div>
  );
}
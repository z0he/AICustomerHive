import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Construction } from "lucide-react";

interface UnderDevelopmentProps {
  title: string;
}

export function UnderDevelopment({ title }: UnderDevelopmentProps) {
  return (
    <div className="flex items-center justify-center min-h-screen p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
            <Construction className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600">
            This feature is currently under development and will be available soon.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
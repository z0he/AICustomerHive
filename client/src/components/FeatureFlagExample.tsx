import { useFlag, useFlags, useFeatureFlags } from "@/hooks/use-feature-flags";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * Example component demonstrating feature flag usage
 * This shows different ways to use the feature flag hooks
 */
export function FeatureFlagExample() {
  // Single flag usage
  const contactsUnified = useFlag('ff.contacts_unified');
  const websiteTracking = useFlag('ff.website_tracking_v2');

  // Multiple flags at once
  const { 'ff.unified_segments': unifiedSegments, 'ff.journey_unified': journeyUnified } = useFlags([
    'ff.unified_segments',
    'ff.journey_unified'
  ]);

  // All flags with loading state
  const { data: allFlags, isLoading } = useFeatureFlags();

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading feature flags...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Feature Flag Example</CardTitle>
          <CardDescription>
            This component demonstrates different ways to use feature flags
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Conditional rendering based on single flag */}
          {contactsUnified ? (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <h3 className="font-medium text-green-800">✅ Unified Contacts</h3>
              <p className="text-sm text-green-700">
                The unified contacts system is enabled! You can access the new contacts page.
              </p>
            </div>
          ) : (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h3 className="font-medium text-yellow-800">⏳ Unified Contacts</h3>
              <p className="text-sm text-yellow-700">
                The unified contacts system is disabled. Using legacy customer/lead pages.
              </p>
            </div>
          )}

          {/* Multiple conditional features */}
          <div className="grid grid-cols-2 gap-4">
            {websiteTracking && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <h4 className="font-medium text-blue-800">🔍 Website Tracking V2</h4>
                <p className="text-xs text-blue-700">Enhanced tracking enabled</p>
              </div>
            )}

            {unifiedSegments && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded">
                <h4 className="font-medium text-purple-800">🎯 Unified Segments</h4>
                <p className="text-xs text-purple-700">Advanced segmentation active</p>
              </div>
            )}

            {journeyUnified && (
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded">
                <h4 className="font-medium text-indigo-800">🗺️ Journey Mapping</h4>
                <p className="text-xs text-indigo-700">Unified journey tracking</p>
              </div>
            )}
          </div>

          {/* Show all flags status */}
          <div>
            <h4 className="font-medium mb-2">All Feature Flags:</h4>
            <div className="flex flex-wrap gap-2">
              {Object.entries(allFlags || {}).map(([key, enabled]) => (
                <Badge 
                  key={key} 
                  variant={enabled ? "default" : "secondary"}
                  className={enabled ? "bg-green-100 text-green-800" : ""}
                >
                  {key}: {enabled ? "ON" : "OFF"}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
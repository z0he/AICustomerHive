import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { Alert, AlertDescription } from './alert';
import { Button } from './button';

interface DomainValidationAlertProps {
  isVisible: boolean;
  onDismiss?: () => void;
}

export function DomainValidationAlert({ isVisible, onDismiss }: DomainValidationAlertProps) {
  if (!isVisible) return null;

  return (
    <Alert className="border-amber-200 bg-amber-50">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800">
        <div className="space-y-3">
          <div>
            <strong>Domain Configuration Issue Detected</strong>
          </div>
          <div className="text-sm">
            Your Mailgun API key appears to be associated with a sandbox domain, but AICRM requires <strong>mail.aicrm.co.uk</strong> for all outbound emails.
          </div>
          <div className="text-sm">
            <strong>To fix this:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Add <strong>mail.aicrm.co.uk</strong> to your Mailgun account</li>
              <li>Complete DNS verification for the domain</li>
              <li>Generate a new API key for <strong>mail.aicrm.co.uk</strong></li>
              <li>Update your API key in AICRM settings</li>
            </ol>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => window.open('https://app.mailgun.com/app/domains', '_blank')}
              className="text-amber-700 border-amber-300 hover:bg-amber-100"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Mailgun Domains
            </Button>
            {onDismiss && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={onDismiss}
                className="text-amber-700 hover:bg-amber-100"
              >
                Dismiss
              </Button>
            )}
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}
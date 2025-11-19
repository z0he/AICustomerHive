import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, Coins } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TopUpCreditsModalProps {
  open: boolean;
  onClose: () => void;
  required?: number;
  current?: number;
}

export function TopUpCreditsModal({ 
  open, 
  onClose, 
  required, 
  current 
}: TopUpCreditsModalProps) {
  const [amount, setAmount] = useState(100);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const topUpMutation = useMutation({
    mutationFn: async (amount: number) => {
      return await apiRequest('/api/credits/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, metadata: { source: 'manual_topup' } })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
      toast({
        title: 'Credits added!',
        description: `Successfully added ${amount} credits to your account.`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to add credits',
        description: error.message || 'An error occurred while adding credits.',
        variant: 'destructive',
      });
    },
  });

  const handleTopUp = () => {
    topUpMutation.mutate(amount);
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md" data-testid="modal-topup-credits">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="text-amber-500" size={24} />
            Top Up Credits
          </DialogTitle>
          {required !== undefined && current !== undefined ? (
            <DialogDescription>
              <div className="flex items-start gap-2 mt-2 p-3 bg-red-50 border border-red-200 rounded">
                <AlertCircle className="text-red-600 shrink-0 mt-0.5" size={16} />
                <div className="text-sm text-red-800">
                  <p className="font-medium">Insufficient credits</p>
                  <p className="mt-1">
                    You need <strong>{required}</strong> credits but only have{' '}
                    <strong>{current}</strong>. Please top up to continue.
                  </p>
                </div>
              </div>
            </DialogDescription>
          ) : (
            <DialogDescription>
              Add credits to your account to continue using premium features.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Select amount</label>
            <div className="grid grid-cols-3 gap-2">
              {[50, 100, 250, 500, 1000, 2500].map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={amount === value ? 'default' : 'outline'}
                  className="h-12"
                  onClick={() => setAmount(value)}
                  data-testid={`button-amount-${value}`}
                >
                  {value}
                </Button>
              ))}
            </div>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-slate-600">Credits to add:</span>
              <span className="text-lg font-bold text-emerald-600">
                {amount.toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-slate-500">
              1 credit = 1 email • 2 credits = 1 AI action • 3 credits = 1 automation step
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
            disabled={topUpMutation.isPending}
            data-testid="button-cancel-topup"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleTopUp}
            disabled={topUpMutation.isPending}
            data-testid="button-confirm-topup"
          >
            {topUpMutation.isPending ? 'Adding...' : `Add ${amount} Credits`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

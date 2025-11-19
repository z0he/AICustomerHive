import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, Coins, CreditCard, Sparkles, Zap, Rocket } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface TopUpCreditsModalProps {
  open: boolean;
  onClose: () => void;
  required?: number;
  current?: number;
}

type BundleType = 'starter' | 'growth' | 'scale' | 'custom';

interface Bundle {
  type: BundleType;
  name: string;
  credits: number;
  price: number;
  icon: typeof Sparkles;
  popular?: boolean;
}

const BUNDLES: Bundle[] = [
  { type: 'starter', name: 'Starter', credits: 500, price: 29, icon: Sparkles },
  { type: 'growth', name: 'Growth', credits: 2000, price: 99, icon: Zap, popular: true },
  { type: 'scale', name: 'Scale', credits: 5000, price: 199, icon: Rocket },
];

const MIN_CUSTOM_AMOUNT = 10;
const CREDITS_PER_DOLLAR = 18;

export function TopUpCreditsModal({ 
  open, 
  onClose, 
  required, 
  current 
}: TopUpCreditsModalProps) {
  const [selectedBundle, setSelectedBundle] = useState<BundleType | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const checkout = params.get('checkout');
    
    if (checkout === 'success') {
      queryClient.invalidateQueries({ queryKey: ['/api/credits'] });
      toast({
        title: 'Credits added!',
        description: 'Your purchase was successful. Credits have been added to your account.',
      });
      window.history.replaceState({}, '', window.location.pathname);
    } else if (checkout === 'cancelled') {
      toast({
        title: 'Purchase cancelled',
        description: 'Your checkout was cancelled. No charges were made.',
        variant: 'destructive',
      });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [queryClient, toast]);

  const checkoutMutation = useMutation({
    mutationFn: async ({ type, amountUsd }: { type: BundleType; amountUsd?: number }) => {
      const response = await apiRequest('/api/stripe/create-checkout-session', 'POST', { type, amountUsd });
      return await response.json() as { url: string };
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to start checkout',
        description: error.message || 'An error occurred while creating checkout session.',
        variant: 'destructive',
      });
    },
  });

  const handleBundleSelect = (type: BundleType) => {
    if (type === 'custom') {
      setSelectedBundle('custom');
    } else {
      checkoutMutation.mutate({ type });
    }
  };

  const handleCustomCheckout = () => {
    const amount = parseFloat(customAmount);
    
    if (isNaN(amount) || amount < MIN_CUSTOM_AMOUNT) {
      toast({
        title: 'Invalid amount',
        description: `Please enter an amount of at least $${MIN_CUSTOM_AMOUNT}.`,
        variant: 'destructive',
      });
      return;
    }

    checkoutMutation.mutate({ type: 'custom', amountUsd: amount });
  };

  if (selectedBundle === 'custom') {
    const customCredits = customAmount ? Math.floor(parseFloat(customAmount) * CREDITS_PER_DOLLAR) : 0;
    
    return (
      <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md" data-testid="modal-topup-credits">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="text-blue-500" size={24} />
              Custom Amount
            </DialogTitle>
            <DialogDescription>
              Enter a custom dollar amount. Credits calculated at ${CREDITS_PER_DOLLAR} credits per dollar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Amount (USD)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">$</span>
                <Input
                  type="number"
                  min={MIN_CUSTOM_AMOUNT}
                  step="1"
                  placeholder={MIN_CUSTOM_AMOUNT.toString()}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="pl-8"
                  data-testid="input-custom-amount"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Minimum ${MIN_CUSTOM_AMOUNT}
              </p>
            </div>

            {customCredits > 0 && (
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-slate-600">You'll receive:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {customCredits.toLocaleString()} credits
                  </span>
                </div>
                <div className="text-xs text-slate-500">
                  1 credit = 1 email • 2 credits = 1 AI action • 3 credits = 1 automation
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => setSelectedBundle(null)}
              disabled={checkoutMutation.isPending}
              data-testid="button-back"
            >
              Back
            </Button>
            <Button 
              onClick={handleCustomCheckout}
              disabled={checkoutMutation.isPending || !customAmount || parseFloat(customAmount) < MIN_CUSTOM_AMOUNT}
              className="flex-1"
              data-testid="button-checkout-custom"
            >
              {checkoutMutation.isPending ? 'Processing...' : 'Continue to Checkout'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl" data-testid="modal-topup-credits">
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
              Choose a bundle or enter a custom amount to add credits to your account.
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {BUNDLES.map((bundle) => {
              const Icon = bundle.icon;
              return (
                <div
                  key={bundle.type}
                  className={`relative border rounded-lg p-4 cursor-pointer transition-all hover:border-primary hover:shadow-md ${
                    bundle.popular ? 'border-primary shadow-sm' : ''
                  }`}
                  onClick={() => handleBundleSelect(bundle.type)}
                  data-testid={`bundle-${bundle.type}`}
                >
                  {bundle.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-full">
                      Popular
                    </div>
                  )}
                  <div className="flex flex-col items-center text-center space-y-2">
                    <Icon className="text-primary" size={32} />
                    <h3 className="font-bold text-lg">{bundle.name}</h3>
                    <div className="text-2xl font-bold text-primary">
                      {bundle.credits.toLocaleString()}
                    </div>
                    <div className="text-sm text-slate-600">credits</div>
                    <div className="text-lg font-semibold">${bundle.price}</div>
                    <Button
                      className="w-full mt-2"
                      variant={bundle.popular ? 'default' : 'outline'}
                      disabled={checkoutMutation.isPending}
                      data-testid={`button-${bundle.type}`}
                    >
                      {checkoutMutation.isPending ? 'Loading...' : 'Select'}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button
            variant="outline"
            className="w-full"
            onClick={() => handleBundleSelect('custom')}
            disabled={checkoutMutation.isPending}
            data-testid="button-custom"
          >
            <CreditCard className="mr-2" size={16} />
            Enter Custom Amount
          </Button>

          <div className="text-xs text-slate-500 text-center mt-2">
            Secure payment powered by Stripe • 1 credit = 1 email • 2 credits = 1 AI action
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

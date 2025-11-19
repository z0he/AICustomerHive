import { useQuery } from '@tanstack/react-query';

export interface CreditBalance {
  balance: number;
  lastTransactions: Array<{
    id: number;
    organizationId: number;
    amount: number;
    type: string;
    metadata: any;
    createdAt: string;
  }>;
}

export function useCredits() {
  return useQuery<CreditBalance>({
    queryKey: ['/api/credits'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

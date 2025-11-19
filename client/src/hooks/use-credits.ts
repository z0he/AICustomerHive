import { useQuery } from '@tanstack/react-query';

export interface CreditTransaction {
  id: number;
  organizationId: number;
  amount: number;
  type: string;
  metadata: any;
  createdAt: string;
}

export interface CreditInfo {
  balance: number;
  totalPurchasedCredits: number;
  totalUsedCredits: number;
  transactions: CreditTransaction[];
  lowBalance: boolean;
  threshold: number;
}

export function useCredits() {
  return useQuery<CreditInfo>({
    queryKey: ['/api/credits'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

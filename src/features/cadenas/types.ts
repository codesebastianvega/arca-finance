export type ChainFrequency = 'daily' | 'weekly_8d' | 'biweekly_15d' | 'monthly';
export type ChainStatus = 'active' | 'completed' | 'paused';
export type PayoutStatus = 'pending' | 'paid';

export interface SavingsChainMember {
  id: string;
  chainId: string;
  turnNumber: number;
  memberName: string;
  phone?: string | null;
  isCurrentUser: boolean;
  payoutStatus: PayoutStatus;
  payoutDate?: string | null;
}

export interface SavingsChain {
  id: string;
  workspaceId: string;
  name: string;
  contributionAmount: number;
  frequency: ChainFrequency;
  startDate: string;
  totalRounds: number;
  userTurnNumber: number;
  status: ChainStatus;
  createdAt: string;
  updatedAt: string;
  members: SavingsChainMember[];
  // Calculated properties
  totalPot: number;
  currentRoundNumber: number;
  userPayoutDate: string;
  userHasBeenPaid: boolean;
}

export interface SavingsChainsViewModel {
  chains: SavingsChain[];
  totalActiveChains: number;
  totalMonthlyCommitment: number;
  nextUserPayout: {
    chainName: string;
    amount: number;
    date: string;
    daysRemaining: number;
  } | null;
}

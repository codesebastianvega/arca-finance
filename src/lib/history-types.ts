export type HistoryItem = {
  id: string;
  concept: string;
  amount: number;
  amountLabel: string;
  signedAmountLabel: string;
  dateLabel: string;
  dateInputValue: string;
  category: string;
  unit: string;
  kind: string;
  method: string;
  tags: string[];
  accountId: string | null;
  accountName: string | null;
  status: string;
  sourceType: string | null;
  editable: boolean;
};

export type HistoryViewModel = {
  items: HistoryItem[];
};

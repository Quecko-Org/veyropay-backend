export interface IRainCustomer {
  id: string;
}

export interface IRainCard {
  id: string;
  status: string;
}

export interface IRainCardTransaction {
  id: string;
  cardId: string;
  merchant: string;
  amount: string;
  currency: string;
  settlementCurrency: string;
  status: string;
}

// Rain and Baanx are interchangeable card issuers - CardService depends on this
// abstraction so it can fail over from Rain to Baanx without branching on provider.
export interface ICardProviderCustomer {
  id: string;
}

export interface ICardProviderCard {
  id: string;
  status: string;
}

export interface ICardProviderClient {
  createCustomer(externalUserId: string, email?: string): Promise<ICardProviderCustomer>;
  issueCard(customerId: string): Promise<ICardProviderCard>;
  freezeCard(cardId: string): Promise<void>;
  unfreezeCard(cardId: string): Promise<void>;
  setSpendLimit(cardId: string, limit: string): Promise<void>;
}

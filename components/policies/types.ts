export interface PolicySource {
  publisher: string;
  title: string;
  url: string;
}

export interface PolicyClaim {
  text: string;
  source: string;
}

export interface PartyPolicies {
  name: string;
  claims: readonly PolicyClaim[];
}

export interface PolicyArea {
  id: string;
  title: string;
  note?: string;
  parties: readonly PartyPolicies[];
}

export type PolicySources = Readonly<Record<string, PolicySource>>;

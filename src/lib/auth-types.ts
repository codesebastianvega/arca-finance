export interface Profile {
  id: string;
  email?: string;
  fullName?: string;
  isSuperAdmin: boolean;
  createdAt?: string;
}

export interface Workspace {
  id: string;
  ownerUserId: string;
  slug: string;
  name: string;
  currencyCode: string;
  timezone: string;
  status: "active" | "paused" | "archived";
  createdAt?: string;
}

export interface WorkspaceMembership {
  workspaceId: string;
  userId: string;
  role: "owner" | "admin" | "member";
  createdAt?: string;
}

export interface WorkspaceSubscription {
  id: string;
  workspaceId: string;
  planCode: "free" | "personal_pro" | "business";
  status: "trialing" | "active" | "past_due" | "canceled" | "paused";
  provider: string;
  startsAt?: string;
  endsAt?: string;
  trialEndsAt?: string;
  metadata?: Record<string, unknown>;
}

export interface WorkspaceContext {
  profile: Profile;
  workspace: Workspace;
  membership: WorkspaceMembership;
  subscription?: WorkspaceSubscription;
}

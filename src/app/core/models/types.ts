export interface Event {
  id: string;
  name: string;
  category: string;
  slug: string;
  voting_start: string;
  voting_end: string;
  grace_period_seconds: number;
  is_active: boolean;
}

export interface Candidate {
  id: string;
  event_id: string;
  name: string;
  school_or_team: string;
  photo_url: string;
  candidate_number: number;
}

export interface LeaderboardEntry {
  candidate_id: string;
  event_id: string;
  name: string;
  school_or_team: string;
  photo_url: string;
  candidate_number: number;
  total_votes: number;
}

export interface VotePackage {
  id: string;
  event_id: string;
  label: string;
  vote_count: number;
  price_idr: number;
  is_active?: boolean;
}

export interface Voter {
  id: string;
  name: string;
  display_name: string;
  phone: string;
  is_anonymous: boolean;
  google_id: string | null;
  avatar_url: string | null;
}

export interface TopDonor {
  voter_id: string;
  event_id: string;
  display_name: string;
  avatar_url: string | null;
  total_votes_given: number;
  total_spent_idr: number;
  last_voted_at: string;
}

export interface Transaction {
  id: string;
  voter_id: string;
  candidate_id: string;
  package_id: string;
  vote_count: number;
  amount_idr: number;
  status: 'pending' | 'success' | 'failed' | 'expired';
  payment_method: string | null;
  gateway_ref: string | null;
  initiated_at: string;
  confirmed_at: string | null;
  expired_at: string;
}

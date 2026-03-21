import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, RealtimeChannel } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { Event, Candidate, VotePackage, LeaderboardEntry, TopDonor } from '../models/types';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabase.url,
      environment.supabase.anonKey
    );
  }

  get supabaseUrl(): string {
    return environment.supabase.url;
  }

  // ── Auth (admin) ─────────────────────────────────────────
  signIn(email: string, password: string) {
    return this.supabase.auth.signInWithPassword({ email, password });
  }

  signOut() {
    return this.supabase.auth.signOut();
  }

  getSession() {
    return this.supabase.auth.getSession();
  }

  // ── Auth (Google OAuth - voter) ──────────────────────────
  signInWithGoogle() {
    return this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href }
    });
  }

  getUser(): Promise<User | null> {
    return this.supabase.auth.getUser().then(({ data }) => data.user);
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    return this.supabase.auth.onAuthStateChange((_, session) => {
      callback(session?.user ?? null);
    });
  }

  // ── Events ───────────────────────────────────────────────
  getActiveEvents() {
    return this.supabase
      .from('events')
      .select('*')
      .eq('is_active', true)
      .order('voting_start', { ascending: false });
  }

  getEventBySlug(slug: string) {
    return this.supabase
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single();
  }

  // ── Candidates ───────────────────────────────────────────
  getCandidatesByEvent(eventId: string) {
    return this.supabase
      .from('candidates')
      .select('*')
      .eq('event_id', eventId)
      .order('candidate_number');
  }

  // ── Vote Packages ────────────────────────────────────────
  getPackagesByEvent(eventId: string) {
    return this.supabase
      .from('vote_packages')
      .select('*')
      .eq('event_id', eventId)
      .eq('is_active', true)
      .order('price_idr');
  }

  // ── Leaderboard ──────────────────────────────────────────
  getLeaderboard(eventId: string) {
    return this.supabase
      .from('leaderboard')
      .select('*')
      .eq('event_id', eventId)
      .order('total_votes', { ascending: false });
  }

  subscribeToTransactions(eventId: string, callback: () => void): RealtimeChannel {
    return this.supabase
      .channel(`transactions:${eventId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'transactions'
        },
        (payload) => {
          // Filter di client side — hanya trigger kalau status berubah jadi success
          if (payload.new['status'] === 'success') {
            callback();
          }
        }
      )
      .subscribe();
  }

  unsubscribe(channel: RealtimeChannel) {
    this.supabase.removeChannel(channel);
  }

  // ── Top Donors ───────────────────────────────────────────
  getTopDonors(eventId: string, limit = 10) {
    return this.supabase
      .from('top_donors')
      .select('*')
      .eq('event_id', eventId)
      .limit(limit);
  }

  // ── Transactions ─────────────────────────────────────────
  createTransaction(payload: {
    voter_id: string;
    candidate_id: string;
    package_id: string;
    vote_count: number;
    amount_idr: number;
    expired_at: string;
  }) {
    return this.supabase
      .from('transactions')
      .insert(payload)
      .select()
      .single();
  }

  // ── Voters ───────────────────────────────────────────────
  upsertVoter(payload: {
    google_id: string;
    name: string;
    display_name: string;
    phone: string;
    avatar_url: string;
    is_anonymous: boolean;
  }) {
    return this.supabase
      .from('voters')
      .upsert(payload, { onConflict: 'google_id' })
      .select()
      .single();
  }

  createAnonymousVoter(payload: {
    name: string;
    display_name: string;
    phone: string;
    is_anonymous: boolean;
  }) {
    return this.supabase
      .from('voters')
      .insert(payload)
      .select()
      .single();
  }

  // ── Storage ──────────────────────────────────────────────
  getPhotoUrl(path: string) {
    return this.supabase
      .storage
      .from('candidate-photos')
      .getPublicUrl(path).data.publicUrl;
  }
}

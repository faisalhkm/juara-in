import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../../core/services/supabase';
import { Event, Candidate, LeaderboardEntry, TopDonor, VotePackage } from '../../../core/models/types';
import { formatRupiah } from '../../../core/utils/format';
import { CountdownTimer } from '../../../shared/components/countdown-timer/countdown-timer';
import { CandidateCard } from '../candidate-card/candidate-card';
import { Payment } from '../payment/payment';
import {AuthService} from '../../../core/services/auth';

@Component({
  selector: 'app-event-detail',
  standalone: true,
  imports: [CountdownTimer, CandidateCard, Payment],
  templateUrl: './event-detail.html',
  styleUrl: './event-detail.scss'
})
export class EventDetail implements OnInit, OnDestroy {
  event = signal<Event | null>(null);
  candidates = signal<Candidate[]>([]);
  leaderboard = signal<LeaderboardEntry[]>([]);
  topDonors = signal<TopDonor[]>([]);
  packages = signal<VotePackage[]>([]);
  selectedCandidate = signal<Candidate | null>(null);
  showPayment = signal(false);
  isLoading = signal(true);
  pendingPackage = signal<VotePackage | null>(null);

  private realtimeChannel?: RealtimeChannel;

  // Merge candidates + leaderboard
  // Kandidat yang belum ada di leaderboard tetap tampil dengan total_votes: 0
  mergedLeaderboard = computed<LeaderboardEntry[]>(() => {
    const lb = this.leaderboard();
    const candidates = this.candidates();

    if (lb.length > 0) return lb;

    // Leaderboard kosong — return semua kandidat dengan 0 votes
    return candidates.map(c => ({
      candidate_id: c.id,
      event_id: c.event_id,
      name: c.name,
      school_or_team: c.school_or_team,
      photo_url: c.photo_url,
      candidate_number: c.candidate_number,
      total_votes: 0
    })).sort((a, b) => a.candidate_number - b.candidate_number);
  });

  get maxVotes(): number {
    const list = this.mergedLeaderboard();
    if (list.length === 0) return 0;
    return Math.max(...list.map(c => c.total_votes), 1);
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService,
    protected auth: AuthService
  ) {}

  async ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    await this.loadEvent(slug);
    this.restorePendingVote();
  }

  private restorePendingVote() {
    const pending = localStorage.getItem('juara_pending_vote');
    console.log('restorePendingVote - raw:', pending);

    if (!pending) return;

    try {
      const parsed = JSON.parse(pending);
      console.log('restorePendingVote - parsed:', parsed);

      if (parsed.eventId !== this.event()?.id) {
        console.log('event mismatch:', parsed.eventId, this.event()?.id);
        return;
      }
      if (!this.auth.isLoggedIn) {
        console.log('not logged in');
        return;
      }

      localStorage.removeItem('juara_pending_vote');
      this.selectedCandidate.set(parsed.candidate);
      this.pendingPackage.set(parsed.package);
      console.log('pendingPackage set to:', parsed.package);
      this.showPayment.set(true);
    } catch(e) {
      console.log('parse error:', e);
      localStorage.removeItem('juara_pending_vote');
    }
  }

  ngOnDestroy() {
    if (this.realtimeChannel) {
      this.supabase.unsubscribe(this.realtimeChannel);
    }
  }

  private async loadEvent(slug: string) {
    this.isLoading.set(true);

    const { data: event, error } = await this.supabase.getEventBySlug(slug);
    if (error || !event) {
      this.router.navigate(['/']);
      return;
    }
    this.event.set(event);

    // Load semua data paralel
    await Promise.all([
      this.loadCandidates(event.id),
      this.loadLeaderboard(event.id),
      this.loadTopDonors(event.id),
      this.loadPackages(event.id)
    ]);

    this.isLoading.set(false);

    // Subscribe realtime
    this.realtimeChannel = this.supabase.subscribeToTransactions(
      event.id,
      () => this.refreshLeaderboard(event.id)
    );
  }

  private async loadCandidates(eventId: string) {
    const { data } = await this.supabase.getCandidatesByEvent(eventId);
    this.candidates.set(data ?? []);
  }

  private async loadLeaderboard(eventId: string) {
    const { data } = await this.supabase.getLeaderboard(eventId);
    this.leaderboard.set(data ?? []);
  }

  private async loadTopDonors(eventId: string) {
    const { data } = await this.supabase.getTopDonors(eventId);
    this.topDonors.set(data ?? []);
  }

  private async loadPackages(eventId: string) {
    const { data } = await this.supabase.getPackagesByEvent(eventId);
    this.packages.set(data ?? []);
  }

  private async refreshLeaderboard(eventId: string) {
    await Promise.all([
      this.loadLeaderboard(eventId),
      this.loadTopDonors(eventId)
    ]);
  }

  onVote(candidate: LeaderboardEntry) {
    const c: Candidate = {
      id: candidate.candidate_id,
      event_id: candidate.event_id,
      name: candidate.name,
      school_or_team: candidate.school_or_team,
      photo_url: candidate.photo_url,
      candidate_number: candidate.candidate_number
    };
    this.selectedCandidate.set(c);
    this.showPayment.set(true);
  }

  onPaymentClose() {
    this.showPayment.set(false);
    this.selectedCandidate.set(null);
    this.pendingPackage.set(null);
  }

  onPaymentSuccess() {
    this.showPayment.set(false);
    this.selectedCandidate.set(null);
    this.pendingPackage.set(null);
    if (this.event()) {
      this.refreshLeaderboard(this.event()!.id);
    }
  }

  goBack() {
    this.router.navigate(['/']);
  }

  formatRupiah(amount: number): string {
    return formatRupiah(amount);
  }
}

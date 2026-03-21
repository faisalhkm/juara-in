import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RealtimeChannel } from '@supabase/supabase-js';
import { SupabaseService } from '../../../core/services/supabase';
import { AuthService } from '../../../core/services/auth';
import { ToastService } from '../../../core/services/toast';
import { Event, Candidate, LeaderboardEntry, TopDonor, VotePackage } from '../../../core/models/types';
import { formatRupiah } from '../../../core/utils/format';
import { CountdownTimer } from '../../../shared/components/countdown-timer/countdown-timer';
import { CandidateCard } from '../candidate-card/candidate-card';
import { Payment } from '../payment/payment';

type EventState = 'upcoming' | 'active' | 'counting' | 'ended';

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
  private nowSignal = signal(Date.now());
  private tickInterval?: ReturnType<typeof setInterval>;

  eventState = computed<EventState>(() => {
    const event = this.event();
    if (!event) return 'upcoming';
    const now = this.nowSignal();
    const start = new Date(event.voting_start).getTime();
    const end = new Date(event.voting_end).getTime();
    const countingEnd = end + (event.counting_duration_minutes * 60 * 1000);
    if (now < start) return 'upcoming';
    if (now > countingEnd) return 'ended';
    if (now > end) return 'counting';
    return 'active';
  });

  mergedLeaderboard = computed<LeaderboardEntry[]>(() => {
    const lb = this.leaderboard();
    const candidates = this.candidates();
    if (lb.length > 0) return lb;
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

  getCountingEndDate(): string {
    const event = this.event();
    if (!event) return '';
    const end = new Date(event.voting_end).getTime();
    const countingMs = (event.counting_duration_minutes ?? 5) * 60 * 1000;
    return new Date(end + countingMs).toISOString();
  }

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabase: SupabaseService,
    protected auth: AuthService,
    private toast: ToastService
  ) {}

  async ngOnInit() {
    const slug = this.route.snapshot.paramMap.get('slug') ?? '';
    await this.loadEvent(slug);
    this.restorePendingVote();

    this.tickInterval = setInterval(() => {
      this.nowSignal.set(Date.now());
    }, 1000);
  }

  ngOnDestroy() {
    if (this.realtimeChannel) {
      this.supabase.unsubscribe(this.realtimeChannel);
    }
    clearInterval(this.tickInterval);
  }

  private async loadEvent(slug: string) {
    this.isLoading.set(true);
    const { data: event, error } = await this.supabase.getEventBySlug(slug);
    if (error || !event) {
      this.router.navigate(['/']);
      return;
    }
    this.event.set(event);
    await Promise.all([
      this.loadCandidates(event.id),
      this.loadLeaderboard(event.id),
      this.loadTopDonors(event.id),
      this.loadPackages(event.id)
    ]);
    this.isLoading.set(false);
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

  private restorePendingVote() {
    const pending = localStorage.getItem('juara_pending_vote');
    if (!pending) return;
    try {
      const parsed = JSON.parse(pending);
      if (parsed.eventId !== this.event()?.id) return;
      if (!this.auth.isLoggedIn) return;
      localStorage.removeItem('juara_pending_vote');
      this.selectedCandidate.set(parsed.candidate);
      this.pendingPackage.set(parsed.package);
      this.showPayment.set(true);
    } catch {
      localStorage.removeItem('juara_pending_vote');
    }
  }

  onVote(candidate: LeaderboardEntry) {
    if (this.eventState() !== 'active') return;
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
    console.log('Payment successful!');
    this.toast.success('Vote berhasil!', 'Terima kasih sudah mendukung kandidat favoritmu');
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

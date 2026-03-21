import {Component, computed, OnInit, signal} from '@angular/core';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';
import { Event } from '../../../core/models/types';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [],
  templateUrl: './event-list.html',
  styleUrl: './event-list.scss'
})
export class EventList implements OnInit {
  events = signal<Event[]>([]);
  isLoading = signal(true);
  sortedEvents = computed(() => {
    const order = { active: 0, counting: 1, upcoming: 2, ended: 3 };
    return [...this.events()].sort((a, b) =>
      order[this.getEventState(a)] - order[this.getEventState(b)]
    );
  });

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {}

  async ngOnInit() {
    const { data } = await this.supabase.getActiveEvents();
    this.events.set(data ?? []);
    this.isLoading.set(false);
  }

  goToEvent(slug: string) {
    this.router.navigate(['/vote', slug]);
  }

  getTimeLeft(votingEnd: string): string {
    const diff = new Date(votingEnd).getTime() - Date.now();
    if (diff <= 0) return 'Voting ditutup';
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    if (days > 0) return `${days} hari ${hours} jam lagi`;
    const mins = Math.floor((diff % 3600000) / 60000);
    return `${hours} jam ${mins} menit lagi`;
  }

  getEventState(event: Event): 'upcoming' | 'active' | 'counting' | 'ended' {
    const now = Date.now();
    const start = new Date(event.voting_start).getTime();
    const end = new Date(event.voting_end).getTime();
    const countingEnd = end + ((event.counting_duration_minutes ?? 5) * 60 * 1000);
    if (now < start) return 'upcoming';
    if (now > countingEnd) return 'ended';
    if (now > end) return 'counting';
    return 'active';
  }

  getCountdownTarget(event: Event): string {
    const state = this.getEventState(event);
    return state === 'upcoming' ? event.voting_start : event.voting_end;
  }

  getCountdownLabel(event: Event): string {
    switch (this.getEventState(event)) {
      case 'upcoming': return 'Dimulai dalam';
      case 'active': return 'Sisa waktu';
      case 'counting':
      case 'ended': return 'Voting selesai';
    }
  }

  get activeEventsCount(): number {
    return this.events().filter(e => this.getEventState(e) === 'active').length;
  }
}

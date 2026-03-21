import { Component, OnInit, signal } from '@angular/core';
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
}

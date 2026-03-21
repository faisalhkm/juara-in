import { Component, OnInit, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';
import { Candidate, Event } from '../../../core/models/types';

@Component({
  selector: 'app-candidate-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './candidate-list.html',
  styleUrl: './candidate-list.scss'
})
export class CandidateList implements OnInit {
  eventId = '';
  event = signal<Event | null>(null);
  candidates = signal<Candidate[]>([]);
  isLoading = signal(true);
  deletingId = signal<string | null>(null);

  constructor(
    private supabase: SupabaseService,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id') ?? '';
    await Promise.all([
      this.loadEvent(),
      this.loadCandidates()
    ]);
    this.isLoading.set(false);
  }

  private async loadEvent() {
    const { data } = await this.supabase.getEventById(this.eventId);
    this.event.set(data);
  }

  private async loadCandidates() {
    const { data } = await this.supabase.getCandidatesByEvent(this.eventId);
    this.candidates.set(data ?? []);
  }

  async deleteCandidate(id: string) {
    if (!confirm('Yakin mau hapus kandidat ini?')) return;
    this.deletingId.set(id);
    await this.supabase.deleteCandidate(id);
    await this.loadCandidates();
    this.deletingId.set(null);
  }
}

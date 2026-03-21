import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';
import { Event } from '../../../core/models/types';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './event-list.html',
  styleUrl: './event-list.scss'
})
export class EventList implements OnInit {
  events = signal<Event[]>([]);
  isLoading = signal(true);
  deletingId = signal<string | null>(null);

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    await this.loadEvents();
  }

  private async loadEvents() {
    this.isLoading.set(true);
    const { data } = await this.supabase.getAdminEvents();
    this.events.set(data ?? []);
    this.isLoading.set(false);
  }

  async toggleActive(event: Event) {
    await this.supabase.updateEvent(event.id, { is_active: !event.is_active });
    await this.loadEvents();
  }

  async deleteEvent(id: string) {
    if (!confirm('Yakin mau hapus event ini? Semua kandidat dan transaksi ikut terhapus.')) return;
    this.deletingId.set(id);
    await this.supabase.deleteEvent(id);
    await this.loadEvents();
    this.deletingId.set(null);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  }
}

import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';
import { Event } from '../../../core/models/types';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './event-form.html',
  styleUrl: './event-form.scss'
})
export class EventForm implements OnInit {
  isEdit = false;
  eventId: string | null = null;
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal<string | null>(null);

  // Form fields
  name = '';
  category = '';
  slug = '';
  votingStart = '';
  votingEnd = '';
  gracePeriod = 180;
  isActive = false;

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id');
    this.isEdit = !!this.eventId;

    if (this.isEdit && this.eventId) {
      this.isLoading.set(true);
      const { data } = await this.supabase.getEventById(this.eventId);
      if (data) this.populateForm(data);
      this.isLoading.set(false);
    }
  }

  private populateForm(event: Event) {
    this.name = event.name;
    this.category = event.category ?? '';
    this.slug = event.slug ?? '';
    this.votingStart = this.toDatetimeLocal(event.voting_start);
    this.votingEnd = this.toDatetimeLocal(event.voting_end);
    this.gracePeriod = event.grace_period_seconds ?? 180;
    this.isActive = event.is_active;
  }

  private toDatetimeLocal(isoString: string): string {
    const date = new Date(isoString);
    const offset = date.getTimezoneOffset();
    const local = new Date(date.getTime() - offset * 60000);
    return local.toISOString().slice(0, 16);
  }

  generateSlug() {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  async onSubmit() {
    if (!this.name.trim() || !this.slug.trim() || !this.votingStart || !this.votingEnd) {
      this.errorMessage.set('Semua field wajib diisi');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const payload = {
      name: this.name.trim(),
      category: this.category.trim(),
      slug: this.slug.trim(),
      voting_start: new Date(this.votingStart).toISOString(),
      voting_end: new Date(this.votingEnd).toISOString(),
      grace_period_seconds: this.gracePeriod,
      is_active: this.isActive
    };

    if (this.isEdit && this.eventId) {
      const { error } = await this.supabase.updateEvent(this.eventId, payload);
      if (error) {
        this.errorMessage.set('Gagal update event');
        this.isSaving.set(false);
        return;
      }
    } else {
      const { error } = await this.supabase.createEvent(payload);
      if (error) {
        this.errorMessage.set('Gagal buat event — slug mungkin sudah dipakai');
        this.isSaving.set(false);
        return;
      }
    }

    this.router.navigate(['/admin/events']);
  }
}

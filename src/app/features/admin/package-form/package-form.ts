import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';
import { VotePackage } from '../../../core/models/types';

@Component({
  selector: 'app-package-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './package-form.html',
  styleUrl: './package-form.scss'
})
export class PackageForm implements OnInit {
  eventId = '';
  packageId: string | null = null;
  isEdit = false;
  isLoading = signal(false);
  isSaving = signal(false);
  errorMessage = signal<string | null>(null);

  // Form fields
  label = '';
  voteCount = 1;
  priceIdr = 0;
  isActive = true;

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id') ?? '';
    this.packageId = this.route.snapshot.paramMap.get('packageId');
    this.isEdit = !!this.packageId;

    if (this.isEdit && this.packageId) {
      this.isLoading.set(true);
      const { data } = await this.supabase.getPackageById(this.packageId);
      if (data) this.populateForm(data);
      this.isLoading.set(false);
    }
  }

  private populateForm(pkg: VotePackage) {
    this.label = pkg.label;
    this.voteCount = pkg.vote_count;
    this.priceIdr = pkg.price_idr;
    this.isActive = pkg.is_active ?? true;
  }

  get pricePerVote(): number {
    if (!this.voteCount) return 0;
    return Math.round(this.priceIdr / this.voteCount);
  }

  async onSubmit() {
    if (!this.label.trim() || !this.voteCount || !this.priceIdr) {
      this.errorMessage.set('Semua field wajib diisi');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    const payload = {
      label: this.label.trim(),
      vote_count: this.voteCount,
      price_idr: this.priceIdr,
      is_active: this.isActive,
      event_id: this.eventId
    };

    if (this.isEdit && this.packageId) {
      const { error } = await this.supabase.updatePackage(this.packageId, payload);
      if (error) {
        this.errorMessage.set('Gagal update paket');
        this.isSaving.set(false);
        return;
      }
    } else {
      const { error } = await this.supabase.createPackage(payload);
      if (error) {
        this.errorMessage.set('Gagal buat paket');
        this.isSaving.set(false);
        return;
      }
    }

    this.router.navigate(['/admin/events', this.eventId, 'packages']);
  }
}

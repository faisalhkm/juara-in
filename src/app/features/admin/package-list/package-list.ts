import { Component, OnInit, signal } from '@angular/core';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';
import { VotePackage, Event } from '../../../core/models/types';
import { formatRupiah } from '../../../core/utils/format';

@Component({
  selector: 'app-package-list',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './package-list.html',
  styleUrl: './package-list.scss'
})
export class PackageList implements OnInit {
  eventId = '';
  event = signal<Event | null>(null);
  packages = signal<VotePackage[]>([]);
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
      this.loadPackages()
    ]);
    this.isLoading.set(false);
  }

  private async loadEvent() {
    const { data } = await this.supabase.getEventById(this.eventId);
    this.event.set(data);
  }

  private async loadPackages() {
    const { data } = await this.supabase.getAdminPackagesByEvent(this.eventId);
    this.packages.set(data ?? []);
  }

  async togglePackageActive(pkg: VotePackage) {
    await this.supabase.updatePackage(pkg.id, { is_active: !pkg.is_active });
    await this.loadPackages();
  }

  async deletePackage(id: string) {
    if (!confirm('Yakin mau hapus paket ini?')) return;
    this.deletingId.set(id);
    await this.supabase.deletePackage(id);
    await this.loadPackages();
    this.deletingId.set(null);
  }

  formatRupiah(amount: number): string {
    return formatRupiah(amount);
  }
}

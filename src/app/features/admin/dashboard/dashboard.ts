import { Component, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';
import { formatRupiah } from '../../../core/utils/format';

interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  totalTransactions: number;
  totalIncome: number;
  totalVotes: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss'
})
export class Dashboard implements OnInit {
  stats = signal<DashboardStats>({
    totalEvents: 0,
    activeEvents: 0,
    totalTransactions: 0,
    totalIncome: 0,
    totalVotes: 0
  });
  isLoading = signal(true);

  constructor(private supabase: SupabaseService) {}

  async ngOnInit() {
    await this.loadStats();
  }

  private async loadStats() {
    const [events, transactions] = await Promise.all([
      this.supabase.getAdminEvents(),
      this.supabase.getSuccessTransactions()
    ]);

    const totalIncome = transactions.data?.reduce((sum, t) => sum + t.amount_idr, 0) ?? 0;
    const totalVotes = transactions.data?.reduce((sum, t) => sum + t.vote_count, 0) ?? 0;

    this.stats.set({
      totalEvents: events.data?.length ?? 0,
      activeEvents: events.data?.filter(e => e.is_active).length ?? 0,
      totalTransactions: transactions.data?.length ?? 0,
      totalIncome,
      totalVotes
    });

    this.isLoading.set(false);
  }

  formatRupiah(amount: number): string {
    return formatRupiah(amount);
  }
}

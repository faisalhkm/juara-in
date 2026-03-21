import {Component, Input, Output, EventEmitter, signal, output, effect, OnInit} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from '../../../core/services/supabase';
import { Candidate, VotePackage } from '../../../core/models/types';
import { formatRupiah } from '../../../core/utils/format';
import { environment } from '../../../../environments/environment';
import {AuthService} from '../../../core/services/auth';

declare const window: Window & {
  snap: {
    pay: (token: string, options: {
      onSuccess: (result: any) => void;
      onPending: (result: any) => void;
      onError: (result: any) => void;
      onClose: () => void;
    }) => void;
  }
};

type PaymentStep = 'package' | 'identity' | 'processing';

@Component({
  selector: 'app-payment',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './payment.html',
  styleUrl: './payment.scss'
})
export class Payment implements OnInit {
  @Input() candidate!: Candidate;
  @Input() eventId!: string;
  @Input() packages: VotePackage[] = [];
  @Input() preSelectedPackage: VotePackage | null = null;
  onClose = output<void>();
  onSuccess = output<void>();

  step = signal<PaymentStep>('package');
  selectedPackage = signal<VotePackage | null>(null);
  isGoogleLoading = signal(false);
  errorMessage = signal<string | null>(null);

  phone = '';

  constructor(
    private supabase: SupabaseService,
    protected auth: AuthService
  ) {}

  ngOnInit() {
    if (this.preSelectedPackage && this.auth.isLoggedIn) {
      this.selectedPackage.set(this.preSelectedPackage);
      this.step.set('processing');
      setTimeout(() => this.continueWithGoogle(), 300);
    }
  }

  selectPackage(pkg: VotePackage) {
    this.selectedPackage.set(pkg);
  }

  get isGoogleLoggedIn(): boolean {
    const user = this.auth.currentUser();
    if (!user) return false;
    return user.app_metadata?.['provider'] === 'google';
  }

  get googleUser() {
    return this.auth.currentUser();
  }

  goToIdentity() {
    if (!this.selectedPackage()) return;
    this.step.set('identity');
  }

  async loginGoogle() {
    const user = this.auth.currentUser();
    if (user && user.app_metadata?.['provider'] !== 'google') {
      if (!confirm('Login Google akan mengakhiri sesi admin kamu. Lanjutkan?')) {
        return;
      }
    }

    this.isGoogleLoading.set(true);
    // Simpan state voting sebelum redirect
    localStorage.setItem('juara_pending_vote', JSON.stringify({
      candidate: this.candidate,
      package: this.selectedPackage(),
      eventId: this.eventId
    }));

    await this.supabase.signInWithGoogle();
  }

  async continueAsAnonymous() {
    if (!this.phone.trim()) return;
    this.step.set('processing');
    await this.processPayment(null);
  }

  async continueWithGoogle() {
    const user = await this.supabase.getUser();
    if (!user) {
      await this.supabase.signOut();
      this.auth.currentUser.set(null);
      this.step.set('identity');
      return;
    }

    const fullName = user.user_metadata['full_name'] ??
      user.user_metadata['name'] ??
      user.email ??
      'Google User';

    if (!fullName || fullName === 'Google User') {
      await this.supabase.signOut();
      this.auth.currentUser.set(null);
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-')) localStorage.removeItem(key);
      });
      this.isGoogleLoading.set(false);
      this.step.set('identity');
      return;
    }

    this.step.set('processing');
    await this.processPayment({
      google_id: user.id,
      name: fullName,
      display_name: fullName,
      avatar_url: user.user_metadata['avatar_url'] ??
        user.user_metadata['picture'] ?? '',
    });
  }

  private async processPayment(googleData: {
    google_id: string;
    name: string;
    display_name: string;
    avatar_url: string;
  } | null) {
    const pkg = this.selectedPackage();
    if (!pkg) return;

    try {
      this.errorMessage.set(null);

      // 1. Upsert / create voter
      let voterId: string;
      if (googleData) {
        const { data, error } = await this.supabase.upsertVoter({
          ...googleData,
          phone: '',
          is_anonymous: false
        });
        console.log('upsertVoter result:', { data, error });
        if (error || !data) throw new Error('Gagal menyimpan data voter');
        voterId = data.id;
      } else {
        const { data, error } = await this.supabase.createAnonymousVoter({
          name: 'Anonymous',
          display_name: 'Anonymous',
          phone: this.phone,
          is_anonymous: true
        });
        console.log('createAnonymousVoter result:', { data, error });
        if (error || !data) throw new Error('Gagal menyimpan data voter');
        voterId = data.id;
      }

      // 2. Buat transaksi di DB
      const expiredAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const { data: trx, error: trxError } = await this.supabase.createTransaction({
        voter_id: voterId,
        candidate_id: this.candidate.id,
        package_id: pkg.id,
        vote_count: pkg.vote_count,
        amount_idr: pkg.price_idr,
        expired_at: expiredAt
      });
      if (trxError || !trx) throw new Error('Gagal membuat transaksi');

      // 3. Call Edge Function untuk dapat snap_token
      const { data: sessionData } = await this.supabase.getSession();
      const accessToken = sessionData.session?.access_token ?? environment.supabase.anonKey;

      const res = await fetch(
        `${this.supabase.supabaseUrl}/functions/v1/create-payment`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify({ transaction_id: trx.id })
        }
      );

      const { snap_token, error: fnError } = await res.json();
      if (fnError || !snap_token) throw new Error(fnError ?? 'Gagal mendapat token pembayaran');

      // 4. Trigger Midtrans Snap popup
      this.step.set('package');
      this.onClose.emit();

      window.snap.pay(snap_token, {
        onSuccess: (result) => {
          console.log('Payment success:', result);
          this.onSuccess.emit();
        },
        onPending: (result) => {
          console.log('Payment pending:', result);
        },
        onError: (result) => {
          console.error('Payment error:', result);
          this.errorMessage.set('Pembayaran gagal, silakan coba lagi');
        },
        onClose: () => {
          console.log('Snap closed without payment');
        }
      });

    } catch (err) {
      console.error('processPayment error:', err);
      this.errorMessage.set(err instanceof Error ? err.message : 'Terjadi kesalahan');
      this.step.set('identity');
    }
  }

  formatRupiah(amount: number): string {
    return formatRupiah(amount);
  }

  close() {
    this.onClose.emit();
  }
}

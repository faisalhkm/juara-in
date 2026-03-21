import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss'
})
export class Login {
  email = '';
  password = '';
  isLoading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(
    private supabase: SupabaseService,
    private router: Router
  ) {}

  async onSubmit() {
    if (!this.email.trim() || !this.password.trim()) return;

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const { error } = await this.supabase.signIn(this.email, this.password);

    if (error) {
      this.errorMessage.set('Email atau password salah');
      this.isLoading.set(false);
      return;
    }

    this.router.navigate(['/admin/dashboard']);
  }
}

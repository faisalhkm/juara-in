import { Injectable, signal } from '@angular/core';
import { User } from '@supabase/supabase-js';
import { SupabaseService } from './supabase';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  currentUser = signal<User | null>(null);
  isLoading = signal(true);

  constructor(private supabase: SupabaseService) {
    this.init();
  }

  private async init() {
    this.isLoading.set(true);
    const user = await this.supabase.getUser();
    this.currentUser.set(user);
    this.isLoading.set(false);

    this.supabase.onAuthStateChange((user) => {
      this.currentUser.set(user);
    });
  }

  get isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  async signOut() {
    await this.supabase.signOut();
    this.currentUser.set(null);
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-')) localStorage.removeItem(key);
    });
  }
}

import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { SupabaseService } from '../../../core/services/supabase';
import { Candidate } from '../../../core/models/types';

@Component({
  selector: 'app-candidate-form',
  standalone: true,
  imports: [FormsModule, RouterLink],
  templateUrl: './candidate-form.html',
  styleUrl: './candidate-form.scss'
})
export class CandidateForm implements OnInit {
  eventId = '';
  candidateId: string | null = null;
  isEdit = false;
  isLoading = signal(false);
  isSaving = signal(false);
  isUploadingPhoto = signal(false);
  errorMessage = signal<string | null>(null);

  // Form fields
  name = '';
  schoolOrTeam = '';
  candidateNumber = 1;
  photoUrl = '';
  photoFile: File | null = null;

  constructor(
    private supabase: SupabaseService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  async ngOnInit() {
    this.eventId = this.route.snapshot.paramMap.get('id') ?? '';
    this.candidateId = this.route.snapshot.paramMap.get('candidateId');
    this.isEdit = !!this.candidateId;

    if (this.isEdit && this.candidateId) {
      this.isLoading.set(true);
      const { data } = await this.supabase.getCandidateById(this.candidateId);
      if (data) this.populateForm(data);
      this.isLoading.set(false);
    }
  }

  private populateForm(candidate: Candidate) {
    this.name = candidate.name;
    this.schoolOrTeam = candidate.school_or_team;
    this.candidateNumber = candidate.candidate_number;
    this.photoUrl = candidate.photo_url ?? '';
  }

  async onPhotoSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];

    // Validasi 2MB
    if (file.size > 2 * 1024 * 1024) {
      this.errorMessage.set('Ukuran foto maksimal 2MB');
      return;
    }

    this.photoFile = file;
    this.errorMessage.set(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      this.photoUrl = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  private async uploadPhoto(): Promise<string | null> {
    if (!this.photoFile) return this.photoUrl;

    this.isUploadingPhoto.set(true);
    const fileName = `${Date.now()}-${this.photoFile.name.replace(/\s/g, '-')}`;

    const { data, error } = await this.supabase.uploadCandidatePhoto(
      fileName,
      this.photoFile
    );

    this.isUploadingPhoto.set(false);

    if (error || !data) return null;
    return this.supabase.getPhotoUrl(data.path);
  }

  async onSubmit() {
    if (!this.name.trim() || !this.schoolOrTeam.trim() || !this.candidateNumber) {
      this.errorMessage.set('Nama, sekolah/tim, dan nomor kandidat wajib diisi');
      return;
    }

    this.isSaving.set(true);
    this.errorMessage.set(null);

    // Upload foto kalau ada file baru
    let finalPhotoUrl = this.photoUrl;
    if (this.photoFile) {
      const uploaded = await this.uploadPhoto();
      if (!uploaded) {
        this.errorMessage.set('Gagal upload foto');
        this.isSaving.set(false);
        return;
      }
      finalPhotoUrl = uploaded;
    }

    const payload = {
      name: this.name.trim(),
      school_or_team: this.schoolOrTeam.trim(),
      candidate_number: this.candidateNumber,
      photo_url: finalPhotoUrl,
      event_id: this.eventId
    };

    if (this.isEdit && this.candidateId) {
      const { error } = await this.supabase.updateCandidate(this.candidateId, payload);
      if (error) {
        this.errorMessage.set('Gagal update kandidat');
        this.isSaving.set(false);
        return;
      }
    } else {
      const { error } = await this.supabase.createCandidate(payload);
      if (error) {
        this.errorMessage.set('Gagal tambah kandidat — nomor kandidat mungkin sudah dipakai');
        this.isSaving.set(false);
        return;
      }
    }

    this.router.navigate(['/admin/events', this.eventId, 'candidates']);
  }
}

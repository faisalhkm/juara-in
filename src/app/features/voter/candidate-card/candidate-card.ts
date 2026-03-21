import { Component, Input, output } from '@angular/core';
import { LeaderboardEntry } from '../../../core/models/types';
import { formatVotes } from '../../../core/utils/format';

@Component({
  selector: 'app-candidate-card',
  standalone: true,
  imports: [],
  templateUrl: './candidate-card.html',
  styleUrl: './candidate-card.scss'
})
export class CandidateCard {
  @Input() candidate!: LeaderboardEntry;
  @Input() rank!: number;
  @Input() maxVotes!: number;

  onVote = output<LeaderboardEntry>();

  get votePercent(): number {
    if (this.maxVotes === 0) return 0;
    return Math.round((this.candidate.total_votes / this.maxVotes) * 100);
  }

  get rankColor(): string {
    if (this.rank === 1) return 'var(--j-green)';
    if (this.rank === 2) return 'var(--j-blue)';
    if (this.rank === 3) return 'var(--j-purple)';
    return 'var(--j-text-muted)';
  }

  get rankBg(): string {
    if (this.rank === 1) return '#04342C';
    if (this.rank === 2) return '#042C53';
    if (this.rank === 3) return '#26215C';
    return '#0d0d1f';
  }

  get isTop3(): boolean {
    return this.rank <= 3;
  }

  formatVotes(votes: number): string {
    return formatVotes(votes);
  }
}

import { Component, Input, OnInit, OnDestroy, signal } from '@angular/core';

interface TimeLeft {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  isExpired: boolean;
}

@Component({
  selector: 'app-countdown-timer',
  standalone: true,
  imports: [],
  templateUrl: './countdown-timer.html',
  styleUrl: './countdown-timer.scss'
})
export class CountdownTimer implements OnInit, OnDestroy {
  @Input() targetDate!: string;

  timeLeft = signal<TimeLeft>({
    days: '00', hours: '00', minutes: '00', seconds: '00', isExpired: false
  });

  private interval?: ReturnType<typeof setInterval>;

  ngOnInit() {
    this.calculate();
    this.interval = setInterval(() => this.calculate(), 1000);
  }

  ngOnDestroy() {
    clearInterval(this.interval);
  }

  private calculate() {
    const diff = new Date(this.targetDate).getTime() - Date.now();
    if (diff <= 0) {
      this.timeLeft.set({ days: '00', hours: '00', minutes: '00', seconds: '00', isExpired: true });
      clearInterval(this.interval);
      return;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    this.timeLeft.set({
      days:    pad(Math.floor(diff / 86400000)),
      hours:   pad(Math.floor((diff % 86400000) / 3600000)),
      minutes: pad(Math.floor((diff % 3600000) / 60000)),
      seconds: pad(Math.floor((diff % 60000) / 1000)),
      isExpired: false
    });
  }
}

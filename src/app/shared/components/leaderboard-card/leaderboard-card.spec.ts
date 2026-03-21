import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LeaderboardCard } from './leaderboard-card';

describe('LeaderboardCard', () => {
  let component: LeaderboardCard;
  let fixture: ComponentFixture<LeaderboardCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LeaderboardCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LeaderboardCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

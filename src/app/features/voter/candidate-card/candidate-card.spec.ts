import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CandidateCard } from './candidate-card';

describe('CandidateCard', () => {
  let component: CandidateCard;
  let fixture: ComponentFixture<CandidateCard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CandidateCard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CandidateCard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

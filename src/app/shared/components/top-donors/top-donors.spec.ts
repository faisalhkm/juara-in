import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TopDonors } from './top-donors';

describe('TopDonors', () => {
  let component: TopDonors;
  let fixture: ComponentFixture<TopDonors>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TopDonors]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TopDonors);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

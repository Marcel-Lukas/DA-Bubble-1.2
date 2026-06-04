import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GoToEmailComponent } from './go-to-email.component';

describe('GoToEmailComponent', () => {
  let component: GoToEmailComponent;
  let fixture: ComponentFixture<GoToEmailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GoToEmailComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GoToEmailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

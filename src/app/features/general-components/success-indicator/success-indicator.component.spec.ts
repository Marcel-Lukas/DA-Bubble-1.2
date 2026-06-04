import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SuccessIndicatorComponent } from './success-indicator.component';

describe('SuccessIndicatorComponent', () => {
  let component: SuccessIndicatorComponent;
  let fixture: ComponentFixture<SuccessIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SuccessIndicatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SuccessIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

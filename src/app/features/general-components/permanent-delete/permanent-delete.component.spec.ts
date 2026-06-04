import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PermanentDeleteComponent } from './permanent-delete.component';

describe('PermanentDeleteComponent', () => {
  let component: PermanentDeleteComponent;
  let fixture: ComponentFixture<PermanentDeleteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PermanentDeleteComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PermanentDeleteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

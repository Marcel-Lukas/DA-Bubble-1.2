import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddNewMembersComponent } from './add-new-members.component';

describe('AddNewMembersComponent', () => {
  let component: AddNewMembersComponent;
  let fixture: ComponentFixture<AddNewMembersComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddNewMembersComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddNewMembersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

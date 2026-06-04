import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChannelLeaveComponent } from './channel-leave.component';

describe('ChannelLeaveComponent', () => {
  let component: ChannelLeaveComponent;
  let fixture: ComponentFixture<ChannelLeaveComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChannelLeaveComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ChannelLeaveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

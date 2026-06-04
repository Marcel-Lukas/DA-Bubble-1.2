import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SearchInformationComponent } from './search-information.component';

describe('SearchInformationComponent', () => {
  let component: SearchInformationComponent;
  let fixture: ComponentFixture<SearchInformationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchInformationComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SearchInformationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

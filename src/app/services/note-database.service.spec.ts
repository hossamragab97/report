import { TestBed } from '@angular/core/testing';

import { NoteDatabaseService } from './note-database.service';

describe('NoteDatabaseService', () => {
  let service: NoteDatabaseService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NoteDatabaseService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});

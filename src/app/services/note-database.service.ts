import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { interval } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { db, Note } from './note-database';
import { ApiService } from '../../../public/network/api.service';

@Injectable({
  providedIn: 'root'
})
export class NoteTrackerService {
  private apiUrl = 'https://your-api.com/endpoint'; // Change to your actual API

  constructor(private http: HttpClient, private apiService: ApiService) {
    this.startTracking();
  }

  private startTracking(): void {
    // Call immediately and then every 10 minutes
    this.fetchAndSave();

    interval(15 * 60 * 1000).subscribe(() => {
      this.fetchAndSave();
    });
  }

  private fetchAndSave(): void {
    this.apiService.getAllTriggersDevices().subscribe((data: any) => {
      let allTriggers_id: any
      this.getAllNotes().then(notes => {
        allTriggers_id = notes.map((t: any) => t.trigger_id)
        let triggers = data.triggers
        triggers.forEach((item: any, index: number) => {
          if (item.note && item.note.trim() !== '' && !allTriggers_id.includes(item.trigger_id)) {
            const note: Note = {
              value: Number(item.value),
              note: item.note,
              time: new Date(Date.now() + (index + 1) * 1000 * 60).toISOString(), // +10s, +20s, ...
              channelId_field: item.channel_id + ' ' + item.trigger_field.split(' ')[0],
              trigger_id: item.trigger_id ,
              created_at : item.created_at
            };
            db.notes.add(note);
          }
        });
      });
    });
  }

  // Optional: Read saved notes
  getAllNotes(): Promise<Note[]> {
    return db.notes.toArray();
  }

  // Optional: Clear all notes
  clearAll(): Promise<void> {
    return db.notes.clear();
  }

}

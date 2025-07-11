import Dexie, { Table } from 'dexie';

export interface Note {
  id?: number;
  value: number;
  note: string;
  time: string;
  created_at: string;
  channelId_field: string;
  trigger_id : string
}

export class NoteDatabase extends Dexie {
  notes!: Table<Note, number>;

  constructor() {
    super('NoteDatabase');
    this.version(1).stores({
      notes: '++id, value, note, time' 
    });
  }
}

export const db = new NoteDatabase();

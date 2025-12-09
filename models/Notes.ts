import mongoose, { Schema, Document } from 'mongoose';
import { Notes } from '../types';

const NotesSchema: Schema = new Schema({
  date: { type: Date, required: true },
  notes: { type: String, default: '' },
  location: { type: String, required: true }, 
  createdAt: { type: Date, default: Date.now },
},{
    timestamps: true
});

export interface INotes extends Notes, Document {}

const NotesModel = mongoose.models.Notes || mongoose.model<INotes>('Notes', NotesSchema); 

export default NotesModel;

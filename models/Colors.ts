import mongoose, { Schema, Document } from 'mongoose';
import { Colors } from '../types';

const ColorSchema: Schema = new Schema({
  location: { type: String, required: true },
  date: { type: Date, required: true },
  color: { type: String, required : true},
  createdAt: { type: Date, default: Date.now },
},{
    timestamps: true
});

export interface IColors extends Colors, Document {}

const ColorsModel = mongoose.models.Colors || mongoose.model<IColors>('Colors', ColorSchema); 

export default ColorsModel;

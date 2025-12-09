import {create} from "zustand";

interface TimeSlotStore {
  timeSlots: string[]; // You can change this type based on your actual time slots structure.
  setTimeSlots: (slots: string[]) => void;
}

export const useTimeSlotStore = create<TimeSlotStore>((set) => ({
  timeSlots: [],
  setTimeSlots: (slots: string[]) => set({ timeSlots: slots }),
}));

"use client";
import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/superadmin/SuperAdminLayout';
import DataTable from '@/components/superadmin/DataTable';
import Modal from '@/components/superadmin/Modal';
import FormField from '@/components/superadmin/FormField';
import { sectionsApi, locationsApi, Section, Location } from '@/services/api';
import toast from 'react-hot-toast';
import { Plus, Clock, Trash2, Edit } from 'lucide-react';
import api from '@/services/api';

interface TimeSlot {
  time: string;
  date: string; // "00:00:00" for default, or "YYYY-MM-DD" for override
}

interface DaySchedule {
  [day: string]: TimeSlot[];
}

interface SectionSchedule {
  _id?: string;
  sectionId: string;
  location: string;
  schedule: {
    Luni: TimeSlot[];
    Marți: TimeSlot[];
    Miercuri: TimeSlot[];
    Joi: TimeSlot[];
    Vineri: TimeSlot[];
    Sâmbătă: TimeSlot[];
    Duminica: TimeSlot[];
  };
  slotInterval?: number;
}

export default function SectionSchedulesPage() {
  const [schedules, setSchedules] = useState<SectionSchedule[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<SectionSchedule | null>(null);
  const [formData, setFormData] = useState({
    sectionId: '',
    location: '',
    slotInterval: 15,
    schedule: {
      Luni: [] as TimeSlot[],
      Marți: [] as TimeSlot[],
      Miercuri: [] as TimeSlot[],
      Joi: [] as TimeSlot[],
      Vineri: [] as TimeSlot[],
      Sâmbătă: [] as TimeSlot[],
      Duminica: [] as TimeSlot[],
    },
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedDay, setSelectedDay] = useState<string>('Luni');
  const [timeRangeModalOpen, setTimeRangeModalOpen] = useState(false);
  const [timeRangeData, setTimeRangeData] = useState({
    startTime: '',
    endTime: '',
    date: '00:00:00', // Default weekly schedule
  });

  const daysOfWeek = ['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminica'];

  useEffect(() => {
    fetchSchedules();
    fetchSections();
    fetchLocations();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await api.get('/section-schedules');
      setSchedules(response.data.data || []);
    } catch (error) {
      console.error('Error fetching section schedules:', error);
      toast.error('Failed to load section schedules');
    } finally {
      setLoading(false);
    }
  };

  const fetchSections = async () => {
    try {
      const response = await sectionsApi.getAll();
      setSections(response.data.data);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Failed to load sections');
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await locationsApi.getAll();
      setLocations(response.data.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Failed to load locations');
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.sectionId) {
      errors.sectionId = 'Section is required';
    }

    if (!formData.location) {
      errors.location = 'Location is required';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      if (editingSchedule) {
        // Update existing schedule
        await api.patch(`/section-schedules?id=${editingSchedule._id}`, formData);
        toast.success('Section schedule updated successfully');
      } else {
        // Create new schedule
        await api.post('/section-schedules', formData);
        toast.success('Section schedule created successfully');
      }

      setModalOpen(false);
      resetForm();
      fetchSchedules();
    } catch (error: any) {
      console.error('Error saving section schedule:', error);
      toast.error(error.response?.data?.message || 'Failed to save section schedule');
    }
  };

  const handleEdit = (schedule: SectionSchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      sectionId: schedule.sectionId,
      location: schedule.location,
      slotInterval: schedule.slotInterval || 15,
      schedule: schedule.schedule,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    try {
      await api.delete('/section-schedules', {
        data: { id },
      });
      toast.success('Section schedule deleted successfully');
      fetchSchedules();
    } catch (error) {
      console.error('Error deleting section schedule:', error);
      toast.error('Failed to delete section schedule');
    }
  };

  const resetForm = () => {
    setFormData({
      sectionId: '',
      location: '',
      slotInterval: 15,
      schedule: {
        Luni: [],
        Marți: [],
        Miercuri: [],
        Joi: [],
        Vineri: [],
        Sâmbătă: [],
        Duminica: [],
      },
    });
    setEditingSchedule(null);
    setFormErrors({});
  };

  const generateTimeSlots = (startTime: string, endTime: string, interval: number): string[] => {
    const slots: string[] = [];
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);

    const startTotalMinutes = startHour * 60 + startMin;
    const endTotalMinutes = endHour * 60 + endMin;

    for (let minutes = startTotalMinutes; minutes <= endTotalMinutes; minutes += interval) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      slots.push(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
    }

    return slots;
  };

  const handleAddTimeRange = () => {
    if (!timeRangeData.startTime || !timeRangeData.endTime) {
      toast.error('Please provide both start and end times');
      return;
    }

    const slots = generateTimeSlots(
      timeRangeData.startTime,
      timeRangeData.endTime,
      formData.slotInterval
    );

    const newSlots: TimeSlot[] = slots.map((time) => ({
      time,
      date: timeRangeData.date,
    }));

    // Check for duplicates
    const existingTimes = formData.schedule[selectedDay as keyof typeof formData.schedule].map(
      (s) => s.time
    );
    const duplicates = newSlots.filter((s) => existingTimes.includes(s.time));

    if (duplicates.length > 0) {
      toast.error(`Some time slots already exist: ${duplicates.map((d) => d.time).join(', ')}`);
      return;
    }

    setFormData({
      ...formData,
      schedule: {
        ...formData.schedule,
        [selectedDay]: [
          ...formData.schedule[selectedDay as keyof typeof formData.schedule],
          ...newSlots,
        ].sort((a, b) => a.time.localeCompare(b.time)),
      },
    });

    setTimeRangeModalOpen(false);
    setTimeRangeData({ startTime: '', endTime: '', date: '00:00:00' });
    toast.success(`Added ${slots.length} time slots for ${selectedDay}`);
  };

  const handleRemoveTimeSlot = (day: string, index: number) => {
    const daySchedule = formData.schedule[day as keyof typeof formData.schedule];
    const updatedSchedule = daySchedule.filter((_, i) => i !== index);

    setFormData({
      ...formData,
      schedule: {
        ...formData.schedule,
        [day]: updatedSchedule,
      },
    });
  };

  const columns = [
    {
      key: 'section',
      label: 'Section',
      render: (value: any, schedule: SectionSchedule) => {
        const section = sections.find((s) => s._id === schedule.sectionId);
        return section?.name || 'Unknown';
      },
    },
    {
      key: 'location',
      label: 'Location',
    },
    {
      key: 'slotInterval',
      label: 'Slot Interval',
      render: (value: any, schedule: SectionSchedule) => `${schedule.slotInterval || 15} minutes`,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (value: any, schedule: SectionSchedule) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleEdit(schedule)}
            className="text-blue-600 hover:text-blue-800"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => schedule._id && handleDelete(schedule._id)}
            className="text-red-600 hover:text-red-800"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <SuperAdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Section Schedules Management</h1>
          <button
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
          >
            <Plus size={20} />
            Add Section Schedule
          </button>
        </div>

        <DataTable
          data={schedules}
          columns={columns}
          loading={loading}
          emptyMessage="No section schedules found"
        />

        {/* Create/Edit Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            resetForm();
          }}
          title={editingSchedule ? 'Edit Section Schedule' : 'Create Section Schedule'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Section"
              name="sectionId"
              type="select"
              value={formData.sectionId}
              onChange={(value) =>
                setFormData({ ...formData, sectionId: value })
              }
              error={formErrors.sectionId}
              required
              options={[
                { value: '', label: 'Select Section' },
                ...sections.map((section) => ({
                  value: section._id,
                  label: section.name
                }))
              ]}
            />

            <FormField
              label="Location"
              name="location"
              type="select"
              value={formData.location}
              onChange={(value) =>
                setFormData({ ...formData, location: value })
              }
              error={formErrors.location}
              required
              options={[
                { value: '', label: 'Select Location' },
                ...locations.map((location) => ({
                  value: location.name,
                  label: location.name
                }))
              ]}
            />

            <FormField
              label="Slot Interval (minutes)"
              name="slotInterval"
              type="text"
              value={formData.slotInterval.toString()}
              onChange={(value) =>
                setFormData({
                  ...formData,
                  slotInterval: parseInt(value) || 15,
                })
              }
            />

            {/* Day Selection */}
            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-2">Select Day</label>
              <div className="flex gap-2 flex-wrap">
                {daysOfWeek.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1 rounded ${
                      selectedDay === day
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 hover:bg-gray-300'
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            {/* Time Range Addition */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">
                  Time Slots for {selectedDay}
                </label>
                <button
                  type="button"
                  onClick={() => setTimeRangeModalOpen(true)}
                  className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Plus size={16} />
                  Add Time Range
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border rounded p-2">
                {formData.schedule[selectedDay as keyof typeof formData.schedule].length === 0 ? (
                  <p className="text-gray-500 text-sm">No time slots added</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.schedule[
                      selectedDay as keyof typeof formData.schedule
                    ].map((slot, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded"
                      >
                        <span className="text-sm">{slot.time}</span>
                        <span className="text-xs text-gray-500">
                          ({slot.date === '00:00:00' ? 'Default' : slot.date})
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveTimeSlot(selectedDay, index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {editingSchedule ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </Modal>

        {/* Time Range Modal */}
        <Modal
          isOpen={timeRangeModalOpen}
          onClose={() => {
            setTimeRangeModalOpen(false);
            setTimeRangeData({ startTime: '', endTime: '', date: '00:00:00' });
          }}
          title={`Add Time Range for ${selectedDay}`}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Start Time</label>
              <input
                type="time"
                value={timeRangeData.startTime}
                onChange={(e) =>
                  setTimeRangeData({ ...timeRangeData, startTime: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">End Time</label>
              <input
                type="time"
                value={timeRangeData.endTime}
                onChange={(e) =>
                  setTimeRangeData({ ...timeRangeData, endTime: e.target.value })
                }
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Date Type</label>
              <select
                value={timeRangeData.date}
                onChange={(e) =>
                  setTimeRangeData({ ...timeRangeData, date: e.target.value })
                }
                className="w-full p-2 border rounded"
              >
                <option value="00:00:00">Default Weekly Schedule</option>
                <option value={new Date().toISOString().split('T')[0]}>
                  Specific Date Override
                </option>
              </select>
              {timeRangeData.date !== '00:00:00' && (
                <input
                  type="date"
                  value={timeRangeData.date}
                  onChange={(e) =>
                    setTimeRangeData({ ...timeRangeData, date: e.target.value })
                  }
                  className="w-full p-2 border rounded mt-2"
                />
              )}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAddTimeRange}
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Time Slots
              </button>
              <button
                type="button"
                onClick={() => {
                  setTimeRangeModalOpen(false);
                  setTimeRangeData({ startTime: '', endTime: '', date: '00:00:00' });
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}


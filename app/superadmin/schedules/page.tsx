"use client";
import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/superadmin/SuperAdminLayout';
import DataTable from '@/components/superadmin/DataTable';
import Modal from '@/components/superadmin/Modal';
import FormField from '@/components/superadmin/FormField';
import { 
  activitySchedulesApi, 
  usersApi, 
  sectionsApi, 
  ActivitySchedule, 
  User, 
  Section,
  DailySchedule,
  TimeSlot 
} from '@/services/api';
import toast from 'react-hot-toast';
import { Plus, Clock } from 'lucide-react';

export default function SchedulesPage() {
  const [schedules, setSchedules] = useState<ActivitySchedule[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<ActivitySchedule | null>(null);
  const [formData, setFormData] = useState({
    userId: '',
    sectionId: '',
    isActive: true,
    schedule: [] as DailySchedule[]
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  useEffect(() => {
    fetchSchedules();
    fetchUsers();
    fetchSections();
  }, []);

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const response = await activitySchedulesApi.getAll();
      setSchedules(response.data.data);
    } catch (error) {
      console.error('Error fetching schedules:', error);
      toast.error('Failed to load activity schedules');
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await usersApi.getAll();
      setUsers(response.data.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
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

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.userId) {
      errors.userId = 'User is required';
    }

    if (!formData.sectionId) {
      errors.sectionId = 'Section is required';
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
        await activitySchedulesApi.update(editingSchedule._id, formData);
        toast.success('Activity schedule updated successfully');
      } else {
        await activitySchedulesApi.create(formData);
        toast.success('Activity schedule created successfully');
      }

      setModalOpen(false);
      setEditingSchedule(null);
      resetForm();
      fetchSchedules();
    } catch (error: any) {
      console.error('Error saving schedule:', error);
      toast.error(error.response?.data?.error || 'Failed to save activity schedule');
    }
  };

  const handleEdit = (schedule: ActivitySchedule) => {
    setEditingSchedule(schedule);
    setFormData({
      userId: schedule.userId,
      sectionId: schedule.sectionId,
      isActive: schedule.isActive,
      schedule: schedule.schedule
    });
    setModalOpen(true);
  };

  const handleDelete = async (schedule: ActivitySchedule) => {
    const user = users.find(u => u._id === schedule.userId);
    const section = sections.find(s => s._id === schedule.sectionId);
    
    if (!confirm(`Are you sure you want to delete the activity schedule for "${user?.username}" in "${section?.name}"?`)) {
      return;
    }

    try {
      await activitySchedulesApi.delete(schedule._id);
      toast.success('Activity schedule deleted successfully');
      fetchSchedules();
    } catch (error: any) {
      console.error('Error deleting schedule:', error);
      toast.error(error.response?.data?.error || 'Failed to delete activity schedule');
    }
  };

  const handleAddNew = () => {
    setEditingSchedule(null);
    resetForm();
    setModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      userId: '',
      sectionId: '',
      isActive: true,
      schedule: []
    });
    setFormErrors({});
  };

  const getUserOptions = () => {
    return users.map(user => ({
      value: user._id,
      label: user.username
    }));
  };

  const getSectionOptions = () => {
    return sections.map(section => ({
      value: section._id,
      label: section.name
    }));
  };

  const addTimeSlot = (dayIndex: number) => {
    const newSchedule = [...formData.schedule];
    if (!newSchedule[dayIndex]) {
      newSchedule[dayIndex] = {
        day: daysOfWeek[dayIndex],
        timeSlots: [],
        isWorkingDay: true
      };
    }
    newSchedule[dayIndex].timeSlots.push({
      startTime: '09:00',
      endTime: '17:00',
      isAvailable: true
    });
    setFormData({ ...formData, schedule: newSchedule });
  };

  const removeTimeSlot = (dayIndex: number, slotIndex: number) => {
    const newSchedule = [...formData.schedule];
    if (newSchedule[dayIndex]) {
      newSchedule[dayIndex].timeSlots.splice(slotIndex, 1);
      setFormData({ ...formData, schedule: newSchedule });
    }
  };

  const updateTimeSlot = (dayIndex: number, slotIndex: number, field: keyof TimeSlot, value: string | boolean) => {
    const newSchedule = [...formData.schedule];
    if (newSchedule[dayIndex] && newSchedule[dayIndex].timeSlots[slotIndex]) {
      (newSchedule[dayIndex].timeSlots[slotIndex] as any)[field] = value;
      setFormData({ ...formData, schedule: newSchedule });
    }
  };

  const toggleWorkingDay = (dayIndex: number) => {
    const newSchedule = [...formData.schedule];
    if (!newSchedule[dayIndex]) {
      newSchedule[dayIndex] = {
        day: daysOfWeek[dayIndex],
        timeSlots: [],
        isWorkingDay: true
      };
    }
    newSchedule[dayIndex].isWorkingDay = !newSchedule[dayIndex].isWorkingDay;
    setFormData({ ...formData, schedule: newSchedule });
  };

  const columns = [
    {
      key: 'user',
      label: 'User',
      sortable: false,
      render: (value: any, row: ActivitySchedule) => {
        const user = users.find(u => u._id === row.userId);
        return user ? user.username : 'Unknown User';
      }
    },
    {
      key: 'section',
      label: 'Section',
      sortable: false,
      render: (value: any, row: ActivitySchedule) => {
        const section = sections.find(s => s._id === row.sectionId);
        return section ? section.name : 'Unknown Section';
      }
    },
    {
      key: 'schedule',
      label: 'Schedule',
      sortable: false,
      render: (value: DailySchedule[]) => {
        const workingDays = value.filter(day => day.isWorkingDay);
        return (
          <div className="flex items-center">
            <Clock className="h-4 w-4 mr-1 text-gray-400" />
            <span className="text-sm text-gray-600">
              {workingDays.length} day{workingDays.length !== 1 ? 's' : ''}
            </span>
          </div>
        );
      }
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      render: (value: boolean) => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
          value 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString()
    }
  ];

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Activity Schedules</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage user activity schedules for different sections
            </p>
          </div>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Schedule
          </button>
        </div>

        {/* Data Table */}
        <DataTable
          data={schedules}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          emptyMessage="No activity schedules found. Create your first schedule to get started."
        />

        {/* Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingSchedule ? 'Edit Activity Schedule' : 'Add New Activity Schedule'}
          size="xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="User"
                name="userId"
                type="select"
                value={formData.userId}
                onChange={(value) => setFormData({ ...formData, userId: value })}
                error={formErrors.userId}
                required
                options={getUserOptions()}
              />

              <FormField
                label="Section"
                name="sectionId"
                type="select"
                value={formData.sectionId}
                onChange={(value) => setFormData({ ...formData, sectionId: value })}
                error={formErrors.sectionId}
                required
                options={getSectionOptions()}
              />
            </div>

            <FormField
              label="Active"
              name="isActive"
              type="checkbox"
              value={formData.isActive}
              onChange={(value) => setFormData({ ...formData, isActive: value })}
            />

            {/* Weekly Schedule */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Weekly Schedule</h3>
              <div className="space-y-4">
                {daysOfWeek.map((day, dayIndex) => (
                  <div key={day} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.schedule[dayIndex]?.isWorkingDay || false}
                          onChange={() => toggleWorkingDay(dayIndex)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-900">
                          {day}
                        </label>
                      </div>
                      {formData.schedule[dayIndex]?.isWorkingDay && (
                        <button
                          type="button"
                          onClick={() => addTimeSlot(dayIndex)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          + Add Time Slot
                        </button>
                      )}
                    </div>

                    {formData.schedule[dayIndex]?.isWorkingDay && (
                      <div className="space-y-2">
                        {formData.schedule[dayIndex].timeSlots.map((slot, slotIndex) => (
                          <div key={slotIndex} className="flex items-center space-x-2">
                            <input
                              type="time"
                              value={slot.startTime}
                              onChange={(e) => updateTimeSlot(dayIndex, slotIndex, 'startTime', e.target.value)}
                              className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            <span className="text-gray-500">to</span>
                            <input
                              type="time"
                              value={slot.endTime}
                              onChange={(e) => updateTimeSlot(dayIndex, slotIndex, 'endTime', e.target.value)}
                              className="block w-32 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                            />
                            <input
                              type="checkbox"
                              checked={slot.isAvailable}
                              onChange={(e) => updateTimeSlot(dayIndex, slotIndex, 'isAvailable', e.target.checked)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="text-sm text-gray-700">Available</label>
                            <button
                              type="button"
                              onClick={() => removeTimeSlot(dayIndex, slotIndex)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {editingSchedule ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}

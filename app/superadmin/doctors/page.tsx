"use client";
import { useEffect, useState } from 'react';
import SuperAdminLayout from '@/components/superadmin/SuperAdminLayout';
import DataTable from '@/components/superadmin/DataTable';
import Modal from '@/components/superadmin/Modal';
import FormField from '@/components/superadmin/FormField';
import { doctorsApi, sectionsApi, Doctor, Section } from '@/services/api';
import toast from 'react-hot-toast';
import { Plus, Clock } from 'lucide-react';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    specialization: '',
    sectionId: '',
    isActive: true,
    schedule: [] as any[]
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const daysOfWeek = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
  ];

  useEffect(() => {
    fetchDoctors();
    fetchSections();
  }, []);

  const fetchDoctors = async () => {
    try {
      setLoading(true);
      const response = await doctorsApi.getAll();
      setDoctors(response.data.data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Failed to load doctors');
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

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Doctor name is required';
    }

    if (!formData.sectionId) {
      errors.sectionId = 'Section is required';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Email is invalid';
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
      if (editingDoctor) {
        await doctorsApi.update(editingDoctor._id, formData);
        toast.success('Doctor updated successfully');
      } else {
        await doctorsApi.create(formData);
        toast.success('Doctor created successfully');
      }

      setModalOpen(false);
      setEditingDoctor(null);
      resetForm();
      fetchDoctors();
    } catch (error: any) {
      console.error('Error saving doctor:', error);
      toast.error(error.response?.data?.error || 'Failed to save doctor');
    }
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    const sectionIdValue = typeof doctor.sectionId === 'string' 
      ? doctor.sectionId 
      : doctor.sectionId?._id || '';
    setFormData({
      name: doctor.name,
      email: doctor.email || '',
      phone: doctor.phone || '',
      specialization: doctor.specialization || '',
      sectionId: sectionIdValue,
      isActive: doctor.isActive,
      schedule: doctor.schedule
    });
    setModalOpen(true);
  };

  const handleDelete = async (doctor: Doctor) => {
    if (!confirm(`Are you sure you want to delete doctor "${doctor.name}"?`)) {
      return;
    }

    try {
      await doctorsApi.delete(doctor._id);
      toast.success('Doctor deleted successfully');
      fetchDoctors();
    } catch (error: any) {
      console.error('Error deleting doctor:', error);
      toast.error(error.response?.data?.error || 'Failed to delete doctor');
    }
  };

  const handleAddNew = () => {
    setEditingDoctor(null);
    resetForm();
    setModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      specialization: '',
      sectionId: '',
      isActive: true,
      schedule: []
    });
    setFormErrors({});
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

  const updateTimeSlot = (dayIndex: number, slotIndex: number, field: string, value: any) => {
    const newSchedule = [...formData.schedule];
    if (newSchedule[dayIndex] && newSchedule[dayIndex].timeSlots[slotIndex]) {
      newSchedule[dayIndex].timeSlots[slotIndex][field] = value;
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
      key: 'name',
      label: 'Doctor Name',
      sortable: true
    },
    {
      key: 'section',
      label: 'Section',
      sortable: false,
      render: (value: any, row: Doctor) => {
        if (typeof row.sectionId === 'object' && row.sectionId?.name) {
          return row.sectionId.name;
        }
        return 'Unknown Section';
      }
    },
    {
      key: 'specialization',
      label: 'Specialization',
      sortable: true,
      render: (value: string) => value || '-'
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (value: string) => value || '-'
    },
    {
      key: 'schedule',
      label: 'Schedule',
      sortable: false,
      render: (value: any[]) => {
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
            <h1 className="text-2xl font-bold text-gray-900">Doctors</h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage doctors and their schedules
            </p>
          </div>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Doctor
          </button>
        </div>

        {/* Data Table */}
        <DataTable
          data={doctors}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          emptyMessage="No doctors found. Create your first doctor to get started."
        />

        {/* Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
          size="xl"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Doctor Name"
                name="name"
                type="text"
                value={formData.name}
                onChange={(value) => setFormData({ ...formData, name: value })}
                error={formErrors.name}
                required
                placeholder="Enter doctor name"
              />

              <FormField
                label="Specialization"
                name="specialization"
                type="text"
                value={formData.specialization}
                onChange={(value) => setFormData({ ...formData, specialization: value })}
                error={formErrors.specialization}
                placeholder="Enter specialization"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={(value) => setFormData({ ...formData, email: value })}
                error={formErrors.email}
                placeholder="Enter email"
              />

              <FormField
                label="Phone"
                name="phone"
                type="text"
                value={formData.phone}
                onChange={(value) => setFormData({ ...formData, phone: value })}
                error={formErrors.phone}
                placeholder="Enter phone number"
              />
            </div>

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
                        {formData.schedule[dayIndex].timeSlots.map((slot: any, slotIndex: number) => (
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
                {editingDoctor ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}

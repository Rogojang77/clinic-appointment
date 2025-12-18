"use client";
import { useEffect, useState, useCallback } from 'react';
import SuperAdminLayout from '@/components/superadmin/SuperAdminLayout';
import DataTable from '@/components/superadmin/DataTable';
import Modal from '@/components/superadmin/Modal';
import FormField from '@/components/superadmin/FormField';
import { doctorsApi, sectionsApi, locationsApi, Doctor, Section, Location } from '@/services/api';
import toast from 'react-hot-toast';
import { Plus } from 'lucide-react';

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    sectionId: '',
    locationIds: [] as string[]
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const response = await doctorsApi.getAll();
      setDoctors(response.data.data);
    } catch (error) {
      console.error('Error fetching doctors:', error);
      toast.error('Nu s-au putut încărca medicii');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchSections = useCallback(async () => {
    try {
      const response = await sectionsApi.getAll();
      setSections(response.data.data);
    } catch (error) {
      console.error('Error fetching sections:', error);
      toast.error('Nu s-au putut încărca secțiile');
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const response = await locationsApi.getAll();
      setLocations(response.data.data);
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Nu s-au putut încărca locațiile');
    }
  }, []);

  useEffect(() => {
    fetchDoctors();
    fetchSections();
    fetchLocations();
  }, [fetchDoctors, fetchSections, fetchLocations]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Numele medicului este obligatoriu';
    }

    if (!formData.sectionId) {
      errors.sectionId = 'Secția este obligatorie';
    }

    if (!formData.locationIds || formData.locationIds.length === 0) {
      errors.locationIds = 'Cel puțin o locație este obligatorie';
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
        toast.success('Medicul a fost actualizat cu succes');
      } else {
        await doctorsApi.create(formData);
        toast.success('Medicul a fost creat cu succes');
      }

      setModalOpen(false);
      setEditingDoctor(null);
      resetForm();
      fetchDoctors();
    } catch (error: any) {
      console.error('Error saving doctor:', error);
      toast.error(error.response?.data?.error || 'Nu s-a putut salva medicul');
    }
  };

  const handleEdit = (doctor: Doctor) => {
    setEditingDoctor(doctor);
    const sectionIdValue = typeof doctor.sectionId === 'string' 
      ? doctor.sectionId 
      : doctor.sectionId?._id || '';
    
    // Handle both locationId (single) and locationIds (array) for backward compatibility
    let locationIdsValue: string[] = [];
    if ((doctor as any).locationIds && Array.isArray((doctor as any).locationIds)) {
      locationIdsValue = (doctor as any).locationIds.map((loc: any) => 
        typeof loc === 'string' ? loc : loc._id || loc
      );
    } else if ((doctor as any).locationId) {
      const locId = (doctor as any).locationId;
      locationIdsValue = [typeof locId === 'string' ? locId : locId._id || ''];
    }
    
    setFormData({
      name: doctor.name,
      sectionId: sectionIdValue,
      locationIds: locationIdsValue
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
      toast.error(error.response?.data?.error || 'Nu s-a putut șterge medicul');
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
      sectionId: '',
      locationIds: []
    });
    setFormErrors({});
  };

  const getSectionOptions = () => {
    return sections.map(section => ({
      value: section._id,
      label: section.name
    }));
  };

  const handleLocationToggle = (locationId: string) => {
    setFormData(prev => {
      const currentIds = prev.locationIds || [];
      const newIds = currentIds.includes(locationId)
        ? currentIds.filter(id => id !== locationId)
        : [...currentIds, locationId];
      return { ...prev, locationIds: newIds };
    });
    // Clear error when user selects a location
    if (formErrors.locationIds) {
      setFormErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.locationIds;
        return newErrors;
      });
    }
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
      key: 'locations',
      label: 'Locations',
      sortable: false,
      render: (value: any, row: Doctor) => {
        const locationIds = (row as any).locationIds || ((row as any).locationId ? [(row as any).locationId] : []);
        const locationNames = locationIds
          .map((locId: any) => {
            const loc = typeof locId === 'object' && locId?.name 
              ? locId.name 
              : locations.find(l => l._id === (typeof locId === 'string' ? locId : locId._id))?.name;
            return loc;
          })
          .filter(Boolean);
        return locationNames.length > 0 ? locationNames.join(', ') : '-';
      }
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
            <h1 className="text-2xl font-bold text-gray-900">Medici</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestionează medicii și programările lor
            </p>
          </div>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adaugă Medic
          </button>
        </div>

        {/* Data Table */}
        <DataTable
          data={doctors}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          emptyMessage="Nu s-au găsit medici. Creează primul medic pentru a începe."
        />

        {/* Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingDoctor ? 'Editează Medic' : 'Adaugă Medic Nou'}
          size="md"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <FormField
              label="Nume Medic"
              name="name"
              type="text"
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              error={formErrors.name}
              required
              placeholder="Introdu numele medicului"
            />

            <FormField
              label="Secție"
              name="sectionId"
              type="select"
              value={formData.sectionId}
              onChange={(value) => setFormData({ ...formData, sectionId: value })}
              error={formErrors.sectionId}
              required
              options={getSectionOptions()}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Locații <span className="text-red-500">*</span>
              </label>
              <div className="space-y-2">
                {locations.map((location) => (
                  <div key={location._id} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`location-${location._id}`}
                      checked={formData.locationIds.includes(location._id)}
                      onChange={() => handleLocationToggle(location._id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor={`location-${location._id}`}
                      className="ml-2 text-sm text-gray-700 cursor-pointer"
                    >
                      {location.name}
                    </label>
                  </div>
                ))}
              </div>
              {formErrors.locationIds && (
                <p className="mt-1 text-sm text-red-600">{formErrors.locationIds}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Anulează
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {editingDoctor ? 'Actualizează' : 'Creează'}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}

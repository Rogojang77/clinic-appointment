"use client";
import { useEffect, useState, useCallback } from "react";
import SuperAdminLayout from "@/components/superadmin/SuperAdminLayout";
import DataTable from "@/components/superadmin/DataTable";
import Modal from "@/components/superadmin/Modal";
import FormField from "@/components/superadmin/FormField";
import {
  sectionsApi,
  doctorsApi,
  locationsApi,
  Section,
  Doctor,
  Location,
} from "@/services/api";
import { departmentsData } from "@/lib/department";
import toast from "react-hot-toast";
import { Plus, UserCheck, Edit, Trash2 } from "lucide-react";

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [showDepartments, setShowDepartments] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    locationIds: [] as string[],
    isActive: true,
    doctors: [] as string[],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const fetchSections = useCallback(async () => {
    try {
      setLoading(true);
      const response = await sectionsApi.getAll();

      if (response.data && response.data.data) {
        setSections(response.data.data);

        // If no sections exist, show departments
        if (response.data.data.length === 0) {
          setShowDepartments(true);
        } else {
          setShowDepartments(false);
        }
      } else {
        console.error("Invalid response structure:", response);
        toast.error("Invalid response from server");
        setShowDepartments(true);
      }
    } catch (error) {
      console.error("Error fetching sections:", error);
      toast.error("Nu s-au putut încărca secțiile");
      setShowDepartments(true);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDoctors = useCallback(async () => {
    try {
      const response = await doctorsApi.getAll();
      setDoctors(response.data.data);
    } catch (error) {
      console.error("Error fetching doctors:", error);
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    try {
      const response = await locationsApi.getAll();
      setLocations(response.data.data);
    } catch (error) {
      console.error("Error fetching locations:", error);
      toast.error("Nu s-au putut încărca locațiile");
    }
  }, []);

  useEffect(() => {
    fetchSections();
    fetchDoctors();
    fetchLocations();
  }, [fetchSections, fetchDoctors, fetchLocations]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Numele secției este obligatoriu";
    }

    if (!formData.locationIds || formData.locationIds.length === 0) {
      errors.locationIds = "Cel puțin o locație este obligatorie";
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
      if (editingSection) {
        await sectionsApi.update(editingSection._id, formData);
        toast.success("Secția a fost actualizată cu succes");
      } else {
        await sectionsApi.create(formData);
        toast.success("Secția a fost creată cu succes");
      }

      setModalOpen(false);
      setEditingSection(null);
      resetForm();
      fetchSections();
    } catch (error: any) {
      console.error("Error saving section:", error);
      toast.error(error.response?.data?.error || "Nu s-a putut salva secția");
    }
  };

  const handleEdit = (section: Section) => {
    setEditingSection(section);

    // Handle both new locationIds array and legacy locationId field
    let locationIds: string[] = [];
    if (section.locationIds && Array.isArray(section.locationIds)) {
      locationIds = section.locationIds.map((loc: any) =>
        typeof loc === "string" ? loc : loc._id || loc
      );
    } else if (section.locationId) {
      // Legacy support: convert single locationId to array
      locationIds = [
        typeof section.locationId === "string"
          ? section.locationId
          : section.locationId._id || "",
      ];
    }

    setFormData({
      name: section.name,
      description: section.description || "",
      locationIds: locationIds,
      isActive: section.isActive,
      doctors: (section as any).doctors?.map((doctor: any) => doctor._id) || [],
    });
    setModalOpen(true);
  };

  const handleDelete = async (section: Section) => {
    if (
      !confirm(
        `Ești sigur că vrei să ștergi secția "${section.name}"? Aceasta va elimina și toți medicii asociați.`
      )
    ) {
      return;
    }

    try {
      await sectionsApi.delete(section._id);
      toast.success("Secția a fost ștearsă cu succes");
      fetchSections();
    } catch (error: any) {
      console.error("Error deleting section:", error);
      toast.error(error.response?.data?.error || "Nu s-a putut șterge secția");
    }
  };

  const handleAddNew = () => {
    setEditingSection(null);
    resetForm();
    setModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      locationIds: [],
      isActive: true,
      doctors: [],
    });
    setFormErrors({});
  };

  const createDepartmentsAsSections = async () => {
    try {
      // Get first active location as default
      const defaultLocation =
        locations.find((loc: any) => loc.isActive) || locations[0];
      if (!defaultLocation) {
        toast.error("Nu sunt locații disponibile. Vă rugăm să creați mai întâi o locație.");
        return;
      }

      // Create sections from departments
      for (const department of departmentsData) {
        await sectionsApi.create({
          name: department.name,
          description: `Medical department for ${department.name.toLowerCase()}`,
          isActive: true,
          locationIds: [defaultLocation._id],
        });
      }
      toast.success("Secțiile au fost create din departamente cu succes");
      fetchSections();
    } catch (error: any) {
      console.error("Error creating sections from departments:", error);
      toast.error(
        error.response?.data?.error ||
          "Nu s-au putut crea secțiile din departamente"
      );
    }
  };

  const getDoctorsForSection = (sectionId: string) => {
    return doctors.filter((doctor) => {
      return (
        (typeof doctor.sectionId === "string" &&
          doctor.sectionId === sectionId) ||
        (typeof doctor.sectionId === "object" &&
          doctor.sectionId?._id?.toString() === sectionId)
      );
    });
  };

  const getSectionDoctorCount = (section: Section) => {
    // If doctors are populated, use the length, otherwise filter from all doctors
    if ((section as any).doctors && Array.isArray((section as any).doctors)) {
      return (section as any).doctors.length;
    }
    return getDoctorsForSection(section._id).length;
  };

  const getAvailableDoctors = () => {
    // If editing a section, show doctors from that section + unassigned doctors
    if (editingSection) {
      return doctors.filter((doctor) => {
        // Check if doctor is assigned to this section or is unassigned
        const isAssignedToThisSection =
          (typeof doctor.sectionId === "string" &&
            doctor.sectionId === editingSection._id) ||
          (typeof doctor.sectionId === "object" &&
            doctor.sectionId?._id?.toString() ===
              editingSection._id.toString());
        const isUnassigned = !doctor.sectionId || doctor.sectionId === null;
        return isAssignedToThisSection || isUnassigned;
      });
    }
    // If creating new section, show all unassigned doctors
    return doctors.filter(
      (doctor) => !doctor.sectionId || doctor.sectionId === null
    );
  };

  const handleDoctorToggle = (doctorId: string) => {
    const newDoctors = formData.doctors.includes(doctorId)
      ? formData.doctors.filter((id) => id !== doctorId)
      : [...formData.doctors, doctorId];

    setFormData({ ...formData, doctors: newDoctors });
  };

  const getSectionLocations = (section: Section) => {
    // Handle both new locationIds array and legacy locationId field
    if (section.locationIds && Array.isArray(section.locationIds)) {
      return section.locationIds.map((loc: any) => {
        if (typeof loc === "string") {
          const location = locations.find((l: any) => l._id === loc);
          return location ? location.name : loc;
        }
        return loc.name || loc._id;
      });
    } else if (section.locationId) {
      // Legacy support
      if (typeof section.locationId === "string") {
        const location = locations.find(
          (l: any) => l._id === section.locationId
        );
        return location ? [location.name] : [section.locationId];
      }
      return [section.locationId.name || section.locationId._id];
    }
    return [];
  };

  const columns = [
    {
      key: "name",
      label: "Section Name",
      sortable: true,
    },
    {
      key: "description",
      label: "Description",
      sortable: true,
      render: (value: string) => value || "-",
    },
    {
      key: "locations",
      label: "Locations",
      sortable: false,
      render: (value: any, row: Section) => {
        const locationNames = getSectionLocations(row);
        if (locationNames.length === 0) {
          return <span className="text-sm text-gray-400">No locations</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {locationNames.map((name: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 rounded text-xs bg-blue-100 text-blue-800"
              >
                {name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: "doctors",
      label: "Doctors",
      sortable: true,
      render: (value: any, row: Section) => {
        const doctorCount = getSectionDoctorCount(row);
        return (
          <div className="flex items-center">
            <UserCheck className="h-4 w-4 mr-1 text-gray-400" />
            <span className="text-sm text-gray-600">
              {doctorCount} doctor{doctorCount !== 1 ? "s" : ""}
            </span>
          </div>
        );
      },
    },
    {
      key: "isActive",
      label: "Status",
      sortable: true,
      render: (value: boolean) => (
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            value ? "bg-green-200 text-green-800" : "bg-red-150 text-red-800"
          }`}
        >
          {value ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (value: string) => new Date(value).toLocaleDateString(),
    },
  ];

  // If showing departments (when sections don't exist)
  if (showDepartments) {
    const departmentColumns = [
      {
        key: "name",
        label: "Department Name",
        sortable: true,
      },
      {
        key: "doctorCount",
        label: "Doctors",
        sortable: true,
        render: (value: number) => (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            {value} doctor{value !== 1 ? "s" : ""}
          </span>
        ),
      },
      {
        key: "schedules",
        label: "Available Days",
        sortable: false,
        render: (value: any, row: any) => {
          const allDays = new Set();
          row.doctors.forEach((doctor: any) => {
            doctor.schedule.forEach((schedule: any) => {
              allDays.add(schedule.day);
            });
          });
          return (
            <div className="flex flex-wrap gap-1">
              {Array.from(allDays)
                .slice(0, 3)
                .map((day: any) => (
                  <span
                    key={day}
                    className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800"
                  >
                    {day}
                  </span>
                ))}
              {Array.from(allDays).length > 3 && (
                <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                  +{Array.from(allDays).length - 3}
                </span>
              )}
            </div>
          );
        },
      },
    ];

    const departmentData = departmentsData.map((dept) => ({
      ...dept,
      doctorCount: dept.doctors.length,
    }));

    return (
      <SuperAdminLayout>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
              <p className="mt-1 text-sm text-gray-500">
                Medical departments and their doctors
              </p>
            </div>
            <button
              onClick={createDepartmentsAsSections}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Sections from Departments
            </button>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">
                  Departments Overview
                </h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    These are your existing medical departments. Click &quot;Create
                    Sections from Departments&quot; to convert them into manageable
                    sections for user assignments and doctor management.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Departments Table */}
          <DataTable
            data={departmentData}
            columns={departmentColumns}
            loading={loading}
            emptyMessage="No departments found."
          />
        </div>
      </SuperAdminLayout>
    );
  }

  // If sections exist, show them with management capabilities
  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Secții</h1>
            <p className="mt-1 text-sm text-gray-500">
              Gestionează secțiile medicale și medicii lor
            </p>
          </div>
          <button
            onClick={handleAddNew}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adaugă Secție
          </button>
        </div>

        {/* Sections Table */}
        <DataTable
          data={sections}
          columns={columns}
          onEdit={handleEdit}
          onDelete={handleDelete}
          loading={loading}
          emptyMessage="Nu s-au găsit secții."
        />

        {/* Modal */}
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingSection ? "Editează Secție" : "Adaugă Secție Nouă"}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              label="Nume Secție"
              name="name"
              type="text"
              value={formData.name}
              onChange={(value) => setFormData({ ...formData, name: value })}
              error={formErrors.name}
              required
              placeholder="Introdu numele secției"
            />

            <FormField
              label="Descriere"
              name="description"
              type="textarea"
              value={formData.description}
              onChange={(value) =>
                setFormData({ ...formData, description: value })
              }
              error={formErrors.description}
              placeholder="Introdu descrierea secției"
            />

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">
                Locații <span className="text-red-500">*</span>
              </label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                {locations.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    Nu sunt locații disponibile
                  </p>
                ) : (
                  locations.map((location) => (
                    <div
                      key={location._id}
                      className="flex items-center space-x-3"
                    >
                      <input
                        type="checkbox"
                        id={`location-${location._id}`}
                        checked={formData.locationIds.includes(location._id)}
                        onChange={(e) => {
                          const newLocationIds = e.target.checked
                            ? [...formData.locationIds, location._id]
                            : formData.locationIds.filter(
                                (id) => id !== location._id
                              );
                          setFormData({
                            ...formData,
                            locationIds: newLocationIds,
                          });
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`location-${location._id}`}
                        className="flex-1 cursor-pointer"
                      >
                        <span className="text-sm font-medium text-gray-900">
                          {location.name}
                        </span>
                        {!location.isActive && (
                          <span className="ml-2 text-xs text-gray-500">
                            (Inactiv)
                          </span>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>
              {formData.locationIds.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {formData.locationIds.length} {formData.locationIds.length === 1 ? "locație selectată" : "locații selectate"}
                </p>
              )}
              {formErrors.locationIds && (
                <p className="text-sm text-red-600">{formErrors.locationIds}</p>
              )}
            </div>

            <FormField
              label="Activ"
              name="isActive"
              type="checkbox"
              value={formData.isActive}
              onChange={(value) =>
                setFormData({ ...formData, isActive: value })
              }
            />

            {/* Doctors Assignment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Atribuie Medici
              </label>
              <div className="max-h-48 overflow-y-auto border rounded-md p-3 space-y-2">
                {getAvailableDoctors().length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {editingSection
                      ? "Nu sunt medici disponibili de atribuit"
                      : "Nu sunt medici neatribuiți disponibili"}
                  </p>
                ) : (
                  getAvailableDoctors().map((doctor) => (
                    <div
                      key={doctor._id}
                      className="flex items-center space-x-3"
                    >
                      <input
                        type="checkbox"
                        id={`doctor-${doctor._id}`}
                        checked={formData.doctors.includes(doctor._id)}
                        onChange={() => handleDoctorToggle(doctor._id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label
                        htmlFor={`doctor-${doctor._id}`}
                        className="flex-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-900">
                            {doctor.name}
                          </span>
                          <span className="text-xs text-gray-500">
                            {doctor.specialization || "Fără specializare"}
                          </span>
                        </div>
                        {doctor.email && (
                          <div className="text-xs text-gray-500">
                            {doctor.email}
                          </div>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>
              {formData.doctors.length > 0 && (
                <p className="mt-2 text-sm text-gray-600">
                  {formData.doctors.length} {formData.doctors.length === 1 ? "medic selectat" : "medici selectați"}
                </p>
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
                {editingSection ? "Actualizează" : "Creează"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}

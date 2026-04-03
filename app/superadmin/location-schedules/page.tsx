"use client";
import { useEffect, useState, useCallback } from "react";

export const dynamic = "force-dynamic";
import SuperAdminLayout from "@/components/superadmin/SuperAdminLayout";
import DataTable from "@/components/superadmin/DataTable";
import Modal from "@/components/superadmin/Modal";
import FormField from "@/components/superadmin/FormField";
import WeeklySlotGrid from "@/components/superadmin/WeeklySlotGrid";
import { countScheduleSlots, dedupeSchedule } from "@/utils/weekScheduleGrid";
import { locationsApi, Location } from "@/services/api";
import toast from "react-hot-toast";
import { Plus, Edit } from "lucide-react";
import api from "@/services/api";

interface TimeSlot {
  time: string;
  date: string;
}

const EMPTY_SCHEDULE = {
  Luni: [] as TimeSlot[],
  Marți: [] as TimeSlot[],
  Miercuri: [] as TimeSlot[],
  Joi: [] as TimeSlot[],
  Vineri: [] as TimeSlot[],
  Sâmbătă: [] as TimeSlot[],
  Duminica: [] as TimeSlot[],
};

interface LocationScheduleRow {
  _id: string;
  location: string;
  schedule: typeof EMPTY_SCHEDULE;
}

function normalizeSchedule(raw: Record<string, TimeSlot[] | undefined>): typeof EMPTY_SCHEDULE {
  const days = Object.keys(EMPTY_SCHEDULE) as (keyof typeof EMPTY_SCHEDULE)[];
  const out = { ...EMPTY_SCHEDULE };
  for (const day of days) {
    out[day] = Array.isArray(raw[day]) ? [...raw[day]!] : [];
  }
  return out;
}

export default function LocationSchedulesPage() {
  const [schedules, setSchedules] = useState<LocationScheduleRow[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [deduping, setDeduping] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<LocationScheduleRow | null>(null);
  const [formData, setFormData] = useState({
    location: "",
    schedule: { ...EMPTY_SCHEDULE },
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedDay, setSelectedDay] = useState<string>("Luni");

  const daysOfWeek = Object.keys(EMPTY_SCHEDULE);

  const fetchSchedules = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get("/location-schedules");
      setSchedules(response.data.data || []);
    } catch (error) {
      console.error("Error fetching location schedules:", error);
      toast.error("Nu s-au putut încărca programele pe locație");
    } finally {
      setLoading(false);
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
    fetchSchedules();
    fetchLocations();
  }, [fetchSchedules, fetchLocations]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formData.location) {
      errors.location = "Selectați locația";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const schedule = dedupeSchedule(
        formData.schedule as unknown as Record<string, unknown>
      ) as unknown as typeof formData.schedule;

      if (editingSchedule) {
        await api.patch(`/schedule?id=${editingSchedule._id}`, {
          schedule,
        });
        toast.success("Program actualizat");
      } else {
        await api.post("/location-schedules", {
          location: formData.location,
          schedule,
        });
        toast.success("Program creat");
      }
      setModalOpen(false);
      resetForm();
      fetchSchedules();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      console.error("Error saving location schedule:", error);
      toast.error(err.response?.data?.message || "Salvare eșuată");
    }
  };

  const handleEdit = (row: LocationScheduleRow) => {
    setEditingSchedule(row);
    const normalized = normalizeSchedule(row.schedule as Record<string, TimeSlot[]>);
    setFormData({
      location: row.location,
      schedule: dedupeSchedule(
        normalized as unknown as Record<string, unknown>
      ) as unknown as typeof normalized,
    });
    setModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Ștergeți întregul program pentru această locație?")) return;
    try {
      await api.delete(`/location-schedules?id=${id}`);
      toast.success("Program șters");
      fetchSchedules();
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error("Ștergere eșuată");
    }
  };

  const resetForm = () => {
    setFormData({
      location: "",
      schedule: { ...EMPTY_SCHEDULE },
    });
    setEditingSchedule(null);
    setFormErrors({});
  };

  const handleDedupeAll = async () => {
    if (
      !confirm(
        "Se elimină duplicatele din toate programele pe locație (aceeași oră + aceeași dată). Continuați?"
      )
    ) {
      return;
    }
    try {
      setDeduping(true);
      const res = await api.post("/location-schedules", { action: "dedupeAll" });
      const locs = res.data?.data?.locations as
        | { location: string; before: number; after: number }[]
        | undefined;
      if (locs?.length) {
        const changed = locs.filter((l) => l.before !== l.after);
        toast.success(
          changed.length
            ? `Curățat: ${changed.map((l) => `${l.location} ${l.before}→${l.after}`).join("; ")}`
            : "Nu existau duplicate de eliminat."
        );
      } else {
        toast.success(res.data?.message || "Gata");
      }
      fetchSchedules();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(err.response?.data?.message || "Eșuat");
    } finally {
      setDeduping(false);
    }
  };

  const existingLocationNames = new Set(schedules.map((s) => s.location));
  const locationOptionsForCreate = locations.filter((l) => !existingLocationNames.has(l.name));

  const columns = [
    { key: "location", label: "Locație" },
    {
      key: "slots",
      label: "Sloturi (unice)",
      render: (_: unknown, row: LocationScheduleRow) => countScheduleSlots(row.schedule),
    },
    {
      key: "actions",
      label: "Acțiuni",
      render: (_: unknown, row: LocationScheduleRow) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => handleEdit(row)}
            className="text-blue-600 hover:text-blue-800"
            aria-label="Editează"
          >
            <Edit size={16} />
          </button>
          <button
            type="button"
            onClick={() => row._id && handleDelete(row._id)}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
            aria-label="Șterge"
          >
            Șterge
          </button>
        </div>
      ),
    },
  ];

  const dayKey = selectedDay as keyof typeof formData.schedule;

  return (
    <SuperAdminLayout>
      <div className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center mb-6">
          <h1 className="text-2xl font-bold">Program pe locații</h1>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleDedupeAll}
              disabled={deduping}
              className="bg-slate-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-800 disabled:opacity-60"
            >
              {deduping ? "Se curăță…" : "Curăță duplicate"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setModalOpen(true);
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700"
            >
              <Plus size={20} />
              Adaugă program
            </button>
          </div>
        </div>

        <DataTable
          data={schedules}
          columns={columns}
          loading={loading}
          emptyMessage="Niciun program pe locație. Adăugați unul din SuperAdmin — altfel nu vor apărea sloturi pentru acea locație."
        />

        <Modal
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false);
            resetForm();
          }}
          title={editingSchedule ? `Editare: ${editingSchedule.location}` : "Program nou pe locație"}
        >
          <form onSubmit={handleSubmit} className="space-y-4 max-w-4xl mx-auto">
            {!editingSchedule && (
              <FormField
                label="Locație"
                name="location"
                type="select"
                value={formData.location}
                onChange={(value) => setFormData({ ...formData, location: value })}
                error={formErrors.location}
                required
                options={[
                  { value: "", label: "Selectați locația" },
                  ...locationOptionsForCreate.map((l) => ({
                    value: l.name,
                    label: l.name,
                  })),
                ]}
              />
            )}

            <div className={editingSchedule ? "pt-1" : "border-t pt-4"}>
              <label className="block text-sm font-medium mb-2">Ziua săptămânii</label>
              <div className="flex gap-2 flex-wrap">
                {daysOfWeek.map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                      selectedDay === day
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                    }`}
                  >
                    {day}
                  </button>
                ))}
              </div>
            </div>

            <WeeklySlotGrid
              daySlots={formData.schedule[dayKey]}
              dayLabel={selectedDay}
              onChange={(slots) =>
                setFormData({
                  ...formData,
                  schedule: { ...formData.schedule, [dayKey]: slots },
                })
              }
            />

            <div className="flex gap-2 pt-4 border-t">
              <button
                type="submit"
                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {editingSchedule ? "Salvează" : "Creează"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400"
              >
                Anulează
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </SuperAdminLayout>
  );
}

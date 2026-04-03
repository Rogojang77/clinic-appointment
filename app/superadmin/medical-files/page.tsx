"use client";

import { useCallback, useEffect, useState } from "react";
import SuperAdminLayout from "@/components/superadmin/SuperAdminLayout";
import { DatePicker } from "@/components/ui/date-picker";
import MedicalFilesTable from "@/components/medical-files/MedicalFilesTable";
import { doctorsApi, Doctor, medicalFilesApi, MedicalFileListItem } from "@/services/api";
import Spinner from "@/components/common/loader";

export default function SuperAdminMedicalFilesPage() {
  const [items, setItems] = useState<MedicalFileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [patientName, setPatientName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const loadDoctors = useCallback(async () => {
    try {
      const res = await doctorsApi.getAll({ isActive: true });
      setDoctors(res.data.data || []);
    } catch (err) {
      console.error("Error loading doctors:", err);
      setDoctors([]);
    }
  }, []);

  const loadFiles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await medicalFilesApi.list({
        doctorId: selectedDoctorId || undefined,
        patientName: patientName || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setItems(res.data.data || []);
    } catch (err) {
      console.error("Error loading medical files:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [selectedDoctorId, patientName, fromDate, toDate]);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  return (
    <SuperAdminLayout>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">Fișe medicale</h1>
        <p className="text-sm text-gray-600">
          Lista tuturor fișelor medicale create de medici, cu posibilitatea de filtrare după medic, pacient și dată.
        </p>

        <div className="flex flex-wrap items-end gap-4 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Medic</label>
            <select
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[200px] bg-white"
            >
              <option value="">Toți medicii</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Pacient</label>
            <input
              type="text"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="Nume pacient"
              className="border border-gray-300 rounded-md px-3 py-2 text-sm min-w-[180px]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">De la</label>
            <DatePicker
              value={fromDate}
              onChange={setFromDate}
              placeholder="De la"
              aria-label="Data de la"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">Până la</label>
            <DatePicker
              value={toDate}
              onChange={setToDate}
              placeholder="Până la"
              aria-label="Data până la"
            />
          </div>

          <button
            className="ml-auto bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-md"
            onClick={loadFiles}
          >
            Aplică filtre
          </button>
        </div>

        {loading ? (
          <div className="w-full flex justify-center items-center py-10">
            <Spinner />
          </div>
        ) : (
          <MedicalFilesTable
            items={items}
            showDoctorColumn
            canDelete
            onDeleted={loadFiles}
          />
        )}
      </div>
    </SuperAdminLayout>
  );
}


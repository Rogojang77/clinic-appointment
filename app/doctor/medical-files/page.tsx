"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuthEffect } from "@/hook/useAuthEffect";
import { useUserStore } from "@/store/store";
import { DatePicker } from "@/components/ui/date-picker";
import Spinner from "@/components/common/loader";
import MedicalFilesTable from "@/components/medical-files/MedicalFilesTable";
import { medicalFilesApi, MedicalFileListItem } from "@/services/api";

export default function DoctorMedicalFilesPage() {
  useAuthEffect();
  const { user } = useUserStore();
  const [items, setItems] = useState<MedicalFileListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [patientName, setPatientName] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await medicalFilesApi.list({
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
  }, [patientName, fromDate, toDate]);

  useEffect(() => {
    if (!user) return;
    if (user.role !== "doctor") return;
    load();
  }, [user, load]);

  if (!user || user.role !== "doctor") {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-200 py-5 min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-gray-200 py-5 min-h-screen">
      <div className="w-full max-w-4xl p-5 space-y-4 bg-gray-100 rounded-md shadow-md">
        <h1 className="text-2xl font-bold text-gray-900">Fișele mele medicale</h1>

        <div className="flex flex-wrap items-end gap-4 bg-white rounded-lg border border-gray-200 p-4">
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
            onClick={load}
          >
            Aplică filtre
          </button>
        </div>

        {loading ? (
          <div className="w-full flex justify-center items-center py-10">
            <Spinner />
          </div>
        ) : (
          <MedicalFilesTable items={items} canDelete onDeleted={load} />
        )}
      </div>
    </div>
  );
}


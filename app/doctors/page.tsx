"use client";

import { useEffect, useState, useCallback } from "react";
import { doctorsApi, sectionsApi, Doctor, Section } from "@/services/api";
import Spinner from "@/components/common/loader";
import toast from "react-hot-toast";

function getSectionName(doctor: Doctor): string {
  const s = doctor.sectionId ?? doctor.section;
  if (!s) return "—";
  return typeof s === "string" ? s : (s as { name?: string }).name ?? "—";
}

function getLocationNames(doctor: Doctor): string {
  const locs = doctor.locationIds ?? (doctor as any).locationId;
  if (!locs) return "—";
  const arr = Array.isArray(locs) ? locs : [locs];
  const names = arr.map((loc) =>
    typeof loc === "string" ? loc : (loc as { name?: string })?.name ?? ""
  );
  return names.filter(Boolean).length ? names.join(", ") : "—";
}

export default function DoctorsPage() {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [sectionFilter, setSectionFilter] = useState<string>("");

  const fetchDoctors = useCallback(async () => {
    try {
      setLoading(true);
      const params =
        sectionFilter !== ""
          ? { sectionId: sectionFilter, isActive: true }
          : { isActive: true };
      const response = await doctorsApi.getAll(params);
      setDoctors(response.data.data ?? []);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast.error("Nu s-au putut încărca medicii");
      setDoctors([]);
    } finally {
      setLoading(false);
    }
  }, [sectionFilter]);

  const fetchSections = useCallback(async () => {
    try {
      const response = await sectionsApi.getAll();
      setSections(response.data.data ?? []);
    } catch (error) {
      console.error("Error fetching sections:", error);
    }
  }, []);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-6xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Medici</h1>

        <div className="mb-6 flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Filtrează după secție:
          </label>
          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 max-w-xs"
          >
            <option value="">Toate secțiile</option>
            {sections.map((s) => (
              <option key={s._id} value={s._id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nume
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Specializare
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Secție
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Locații
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-32" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                      <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : doctors.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-gray-500">
            Nu s-au găsit medici.
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Nume
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Specializare
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Secție
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Locații
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {doctors.map((doctor) => (
                    <tr key={doctor._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {doctor.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {doctor.specialization ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getSectionName(doctor)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {getLocationNames(doctor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

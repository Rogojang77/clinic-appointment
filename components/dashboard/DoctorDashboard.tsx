"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthEffect } from "@/hook/useAuthEffect";
import dayjs from "dayjs";
import { fetchAppointmentsAPI } from "@/service/appointmentService";
import ViewAppointment from "./view-appointment";
import Spinner from "../common/loader";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import toast from "react-hot-toast";
import isDateValid from "@/utils/isValidDate";
import { dayNameMap } from "@/lib/dayNameMap";

const DAYS_PAST = 7;
const DAYS_FUTURE = 31;

function groupAppointmentsByDay(appointments: any[]): Record<string, any[]> {
  const byDay: Record<string, any[]> = {};
  for (const a of appointments || []) {
    const dateStr = typeof a.date === "string" ? a.date : a.date ? dayjs(a.date).format("YYYY-MM-DD") : "";
    if (!dateStr) continue;
    if (!byDay[dateStr]) byDay[dateStr] = [];
    byDay[dateStr].push(a);
  }
  for (const key of Object.keys(byDay)) {
    // Newest time first within the same day
    byDay[key].sort((x, y) => (y.time || "").localeCompare(x.time || ""));
  }
  return byDay;
}

const defaultFrom = dayjs().subtract(DAYS_PAST, "day").format("YYYY-MM-DD");
const defaultTo = dayjs().add(DAYS_FUTURE, "day").format("YYYY-MM-DD");

export default function DoctorDashboard() {
  useAuthEffect();
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewingAppointment, setViewingAppointment] = useState<any>(null);
  const [dateFrom, setDateFrom] = useState(defaultFrom);
  const [dateTo, setDateTo] = useState(defaultTo);

  const fetchAppointments = useCallback(async () => {
    try {
      setIsLoading(true);
      // No date filter: API returns only this doctor's appointments
      const data = await fetchAppointmentsAPI({});
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error fetching appointments:", err);
      setAppointments([]);
      toast.error("Nu s-au putut încărca programările.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleView = (appointment: any) => setViewingAppointment(appointment);

  const byDay = groupAppointmentsByDay(appointments);
  const daysInRange = Object.keys(byDay)
    .filter((d) => d >= dateFrom && d <= dateTo)
    // Newest day first
    .sort((a, b) => b.localeCompare(a));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-200 py-5 min-h-screen">
        <div className="w-full max-w-4xl p-5 flex justify-center items-center min-h-[400px]">
          <Spinner />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-gray-200 py-5 min-h-screen">
      <div className="w-full max-w-4xl p-5 space-y-6 bg-gray-100 rounded-md shadow-md">
        <h1 className="text-2xl font-bold text-gray-900">Programările mele</h1>

        <div className="flex flex-wrap items-center gap-4 bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2">
            <label htmlFor="date-from" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              De la
            </label>
            <DatePicker
              id="date-from"
              value={dateFrom}
              onChange={setDateFrom}
              placeholder="De la"
              aria-label="Data de la"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="date-to" className="text-sm font-medium text-gray-700 whitespace-nowrap">
              Până la
            </label>
            <DatePicker
              id="date-to"
              value={dateTo}
              onChange={setDateTo}
              placeholder="Până la"
              aria-label="Data până la"
            />
          </div>
        </div>

        {daysInRange.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
            Nu aveți programări în această perioadă.
          </div>
        ) : (
          <div className="space-y-6">
            {daysInRange.map((dateStr) => {
              const dayAppointments = byDay[dateStr] || [];
              const dayDate = dayjs(dateStr);
              const dayName = dayNameMap[dayDate.format("dddd")] || dayDate.format("dddd");
              const today = dayjs().format("YYYY-MM-DD");
              const isToday = dateStr === today;
              const isPast = dateStr < today;

              return (
                <section key={dateStr} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <header className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800">
                      {dayName}, {dayDate.format("D MMMM YYYY")}
                      {isToday && (
                        <span className="ml-2 text-sm font-normal text-blue-600">(azi)</span>
                      )}
                      {isPast && (
                        <span className="ml-2 text-sm font-normal text-gray-500">(trecut)</span>
                      )}
                    </h2>
                  </header>
                  <ul className="divide-y divide-gray-100">
                    {dayAppointments.map((apt) => {
                      const sectionName = apt.section?.name ?? apt.testType ?? "—";
                      return (
                        <li key={apt._id} className="px-4 py-3 hover:bg-gray-50 flex items-center justify-between gap-4">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 min-w-0">
                            <span className="font-medium text-gray-900 shrink-0">{apt.time}</span>
                            <span className="text-gray-700 truncate">{apt.patientName}</span>
                            <span className="text-sm text-gray-500 truncate">{sectionName}</span>
                            {apt.location && (
                              <span className="text-sm text-gray-400 truncate">{apt.location}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleView(apt)}
                            >
                              Detalii
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                router.push(
                                  `/doctor/medical-file/new?appointmentId=${encodeURIComponent(
                                    apt._id
                                  )}&patientName=${encodeURIComponent(
                                    apt.patientName || ""
                                  )}`
                                )
                              }
                            >
                              Creează fișă medicală
                            </Button>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>

      <ViewAppointment
        appointment={viewingAppointment}
        open={!!viewingAppointment}
        onClose={() => setViewingAppointment(null)}
        onEdit={() => setViewingAppointment(null)}
        onDelete={() => setViewingAppointment(null)}
        isPastDate={(date: string) => !isDateValid(date)}
        showAppointmentActions={false}
      />
    </div>
  );
}

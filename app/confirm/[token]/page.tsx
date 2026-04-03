"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

type Decision = "confirmed" | "declined";

export default function ConfirmAppointmentPage() {
  const params = useParams<{ token: string }>();
  const token = useMemo(() => (params?.token ? String(params.token) : ""), [params]);

  const [loading, setLoading] = useState<Decision | null>(null);
  const [done, setDone] = useState<Decision | null>(null);

  const submit = async (decision: Decision) => {
    if (!token) return;
    setLoading(decision);
    try {
      const res = await fetch("/api/appointments/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, decision }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || "Link invalid or expired");
      }
      setDone(decision);
      toast.success(decision === "confirmed" ? "Programarea a fost confirmată." : "Programarea a fost anulată.");
    } catch (e: any) {
      toast.error(e?.message ?? "Ceva nu a mers bine.");
    } finally {
      setLoading(null);
    }
  };

  const disabled = !token || !!done || loading !== null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white shadow rounded-lg p-6">
        <h1 className="text-xl font-semibold text-gray-900">Confirmare programare</h1>
        <p className="mt-2 text-sm text-gray-600">
          Te rugăm alege una dintre opțiuni.
        </p>

        {done ? (
          <div className="mt-6 rounded-md border p-4">
            <p className="text-sm text-gray-800">
              Status:{" "}
              <span className={done === "confirmed" ? "text-green-700 font-medium" : "text-red-700 font-medium"}>
                {done === "confirmed" ? "Confirmat" : "Refuzat"}
              </span>
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Poți închide această pagină.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-1 gap-3">
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
              disabled={disabled || loading === "declined"}
              onClick={() => submit("confirmed")}
            >
              {loading === "confirmed" ? "Se confirmă..." : "Confirmă"}
            </Button>
            <Button
              className="w-full"
              variant="destructive"
              disabled={disabled || loading === "confirmed"}
              onClick={() => submit("declined")}
            >
              {loading === "declined" ? "Se anulează..." : "Refuză"}
            </Button>
          </div>
        )}

        {!token && (
          <p className="mt-6 text-sm text-red-700">
            Link invalid.
          </p>
        )}
      </div>
    </div>
  );
}


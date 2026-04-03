"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect } from "react";
import { useAuthEffect } from "@/hook/useAuthEffect";
import { useUserStore } from "@/store/store";
import MedicalLetterForm from "@/components/doctor/MedicalLetterForm";
import Spinner from "@/components/common/loader";
import type { MedicalLetterState } from "@/components/doctor/MedicalLetterForm";

function NewMedicalFilePageContent() {
  useAuthEffect();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useUserStore();

  const appointmentId = searchParams.get("appointmentId") || "";
  const patientName = searchParams.get("patientName") || "";

  useEffect(() => {
    if (!user) return;
    if (user.role !== "doctor" && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, router]);

  if (!appointmentId) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-200 py-5 min-h-screen">
        <div className="w-full max-w-xl p-6 bg-white rounded-md shadow-md border border-gray-200 space-y-3">
          <h1 className="text-xl font-semibold text-gray-900">
            Scrisoare medicală
          </h1>
          <p className="text-sm text-gray-700">
            Nu a fost furnizat niciun identificator de programare. Accesați
            această pagină din lista de programări a medicului pentru a crea
            o fișă medicală.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center bg-gray-200 py-5 min-h-screen">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center bg-gray-200 py-5 min-h-screen">
      <MedicalLetterForm
        appointmentId={appointmentId}
        doctorName={user.username}
        initialForm={
          patientName
            ? ({ pacientNume: patientName } satisfies Partial<MedicalLetterState>)
            : undefined
        }
      />
    </div>
  );
}

export default function NewMedicalFilePage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-col items-center justify-center bg-gray-200 py-5 min-h-screen">
          <Spinner />
        </div>
      }
    >
      <NewMedicalFilePageContent />
    </Suspense>
  );
}


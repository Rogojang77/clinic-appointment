"use client";

import { useRouter } from "next/navigation";
import { MedicalFileListItem, medicalFilesApi } from "@/services/api";
import { Button } from "@/components/ui/button";
import dayjs from "dayjs";
import toast from "react-hot-toast";

interface MedicalFilesTableProps {
  items: MedicalFileListItem[];
  showDoctorColumn?: boolean;
  canDelete?: boolean;
  onDeleted?: () => void;
}

export default function MedicalFilesTable({
  items,
  showDoctorColumn = false,
  canDelete = false,
  onDeleted,
}: MedicalFilesTableProps) {
  const router = useRouter();
  const handleDownload = async (id: string) => {
    await medicalFilesApi.downloadPdf(id);
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Sigur doriți să ștergeți această fișă medicală? Această acțiune nu poate fi anulată."
    );
    if (!confirmed) return;

    try {
      await medicalFilesApi.delete(id);
      toast.success("Fișa medicală a fost ștearsă");
      onDeleted?.();
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "A apărut o eroare la ștergerea fișei medicale";
      toast.error(msg);
    }
  };

  if (!items.length) {
    return (
      <div className="w-full bg-white rounded-md border border-gray-200 p-4 text-sm text-gray-600">
        Nu există fișe medicale pentru filtrele selectate.
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-md border border-gray-200 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
              Dată
            </th>
            <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
              Pacient
            </th>
            {showDoctorColumn && (
              <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
                Doctor
              </th>
            )}
            <th className="px-3 py-2 text-left font-medium text-gray-700 whitespace-nowrap">
              Secție / Tip
            </th>
            <th className="px-3 py-2 text-right font-medium text-gray-700 whitespace-nowrap">
              Acțiuni
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item) => {
            const appt = item.appointment;
            const doc = item.doctor;
            const date =
              (appt?.date && dayjs(appt.date).format("DD.MM.YYYY")) || "—";

            return (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="px-3 py-2 align-top whitespace-nowrap">
                  <div className="flex flex-col">
                    <span>{date}</span>
                    {appt?.time && (
                      <span className="text-xs text-gray-500">
                        {appt.time}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900">
                      {appt?.patientName || "—"}
                    </span>
                    {appt?.location && (
                      <span className="text-xs text-gray-500">
                        {appt.location}
                      </span>
                    )}
                  </div>
                </td>
                {showDoctorColumn && (
                  <td className="px-3 py-2 align-top">
                    <div className="flex flex-col">
                      <span>{doc?.name || "—"}</span>
                      {doc?.specialization && (
                        <span className="text-xs text-gray-500">
                          {doc.specialization}
                        </span>
                      )}
                    </div>
                  </td>
                )}
                <td className="px-3 py-2 align-top whitespace-nowrap">
                  {appt?.testType || "—"}
                </td>
                <td className="px-3 py-2 align-top">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/doctor/medical-file/edit?fileId=${item._id}`
                        )
                      }
                    >
                      Editează
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownload(item._id)}
                    >
                      Descarcă PDF
                    </Button>
                    {canDelete && (
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(item._id)}
                      >
                        Șterge
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


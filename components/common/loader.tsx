import { Loader } from "lucide-react";

export default function Spinner() {
  return (
    <div className="flex justify-center items-center">
        <Loader size={28} className="animate-spin text-blue-500"/>
    </div>
  );
}

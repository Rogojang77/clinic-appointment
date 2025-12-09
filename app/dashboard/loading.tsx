import Spinner from "@/components/common/loader";

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center bg-gray-200 py-5 min-h-screen">
      <div className="w-full max-w-7xl p-5 space-y-4 bg-gray-100 rounded-md shadow-md py-5 flex flex-col justify-center items-center min-h-[400px]">
        <Spinner />
        <p className="text-gray-600 mt-4">Loading dashboard...</p>
      </div>
    </div>
  );
}


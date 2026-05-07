import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-white p-4 w-full mt-auto border-t border-gray-100">
      <div className="container mx-auto w-full max-w-7xl flex flex-col items-center aign-center gap-3">
        <div className="flex items-center">
          <Image
            src="/eu_logos.png"
            alt="EU logos"
            className="h-[80px] w-auto object-contain"
          />
        </div>
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} Policlinica Mos. Toate drepturile rezervate.
        </p>
      </div>
    </footer>
  );
}

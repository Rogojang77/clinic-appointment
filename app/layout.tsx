import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/nav-bar";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "Programari Policlinica Mos",
  description: "Programari Policlinica Mos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  return (
    <html lang="ro">
      <body
        className={` antialiased`}
      >
        <Toaster
          position="top-center"
          toastOptions={{
            ariaProps: { role: "status", "aria-live": "polite" },
            error: { ariaProps: { role: "alert", "aria-live": "assertive" } },
          }}
        />
        <Navbar />
        {children}
      </body>
    </html>
  );
}

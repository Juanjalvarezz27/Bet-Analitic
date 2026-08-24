import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Bet Analytics",
  description: "Gestión y análisis personal de apuestas deportivas",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-50 antialiased selection:bg-orange-500/30 relative min-h-screen overflow-x-hidden`}>
        {/* Ambient Background para el efecto Liquid Glass */}
        <div className="fixed inset-0 z-[-1]">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[30%] h-[40%] bg-orange-600/20 rounded-full blur-[120px] mix-blend-screen pointer-events-none" />
          <div className="absolute top-[40%] left-[60%] w-[25%] h-[25%] bg-emerald-600/15 rounded-full blur-[100px] mix-blend-screen pointer-events-none" />
        </div>

        <BottomNav />
        <div className="mx-auto max-w-7xl min-h-screen relative pb-20 md:pb-8 pt-4 md:pt-24 px-4 flex flex-col bg-transparent z-0">
          {children}
        </div>
      </body>
    </html>
  );
}

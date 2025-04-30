import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Mind Map AI App",
  description: "AI-powered mind mapping and information organization",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full w-full min-w-screen min-h-screen">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased !h-full !w-full !bg-zinc-950 p-2`}
      >
        <div className="flex h-full w-full flex-col bg-zinc-900 text-zinc-100 rounded-xl">
          {children}
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Geist, Geist_Mono, Lora } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const lora = Lora({
  variable: "--font-lora",
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
    <html
      lang="en"
      className="flex box-border h-full w-full"
      suppressHydrationWarning={true}
    >
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${lora.variable} antialiased h-full w-full bg-zinc-950 p-2`}
      >
        <div className="flex h-full w-full flex-col bg-zinc-900 text-zinc-100 rounded-xl">
          {children}
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PageTransition from "@/components/PageTransition";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Route Share",
  description: "Draw a custom route and share it instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full w-full bg-neutral-950">
      <body className={`${inter.variable} antialiased font-sans h-full w-full overflow-hidden text-neutral-300`}>
        <PageTransition>
          {children}
        </PageTransition>
      </body>
    </html>
  );
}

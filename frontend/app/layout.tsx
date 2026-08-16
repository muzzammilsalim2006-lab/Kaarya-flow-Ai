import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "KaaryaFlow AI — Public Office Workforce Optimization Engine",
  description: "Dynamic workforce reallocation dashboard for public offices (RTO Pune Division)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans bg-[#0b0f19] text-slate-100 min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}

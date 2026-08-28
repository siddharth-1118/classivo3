import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SRM Student Companion",
    template: "%s | SRM Student Companion",
  },
  description:
    "Your personal dashboard for SRM Institute of Science and Technology. View grades, attendance, hostel details, exam timetable, and more.",
  keywords: [
    "SRM",
    "SRMIST",
    "Student Portal",
    "SRM Student",
    "Academics",
    "Dashboard",
  ],
  authors: [{ name: "SRM Student Companion" }],
  creator: "SRM Student Companion",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://srm-student.app",
    title: "SRM Student Companion",
    description:
      "Your personal dashboard for SRM Institute of Science and Technology.",
    siteName: "SRM Student Companion",
  },
  twitter: {
    card: "summary_large_image",
    title: "SRM Student Companion",
    description:
      "Your personal dashboard for SRM Institute of Science and Technology.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.variable}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          storageKey="student-portal-theme"
        >
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

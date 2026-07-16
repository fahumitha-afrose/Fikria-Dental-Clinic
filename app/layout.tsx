import type { Metadata } from "next";
import "./globals.css";
import { FloatingWidget } from "@/components/receptionist/FloatingWidget";

export const metadata: Metadata = {
  title: "Fikria Dental Clinic — AI Receptionist",
  description:
    "A modern dental clinic with a 24/7 AI receptionist — get answers, find the right specialist, and book appointments in a chat.",
};

// Runs before hydration to apply the saved theme without a flash.
const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (theme === 'dark' || (!theme && prefersDark)) {
      document.documentElement.classList.add('dark');
    }
  } catch (e) {}
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">
        {children}
        <FloatingWidget />
      </body>
    </html>
  );
}

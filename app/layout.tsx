import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./ui-accessibility.css";
import "./library-professional.css";
import "./settings-professional.css";
import "./page-isolation.css";
import "./diagnostics.css";
import RadioProvider from "./components/radio-context";
import AccessibilityPreferences from "./components/accessibility-preferences";
import SettingsTabsEnhancer from "./components/settings-tabs-enhancer";
import DiagnosticsReporter from "../components/diagnostics/diagnostics-reporter";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Howling Whispers — AI Roleplay",
  description: "Every whisper becomes a world. Private, character-driven AI roleplay powered by NovelAI or a local model.",
  other: {
    "codex-preview": "development",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AccessibilityPreferences />
        <SettingsTabsEnhancer />
        <DiagnosticsReporter />
        <RadioProvider>{children}</RadioProvider>
      </body>
    </html>
  );
}

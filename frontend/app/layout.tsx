import type { Metadata } from "next";
import "./globals.css";
import { LanguageProvider } from "@/components/providers/language-provider";

export const metadata: Metadata = {
  title: "AAROH — Learn in your own tongue",
  description:
    "AI-powered learning platform bridging Hindi/English curriculum with Santhali, for rural and tribal primary education.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body min-h-screen">
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}

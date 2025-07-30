import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import { dark } from '@clerk/themes';
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "ForexBot Pro - Professional Forex Trading Bot",
  description: "Advanced AI-powered forex trading bot with comprehensive risk management, multiple strategies, and real-time market analysis.",
  keywords: "forex, trading, bot, AI, automated trading, scalping, DCA, grid trading",
  authors: [{ name: "ForexBot Pro Team" }],
  creator: "ForexBot Pro",
  publisher: "ForexBot Pro",
  robots: "index, follow",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://forexbot-pro.vercel.app",
    title: "ForexBot Pro - Professional Forex Trading Bot",
    description: "Advanced AI-powered forex trading bot with comprehensive risk management",
    siteName: "ForexBot Pro",
  },
  twitter: {
    card: "summary_large_image",
    title: "ForexBot Pro - Professional Forex Trading Bot",
    description: "Advanced AI-powered forex trading bot with comprehensive risk management",
    creator: "@forexbotpro",
  },
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#3b82f6",
          colorBackground: "#0f172a",
          colorInputBackground: "#1e293b",
          colorInputText: "#f1f5f9",
        },
        elements: {
          formButtonPrimary: 
            "bg-blue-600 hover:bg-blue-700 text-sm normal-case",
          card: "bg-slate-900 border border-slate-700",
          headerTitle: "text-blue-400",
          headerSubtitle: "text-slate-300",
        }
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-900 text-white`}
        >
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}

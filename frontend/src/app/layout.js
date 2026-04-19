import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const appSans = Space_Grotesk({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const appMono = JetBrains_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Coco Assistant",
  description: "Professional command and conversation workspace for COCO AI Agent.",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${appSans.variable} ${appMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {children}
      </body>
    </html>
  );
}

import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata = {
  title: { default: "WMS ACIS", template: "%s | WMS ACIS" },
  description: "Inventory & Warehouse Management System by ACIS Apps",
  applicationName: "WMS ACIS",
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" }
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="id"><body><AppShell>{children}</AppShell></body></html>;
}

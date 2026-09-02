import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = {
  title: { default: "WMS ACIS", template: "%s | WMS ACIS" },
  description: "Inventory & Warehouse Management System by ACIS Apps",
  applicationName: "WMS ACIS",
  icons: { icon: "/favicon.png", apple: "/apple-touch-icon.png" }
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="id"><body><div className="shell"><Sidebar/><main className="main">{children}</main></div></body></html>;
}

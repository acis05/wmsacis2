import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata = { title: "GudangKu WMS", description: "Simple barcode inventory WMS" };

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="id"><body><div className="shell"><Sidebar/><main className="main">{children}</main></div></body></html>;
}

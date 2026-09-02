import Link from "next/link";
const items = [["/","Dashboard"],["/products","Produk"],["/stock","Stok"],["/scan","Scan"],["/stock-opname","Stock Opname"],["/history","Riwayat"]];
export default function Sidebar(){return <aside className="sidebar"><div className="brand"><span className="logo">▣</span><span>GudangKu <small className="muted">WMS</small></span></div><nav className="nav">{items.map(([href,label])=><Link key={href} href={href}>{label}</Link>)}</nav></aside>}

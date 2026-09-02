"use client";
import Link from 'next/link';
import Image from 'next/image';
import {usePathname} from 'next/navigation';
import {useEffect,useState} from 'react';

const items=[['/','▦','Dashboard'],['/products','▣','Produk'],['/stock','◫','Stok'],['/inbound','↓','Barang Masuk'],['/outbound','↑','Barang Keluar'],['/warehouse-transfer','⇄','Pindah Gudang'],['/rack-transfer','↔','Pindah Rak'],['/scan','⌁','Scan Barcode'],['/stock-opname','✓','Stock Opname'],['/packing-list','▧','Packing List'],['/warehouses','⌂','Gudang & Rak'],['/history','◷','Riwayat'],['/reports','▤','Laporan'],['/aolinx','⛓','AOLINX']] as const;

export default function Sidebar(){
  const path=usePathname();
  const[open,setOpen]=useState(false);
  useEffect(()=>setOpen(false),[path]);
  return <aside className={`sidebar ${open?'mobile-open':''}`}>
    <div className="sidebar-top">
      <div className="brand"><span className="logo logo-brand"><Image src="/wms-acis-icon.png" alt="WMS ACIS" width={36} height={36} priority /></span><div><span>WMS ACIS</span><small>Inventory & Warehouse</small></div></div>
      <button className="menu-toggle" type="button" aria-label="Buka menu" aria-expanded={open} onClick={()=>setOpen(v=>!v)}>{open?'×':'☰'}</button>
    </div>
    <nav className="nav">{items.map(([href,icon,label])=><Link className={path===href?'active':''} key={href} href={href}><span className="nav-icon">{icon}</span><span>{label}</span>{label==='AOLINX'&&<b className="nav-pill">API</b>}</Link>)}</nav>
    <div className="sidebar-foot"><div className="avatar">AG</div><div><strong>Admin Gudang</strong><small>Administrator</small></div></div>
  </aside>
}

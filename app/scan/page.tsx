"use client";
import Link from"next/link";
import{useEffect,useRef,useState}from"react";
import PageHeader from"@/components/PageHeader";
import type{Product}from"@/lib/types";

const actions=[
  {href:'/inbound',icon:'↓',title:'Terima Barang',desc:'Tambahkan stok ke rak tujuan',tone:'green'},
  {href:'/outbound',icon:'↑',title:'Kirim Barang',desc:'Keluarkan stok dari lokasi',tone:'red'},
  {href:'/rack-transfer',icon:'↔',title:'Pindah Rak',desc:'Relokasi dalam gudang yang sama',tone:'blue'},
  {href:'/warehouse-transfer',icon:'⇄',title:'Pindah Gudang',desc:'Transfer ke gudang lain',tone:'purple'},
  {href:'/stock-opname',icon:'✓',title:'Stock Opname',desc:'Cocokkan stok fisik dan sistem',tone:'amber'},
  {href:'/stock',icon:'◫',title:'Lihat Stok',desc:'Lihat detail stok per lokasi',tone:'slate'},
] as const;

export default function Scan(){
 const videoRef=useRef<HTMLVideoElement>(null),streamRef=useRef<MediaStream|null>(null),timerRef=useRef<any>(null);
 const[code,setCode]=useState(''),[product,setProduct]=useState<Product|null>(null),[msg,setMsg]=useState(''),[running,setRunning]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>()=>stopCamera(),[]);
 async function lookup(raw:string){const v=raw.trim();if(!v)return;setBusy(true);setCode(v);setMsg('');try{const r=await fetch('/api/products?barcode='+encodeURIComponent(v));const rows=await r.json();if(rows[0]){setProduct(rows[0]);return}const r2=await fetch('/api/products?q='+encodeURIComponent(v));const rows2=await r2.json();setProduct(rows2[0]||null);if(!rows2[0])setMsg('Produk tidak ditemukan. Tambahkan barcode di menu Produk.')}finally{setBusy(false)}}
 async function startCamera(){setMsg('');const BD=(window as any).BarcodeDetector;if(!BD){setMsg('Browser ini belum mendukung scan kamera native. Gunakan Chrome/Edge Android, scanner USB, atau input manual.');return}try{const stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});streamRef.current=stream;if(videoRef.current){videoRef.current.srcObject=stream;await videoRef.current.play()}setRunning(true);const detector=new BD({formats:['ean_13','ean_8','code_128','code_39','upc_a','upc_e','qr_code']});timerRef.current=setInterval(async()=>{if(!videoRef.current)return;try{const codes=await detector.detect(videoRef.current);if(codes?.[0]?.rawValue){await lookup(codes[0].rawValue);stopCamera()}}catch{}},450)}catch{setMsg('Kamera tidak bisa dibuka. Pastikan izin kamera diberikan dan situs memakai HTTPS.')}}
 function stopCamera(){if(timerRef.current)clearInterval(timerRef.current);timerRef.current=null;streamRef.current?.getTracks().forEach(t=>t.stop());streamRef.current=null;setRunning(false)}
 function reset(){setProduct(null);setCode('');setMsg('');setTimeout(()=>document.getElementById('scan-input')?.focus(),50)}
 const query=product?`?product=${encodeURIComponent(product.id)}&from=scan&open=1`:'';
 return <><PageHeader title="Scan Barcode" subtitle="Scan sekali, lalu pilih tindakan untuk barang tersebut"/>
 <div className="scan-wrap scan-v2">
  <section className="video-box scan-camera">
   <video ref={videoRef} muted playsInline/>
   <div className="scan-frame"><i/><i/><i/><i/><span className="scan-line"/></div>
   {!running&&<div className="camera-placeholder"><div className="camera-icon">⌁</div><strong>Siap scan barcode</strong><span>Gunakan kamera HP, scanner USB, atau input manual</span></div>}
   <div className="camera-actions"><button className="btn btn-blue" onClick={running?stopCamera:startCamera}>{running?'Stop Kamera':'Buka Kamera'}</button></div>
  </section>
  <section className="scan-side">
   <div className="card scan-search-card"><div className="field"><label>Barcode / SKU</label><div className="scan-input-row"><input id="scan-input" autoFocus value={code} onChange={e=>setCode(e.target.value)} onKeyDown={e=>e.key==='Enter'&&lookup(code)} placeholder="Scan atau ketik barcode..."/><button className="btn btn-light" disabled={busy} onClick={()=>lookup(code)}>{busy?'Mencari...':'Cari'}</button></div></div></div>
   {product?<div className="card product-result product-found">
    <div className="product-found-head"><div className="product-avatar">▣</div><div><span className="eyebrow">BARANG DITEMUKAN</span><h2>{product.name}</h2><div className="product-meta"><span>{product.sku}</span><span>{product.barcode||'Tanpa barcode'}</span></div></div><button className="icon-btn" title="Scan ulang" onClick={reset}>↻</button></div>
    <div className="product-stats"><div><span>Stok total</span><strong>{product.total_stock} {product.unit}</strong></div><div><span>Lokasi</span><strong>{product.locations||'-'}</strong></div></div>
    <div className="action-title"><strong>Mau diapakan barang ini?</strong><span>Pilih transaksi berikut</span></div>
    <div className="scan-action-grid">{actions.map(a=><Link key={a.href} href={`${a.href}${query}`} className={`scan-action ${a.tone}`}><b>{a.icon}</b><div><strong>{a.title}</strong><span>{a.desc}</span></div><em>›</em></Link>)}</div>
    <Link href={`/products?product=${encodeURIComponent(product.id)}`} className="other-action">⚙ Kelola master produk</Link>
   </div>:<div className="card scan-empty"><div className="scan-empty-icon">▦</div><strong>Belum ada barang dipilih</strong><span>Setelah barcode terbaca, detail barang dan seluruh pilihan transaksi akan muncul di sini.</span></div>}
   {msg&&<div className="notice error">{msg}</div>}
  </section>
 </div></>}

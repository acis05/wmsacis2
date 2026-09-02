"use client";
import {FormEvent,useEffect,useState} from "react";
import PageHeader from "@/components/PageHeader";
import type{Product}from"@/lib/types";

type EditableProduct=Product&{category?:string|null;unit:string;min_stock:number;barcode?:string|null};
const empty={id:'',sku:'',name:'',barcode:'',category:'',unit:'pcs',min_stock:0,total_stock:0,locations:''} as EditableProduct;

export default function Products(){
 const[items,setItems]=useState<EditableProduct[]>([]),[q,setQ]=useState(''),[msg,setMsg]=useState(''),[editing,setEditing]=useState<EditableProduct|null>(null),[open,setOpen]=useState(false);
 const load=async()=>{const r=await fetch('/api/products'+(q?'?q='+encodeURIComponent(q):''));const j=await r.json();if(!r.ok){setItems([]);setMsg(j.error||'Gagal memuat produk');return}setItems(Array.isArray(j)?j:[])};
 useEffect(()=>{load()},[]);
 function add(){setEditing({...empty});setMsg('');setOpen(true)}
 function edit(p:EditableProduct){setEditing({...p});setMsg('');setOpen(true)}
 async function save(e:FormEvent<HTMLFormElement>){
  e.preventDefault();setMsg('');const f=new FormData(e.currentTarget);const body:any=Object.fromEntries(f);if(editing?.id)body.id=editing.id;
  const r=await fetch('/api/products',{method:editing?.id?'PUT':'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});const j=await r.json();
  if(!r.ok)return setMsg(j.error||'Gagal menyimpan produk');setOpen(false);setEditing(null);setMsg(editing?.id?'Produk berhasil diperbarui':'Produk berhasil ditambahkan');load();
 }
 async function del(p:EditableProduct){if(!confirm(`Hapus ${p.name}? Riwayat transaksi tetap disimpan.`))return;setMsg('');const r=await fetch('/api/products?id='+encodeURIComponent(p.id),{method:'DELETE'});const j=await r.json();if(!r.ok)return setMsg(j.error||'Gagal menghapus produk');setMsg('Produk berhasil dihapus');load()}
 return <><PageHeader title="Produk" subtitle="Master SKU, barcode dan QR produk" actions={<button className="btn btn-primary" onClick={add}>＋ Tambah Produk</button>}/>
 {msg&&<div className={msg.includes('berhasil')?'notice success-notice':'notice error'}>{msg}</div>}
 <section className="card"><div className="section-head"><div><h2>Daftar Produk</h2><p className="muted">{items.length} produk aktif</p></div><div className="toolbar"><input className="search" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load()} placeholder="Cari SKU, nama, barcode..."/><button className="btn btn-light" onClick={load}>Cari</button></div></div>
 <div className="table-wrap"><table className="table"><thead><tr><th>Produk</th><th>SKU</th><th>Barcode / QR</th><th>Lokasi</th><th>Stok</th><th>Min.</th><th className="actions-col">Aksi</th></tr></thead><tbody>{items.length?items.map(p=><tr key={p.id}><td><strong>{p.name}</strong><div className="muted">{p.category||'-'} · {p.unit}</div></td><td>{p.sku}</td><td>{p.barcode||'-'}</td><td>{p.locations||'-'}</td><td>{p.total_stock}</td><td>{p.min_stock}</td><td><div className="row-actions"><button className="icon-btn" title="Edit" onClick={()=>edit(p)}>✎</button><button className="icon-btn danger-btn" title="Hapus" onClick={()=>del(p)}>⌫</button></div></td></tr>):<tr><td colSpan={7}><div className="empty-state">Belum ada produk.</div></td></tr>}</tbody></table></div></section>
 {open&&editing&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><div className="modal"><div className="modal-head"><div><h2>{editing.id?'Edit':'Tambah'} Produk</h2><p>Barcode bersifat opsional dan harus unik jika diisi.</p></div><button className="icon-btn" onClick={()=>setOpen(false)}>×</button></div><form className="form-grid" onSubmit={save}>
 <div className="field"><label>SKU *</label><input name="sku" required defaultValue={editing.sku}/></div><div className="field"><label>Nama Produk *</label><input name="name" required defaultValue={editing.name}/></div><div className="field"><label>Barcode / nilai QR</label><input name="barcode" defaultValue={editing.barcode||''} placeholder="8999999001234 atau kode QR"/></div><div className="field"><label>Kategori</label><input name="category" defaultValue={editing.category||''}/></div><div className="field"><label>Satuan</label><select name="unit" defaultValue={editing.unit||'pcs'}><option>pcs</option><option>box</option><option>carton</option><option>pack</option></select></div><div className="field"><label>Minimum stok</label><input name="min_stock" type="number" min="0" defaultValue={editing.min_stock||0}/></div><div className="span2 modal-actions"><button type="button" className="btn btn-secondary" onClick={()=>setOpen(false)}>Batal</button><button className="btn btn-primary">Simpan Produk</button></div>
 </form></div></div>}</>;
}

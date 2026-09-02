"use client";
import {FormEvent,useEffect,useState} from 'react';
import PageHeader from '@/components/PageHeader';

export default function Page(){
  const [w,setW]=useState<any[]>([]),[l,setL]=useState<any[]>([]),[msg,setMsg]=useState(''),[error,setError]=useState(''),[savingWh,setSavingWh]=useState(false),[savingRack,setSavingRack]=useState(false);

  async function load(){
    try{
      const [wr,lr]=await Promise.all([fetch('/api/warehouses',{cache:'no-store'}),fetch('/api/locations',{cache:'no-store'})]);
      const [a,b]=await Promise.all([wr.json(),lr.json()]);
      if(!wr.ok)throw new Error(a.error||'Gagal memuat gudang');
      if(!lr.ok)throw new Error(b.error||'Gagal memuat rak');
      setW(Array.isArray(a)?a:[]); setL(Array.isArray(b)?b:[]);
    }catch(e:any){setError(e.message||'Gagal memuat master gudang & rak')}
  }
  useEffect(()=>{load()},[]);

  async function addWh(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=e.currentTarget;
    const f=Object.fromEntries(new FormData(form));
    setMsg('');setError('');setSavingWh(true);
    try{
      const r=await fetch('/api/warehouses',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(f)});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||'Gagal menambah gudang');
      form.reset(); await load(); setMsg(`Gudang “${j.name}” berhasil ditambahkan.`);
    }catch(e:any){setError(e.message||'Gagal menambah gudang')}
    finally{setSavingWh(false)}
  }

  async function addRack(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const form=e.currentTarget;
    const f=Object.fromEntries(new FormData(form));
    setMsg('');setError('');setSavingRack(true);
    try{
      const r=await fetch('/api/locations',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(f)});
      const j=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(j.error||'Gagal menambah rak');
      form.reset(); await load(); setMsg(`Rak “${j.name}” berhasil ditambahkan.`);
    }catch(e:any){setError(e.message||'Gagal menambah rak')}
    finally{setSavingRack(false)}
  }

  return <>
    <PageHeader title="Gudang & Rak" subtitle="Struktur lokasi penyimpanan untuk inventory"/>
    {msg&&<div className="notice">✓ {msg}</div>}
    {error&&<div className="notice" style={{borderColor:'#fecaca',background:'#fff1f2',color:'#991b1b'}}>⚠ {error}</div>}
    <div className="grid2">
      <section className="card">
        <div className="card-head"><h2>⌂ Tambah Gudang</h2></div>
        <form className="form-grid" onSubmit={addWh}>
          <div className="field"><label>Kode</label><input name="code" required maxLength={50} placeholder="WH-JKT" autoComplete="off"/></div>
          <div className="field"><label>Nama Gudang</label><input name="name" required maxLength={140} placeholder="Gudang Jakarta" autoComplete="off"/></div>
          <div className="field span2"><label>Alamat</label><input name="address" placeholder="Opsional" autoComplete="off"/></div>
          <div className="span2"><button type="submit" disabled={savingWh} className="btn btn-primary">{savingWh?'Menyimpan...':'＋ Tambah Gudang'}</button></div>
        </form>
      </section>
      <section className="card">
        <div className="card-head"><h2>⌖ Tambah Rak</h2></div>
        <form className="form-grid" onSubmit={addRack}>
          <div className="field"><label>Gudang</label><select name="warehouse_id" required defaultValue=""><option value="">Pilih gudang</option>{w.map(x=><option value={x.id} key={x.id}>{x.code} · {x.name}</option>)}</select></div>
          <div className="field"><label>Kode Rak</label><input name="code" required maxLength={50} placeholder="A-01" autoComplete="off"/></div>
          <div className="field span2"><label>Nama Rak</label><input name="name" required maxLength={120} placeholder="Rak A-01" autoComplete="off"/></div>
          <div className="span2"><button type="submit" disabled={savingRack||w.length===0} className="btn btn-secondary">{savingRack?'Menyimpan...':'＋ Tambah Rak'}</button></div>
          {w.length===0&&<div className="span2 muted">Buat minimal satu gudang sebelum menambahkan rak.</div>}
        </form>
      </section>
    </div>
    <section className="card section-gap">
      <div className="card-head"><h2>Daftar Lokasi</h2><span className="muted">{w.length} gudang · {l.length} rak</span></div>
      {w.length===0?<div className="empty">Belum ada gudang. Tambahkan gudang pertama di form di atas.</div>:<div className="warehouse-cards">{w.map(x=><div className="warehouse-card" key={x.id}><div className="warehouse-icon">⌂</div><div><strong>{x.name}</strong><span>{x.code} · {x.rack_count} rak</span>{x.address&&<span>{x.address}</span>}<div className="rack-list">{l.filter(a=>a.warehouse_id===x.id).length?l.filter(a=>a.warehouse_id===x.id).map(a=><b key={a.id} title={a.name}>{a.code}</b>):<span className="muted">Belum ada rak</span>}</div></div></div>)}</div>}
    </section>
  </>;
}

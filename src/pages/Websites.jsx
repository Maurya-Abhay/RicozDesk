import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Loading from '../components/Loading';
import { Globe2, Plus, ExternalLink, RefreshCw, AlertCircle } from 'lucide-react';

export default function Websites() {
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', url: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = async () => {
    setLoading(true); setError('');
    const { data, error: fetchError } = await supabase.from('websites').select('*, tickets(id)').order('created_at', { ascending: false });
    if (fetchError) setError(fetchError.message);
    setWebsites(data || []); setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const addWebsite = async (event) => {
    event.preventDefault(); setError(''); setSaving(true);
    const url = form.url.trim();
    if (!/^https?:\/\//i.test(url)) { setError('Enter a full URL starting with https://'); setSaving(false); return; }
    const { error: insertError } = await supabase.from('websites').insert({ name: form.name.trim(), url, status: 'Active' });
    if (insertError) setError(insertError.message);
    else { setForm({ name: '', url: '' }); setShowForm(false); await load(); }
    setSaving(false);
  };
  const toggleStatus = async (site) => {
    const next = site.status === 'Active' ? 'Inactive' : 'Active';
    const { error: updateError } = await supabase.from('websites').update({ status: next }).eq('id', site.id);
    if (updateError) setError(updateError.message);
    else setWebsites((current) => current.map((item) => item.id === site.id ? { ...item, status: next } : item));
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="section-heading-row"><div><h2 className="page-title">Website management</h2><p className="page-subtitle">Register every company website. Support selects the affected website when creating a ticket.</p></div><div style={{ display: 'flex', gap: 8 }}><button className="btn btn-outline" onClick={load}><RefreshCw size={15}/></button><button className="btn btn-primary" onClick={() => setShowForm((value) => !value)}><Plus size={16}/> Add website</button></div></div>
      {error && <div className="card inline-error"><AlertCircle size={16}/>{error}</div>}
      {showForm && <form className="card" onSubmit={addWebsite}><h3 className="form-section-title">Add company website</h3><div className="grid-2"><div className="form-group"><label>Website name *</label><input className="form-control" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Customer portal"/></div><div className="form-group"><label>Website URL *</label><input className="form-control" type="url" required value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://portal.company.com"/></div></div><button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save website'}</button><button className="btn btn-outline" type="button" onClick={() => setShowForm(false)} style={{ marginLeft: 8 }}>Cancel</button></form>}
      <div className="website-kpis"><div className="card"><Globe2/><span>Registered websites</span><b>{websites.length}</b></div><div className="card"><span>Active</span><b>{websites.filter((site) => site.status === 'Active').length}</b></div><div className="card"><span>Inactive</span><b>{websites.filter((site) => site.status !== 'Active').length}</b></div></div>
      {loading ? <Loading/> : <div className="website-list">{websites.map((site) => <article className="card website-card" key={site.id}><span className="website-icon"><Globe2 size={19}/></span><div className="website-card-main"><b>{site.name}</b><a href={site.url} target="_blank" rel="noreferrer">{site.url} <ExternalLink size={12}/></a><small>{site.tickets?.length || 0} linked tickets</small></div><span className={`website-status ${site.status.toLowerCase()}`}>{site.status}</span><button className="btn btn-outline" onClick={() => toggleStatus(site)}>{site.status === 'Active' ? 'Deactivate' : 'Activate'}</button></article>)}{!websites.length && <div className="card empty-state">No websites yet. Add the company's first website.</div>}</div>}
    </div>
  );
}

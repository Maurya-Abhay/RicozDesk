import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Timer, ShieldCheck, Save, LogOut, AlertCircle } from 'lucide-react';

const DEFAULTS = [
  { priority: 'Critical', first_response_hours: 0.25, resolution_hours: 2 },
  { priority: 'High', first_response_hours: 0.5, resolution_hours: 8 },
  { priority: 'Medium', first_response_hours: 4, resolution_hours: 24 },
  { priority: 'Low', first_response_hours: 8, resolution_hours: 48 },
];

export default function Settings({ userProfile }) {
  const [policies, setPolicies] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    supabase.from('sla_policies').select('priority,first_response_hours,resolution_hours').then(({ data, error: queryError }) => {
      if (!active) return;
      if (queryError) setError(queryError.message);
      if (data?.length) setPolicies(DEFAULTS.map((fallback) => data.find((item) => item.priority === fallback.priority) || fallback));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);
  const update = (priority, field, value) => setPolicies((current) => current.map((item) => item.priority === priority ? { ...item, [field]: Number(value) } : item));
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setMessage(''); setError('');
    const invalid = policies.some((item) => !Number.isFinite(item.first_response_hours) || !Number.isFinite(item.resolution_hours) || item.first_response_hours <= 0 || item.resolution_hours <= 0 || item.first_response_hours > item.resolution_hours);
    if (invalid) { setError('Each priority needs positive targets, and first response must be less than or equal to resolution time.'); setSaving(false); return; }
    const { error: saveError } = await supabase.from('sla_policies').upsert(policies.map((item) => ({ ...item, updated_by: userProfile.id, updated_at: new Date().toISOString() })), { onConflict: 'priority' });
    if (saveError) setError(saveError.message); else setMessage('SLA targets saved. New tickets will use these values. Existing ticket deadlines are unchanged.');
    setSaving(false);
  };
  const signOut = async () => { await supabase.auth.signOut(); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }}>
      <div><h2 className="page-title">Workspace settings</h2><p className="page-subtitle">Manage service-level targets and your company account.</p></div>
      {error && <div className="card inline-error"><AlertCircle size={16}/>{error}</div>}{message && <div className="card success-message">{message}</div>}
      <form className="card settings-policy-card" onSubmit={save}><div className="section-heading-row"><div><h3 className="section-title">SLA response and resolution targets</h3><p className="section-subtitle">These values are defaults for newly created tickets. Confirm approved company timings before go-live.</p></div><Timer size={20}/></div>
        {loading ? <p>Loading service targets...</p> : <><div className="sla-table-head"><span>Priority</span><span>First response target</span><span>Resolution target</span></div>{policies.map((item) => <div className="sla-policy-row" key={item.priority}><b>{item.priority}</b><label><input className="form-control" type="number" min="0.1" max="720" step="0.1" value={item.first_response_hours} onChange={(e) => update(item.priority, 'first_response_hours', e.target.value)}/><span>hours</span></label><label><input className="form-control" type="number" min="0.1" max="720" step="0.1" value={item.resolution_hours} onChange={(e) => update(item.priority, 'resolution_hours', e.target.value)}/><span>hours</span></label></div>)}<button className="btn btn-primary" type="submit" disabled={saving}><Save size={15}/>{saving ? 'Saving...' : 'Save SLA targets'}</button></>}
      </form>
      <section className="card account-settings-card"><div className="section-heading-row"><div><h3 className="section-title">Signed-in account</h3><p className="section-subtitle">Your role controls which of the three portals you can access.</p></div><ShieldCheck size={20}/></div><div className="account-info-grid"><div><small>Name</small><b>{userProfile.full_name}</b></div><div><small>Email</small><b>{userProfile.email}</b></div><div><small>Role</small><b>{userProfile.role}</b></div><div><small>Team</small><b>{userProfile.team || '—'}</b></div></div><button className="btn btn-outline" onClick={signOut}><LogOut size={15}/> Sign out</button></section>
    </div>
  );
}

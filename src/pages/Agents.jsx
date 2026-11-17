import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import Loading from '../components/Loading';
import { Search, RefreshCw } from 'lucide-react';

const ROLES = [
  { value: 'admin', label: 'System Admin' },
  { value: 'support_manager', label: 'Support Manager' },
  { value: 'support_agent', label: 'Support Agent' },
  { value: 'tech_lead', label: 'Development Lead' },
  { value: 'developer', label: 'Developer' },
];

const ROLE_LABELS = Object.fromEntries(ROLES.map((role) => [role.value, role.label]));

export default function Agents({ userProfile }) {
  const [people, setPeople] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [saving, setSaving] = useState(false);
  const [requestEdits, setRequestEdits] = useState({});

  const canAdmin = userProfile?.role === 'admin';
  const loadPeople = async () => {
    setLoading(true); setError('');
    let request = supabase.from('profiles').select('id,full_name,email,role,team,skills,is_active,created_at').order('created_at', { ascending: false });
    if (!canAdmin) request = request.in('role', ['developer', 'tech_lead']);
    const [{ data, error: fetchError }, { data: requestRows, error: requestError }] = await Promise.all([
      request,
      canAdmin ? supabase.from('role_requests').select('id,user_id,full_name,email,requested_role,requested_team,requested_skills,status,created_at').eq('status', 'pending').order('created_at', { ascending: true }) : Promise.resolve({ data: [], error: null }),
    ]);
    if (fetchError) setError(fetchError.message);
    if (requestError) setError(requestError.message);
    setPeople(data || []);
    setRequests(requestRows || []);
    setRequestEdits(Object.fromEntries((requestRows || []).map((item) => [item.id, {
      role: item.requested_role,
      team: item.requested_team,
      skills: (item.requested_skills || []).join(', '),
    }])));
    setLoading(false);
  };
  useEffect(() => { loadPeople(); }, [canAdmin]);

  const filtered = people.filter((person) => (filter === 'All' || person.role === filter) && [person.full_name, person.email, person.team].join(' ').toLowerCase().includes(query.toLowerCase()));

  const updatePerson = async (id, field, value) => {
    const patch = field === 'skills' ? { skills: value.split(',').map((item) => item.trim()).filter(Boolean) }
      : field === 'role' ? { role: value, team: ['developer', 'tech_lead'].includes(value) ? 'Engineering' : value === 'admin' ? 'Management' : 'Customer Support' }
      : { [field]: value };
    const { error: updateError } = await supabase.from('profiles').update(patch).eq('id', id);
    if (updateError) setError(updateError.message);
    else setPeople((current) => current.map((person) => person.id === id ? { ...person, ...patch } : person));
  };

  const reviewRequest = async (request, status) => {
    const edit = requestEdits[request.id] || {};
    setSaving(true); setError('');
    const { error: reviewError } = await supabase.rpc('review_role_request', {
      p_request_id: request.id,
      p_status: status,
      p_role: edit.role,
      p_team: edit.team,
      p_skills: (edit.skills || '').split(',').map((item) => item.trim()).filter(Boolean),
    });
    if (reviewError) setError(reviewError.message);
    else {
      const { error: emailError } = await supabase.functions.invoke('password-reset-otp', {
        body: { action: 'access_decision_notification', request_id: request.id, status },
      });
      if (emailError) setError(`Access ${status}, but the notification email could not be sent: ${emailError.message}`);
      await loadPeople();
    }
    setSaving(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="section-heading-row"><div><h2 className="page-title">{canAdmin ? 'People & teams' : 'Development team'}</h2><p className="page-subtitle">{canAdmin ? 'Review access requests and manage approved Support and Technical team members.' : 'View engineers, roles and declared technical skills.'}</p></div><button className="btn btn-outline" onClick={loadPeople}><RefreshCw size={15}/></button></div>
      {error && <div className="card inline-error">{error}</div>}
      {canAdmin && requests.length > 0 && <section className="card"><div className="section-heading-row"><div><h3 className="form-section-title" style={{ marginBottom: 3 }}>Pending access requests</h3><p className="muted small-text">Review the requested role and work area before granting workspace access.</p></div><span className="request-count">{requests.length} pending</span></div><div className="table-responsive"><table className="data-table access-request-table"><thead><tr><th>Applicant</th><th>Requested role</th><th>Team</th><th>Skills / work area</th><th>Actions</th></tr></thead><tbody>{requests.map((request) => { const edit = requestEdits[request.id] || {}; const selectedRole = edit.role || request.requested_role; return <tr key={request.id}><td><b>{request.full_name}</b><small style={{ display: 'block', color: 'var(--color-text-muted)' }}>{request.email}</small></td><td><span className="role-request-label">{ROLE_LABELS[selectedRole] || 'Support Agent'}</span><select aria-label={`Change role for ${request.full_name}`} className="form-control compact-select" value={selectedRole} onChange={(e) => setRequestEdits((current) => ({ ...current, [request.id]: { ...edit, role: e.target.value } }))}>{ROLES.filter((item) => item.value !== 'admin').map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></td><td><select aria-label={`Change team for ${request.full_name}`} className="form-control compact-select" value={edit.team || request.requested_team} onChange={(e) => setRequestEdits((current) => ({ ...current, [request.id]: { ...edit, team: e.target.value } }))}><option>Customer Support</option><option>Management</option><option>Engineering</option></select></td><td><input aria-label={`Change skills for ${request.full_name}`} className="form-control compact-input" value={edit.skills || ''} onChange={(e) => setRequestEdits((current) => ({ ...current, [request.id]: { ...edit, skills: e.target.value } }))}/></td><td><div style={{ display: 'flex', gap: 6 }}><button className="btn btn-primary" disabled={saving} onClick={() => reviewRequest(request, 'approved')}>Approve</button><button className="btn btn-outline" disabled={saving} onClick={() => reviewRequest(request, 'rejected')}>Reject</button></div></td></tr>; })}</tbody></table></div></section>}
      <div className="card team-filters"><label className="search-field"><Search size={16}/><input className="form-control" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search people by name, email or team"/></label><select className="form-control" value={filter} onChange={(e) => setFilter(e.target.value)}><option>All</option>{ROLES.filter((role) => canAdmin || ['developer', 'tech_lead'].includes(role.value)).map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select></div>
      {loading ? <Loading/> : <div className="card table-card" style={{ padding: 0 }}><div className="table-responsive"><table className="data-table"><thead><tr><th>Team member</th><th>Role</th><th>Team</th><th>Skills</th><th>Access</th></tr></thead><tbody>{filtered.map((person) => <tr key={person.id}><td><b>{person.full_name}</b><small style={{ display: 'block', color: 'var(--color-text-muted)' }}>{person.email}</small></td><td>{canAdmin ? <select className="form-control compact-select" value={person.role} onChange={(e) => updatePerson(person.id, 'role', e.target.value)}>{ROLES.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select> : ROLES.find((role) => role.value === person.role)?.label}</td><td>{canAdmin ? <select className="form-control compact-select" value={person.team || ''} onChange={(e) => updatePerson(person.id, 'team', e.target.value)}><option>Management</option><option>Customer Support</option><option>Engineering</option></select> : person.team || '—'}</td><td>{canAdmin && person.role === 'developer' ? <input className="form-control compact-input" defaultValue={(person.skills || []).join(', ')} onBlur={(e) => updatePerson(person.id, 'skills', e.target.value)}/> : (person.skills || []).join(', ') || '—'}</td><td>{canAdmin ? <select className="form-control compact-select" value={person.is_active ? 'Active' : 'Inactive'} onChange={(e) => updatePerson(person.id, 'is_active', e.target.value === 'Active')}><option>Active</option><option>Inactive</option></select> : (person.is_active ? 'Active' : 'Inactive')}</td></tr>)}</tbody></table></div>{!filtered.length && <div className="empty-state">No matching users found.</div>}</div>}
    </div>
  );
}

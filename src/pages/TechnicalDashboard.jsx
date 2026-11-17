import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Loading from '../components/Loading';
import StatCard from '../components/StatCard';
import TicketTable from '../components/TicketTable';
import { Code2, Clock, CheckCircle, AlertTriangle, Users } from 'lucide-react';

export default function TechnicalDashboard({ userProfile }) {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isLead = userProfile?.role === 'tech_lead';
  const load = async () => {
    setLoading(true); setError('');
    let ticketQuery = supabase.from('tickets').select('*, websites(name)').eq('assigned_team', 'Engineering').order('created_at', { ascending: false });
    if (!isLead && userProfile?.id) ticketQuery = ticketQuery.eq('tech_owner_id', userProfile.id);
    const [{ data, error: queryError }, { data: people }] = await Promise.all([
      ticketQuery,
      supabase.from('profiles').select('id,full_name,email,skills,is_active').eq('role', 'developer').eq('is_active', true),
    ]);
    if (queryError) setError(queryError.message);
    const rows = data || [];
    const ownerIds = [...new Set(rows.flatMap((item) => [item.support_owner_id, item.tech_owner_id]).filter(Boolean))];
    let profiles = [];
    if (ownerIds.length) { const { data: names } = await supabase.from('profiles').select('id,full_name').in('id', ownerIds); profiles = names || []; }
    const byId = Object.fromEntries(profiles.map((person) => [person.id, person]));
    setTickets(rows.map((item) => ({ ...item, support_profile: byId[item.support_owner_id], developer_profile: byId[item.tech_owner_id] })));
    setDevelopers(people || []); setLoading(false);
  };
  useEffect(() => { load(); }, [userProfile?.id]);
  const assigned = tickets.filter((item) => item.tech_owner_id);
  const unassigned = tickets.filter((item) => !item.tech_owner_id && !['Resolved', 'Closed'].includes(item.status));
  const progress = tickets.filter((item) => item.status === 'In Progress');
  const ready = tickets.filter((item) => item.status === 'Fix Ready' || item.status === 'Verification');
  const breached = tickets.filter((item) => item.sla_due_at && new Date(item.sla_due_at) < new Date() && !['Resolved', 'Closed'].includes(item.status));
  if (loading) return <Loading/>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="section-heading-row"><div><h2 className="page-title">{isLead ? 'Engineering operations' : 'My development work'}</h2><p className="page-subtitle">{isLead ? 'Review escalated issues, assign the right developer and monitor team workload.' : 'Work on issues assigned to you and return fixes to Support for verification.'}</p></div><button className="btn btn-outline" onClick={() => navigate('/tickets')}>Open development queue</button></div>
      {error && <div className="card inline-error">{error}</div>}
      <div className="grid-4"><StatCard title={isLead ? 'Engineering tickets' : 'My assigned issues'} value={tickets.length} icon={Code2} color="#ede9fe"/><StatCard title="Unassigned issues" value={isLead ? unassigned.length : 0} icon={AlertTriangle} color="#fee2e2"/><StatCard title="In progress" value={progress.length} icon={Clock} color="#fef3c7"/><StatCard title="Fix ready / verification" value={ready.length} icon={CheckCircle} color="#dcfce7"/></div>
      {isLead && <section className="card"><div className="section-heading-row"><div><h3 className="section-title">Developer capacity</h3><p className="section-subtitle">Current active developers and assigned open work.</p></div><Users size={20}/></div><div className="developer-capacity-grid">{developers.map((person) => { const count = tickets.filter((item) => item.tech_owner_id === person.id && !['Resolved', 'Closed'].includes(item.status)).length; return <div className="developer-capacity" key={person.id}><b>{person.full_name}</b><span>{(person.skills || []).slice(0, 2).join(' · ') || 'General engineering'}</span><strong>{count} active issue{count === 1 ? '' : 's'}</strong></div>; })}</div></section>}
      {isLead && <section><h3 className="section-title" style={{ marginBottom: 12 }}>Needs developer assignment</h3><TicketTable tickets={unassigned} loading={false}/></section>}
      <section><div className="section-heading-row"><div><h3 className="section-title">{isLead ? 'Engineering queue' : 'Tickets assigned to me'}</h3><p className="section-subtitle">Technical issues currently assigned to the engineering team.</p></div><span className="muted small-text">{breached.length} SLA breached</span></div><TicketTable tickets={tickets} loading={false}/></section>
    </div>
  );
}

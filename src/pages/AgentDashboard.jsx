import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import StatCard from '../components/StatCard';
import TicketTable from '../components/TicketTable';
import Loading from '../components/Loading';
import { AlertCircle, Clock, CheckCircle, Plus, Mail, Phone, ArrowUpRight } from 'lucide-react';

export default function AgentDashboard({ userProfile }) {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [supportAgents, setSupportAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const isManager = userProfile?.role === 'support_manager';
  const load = async () => {
    setLoading(true); setError('');
    const [{ data, error: fetchError }, { data: agentRows }] = await Promise.all([
      supabase.from('tickets').select('*, websites(name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id,full_name,email').eq('role', 'support_agent').eq('is_active', true).order('full_name'),
    ]);
    if (fetchError) setError(fetchError.message);
    const rows = data || [];
    const ownerIds = [...new Set(rows.flatMap((item) => [item.support_owner_id, item.tech_owner_id]).filter(Boolean))];
    let profiles = [];
    if (ownerIds.length) { const { data: people } = await supabase.from('profiles').select('id,full_name').in('id', ownerIds); profiles = people || []; }
    const byId = Object.fromEntries(profiles.map((person) => [person.id, person]));
    setTickets(rows.map((item) => ({ ...item, support_profile: byId[item.support_owner_id], developer_profile: byId[item.tech_owner_id] })));
    setSupportAgents(agentRows || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [userProfile?.id]);
  const openTickets = tickets.filter((item) => !['Resolved', 'Closed'].includes(item.status));
  const pending = tickets.filter((item) => ['Waiting', 'Under Review', 'Verification'].includes(item.status));
  const resolved = tickets.filter((item) => ['Resolved', 'Closed'].includes(item.status));
  const urgent = openTickets.filter((item) => ['Critical', 'High'].includes(item.priority));
  const sources = useMemo(() => ({ phone: tickets.filter((item) => item.source === 'Phone').length, email: tickets.filter((item) => item.source === 'Email').length }), [tickets]);
  if (loading) return <Loading/>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="section-heading-row"><div><h2 className="page-title">{isManager ? 'Support operations' : 'My support workspace'}</h2><p className="page-subtitle">Capture customer problems, keep ownership clear and hand technical issues to Engineering.</p></div><button className="btn btn-primary" onClick={() => navigate('/tickets/create')}><Plus size={16}/> Create ticket</button></div>
      {error && <div className="card inline-error">{error}</div>}
      <div className="grid-4"><StatCard title={isManager ? 'Active support tickets' : 'My active tickets'} value={openTickets.length} icon={AlertCircle} color="#fee2e2"/><StatCard title="Waiting / review" value={pending.length} icon={Clock} color="#fef3c7"/><StatCard title="Resolved / closed" value={resolved.length} icon={CheckCircle} color="#dcfce7"/><StatCard title="High / critical" value={urgent.length} icon={ArrowUpRight} color="#fce7f3"/></div>
      <div className="grid-2"><div className="card support-channel-card"><div><Phone/><span>Phone call tickets</span><b>{sources.phone}</b></div><p>Complaints recorded by Support after a customer phone call.</p></div><div className="card support-channel-card"><div><Mail/><span>Email tickets</span><b>{sources.email}</b></div><p>Email requests manually recorded with their original subject and message.</p></div></div>
      {isManager && <section className="card"><div className="section-heading-row"><div><h3 className="section-title">Support team workload</h3><p className="section-subtitle">Open tickets currently owned by each active support agent.</p></div></div><div className="agent-workload-list">{supportAgents.map((agent) => { const owned = tickets.filter((ticket) => ticket.support_owner_id === agent.id); const active = owned.filter((ticket) => !['Resolved', 'Closed'].includes(ticket.status)).length; const done = owned.filter((ticket) => ['Resolved', 'Closed'].includes(ticket.status)).length; return <div className="agent-workload-row" key={agent.id}><span><b>{agent.full_name}</b><small>{agent.email}</small></span><strong>{active} active</strong><small>{done} resolved / closed</small></div>; })}{!supportAgents.length && <p className="muted small-text">No active support agents are configured.</p>}</div></section>}
      <section><div className="section-heading-row"><div><h3 className="section-title">Tickets needing attention</h3><p className="section-subtitle">Active customer requests visible to your support role.</p></div><button className="btn btn-outline" onClick={() => navigate('/tickets')}>Open ticket queue</button></div><TicketTable tickets={openTickets.slice(0, 10)} loading={false}/></section>
    </div>
  );
}

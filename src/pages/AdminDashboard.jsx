import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import StatCard from '../components/StatCard';
import TicketTable from '../components/TicketTable';
import Loading from '../components/Loading';
import { Ticket, Clock, CheckCircle, AlertTriangle, Globe2, Users, UserRoundCheck, Plus } from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [userCount, setUserCount] = useState(0);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = async () => {
    setLoading(true); setError('');
    const [{ data: ticketRows, error: ticketError }, { data: siteRows }, { count }, { count: requestCount, error: requestError }] = await Promise.all([
      supabase.from('tickets').select('*, websites(name)').order('created_at', { ascending: false }),
      supabase.from('websites').select('id,name,url,status'),
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('role_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);
    if (ticketError) setError(ticketError.message);
    if (requestError) setError(requestError.message);
    const rows = ticketRows || [];
    const ids = [...new Set(rows.flatMap((item) => [item.support_owner_id, item.tech_owner_id]).filter(Boolean))];
    let profiles = [];
    if (ids.length) { const { data } = await supabase.from('profiles').select('id,full_name').in('id', ids); profiles = data || []; }
    const byId = Object.fromEntries(profiles.map((item) => [item.id, item]));
    setTickets(rows.map((item) => ({ ...item, support_profile: byId[item.support_owner_id], developer_profile: byId[item.tech_owner_id] })));
    setWebsites(siteRows || []); setUserCount(count || 0); setPendingRequests(requestCount || 0); setLoading(false);
  };
  useEffect(() => { load(); }, []);
  const active = tickets.filter((ticket) => !['Resolved', 'Closed'].includes(ticket.status));
  const breached = active.filter((ticket) => ticket.sla_due_at && new Date(ticket.sla_due_at) < new Date());
  const resolved = tickets.filter((ticket) => ['Resolved', 'Closed'].includes(ticket.status));
  const counts = useMemo(() => ({ support: tickets.filter((ticket) => ticket.assigned_team !== 'Engineering').length, engineering: tickets.filter((ticket) => ticket.assigned_team === 'Engineering').length }), [tickets]);
  if (loading) return <Loading/>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div className="section-heading-row"><div><h2 className="page-title">Company overview</h2><p className="page-subtitle">One operational view across all registered websites, support and engineering.</p></div><button className="btn btn-primary" onClick={() => navigate('/websites')}><Plus size={16}/> Manage websites</button></div>
      {error && <div className="card inline-error">{error}</div>}
      <div className="grid-4"><StatCard title="Total tickets" value={tickets.length} icon={Ticket} color="#e0f2fe"/><StatCard title="Open / active" value={active.length} icon={Clock} color="#fef3c7"/><StatCard title="Resolved / closed" value={resolved.length} icon={CheckCircle} color="#dcfce7"/><StatCard title="SLA at risk / breached" value={breached.length} icon={AlertTriangle} color="#fee2e2"/></div>
      <div className="grid-3"><div className="card admin-quick-card"><Globe2/><span>Company websites</span><b>{websites.length}</b><button onClick={() => navigate('/websites')}>Manage websites →</button></div><div className="card admin-quick-card"><Users/><span>Active team members</span><b>{userCount}</b><button onClick={() => navigate('/people')}>Manage people →</button></div><div className="card admin-quick-card"><Ticket/><span>Engineering escalations</span><b>{counts.engineering}</b><button onClick={() => navigate('/tickets')}>View ticket queue →</button></div></div>
      <section className="card admin-request-card"><div><UserRoundCheck size={20}/><div><h3 className="form-section-title">Access requests</h3><p className="muted small-text">{pendingRequests ? `${pendingRequests} new Support or Technical request${pendingRequests === 1 ? '' : 's'} waiting for review.` : 'No pending access requests.'}</p></div></div><button className="btn btn-primary" onClick={() => navigate('/people')}>Review requests</button></section>
      <section><div className="section-heading-row"><div><h3 className="section-title">Recently updated tickets</h3><p className="section-subtitle">Latest customer requests across company properties.</p></div><button className="btn btn-outline" onClick={() => navigate('/tickets')}>View all tickets</button></div><TicketTable tickets={tickets.slice(0, 8)} loading={false}/></section>
      <section className="card"><h3 className="form-section-title">Operational split</h3><div className="split-metrics"><div><span>Customer Support queue</span><b>{counts.support}</b></div><div><span>Engineering queue</span><b>{counts.engineering}</b></div><div><span>Registered websites</span><b>{websites.filter((site) => site.status === 'Active').length} active / {websites.length} total</b></div></div></section>
    </div>
  );
}

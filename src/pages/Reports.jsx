import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import StatCard from '../components/StatCard';
import Loading from '../components/Loading';
import { Ticket, CheckCircle, Clock, AlertTriangle, BarChart2 } from 'lucide-react';

const PRIORITIES = ['Critical', 'High', 'Medium', 'Low'];
const STATUSES = ['New', 'Under Review', 'Assigned', 'In Progress', 'Waiting', 'Fix Ready', 'Verification', 'Reopened', 'Resolved', 'Closed'];

export default function Reports({ userProfile }) {
  const [tickets, setTickets] = useState([]);
  const [websites, setWebsites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([
      supabase.from('tickets').select('id, ticket_number, title, priority, status, category, source, created_at, resolved_at, sla_due_at, website_id, websites(name)'),
      supabase.from('websites').select('id,name'),
    ]).then(([ticketResult, websiteResult]) => {
      if (!active) return;
      if (ticketResult.error) setError(ticketResult.error.message);
      setTickets(ticketResult.data || []); setWebsites(websiteResult.data || []); setLoading(false);
    });
    return () => { active = false; };
  }, [userProfile?.id]);
  const resolved = tickets.filter((item) => ['Resolved', 'Closed'].includes(item.status));
  const activeTickets = tickets.filter((item) => !['Resolved', 'Closed'].includes(item.status));
  const breached = activeTickets.filter((item) => item.sla_due_at && new Date(item.sla_due_at) < new Date());
  const avgResolution = resolved.length ? resolved.reduce((sum, item) => sum + Math.max(0, new Date(item.resolved_at || item.created_at) - new Date(item.created_at)), 0) / resolved.length / 3600000 : null;
  const byPriority = useMemo(() => PRIORITIES.map((priority) => ({ priority, count: tickets.filter((item) => item.priority === priority).length })), [tickets]);
  const byStatus = useMemo(() => STATUSES.map((status) => ({ status, count: tickets.filter((item) => item.status === status).length })).filter((item) => item.count), [tickets]);
  const maxPriority = Math.max(1, ...byPriority.map((item) => item.count));
  const maxStatus = Math.max(1, ...byStatus.map((item) => item.count));
  if (loading) return <Loading/>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div><h2 className="page-title">Operational reports</h2><p className="page-subtitle">Ticket volume, SLA health and outcomes across teams and websites visible to your role.</p></div>
      {error && <div className="card inline-error">{error}</div>}
      <div className="grid-4"><StatCard title="Total tickets" value={tickets.length} icon={Ticket} color="#e0f2fe"/><StatCard title="Active tickets" value={activeTickets.length} icon={Clock} color="#fef3c7"/><StatCard title="Resolved / closed" value={resolved.length} icon={CheckCircle} color="#dcfce7"/><StatCard title="Open SLA breaches" value={breached.length} icon={AlertTriangle} color="#fee2e2"/></div>
      <div className="grid-2"><section className="card report-chart"><h3 className="form-section-title">Tickets by priority</h3>{byPriority.map((item) => <div className="report-meter" key={item.priority}><div><span>{item.priority}</span><b>{item.count}</b></div><div className="report-meter-track"><i style={{ width: `${(item.count / maxPriority) * 100}%` }}/></div></div>)}</section><section className="card report-chart"><h3 className="form-section-title">Ticket status</h3>{byStatus.map((item) => <div className="report-status-row" key={item.status}><span>{item.status}</span><b>{item.count}</b><div className="report-meter-track"><i style={{ width: `${(item.count / maxStatus) * 100}%` }}/></div></div>)}{!byStatus.length && <p className="muted">No ticket data yet.</p>}</section></div>
      <section className="card"><div className="section-heading-row"><div><h3 className="section-title">Website performance</h3><p className="section-subtitle">Ticket volume, resolution and SLA breaches for each registered website.</p></div><BarChart2/></div><div className="table-responsive"><table className="data-table"><thead><tr><th>Website</th><th>Tickets</th><th>Resolved</th><th>Active</th><th>SLA breached</th></tr></thead><tbody>{websites.map((site) => { const rows = tickets.filter((ticket) => ticket.website_id === site.id); const closed = rows.filter((ticket) => ['Resolved', 'Closed'].includes(ticket.status)).length; const overdue = rows.filter((ticket) => !['Resolved', 'Closed'].includes(ticket.status) && ticket.sla_due_at && new Date(ticket.sla_due_at) < new Date()).length; return <tr key={site.id}><td><b>{site.name}</b></td><td>{rows.length}</td><td>{closed}</td><td>{rows.length - closed}</td><td>{overdue}</td></tr>; })}</tbody></table></div></section>
      <section className="card report-summary-grid"><div><span>Average resolution time</span><b>{avgResolution === null ? '—' : `${avgResolution.toFixed(1)} hours`}</b></div><div><span>Resolution rate</span><b>{tickets.length ? `${Math.round((resolved.length / tickets.length) * 100)}%` : '—'}</b></div><div><span>Phone tickets</span><b>{tickets.filter((item) => item.source === 'Phone').length}</b></div><div><span>Email tickets</span><b>{tickets.filter((item) => item.source === 'Email').length}</b></div></section>
      <p className="footnote">SLA calculations use the target values stored on each ticket. Reports are only as accurate as the company's configured SLA policy and ticket records.</p>
    </div>
  );
}

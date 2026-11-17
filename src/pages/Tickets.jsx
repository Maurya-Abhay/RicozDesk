import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import TicketTable from '../components/TicketTable';
import Loading from '../components/Loading';
import { Plus, Search, RefreshCw } from 'lucide-react';

export default function Tickets({ userProfile }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(() => searchParams.get('search') || '');
  const [status, setStatus] = useState('Active');
  const [priority, setPriority] = useState('All');
  const [source, setSource] = useState('All');
  const [website, setWebsite] = useState('All');
  const [websites, setWebsites] = useState([]);

  const fetchTickets = async () => {
    setLoading(true); setError('');
    const [{ data, error: ticketError }, { data: siteData }] = await Promise.all([
      supabase.from('tickets').select('*, websites(name)').order('created_at', { ascending: false }),
      supabase.from('websites').select('id,name').order('name'),
    ]);
    if (ticketError) setError(ticketError.message || 'Tickets could not be loaded.');
    const rows = data || [];
    const ownerIds = [...new Set(rows.flatMap((item) => [item.support_owner_id, item.tech_owner_id]).filter(Boolean))];
    let people = [];
    if (ownerIds.length) {
      const { data: profiles } = await supabase.from('profiles').select('id,full_name').in('id', ownerIds);
      people = profiles || [];
    }
    const byId = Object.fromEntries(people.map((person) => [person.id, person]));
    setTickets(rows.map((item) => ({ ...item, support_profile: byId[item.support_owner_id], developer_profile: byId[item.tech_owner_id] })));
    setWebsites(siteData || []);
    setLoading(false);
  };

  useEffect(() => { fetchTickets(); }, [userProfile?.id]);

  const filtered = useMemo(() => tickets.filter((ticket) => {
    const haystack = [ticket.ticket_number, ticket.title, ticket.customer_name, ticket.customer_email, ticket.customer_phone].join(' ').toLowerCase();
    const matchesSearch = haystack.includes(search.toLowerCase());
    const matchesStatus = status === 'All' || (status === 'Active' ? !['Resolved', 'Closed'].includes(ticket.status) : ticket.status === status);
    const matchesPriority = priority === 'All' || ticket.priority === priority;
    const matchesSource = source === 'All' || ticket.source === source;
    const matchesWebsite = website === 'All' || ticket.website_id === website;
    return matchesSearch && matchesStatus && matchesPriority && matchesSource && matchesWebsite;
  }), [tickets, search, status, priority, source, website]);

  const canCreate = ['admin', 'support_manager', 'support_agent'].includes(userProfile?.role);
  const title = ['developer', 'tech_lead'].includes(userProfile?.role) ? 'Development issue queue' : 'Ticket queue';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div className="section-heading-row"><div><h2 className="page-title">{title}</h2><p className="page-subtitle">All tickets available to your role, across the company websites.</p></div><div style={{ display: 'flex', gap: 8 }}>{canCreate && <button className="btn btn-primary" onClick={() => navigate('/tickets/create')}><Plus size={16}/> Create ticket</button>}<button className="btn btn-outline" onClick={fetchTickets} title="Refresh"><RefreshCw size={15}/></button></div></div>
      {error && <div className="card inline-error">{error}</div>}
      <div className="card ticket-filters"><label className="search-field"><Search size={16}/><input className="form-control" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search ticket ID, customer or issue..."/></label>
        <select className="form-control" value={status} onChange={(event) => setStatus(event.target.value)}><option value="Active">Active tickets</option><option>All</option><option>New</option><option>Under Review</option><option>Assigned</option><option>In Progress</option><option>Waiting</option><option>Fix Ready</option><option>Verification</option><option>Reopened</option><option>Resolved</option><option>Closed</option></select>
        <select className="form-control" value={priority} onChange={(event) => setPriority(event.target.value)}><option>All</option><option>Critical</option><option>High</option><option>Medium</option><option>Low</option></select>
        <select className="form-control" value={source} onChange={(event) => setSource(event.target.value)}><option>All</option><option>Phone</option><option>Email</option></select>
        <select className="form-control" value={website} onChange={(event) => setWebsite(event.target.value)}><option value="All">All websites</option>{websites.map((site) => <option value={site.id} key={site.id}>{site.name}</option>)}</select>
      </div>
      <div className="results-meta">Showing {filtered.length} of {tickets.length} tickets</div>
      {loading ? <Loading/> : <TicketTable tickets={filtered} loading={false}/>}
    </div>
  );
}

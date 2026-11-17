import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Loading from '../components/Loading';
import StatusBadge from '../components/StatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { ArrowLeft, MessageSquare, Send, Timer, History, Code2, Headphones, AlertCircle } from 'lucide-react';

const ALL_STATUSES = ['New', 'Under Review', 'Assigned', 'In Progress', 'Waiting', 'Fix Ready', 'Verification', 'Reopened', 'Resolved', 'Closed'];
const ROLE_STATUS = {
  developer: ['In Progress', 'Waiting', 'Fix Ready'],
  tech_lead: ['Assigned', 'In Progress', 'Waiting', 'Fix Ready'],
  support_agent: ['Under Review', 'Waiting', 'Verification', 'Resolved', 'Closed', 'Reopened'],
  support_manager: ['Under Review', 'Waiting', 'Verification', 'Resolved', 'Closed', 'Reopened'],
};

export default function TicketDetails({ userProfile }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [people, setPeople] = useState([]);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [developers, setDevelopers] = useState([]);
  const [supportAgents, setSupportAgents] = useState([]);
  const [developerWorkload, setDeveloperWorkload] = useState({});
  const [comment, setComment] = useState('');
  const [visibility, setVisibility] = useState('Internal');
  const [tab, setTab] = useState('activity');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const canAdmin = userProfile?.role === 'admin';
  const canSupportManage = ['admin', 'support_manager'].includes(userProfile?.role);
  const canTechnicalAssign = ['admin', 'tech_lead'].includes(userProfile?.role);
  const canUpdateStatus = canAdmin || ROLE_STATUS[userProfile?.role] || [];
  const canManageSupportOwner = canSupportManage;

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const [{ data: row, error: ticketError }, { data: noteRows, error: noteError }, { data: historyRows }, { data: users }] = await Promise.all([
      supabase.from('tickets').select('*, websites(name,url)').eq('id', id).single(),
      supabase.from('ticket_comments').select('*, profiles(full_name, role)').eq('ticket_id', id).order('created_at', { ascending: true }),
      supabase.from('ticket_history').select('*, profiles:profiles!ticket_history_actor_id_fkey(full_name)').eq('ticket_id', id).order('created_at', { ascending: true }),
      supabase.from('profiles').select('id,full_name,email,role,skills,is_active').eq('is_active', true),
    ]);
    const { data: engineeringRows } = ['admin', 'tech_lead'].includes(userProfile?.role)
      ? await supabase.from('tickets').select('tech_owner_id,status').eq('assigned_team', 'Engineering')
      : { data: [] };
    const workload = {};
    (engineeringRows || []).forEach((item) => { if (item.tech_owner_id && !['Resolved', 'Closed'].includes(item.status)) workload[item.tech_owner_id] = (workload[item.tech_owner_id] || 0) + 1; });
    setDeveloperWorkload(workload);
    if (ticketError) { setError(ticketError.message || 'Ticket could not be loaded.'); setTicket(null); }
    else setTicket(row);
    if (noteError) setError((current) => current || noteError.message);
    setComments(noteRows || []);
    setHistory(historyRows || []);
    const activeUsers = users || [];
    setPeople(activeUsers);
    setDevelopers(activeUsers.filter((person) => person.role === 'developer'));
    setSupportAgents(activeUsers.filter((person) => person.role === 'support_agent'));
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const owners = useMemo(() => ({
    support: people.find((person) => person.id === ticket?.support_owner_id),
    developer: people.find((person) => person.id === ticket?.tech_owner_id),
  }), [people, ticket]);

  const addHistory = async (action, details) => {
    const { error: historyError } = await supabase.from('ticket_history').insert({ ticket_id: id, actor_id: userProfile.id, action, details });
    if (historyError) console.error('Could not save ticket history:', historyError.message);
  };

  const updateTicket = async (updates, action, details) => {
    setSaving(true); setError('');
    const patch = { ...updates, updated_at: new Date().toISOString() };
    const { error: updateError } = await supabase.from('tickets').update(patch).eq('id', id);
    if (updateError) { setError(updateError.message); setSaving(false); return false; }
    await addHistory(action, details);
    setTicket((current) => ({ ...current, ...patch }));
    setSaving(false);
    return true;
  };

  const assignDeveloper = async (developerId) => {
    if (!developerId) return;
    const developer = developers.find((person) => person.id === developerId);
    await updateTicket({ tech_owner_id: developerId, assigned_team: 'Engineering', status: 'Assigned', escalated_at: ticket.escalated_at || new Date().toISOString() }, 'developer_assigned', `Assigned to ${developer?.full_name || 'developer'} by ${userProfile.full_name}.`);
  };

  const changeStatus = async (nextStatus) => {
    const updates = { status: nextStatus };
    if (['Resolved', 'Closed'].includes(nextStatus)) updates.resolved_at = new Date().toISOString();
    if (nextStatus === 'Reopened') updates.resolved_at = null;
    await updateTicket(updates, 'status_changed', `Status changed to ${nextStatus} by ${userProfile.full_name}.`);
  };

  const handleComment = async (event) => {
    event.preventDefault();
    if (!comment.trim()) return;
    setSaving(true); setError('');
    const { data, error: insertError } = await supabase.from('ticket_comments').insert({ ticket_id: id, user_id: userProfile.id, comment: comment.trim(), visibility }).select('*, profiles(full_name, role)').single();
    if (insertError) { setError(insertError.message); setSaving(false); return; }
    setComments((current) => [...current, data]);
    await addHistory('comment_added', `${visibility} note added by ${userProfile.full_name}.`);
    setComment(''); setSaving(false);
  };

  if (loading) return <Loading/>;
  if (!ticket) return <div className="card"><p>{error || 'Ticket not found or you do not have access.'}</p><button className="btn btn-outline" onClick={() => navigate('/tickets')}>Back to tickets</button></div>;

  const website = ticket.websites;
  const dueAt = ticket.sla_due_at ? new Date(ticket.sla_due_at) : null;
  const slaState = ['Resolved', 'Closed'].includes(ticket.status) ? 'Completed' : dueAt && dueAt < new Date() ? 'Breached' : 'On track';
  const statuses = canAdmin ? ALL_STATUSES : (Array.isArray(canUpdateStatus) ? canUpdateStatus : []);
  const internalOnly = ['developer', 'tech_lead'].includes(userProfile.role);

  return (
    <div className="ticket-detail-page">
      <button className="btn btn-outline" style={{ marginBottom: 16 }} onClick={() => navigate('/tickets')}><ArrowLeft size={16}/> Back to queue</button>
      {error && <div className="card inline-error"><AlertCircle size={16}/>{error}</div>}
      <div className="ticket-detail-heading"><div><div className="ticket-id-line">RZ-{ticket.ticket_number || String(ticket.id).slice(0, 8)} <span>·</span> {ticket.source} <span>·</span> {ticket.category}</div><h2>{ticket.title}</h2><div className="ticket-heading-meta"><PriorityBadge priority={ticket.priority}/><StatusBadge status={ticket.status}/><span>Created {new Date(ticket.created_at).toLocaleString()}</span></div></div><div className="ticket-sla-card"><Timer size={17}/><div><b>SLA: {slaState}</b><small>{dueAt ? `Resolution target ${dueAt.toLocaleString()}` : 'No resolution deadline set'}</small></div></div></div>
      <div className="ticket-detail-grid">
        <div className="ticket-detail-main">
          <section className="card"><h3 className="form-section-title">Customer issue</h3><p className="ticket-description">{ticket.description}</p><div className="ticket-context-grid"><div><small>Customer</small><b>{ticket.customer_name}</b></div><div><small>Website</small><b>{website?.name || '—'}</b>{website?.url && <a href={website.url} target="_blank" rel="noreferrer">{website.url}</a>}</div><div><small>Phone</small><b>{ticket.customer_phone || 'Not provided'}</b></div><div><small>Email</small><b>{ticket.customer_email || 'Not provided'}</b></div><div><small>Issue category</small><b>{ticket.category}</b></div><div><small>Product module</small><b>{ticket.module || 'Other'}</b></div><div><small>Environment</small><b>{ticket.environment || 'Not provided'}</b></div><div><small>Browser / device</small><b>{ticket.browser_device || 'Not provided'}</b></div>{ticket.affected_url && <div className="wide-context"><small>Affected URL</small><a href={ticket.affected_url} target="_blank" rel="noreferrer">{ticket.affected_url}</a></div>}{ticket.email_subject && <div className="wide-context"><small>Original email subject</small><b>{ticket.email_subject}</b></div>}</div></section>
          <section className="card"><div className="ticket-tabs"><button className={tab === 'activity' ? 'active' : ''} onClick={() => setTab('activity')}><MessageSquare size={15}/> Activity & notes</button><button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}><History size={15}/> History</button></div>
            {tab === 'activity' ? <><div className="ticket-comments">{comments.map((item) => <article className="ticket-comment" key={item.id}><div className="comment-top"><b>{item.profiles?.full_name || 'Team member'}</b><span className={`comment-visibility ${item.visibility.toLowerCase()}`}>{item.visibility}</span><time>{new Date(item.created_at).toLocaleString()}</time></div><p>{item.comment}</p></article>)}{!comments.length && <p className="empty-state">No comments yet. Add the first update below.</p>}</div><form className="comment-entry" onSubmit={handleComment}><label className="form-group"><span>Add a note</span><textarea className="form-control" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Record investigation steps, customer updates or hand-off context..."/></label><div className="comment-actions">{!internalOnly && <select className="form-control" value={visibility} onChange={(e) => setVisibility(e.target.value)}><option value="Internal">Internal note</option><option value="Customer">Customer reply (record only)</option></select>}<button type="submit" className="btn btn-primary" disabled={saving || !comment.trim()}><Send size={15}/> Add note</button></div></form></> : <div className="ticket-history">{history.map((item) => <div className="history-entry" key={item.id}><span className="history-dot"/><div><b>{item.action.replaceAll('_', ' ')}</b><p>{item.details}</p><small>{item.profiles?.full_name || 'System'} · {new Date(item.created_at).toLocaleString()}</small></div></div>)}{!history.length && <p className="empty-state">No history recorded.</p>}</div>}
          </section>
        </div>
        <aside className="ticket-detail-side">
          <section className="card"><h3 className="form-section-title">Ownership & routing</h3><div className="owner-block"><span className="owner-icon support"><Headphones size={17}/></span><div><small>Support owner</small><b>{owners.support?.full_name || 'Unassigned'}</b></div></div>{canManageSupportOwner && <select className="form-control assignment-select" value={ticket.support_owner_id || ''} onChange={(e) => updateTicket({ support_owner_id: e.target.value || null }, 'support_owner_changed', `Support owner changed by ${userProfile.full_name}.`)}><option value="">Unassigned support owner</option>{supportAgents.map((agent) => <option key={agent.id} value={agent.id}>{agent.full_name}</option>)}</select>}
            <div className="owner-block"><span className="owner-icon technical"><Code2 size={17}/></span><div><small>Technical owner</small><b>{owners.developer?.full_name || 'Not assigned'}</b></div></div>
            {canTechnicalAssign && <><label className="form-label">Assign developer</label><select className="form-control assignment-select" value={ticket.tech_owner_id || ''} onChange={(e) => assignDeveloper(e.target.value)}><option value="">Select developer...</option>{developers.map((developer) => <option key={developer.id} value={developer.id}>{developer.full_name} · {(developer.skills || []).join(', ') || 'General'} · {developerWorkload[developer.id] || 0} active</option>)}</select></>}
            {canSupportManage && ticket.assigned_team !== 'Engineering' && !['Resolved', 'Closed'].includes(ticket.status) && <button className="btn btn-outline full-width" onClick={() => updateTicket({ assigned_team: 'Engineering', status: 'Under Review', escalated_at: new Date().toISOString() }, 'escalated', `Escalated to Development by ${userProfile.full_name}.`)}>Escalate to Development</button>}
          </section>
          <section className="card"><h3 className="form-section-title">Ticket controls</h3><div className="form-group"><label>Status</label><select className="form-control" value={ticket.status} disabled={!statuses.length || saving} onChange={(e) => changeStatus(e.target.value)}>{[ticket.status, ...statuses.filter((item) => item !== ticket.status)].map((item) => <option key={item}>{item}</option>)}</select></div><div className="form-group"><label>Priority</label><select className="form-control" value={ticket.priority} disabled={!canAdmin && userProfile.role !== 'support_manager'} onChange={(e) => updateTicket({ priority: e.target.value }, 'priority_changed', `Priority changed to ${e.target.value} by ${userProfile.full_name}.`)}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div><div className="muted tiny-text">Ticket ID: {ticket.id}</div></section>
        </aside>
      </div>
    </div>
  );
}

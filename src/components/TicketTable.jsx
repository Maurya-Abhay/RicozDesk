import React from 'react';
import { useNavigate } from 'react-router-dom';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';

export default function TicketTable({ tickets, loading }) {
  const navigate = useNavigate();
  if (loading) return <div className="card">Loading tickets...</div>;
  if (!tickets?.length) return <div className="card empty-state">No tickets match this view.</div>;

  return (
    <div className="card table-card" style={{ padding: 0 }}>
      <div className="table-responsive">
        <table className="data-table">
          <thead><tr><th>Ticket</th><th>Issue</th><th>Customer</th><th>Website</th><th>Priority</th><th>Status</th><th>Owner</th><th>Created</th></tr></thead>
          <tbody>{tickets.map((ticket) => (
            <tr key={ticket.id} onClick={() => navigate(`/tickets/${ticket.id}`)} tabIndex={0} onKeyDown={(event) => { if (event.key === 'Enter') navigate(`/tickets/${ticket.id}`); }}>
              <td style={{ fontWeight: 700, color: '#475569' }}>RZ-{ticket.ticket_number || String(ticket.id).slice(0, 8)}</td>
              <td style={{ fontWeight: 600, minWidth: 190 }}>{ticket.title}</td>
              <td><div>{ticket.customer_name}</div><div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{ticket.customer_email || ticket.customer_phone}</div></td>
              <td>{ticket.websites?.name || '—'}<small style={{ display: 'block', color: 'var(--color-text-muted)' }}>{ticket.source}</small></td>
              <td><PriorityBadge priority={ticket.priority}/></td>
              <td><StatusBadge status={ticket.status}/></td>
              <td>{ticket.developer_profile?.full_name || ticket.support_profile?.full_name || 'Unassigned'}</td>
              <td style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>{ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

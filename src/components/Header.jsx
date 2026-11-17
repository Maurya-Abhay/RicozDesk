import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, Menu, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const PAGE_TITLES = {
  '/admin': 'Admin overview', '/support': 'Support overview', '/technical': 'Technical workspace',
  '/tickets': 'Ticket queue', '/tickets/create': 'Create ticket', '/websites': 'Website management',
  '/people': 'People & teams', '/reports': 'Operational reports', '/settings': 'Workspace settings',
};

export default function Header({ title, userProfile, onMenuToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [search, setSearch] = useState('');
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);
  const initials = (userProfile?.full_name || 'User').split(' ').map((part) => part.charAt(0).toUpperCase()).slice(0, 2).join('');

  useEffect(() => {
    let active = true;
    supabase.from('notifications').select('id,ticket_id,title,body,read_at,created_at').eq('user_id', userProfile.id).order('created_at', { ascending: false }).limit(10)
      .then(({ data }) => { if (active) setNotifications(data || []); });
    const channel = supabase.channel(`ricozdesk-notifications-${userProfile.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${userProfile.id}` }, () => {
      supabase.from('notifications').select('id,ticket_id,title,body,read_at,created_at').eq('user_id', userProfile.id).order('created_at', { ascending: false }).limit(10).then(({ data }) => { if (active) setNotifications(data || []); });
    }).subscribe();
    return () => { active = false; supabase.removeChannel(channel); };
  }, [userProfile.id]);

  const submitSearch = (event) => {
    if (event.key === 'Enter' && search.trim()) {
      navigate(`/tickets?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };
  const openNotification = async (item) => {
    if (!item.read_at) {
      await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', item.id);
      setNotifications((current) => current.map((row) => row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row));
    }
    setOpen(false);
    if (item.ticket_id) navigate(`/tickets/${item.ticket_id}`);
  };
  const unread = notifications.filter((item) => !item.read_at).length;

  return (
    <header className="topbar">
      <button type="button" className="menu-button icon-button" aria-label="Open navigation" onClick={onMenuToggle}><Menu size={20}/></button>
      <div><p className="eyebrow">{userProfile.team || 'Company workspace'}</p><h1 className="topbar-title">{title || PAGE_TITLES[location.pathname] || 'Workspace'}</h1></div>
      <div className="topbar-actions">
        <label className="global-search"><Search size={16}/><input type="search" placeholder="Search tickets, customers..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={submitSearch} aria-label="Search tickets"/></label>
        <div className="header-notification-wrap"><button type="button" className="icon-button" aria-label="Notifications" aria-expanded={open} onClick={() => setOpen((current) => !current)}><Bell size={18}/>{unread > 0 && <i className="notification-dot"/>}</button>{open && <div className="header-notification-panel"><div className="header-notification-title"><b>Notifications</b><button type="button" onClick={() => setOpen(false)} aria-label="Close"><X size={14}/></button></div>{notifications.map((item) => <button type="button" key={item.id} className={`header-notification-item ${item.read_at ? '' : 'unread'}`} onClick={() => openNotification(item)}><b>{item.title}</b><span>{item.body}</span><small>{new Date(item.created_at).toLocaleString()}</small></button>)}{!notifications.length && <p className="empty-state">No notifications yet.</p>}</div>}</div>
        <div className="user-pill"><div className="avatar-circle">{initials}</div><div className="user-meta"><span>{userProfile.full_name}</span><small>{userProfile.role.replaceAll('_', ' ')}</small></div></div>
      </div>
    </header>
  );
}

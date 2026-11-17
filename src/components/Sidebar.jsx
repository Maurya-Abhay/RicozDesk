import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { LayoutDashboard, Ticket, Users, BarChart2, Settings, LogOut, ShieldCheck, X, Globe2, Code2, Headphones, Moon, Sun } from 'lucide-react';

const ROLE_LABELS = {
  admin: 'System Admin', support_manager: 'Support Manager', support_agent: 'Support Agent',
  tech_lead: 'Development Lead', developer: 'Developer',
};

export default function Sidebar({ userProfile, isOpen, onClose, theme, onThemeChange }) {
  const navigate = useNavigate();
  const role = userProfile?.role;
  const isAdmin = role === 'admin';
  const isSupport = ['support_manager', 'support_agent'].includes(role);
  const isTechnical = ['tech_lead', 'developer'].includes(role);

  const links = isAdmin
    ? [
        { to: '/admin', label: 'Overview', icon: LayoutDashboard },
        { to: '/tickets', label: 'All Tickets', icon: Ticket },
        { to: '/websites', label: 'Websites', icon: Globe2 },
        { to: '/people', label: 'People & Teams', icon: Users },
        { to: '/reports', label: 'Reports & SLA', icon: BarChart2 },
        { to: '/settings', label: 'Settings', icon: Settings },
      ]
    : isSupport
      ? [
          { to: '/support', label: 'Support Overview', icon: Headphones },
          { to: '/tickets', label: 'Ticket Queue', icon: Ticket },
          { to: '/reports', label: 'Support Reports', icon: BarChart2, managerOnly: true },
        ].filter((link) => !link.managerOnly || role === 'support_manager')
      : [
          { to: '/technical', label: 'Engineering Overview', icon: Code2 },
          { to: '/tickets', label: 'Development Queue', icon: Ticket },
          { to: '/people', label: 'Developer Team', icon: Users, leadOnly: true },
          { to: '/reports', label: 'Engineering Reports', icon: BarChart2, leadOnly: true },
        ].filter((link) => !link.leadOnly || role === 'tech_lead');

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
      <div className="sidebar-top">
        <div className="brand-block">
          <div className="brand-mark"><ShieldCheck size={18} /></div>
          <button type="button" className="sidebar-close icon-button" aria-label="Close navigation" onClick={onClose}><X size={18} /></button>
          <div><div className="brand-name">RicozDesk</div><div className="brand-subtitle">Support Operations</div></div>
        </div>
        <div className="portal-chip"><span className={isAdmin ? 'portal-dot portal-admin' : isSupport ? 'portal-dot portal-support' : 'portal-dot portal-tech'} />{isAdmin ? 'Admin Portal' : isSupport ? 'Support Portal' : 'Technical Team Portal'}</div>
        <nav className="nav-list" aria-label="Workspace navigation">
          {links.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end onClick={onClose} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={17} /><span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </div>
      <div className="sidebar-footer">
        <div className="profile-box"><div className="profile-name">{userProfile?.full_name || 'Workspace User'}</div><div className="profile-role">{ROLE_LABELS[role] || role}</div></div>
        <button type="button" className="theme-toggle" onClick={onThemeChange} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}><span>{theme === 'dark' ? <Sun size={15}/> : <Moon size={15}/>} {theme === 'dark' ? 'Light mode' : 'Dark mode'}</span><small>{theme === 'dark' ? 'On' : 'Off'}</small></button>
        <button type="button" onClick={handleLogout} className="btn btn-outline sidebar-logout"><LogOut size={16} /> Sign out</button>
      </div>
    </aside>
  );
}

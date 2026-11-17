import React, { useCallback, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Loading from './components/Loading';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import AgentDashboard from './pages/AgentDashboard';
import TechnicalDashboard from './pages/TechnicalDashboard';
import Tickets from './pages/Tickets';
import CreateTicket from './pages/CreateTicket';
import TicketDetails from './pages/TicketDetails';
import Agents from './pages/Agents';
import Websites from './pages/Websites';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import './App.css';

const ROLE_LABELS = {
  admin: 'System Admin',
  support_manager: 'Support Manager',
  support_agent: 'Support Agent',
  tech_lead: 'Development Lead',
  developer: 'Developer',
};

function homeForRole(role) {
  if (role === 'admin') return '/admin';
  if (['support_manager', 'support_agent'].includes(role)) return '/support';
  if (['tech_lead', 'developer'].includes(role)) return '/technical';
  return '/login';
}

function RoleRoute({ profile, allowed, children }) {
  if (!profile) return <Navigate to="/login" replace />;
  return allowed.includes(profile.role) ? children : <Navigate to={homeForRole(profile.role)} replace />;
}

function Workspace({ userProfile, children, title }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('ricozdesk-portal-theme') || 'light');

  useEffect(() => {
    document.documentElement.dataset.portalTheme = theme;
    localStorage.setItem('ricozdesk-portal-theme', theme);
    return () => {
      delete document.documentElement.dataset.portalTheme;
    };
  }, [theme]);

  return (
    <div className="app-container">
      <Sidebar userProfile={userProfile} isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} theme={theme} onThemeChange={() => setTheme((current) => current === 'dark' ? 'light' : 'dark')} />
      <div className="main-wrapper">
        <Header title={title} userProfile={userProfile} onMenuToggle={() => setSidebarOpen(true)} />
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState('');

  const fetchProfile = useCallback(async (userId) => {
    if (!userId) {
      setUserProfile(null);
      return null;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, team, skills, is_active')
      .eq('id', userId)
      .single();
    if (error) {
      console.error('Profile fetch failed:', error);
      setProfileError(error.message || 'Your profile could not be loaded.');
      setUserProfile(null);
      return null;
    }
    if (!data.is_active) {
      await supabase.auth.signOut();
      setUserProfile(null);
      setProfileError('Your account is inactive. Contact your RicozDesk administrator.');
      return null;
    }
    setProfileError('');
    setUserProfile(data);
    return data;
  }, []);

  useEffect(() => {
    let mounted = true;
    if (!isSupabaseConfigured) {
      setLoading(false);
      return undefined;
    }

    const initialize = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) setProfileError(error.message);
      if (!mounted) return;
      setSession(data?.session || null);
      if (data?.session?.user?.id) await fetchProfile(data.session.user.id);
      if (mounted) setLoading(false);
    };
    initialize();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession || null);
      if (nextSession?.user?.id) {
        // Defer profile fetching outside the auth callback to avoid Supabase lock contention.
        window.setTimeout(() => { if (mounted) fetchProfile(nextSession.user.id); }, 0);
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const handleLoginSuccess = async (userId) => {
    const profile = await fetchProfile(userId);
    if (!profile) throw new Error('Your account profile is missing or inactive. Ask an administrator to check your profile.');
  };

  if (loading) return <Loading />;

  return (
    <BrowserRouter>
      {!session ? (
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login onLoginSuccess={handleLoginSuccess} configurationMissing={!isSupabaseConfigured} profileError={profileError} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      ) : !userProfile ? (
        <div className="login-shell">
          <div className="login-card">
            <h2>RicozDesk account setup required</h2>
            <p>{profileError || 'Your account has no active profile. Ask the system administrator to create or activate it.'}</p>
            <button className="btn btn-primary" onClick={() => supabase.auth.signOut()}>Sign out</button>
          </div>
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<Navigate to={homeForRole(userProfile.role)} replace />} />
          <Route path="/login" element={<Navigate to={homeForRole(userProfile.role)} replace />} />

          <Route path="/admin" element={<RoleRoute profile={userProfile} allowed={['admin']}><Workspace userProfile={userProfile} title="Admin overview"><AdminDashboard /></Workspace></RoleRoute>} />
          <Route path="/websites" element={<RoleRoute profile={userProfile} allowed={['admin']}><Workspace userProfile={userProfile} title="Website management"><Websites userProfile={userProfile} /></Workspace></RoleRoute>} />
          <Route path="/people" element={<RoleRoute profile={userProfile} allowed={['admin', 'tech_lead']}><Workspace userProfile={userProfile} title="People & teams"><Agents userProfile={userProfile} /></Workspace></RoleRoute>} />
          <Route path="/settings" element={<RoleRoute profile={userProfile} allowed={['admin']}><Workspace userProfile={userProfile} title="Workspace settings"><Settings userProfile={userProfile} /></Workspace></RoleRoute>} />

          <Route path="/support" element={<RoleRoute profile={userProfile} allowed={['support_manager', 'support_agent']}><Workspace userProfile={userProfile} title="Support overview"><AgentDashboard userProfile={userProfile} /></Workspace></RoleRoute>} />
          <Route path="/technical" element={<RoleRoute profile={userProfile} allowed={['tech_lead', 'developer']}><Workspace userProfile={userProfile} title="Technical workspace"><TechnicalDashboard userProfile={userProfile} /></Workspace></RoleRoute>} />

          <Route path="/tickets" element={<RoleRoute profile={userProfile} allowed={['admin', 'support_manager', 'support_agent', 'tech_lead', 'developer']}><Workspace userProfile={userProfile} title="Ticket queue"><Tickets userProfile={userProfile} /></Workspace></RoleRoute>} />
          <Route path="/tickets/create" element={<RoleRoute profile={userProfile} allowed={['admin', 'support_manager', 'support_agent']}><Workspace userProfile={userProfile} title="Create ticket"><CreateTicket userProfile={userProfile} /></Workspace></RoleRoute>} />
          <Route path="/tickets/:id" element={<RoleRoute profile={userProfile} allowed={['admin', 'support_manager', 'support_agent', 'tech_lead', 'developer']}><Workspace userProfile={userProfile} title="Ticket details"><TicketDetails userProfile={userProfile} /></Workspace></RoleRoute>} />
          <Route path="/reports" element={<RoleRoute profile={userProfile} allowed={['admin', 'support_manager', 'tech_lead']}><Workspace userProfile={userProfile} title="Operational reports"><Reports userProfile={userProfile} /></Workspace></RoleRoute>} />
          <Route path="*" element={<Navigate to={homeForRole(userProfile.role)} replace />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

export { ROLE_LABELS, homeForRole };

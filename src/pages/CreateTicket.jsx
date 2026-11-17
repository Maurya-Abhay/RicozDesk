import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, Globe2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Loading from '../components/Loading';

const CATEGORIES = ['Login & Authentication', 'Payment & Billing', 'Website / UI', 'API / Backend', 'Database', 'Performance', 'Hosting / Infrastructure', 'General Support', 'Other'];
const MODULES = ['Authentication', 'Payments', 'Frontend', 'Backend / API', 'Database', 'Infrastructure', 'Other'];
const emptyForm = {
  source: 'Phone', customer_name: '', customer_phone: '', customer_email: '', website_id: '', title: '',
  category: 'General Support', module: 'Other', priority: 'Medium', description: '', email_subject: '', email_body: '',
  affected_url: '', environment: '', browser_device: '',
};

export default function CreateTicket({ userProfile }) {
  const navigate = useNavigate();
  const [websites, setWebsites] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    supabase.from('websites').select('id,name,url').eq('status', 'Active').order('name')
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError) setError(queryError.message);
        else {
          setWebsites(data || []);
          if (data?.length) setForm((current) => ({ ...current, website_id: current.website_id || data[0].id }));
        }
        setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!userProfile?.id) return setError('Your signed-in profile could not be identified. Sign in again.');
    if (!form.website_id) return setError('Select the website this complaint relates to.');
    if (form.source === 'Phone' && !form.customer_phone.trim()) return setError('Add the customer phone number for a phone-call ticket.');
    if (form.source === 'Email' && !form.customer_email.trim()) return setError('Add the customer email address for an email ticket.');
    if (form.source === 'Email' && !form.email_subject.trim()) return setError('Add the original email subject.');

    setSaving(true);
    const payload = {
      title: form.title.trim(),
      description: [form.description.trim(), form.source === 'Email' && form.email_body.trim() ? `\n\nOriginal email:\n${form.email_body.trim()}` : ''].join('').trim(),
      customer_name: form.customer_name.trim(),
      customer_email: form.customer_email.trim() || null,
      customer_phone: form.customer_phone.trim() || null,
      source: form.source,
      email_subject: form.source === 'Email' ? form.email_subject.trim() : null,
      website_id: form.website_id,
      category: form.category,
      module: form.module,
      priority: form.priority,
      status: 'New',
      support_owner_id: userProfile.id,
      created_by: userProfile.id,
      assigned_team: 'Customer Support',
      affected_url: form.affected_url.trim() || null,
      environment: form.environment.trim() || null,
      browser_device: form.browser_device.trim() || null,
    };

    const { data, error: insertError } = await supabase.from('tickets').insert(payload).select('id').single();
    if (insertError) {
      setError(insertError.message || 'Ticket could not be created.');
      setSaving(false);
      return;
    }
    await supabase.from('ticket_history').insert({ ticket_id: data.id, actor_id: userProfile.id, action: 'created', details: `Ticket created from ${form.source} by ${userProfile.full_name || 'Support'}.` });
    navigate(`/tickets/${data.id}`);
  };

  if (loading) return <Loading />;

  return (
    <div className="create-ticket-page">
      <button className="btn btn-outline" style={{ marginBottom: 16 }} onClick={() => navigate('/tickets')}><ArrowLeft size={16}/> Back to tickets</button>
      <div className="page-title-row"><div><h2 className="page-title">Create support ticket</h2><p className="page-subtitle">Record the customer conversation and route the issue to the right team.</p></div></div>
      {error && <div className="card inline-error" role="alert"><AlertCircle size={16}/>{error}</div>}
      {!websites.length && <div className="card inline-error">No active websites are configured. Ask an administrator to add a website before creating tickets.</div>}
      <form onSubmit={handleSubmit} className="ticket-form-layout">
        <div className="ticket-form-main">
          <section className="card">
            <h3 className="form-section-title">Contact source</h3>
            <div className="source-choice-grid">
              <button type="button" className={`source-choice ${form.source === 'Phone' ? 'selected' : ''}`} onClick={() => setField('source', 'Phone')}><Phone size={18}/><span><b>Phone call</b><small>Complaint received by phone</small></span></button>
              <button type="button" className={`source-choice ${form.source === 'Email' ? 'selected' : ''}`} onClick={() => setField('source', 'Email')}><Mail size={18}/><span><b>Email</b><small>Customer email entered by support</small></span></button>
            </div>
            <div className="grid-2">
              <div className="form-group"><label>Customer name *</label><input className="form-control" required value={form.customer_name} onChange={(e) => setField('customer_name', e.target.value)} placeholder="Customer full name"/></div>
              <div className="form-group"><label>Customer phone {form.source === 'Phone' ? '*' : ''}</label><input className="form-control" type="tel" required={form.source === 'Phone'} value={form.customer_phone} onChange={(e) => setField('customer_phone', e.target.value)} placeholder="+91 98765 43210"/></div>
              <div className="form-group"><label>Customer email {form.source === 'Email' ? '*' : ''}</label><input className="form-control" type="email" required={form.source === 'Email'} value={form.customer_email} onChange={(e) => setField('customer_email', e.target.value)} placeholder="customer@example.com"/></div>
              <div className="form-group"><label>Affected website *</label><select className="form-control" required value={form.website_id} onChange={(e) => setField('website_id', e.target.value)}><option value="">Select company website</option>{websites.map((site) => <option value={site.id} key={site.id}>{site.name} — {site.url}</option>)}</select></div>
            </div>
          </section>
          {form.source === 'Email' && <section className="card"><h3 className="form-section-title">Original email details</h3><div className="form-group"><label>Email subject *</label><input className="form-control" required value={form.email_subject} onChange={(e) => setField('email_subject', e.target.value)} placeholder="Subject from customer email"/></div><div className="form-group"><label>Email message</label><textarea className="form-control" rows={4} value={form.email_body} onChange={(e) => setField('email_body', e.target.value)} placeholder="Paste the customer email body here"/></div></section>}
          <section className="card"><h3 className="form-section-title">Issue details</h3>
            <div className="form-group"><label>Ticket title *</label><input className="form-control" required maxLength={180} value={form.title} onChange={(e) => setField('title', e.target.value)} placeholder="e.g. Customer cannot sign in to the partner portal"/></div>
            <div className="grid-3">
              <div className="form-group"><label>Category *</label><select className="form-control" value={form.category} onChange={(e) => setField('category', e.target.value)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div className="form-group"><label>Product module</label><select className="form-control" value={form.module} onChange={(e) => setField('module', e.target.value)}>{MODULES.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div className="form-group"><label>Priority *</label><select className="form-control" value={form.priority} onChange={(e) => setField('priority', e.target.value)}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div>
            </div>
            <div className="form-group"><label>Problem description *</label><textarea className="form-control" rows={5} required value={form.description} onChange={(e) => setField('description', e.target.value)} placeholder="Explain what the customer reported, what they tried and the impact..."/></div>
            <div className="grid-2"><div className="form-group"><label>Affected page URL (optional)</label><input className="form-control" type="url" value={form.affected_url} onChange={(e) => setField('affected_url', e.target.value)} placeholder="https://example.com/login"/></div><div className="form-group"><label>Environment (optional)</label><input className="form-control" value={form.environment} onChange={(e) => setField('environment', e.target.value)} placeholder="Production / Staging"/></div></div>
            <div className="form-group"><label>Browser / device (optional)</label><input className="form-control" value={form.browser_device} onChange={(e) => setField('browser_device', e.target.value)} placeholder="Chrome on Windows, iPhone Safari..."/></div>
          </section>
        </div>
        <aside className="ticket-form-side">
          <section className="card"><h3 className="form-section-title">Ownership</h3><p className="muted small-text">This ticket enters the Support queue first. The Development Lead assigns technical work after review.</p><div className="assignment-info"><b>Support owner</b><span>{userProfile.full_name}</span></div><div className="assignment-info"><b>Developer</b><span>Not assigned yet</span></div><div className="assignment-info"><b>Source</b><span>{form.source}</span></div><div className="sla-hint"><Globe2 size={16}/><span>Every ticket is linked to the selected company website for reporting and routing.</span></div></section>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={saving || !websites.length}>{saving ? 'Creating ticket...' : 'Create ticket'}</button>
          <p className="form-footnote">Fields marked * are required. File uploads are not enabled until the company storage bucket is configured.</p>
        </aside>
      </form>
    </div>
  );
}

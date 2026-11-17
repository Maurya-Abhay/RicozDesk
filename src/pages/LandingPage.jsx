import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowRight,
  BarChart2,
  Check,
  CheckCircle2,
  Code2,
  CircleHelp,
  Clock3,
  LayoutDashboard,
  Globe2,
  Headphones,
  Menu,
  MessageSquare,
  Minus,
  Plus,
  Settings,
  ShieldCheck,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import './LandingPage.css';

const workflowSteps = [
  { icon: MessageSquare, title: 'Capture the Request', description: 'Support records a customer phone call or email and links it to the correct company website.' },
  { icon: Ticket, title: 'Review & Classify', description: 'The support manager confirms category, priority, customer impact and service targets.' },
  { icon: Users, title: 'Assign to Engineering', description: 'The development lead routes technical issues to a developer with the right skills and capacity.' },
  { icon: CheckCircle2, title: 'Verify & Close', description: 'Engineering marks the fix ready, Support verifies the outcome and closes the customer ticket.' },
];

const features = [
  { icon: Ticket, title: 'Centralized Ticket Management', description: 'Track phone and email complaints with clear status, priority, ownership and a complete activity history.' },
  { icon: Globe2, title: 'Multiple Company Websites', description: 'Manage all company websites in one workspace and connect each ticket to the affected property.' },
  { icon: Users, title: 'Three Role-Based Portals', description: 'Give Admin, Support and Technical teams the views and permissions needed for their work.' },
  { icon: Clock3, title: 'SLA Governance', description: 'Set first-response and resolution targets by priority and identify overdue customer issues.' },
  { icon: ShieldCheck, title: 'Escalation & Ownership', description: 'Move technical issues from Support to the development lead, then to the right engineer.' },
  { icon: BarChart2, title: 'Operational Reporting', description: 'Review ticket volume, resolution, SLA health, contact channel and website-level performance.' },
];

const portals = [
  { icon: ShieldCheck, title: 'Admin Portal', description: 'Manage websites, team access, roles, skills and service policies from one control center.', accent: 'admin' },
  { icon: Headphones, title: 'Support Portal', description: 'Capture customer requests, own follow-ups, track SLAs and verify completed fixes.', accent: 'support' },
  { icon: Code2, title: 'Technical Portal', description: 'Review escalations, assign developers, update progress and return fixes to Support.', accent: 'technical' },
];

const faqs = [
  {
    question: 'What is RicozDesk?',
    answer: 'RicozDesk is an enterprise customer-support operations platform for organisations handling customer requests across multiple websites and teams.',
  },
  {
    question: 'Which portals are available?',
    answer: 'There are exactly three portals: Admin for company configuration, Support for customer intake and follow-up, and Technical Team for engineering assignment and issue resolution.',
  },
  {
    question: 'How are customer tickets created?',
    answer: 'In the current release, Support staff manually record complaints received by phone or email. Each ticket includes customer details, source, affected website, category, priority and problem description.',
  },
  {
    question: 'How does a technical issue reach a developer?',
    answer: 'Support reviews the customer issue and escalates technical work. The Development Lead checks the category, module, developer skills and workload, then assigns the ticket to a suitable developer.',
  },
  {
    question: 'What happens after a developer fixes an issue?',
    answer: 'The developer marks the issue Fix Ready. Support verifies the fix, updates the customer and marks the ticket Resolved or Closed after confirmation.',
  },
  {
    question: 'Can the company manage multiple websites?',
    answer: 'Yes. Administrators register company websites. Support selects the affected website for every ticket, which enables website-level queues and reporting.',
  },
  {
    question: 'How can I sign in to RicozDesk?',
    answer:
      'Choose Sign In or Get Started to open the existing login page, then use the account credentials provided for your RicozDesk workspace.',
  },
];

function Brand({ footer = false }) {
  return (
    <span className={`landing-brand${footer ? ' landing-brand-footer' : ''}`}>
      <span className="landing-brand-mark" aria-hidden="true">rZ</span>
      <span className="landing-brand-name">RicozDesk</span>
    </span>
  );
}

function DashboardPreview() {
  const previewTickets = [
    { title: 'Unable to update account details', priority: 'High', status: 'In Progress', agent: 'Jordan Lee' },
    { title: 'Question about a recent invoice', priority: 'Normal', status: 'Open', agent: 'Maya Chen' },
    { title: 'Access request follow-up', priority: 'Low', status: 'Resolved', agent: 'Alex Morgan' },
  ];

  return (
    <div className="preview-wrap" aria-label="Illustrative RicozDesk dashboard preview">
      <div className="preview-browser">
        <div className="preview-browser-bar" aria-hidden="true">
          <span /><span /><span />
          <div className="preview-address">app.ricozdesk</div>
        </div>

        <div className="preview-app">
          <aside className="preview-sidebar" aria-label="Illustrative dashboard navigation">
            <Brand />
            <span className="preview-sidebar-label">WORKSPACE</span>
            <div className="preview-nav-item preview-nav-active"><LayoutDashboard />Dashboard</div>
            <div className="preview-nav-item"><Ticket />Tickets</div>
            <div className="preview-nav-item"><Users />Agents</div>
            <div className="preview-nav-item"><BarChart2 />Reports</div>
            <div className="preview-nav-item"><Settings />Settings</div>
            <div className="preview-sidebar-profile">
              <span className="preview-avatar">JD</span>
              <span><strong>Jordan Davis</strong><small>Admin</small></span>
            </div>
          </aside>

          <div className="preview-main">
            <div className="preview-heading">
              <div>
                <span className="preview-eyebrow">OVERVIEW</span>
                <h2>Support dashboard</h2>
              </div>
              <span className="preview-date"><Clock3 />Workspace view</span>
            </div>

            <div className="preview-kpis">
              <div className="preview-kpi">
                <span>Open tickets</span>
                <strong><Ticket />Queue</strong>
                <small>Review active requests</small>
              </div>
              <div className="preview-kpi">
                <span>Resolved tickets</span>
                <strong><CheckCircle2 />History</strong>
                <small>Completed requests</small>
              </div>
              <div className="preview-kpi">
                <span>Active agents</span>
                <strong><Users />Team</strong>
                <small>Assignments and workload</small>
              </div>
              <div className="preview-kpi">
                <span>Resolution rate</span>
                <strong><BarChart2 />Reports</strong>
                <small>Explore ticket activity</small>
              </div>
            </div>

            <div className="preview-table-card">
              <div className="preview-table-heading">
                <div><h3>Recent tickets</h3><p>Sample layout for illustration only</p></div>
                <span>Ticket overview</span>
              </div>
              <div className="preview-table-scroll">
                <table className="preview-table">
                  <thead>
                    <tr><th>Ticket</th><th>Priority</th><th>Status</th><th>Assigned agent</th></tr>
                  </thead>
                  <tbody>
                    {previewTickets.map((ticket) => (
                      <tr key={ticket.title}>
                        <td><span className="preview-ticket-icon"><Ticket /></span>{ticket.title}</td>
                        <td><span className={`preview-priority preview-priority-${ticket.priority.toLowerCase()}`}>{ticket.priority}</span></td>
                        <td><span className={`preview-status preview-status-${ticket.status.toLowerCase().replace(' ', '-')}`}><i />{ticket.status}</span></td>
                        <td><span className="preview-agent-avatar">{ticket.agent.split(' ').map((part) => part[0]).join('')}</span>{ticket.agent}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="preview-note"><span />Illustrative preview · not connected to live data</div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const sections = document.querySelectorAll('.landing-reveal');

    if (!('IntersectionObserver' in window)) {
      sections.forEach((section) => section.classList.add('is-visible'));
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12 },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = (sectionId) => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';

    document.getElementById(sectionId)?.scrollIntoView({ behavior });
    setMenuOpen(false);
  };

  const goToLogin = () => {
    setMenuOpen(false);
    navigate('/login?mode=signup');
  };

  const goToSignIn = () => {
    setMenuOpen(false);
    navigate('/login');
  };

  return (
    <main className="landing-page">
      <header className="landing-header">
        <nav className="landing-nav" aria-label="Main navigation">
          <a className="landing-brand-link" href="#top" aria-label="RicozDesk home">
            <Brand />
          </a>

          <button
            className="landing-menu-toggle"
            type="button"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((isOpen) => !isOpen)}
          >
            {menuOpen ? <X /> : <Menu />}
          </button>

          <div className={`landing-nav-links${menuOpen ? ' landing-nav-links-open' : ''}`}>
            <button type="button" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            <button type="button" onClick={() => scrollToSection('features')}>Features</button>
            <button type="button" onClick={() => scrollToSection('why-ricozdesk')}>Why RicozDesk</button>
            <button type="button" onClick={() => scrollToSection('faqs')}>FAQs</button>
          </div>

          <div className="landing-nav-actions">
            <button className="landing-button landing-button-outline landing-nav-sign-in" type="button" onClick={goToSignIn}>Sign In</button>
            <button className="landing-button landing-button-primary landing-nav-start" type="button" onClick={goToLogin}>
              Get Started <ArrowRight aria-hidden="true" />
            </button>
          </div>
        </nav>
      </header>

      <section className="landing-hero" id="top">
        <div className="landing-hero-inner">
          <div className="hero-copy landing-reveal">
            <span className="hero-badge"><span />SMART CUSTOMER SUPPORT OPERATIONS</span>
            <h1>Every Customer Request.<br /><span>Handled Better.</span></h1>
            <p>
              Connect customer requests, multiple company websites, support teams and engineering work in one controlled workspace. Follow each issue from first contact to verified resolution.
            </p>
            <div className="hero-actions">
              <button className="landing-button landing-button-primary" type="button" onClick={goToLogin}>
                Get Started <ArrowRight aria-hidden="true" />
              </button>
              <button className="landing-button landing-button-outline" type="button" onClick={() => scrollToSection('how-it-works')}>
                See How It Works
              </button>
            </div>
            <div className="hero-trust"><Check aria-hidden="true" />One workspace. Clear ownership. Better support.</div>
          </div>
          <div className="hero-preview landing-reveal">
            <DashboardPreview />
          </div>
        </div>
      </section>

      <section className="benefits-strip" aria-label="RicozDesk benefits">
        <div className="benefits-inner">
          <div><span>01</span><strong>Centralized</strong><p>All support requests in one place.</p></div>
          <div><span>02</span><strong>Role-Based</strong><p>Admin, Support and Technical portals.</p></div>
          <div><span>03</span><strong>Trackable</strong><p>Ownership, SLA and escalation tracking.</p></div>
          <div><span>04</span><strong>Actionable</strong><p>Reports to support better decisions.</p></div>
        </div>
      </section>

      <section className="landing-section how-section" id="how-it-works">
        <div className="landing-section-heading landing-reveal">
          <span className="landing-eyebrow">A CLEARER WAY TO WORK</span>
          <h2>A Smoother Journey From Request to Resolution</h2>
          <p>Every request follows a clear workflow, helping your team stay organized and customers stay informed.</p>
        </div>
        <div className="workflow-grid">
          {workflowSteps.map(({ icon: Icon, title, description }, index) => (
            <article className="workflow-card landing-reveal" key={title}>
              <span className="workflow-number">0{index + 1}</span>
              <span className="landing-icon"><Icon aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section features-section" id="features">
        <div className="landing-section-heading landing-reveal">
          <span className="landing-eyebrow">BUILT FOR SUPPORT TEAMS</span>
          <h2>One Workspace for Support and Engineering</h2>
          <p>Manage multi-website support operations, hand tickets to Engineering and track service delivery from one place.</p>
        </div>
        <div className="features-grid">
          {features.map(({ icon: Icon, title, description }) => (
            <article className="feature-card landing-reveal" key={title}>
              <span className="landing-icon"><Icon aria-hidden="true" /></span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section portals-section" id="portals">
        <div className="landing-section-heading landing-reveal">
          <span className="landing-eyebrow">ONE PLATFORM, THREE WORKSPACES</span>
          <h2>Everyone Knows What to Do Next</h2>
          <p>RicozDesk keeps each team focused while the full request history stays connected from intake to resolution.</p>
        </div>
        <div className="portals-grid">
          {portals.map(({ icon: Icon, title, description, accent }) => (
            <article className={`portal-card portal-card-${accent} landing-reveal`} key={title}>
              <span className="portal-card-icon"><Icon aria-hidden="true" /></span>
              <span className="portal-card-kicker">ROLE-BASED ACCESS</span>
              <h3>{title}</h3>
              <p>{description}</p>
              <span className="portal-card-link">Clear permissions <Check aria-hidden="true" /></span>
            </article>
          ))}
        </div>
      </section>

      <section className="why-section" id="why-ricozdesk">
        <div className="why-visual landing-reveal" aria-hidden="true">
          <div className="why-visual-card">
            <span className="why-visual-mark">rZ</span>
            <div className="why-visual-title"><strong>Support overview</strong><span>Workspace activity</span></div>
            <div className="why-visual-row"><span><i className="why-dot why-dot-red" />Open</span><b>In progress</b></div>
            <div className="why-visual-row"><span><i className="why-dot why-dot-amber" />Assigned</span><b>Agent owner</b></div>
            <div className="why-visual-row"><span><i className="why-dot why-dot-green" />Resolved</span><b>Activity saved</b></div>
            <div className="why-visual-footer"><Activity /> Ticket activity stays connected</div>
          </div>
        </div>
        <div className="why-copy landing-reveal">
          <span className="landing-eyebrow">WHY RICOZDESK</span>
          <h2>Built for Clearer, More Reliable Support</h2>
          <p className="why-intro">Keep ticket details, ownership, and team activity together in a workspace designed for day-to-day support operations.</p>
          <div className="why-points">
            <article><span className="why-check"><Check /></span><div><h3>Clear Ownership</h3><p>Make it easier to understand who is handling each request.</p></div></article>
            <article><span className="why-check"><Check /></span><div><h3>Better Visibility</h3><p>View ticket statuses and team activity from one workspace.</p></div></article>
            <article><span className="why-check"><Check /></span><div><h3>Organized Workflows</h3><p>Keep updates and ticket details connected.</p></div></article>
          </div>
        </div>
      </section>

      <section className="landing-section journey-section">
        <div className="landing-section-heading landing-reveal">
          <span className="landing-eyebrow">FROM FIRST MESSAGE TO FOLLOW-UP</span>
          <h2>A Clear View of Every Request</h2>
          <p>Follow a customer issue as it moves from Support review to developer assignment, fix verification and closure.</p>
        </div>
        <div className="journey-track landing-reveal">
          {[
            ['Customer Request', CircleHelp],
            ['Ticket Created', Ticket],
            ['Developer Assigned', Users],
            ['Fix Verified', Clock3],
            ['Resolved', CheckCircle2],
          ].map(([label, Icon], index, stages) => (
            <React.Fragment key={label}>
              <div className={`journey-stage${index === stages.length - 1 ? ' journey-stage-complete' : ''}`}>
                <span><Icon aria-hidden="true" /></span><strong>{label}</strong>
              </div>
              {index < stages.length - 1 && <span className="journey-connector" aria-hidden="true"><ArrowRight /></span>}
            </React.Fragment>
          ))}
        </div>
      </section>

      <section className="landing-section faq-section" id="faqs">
        <div className="landing-section-heading">
          <span className="landing-eyebrow">A FEW QUICK ANSWERS</span>
          <h2>Frequently Asked Questions</h2>
          <p>Learn how RicozDesk brings ticket and team workflows together.</p>
        </div>
        <div className="faq-list">
          {faqs.map(({ question, answer }, index) => {
            const isOpen = openFaq === index;
            const answerId = `faq-answer-${index}`;

            return (
              <article className={`faq-item${isOpen ? ' faq-item-open' : ''}`} key={question}>
                <h3>
                  <button
                    type="button"
                    className="faq-question"
                    aria-expanded={isOpen}
                    aria-controls={answerId}
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                  >
                    <span>{question}</span>
                    {isOpen ? <Minus aria-hidden="true" /> : <Plus aria-hidden="true" />}
                  </button>
                </h3>
                <div className="faq-answer" id={answerId} hidden={!isOpen}>
                  <p>{answer}</p>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-cta-section">
        <div className="landing-cta-card landing-reveal">
          <span className="landing-eyebrow">READY WHEN YOU ARE</span>
          <h2>Make Every Customer Interaction Count.</h2>
          <p>Bring your support workflow into one organized workspace and help your team handle requests with clarity.</p>
          <div className="landing-cta-actions">
            <button className="landing-button landing-button-primary" type="button" onClick={goToLogin}>Get Started <ArrowRight aria-hidden="true" /></button>
            <button className="landing-button landing-button-outline" type="button" onClick={goToSignIn}>Sign In</button>
          </div>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-main">
          <div className="landing-footer-brand">
            <a className="landing-brand-link" href="#top" aria-label="RicozDesk home"><Brand footer /></a>
            <span className="footer-kicker">SUPPORT OPERATIONS, CONNECTED</span>
            <p>One calm, controlled workspace for customer requests, Support ownership and Engineering resolution.</p>
          </div>
          <nav className="landing-footer-links" aria-label="Explore RicozDesk">
            <strong>Explore</strong>
            <button type="button" onClick={() => scrollToSection('how-it-works')}>How It Works</button>
            <button type="button" onClick={() => scrollToSection('features')}>Features</button>
            <button type="button" onClick={() => scrollToSection('portals')}>Portals</button>
            <button type="button" onClick={() => scrollToSection('faqs')}>FAQs</button>
          </nav>
          <nav className="landing-footer-links" aria-label="RicozDesk access">
            <strong>Workspace access</strong>
            <button type="button" onClick={goToSignIn}>Sign In</button>
            <button type="button" onClick={goToLogin}>Request access</button>
            <span className="footer-access-note">Admin approval required</span>
          </nav>
        </div>
        <div className="landing-footer-bottom"><span>© {new Date().getFullYear()} RicozDesk</span><span>From first contact to confirmed fix.</span><span>Secure role-based workspace</span></div>
      </footer>
    </main>
  );
}
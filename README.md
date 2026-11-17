# RicozDesk – Enterprise Customer Support Operations Platform

## Project Overview
RicozDesk is a centralized customer-support management platform that helps companies manage customer complaints, multiple websites, support teams, and technical issues efficiently.

## Technology Stack
- React 19 + Vite
- React Router
- Supabase Authentication
- Supabase PostgreSQL & RLS
- Supabase Edge Functions
- Lucide React
- Responsive CSS

## Main Portals

### 1. Admin Portal
- Manage company websites.
- Manage employees, roles, teams, and skills.
- Approve or reject user registration requests.
- Configure SLA policies.
- Monitor tickets and operational reports.

### 2. Support Portal
- Manually create phone and email tickets.
- Manage customer complaints.
- Follow up with customers.
- Escalate technical issues.
- Verify developer fixes and close tickets.

### 3. Technical Team Portal
- Development Lead reviews and assigns technical tickets.
- Assign developers based on skills and workload.
- Developers manage assigned issues.
- Add internal notes and update progress.
- Mark completed fixes as Fix Ready.

## Ticket Workflow
New → Under Review → Assigned → In Progress / Waiting → Fix Ready → Verification → Resolved → Closed.

Tickets can be reopened if the issue is not resolved.

## Key Features
- Multi-website ticket management.
- Role-based authentication and access control.
- Manual phone and email ticket intake.
- Developer assignment and workload tracking.
- Ticket comments and activity history.
- SLA tracking and reporting.
- Email OTP verification.
- Password reset functionality.
- Admin-controlled user approval.
- Secure database access through Supabase RLS.

## Backend & Security
- Supabase Auth for authentication.
- PostgreSQL for centralized data storage.
- Row Level Security for role-based permissions.
- Edge Functions for secure administrative and email operations.
- ZeptoMail for OTP and activation emails.

## Deployment
- Frontend: Vercel
- Backend: Supabase
- Development: Vite
- Build: `npm run build`
- Quality checks: `npm run lint`

## Project Goal
To create a secure, scalable, and centralized enterprise support platform connecting Admin, Customer Support, and Engineering teams to ensure efficient ticket management and faster issue resolution.
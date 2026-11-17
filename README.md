# RicozDesk

RicozDesk is an enterprise customer-support operations platform for companies managing customer requests across multiple websites and two internal teams: Customer Support and Engineering.

This repository preserves the original Vite + React application structure, including the existing public landing page, login page, reusable components and individual page files. The workspace is organised into exactly three portals:

1. **Admin Portal** — company-wide overview, website registry, people/roles, SLA policy and operational reports.
2. **Support Portal** — receives customer phone calls and emails, manually records customer tickets, follows up with customers and verifies engineering fixes.
3. **Technical Team Portal** — the Development Lead reviews escalated work and assigns it to developers; developers work on their assigned issues and return fixes to Support.

## Technology

- React 19 and Vite
- React Router for page navigation and route guards
- Supabase Auth for login
- Supabase PostgreSQL for shared data
- Supabase Row Level Security for role-aware data access
- Supabase Edge Function for administrator-only user invitations
- Lucide React icons and responsive CSS

## Run the project

Requirements: Node.js 20.19+ (or 22.12+) and npm.

```bash
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The public landing page (`/`) and login page (`/login`) render without demo data. Authenticated workspace pages require a real Supabase project configuration and real user accounts. No fake employee login or local demo database is included.

## Portal roles

| Portal | Roles | Main permissions |
|---|---|---|
| Admin | `admin` | Manage websites, invite users, manage roles/skills, set SLA policies, review all tickets and reports |
| Support | `support_manager`, `support_agent` | Create phone/email tickets, own and follow support queue, escalate technical issues, communicate with customers |
| Technical Team | `tech_lead`, `developer` | Lead assigns developers; developers see assigned technical issues and update progress/fix-ready status |

The portal is based on role; users do not get a fourth portal for Development Lead. The lead and developers use the same Technical Team Portal with different permissions.

## Ticket workflow

`New → Under Review → Assigned → In Progress / Waiting → Fix Ready → Verification → Resolved → Closed`

A ticket can be reopened if the fix does not resolve the customer's problem. Support creates the ticket and remains the customer-facing owner. The Support Manager reviews and escalates technical issues. The Development Lead assigns a suitable developer based on module, declared skills and current assigned workload. The developer records an internal note and marks the issue `Fix Ready`; Support verifies the outcome and records the customer follow-up before closing.

## Ticket intake in this release

- **Phone:** Support manually records the customer call, phone number, issue and affected website.
- **Email:** Support manually records the customer email, email address, subject and message, and affected website.
- Every ticket requires an affected company website, a customer name, issue title, description, category, module and priority.
- Public customer website forms and automatic email inbox ingestion are not part of this agreed first release. The public RicozDesk landing page is included; it is not a customer complaint form.
- File attachment storage is not yet connected to a Supabase Storage bucket.

## Supabase setup

1. Create a Supabase project.
2. Open SQL Editor and run `supabase/migrations/001_ricozdesk_enterprise.sql`.
3. Copy the project URL and publishable key into `.env` as shown in `.env.example`.
4. Create the first company admin user using Supabase Auth. After the user exists, promote that account using SQL:

   ```sql
   update public.profiles
   set role = 'admin', team = 'Management'
   where email = 'admin@your-company.com';
   ```

5. Apply the follow-up migrations `supabase/migrations/002_public_role_requests.sql`, `supabase/migrations/003_password_reset_otps.sql`, `supabase/migrations/004_signup_email_verification.sql` and `supabase/migrations/005_pre_signup_email_verification.sql`. The landing page **Get Started** form first verifies only the email, then reveals the account form. The Auth account and Support or Technical role request are created only after the verified applicant submits the completed form. The user cannot sign in until an admin approves the request in **People & Teams**.
   - For this approval-first flow, open Supabase **Authentication → Providers → Email** and turn **Confirm email** off. This avoids the default Supabase email provider's rate limit because approval is the access gate.
   - If email confirmation is required in production, configure custom SMTP. **Resend** is the recommended simple option; Brevo or SendGrid also work. Do not retry sign-up repeatedly while the default provider is rate-limited.
6. Configure ZeptoMail and deploy the OTP function:

   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVICE_ROLE_KEY
   supabase secrets set ZEPTOMAIL_SMTP_HOST=smtp.zeptomail.in
   supabase secrets set ZEPTOMAIL_SMTP_PORT=587
   supabase secrets set ZEPTOMAIL_SMTP_USER=emailapikey
   supabase secrets set ZEPTOMAIL_SMTP_PASSWORD=YOUR_ZEPTOMAIL_SMTP_PASSWORD
   supabase secrets set ZEPTOMAIL_FROM_EMAIL=care@your-domain.com
   supabase secrets set ZEPTOMAIL_FROM_NAME=RicozDesk
   supabase secrets set APP_LOGIN_URL=https://your-app-domain.com/login
   supabase functions deploy password-reset-otp
   ```

   Supabase supplies `SUPABASE_URL` and `SUPABASE_ANON_KEY` to Edge Functions. Do not place SMTP or service-role secrets in React code or any `VITE_` variable. Set `APP_LOGIN_URL` to the same login URL configured for the frontend. The Login page's signup verification and **Forgot password?** flow both use 6-digit OTPs through ZeptoMail. After approval, the function sends the applicant an English activation email with this login URL; it never includes their password.
7. Sign in as the admin, open **People & Teams**, and approve or reject pending public access requests. The admin can change the requested role, team and skills before approval. Admin invitations remain available for controlled provisioning.
8. Open **Website Management** and enter the company's real website names and URLs.
9. Open **Settings** and replace the example SLA values with the company's approved targets, business hours and policy.

## Vercel deployment

1. Push the project to GitHub and import the repository into Vercel.
2. Keep the default Vite settings: build command `npm run build`, output directory `dist`.
3. Add these Vercel environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`
   - `VITE_APP_URL` (the deployed login URL, for example `https://your-domain.vercel.app/login`)
4. Deploy. The included `vercel.json` keeps React Router routes such as `/people`, `/tickets` and `/settings` working after refresh.
5. Update the Supabase Edge Function secret `APP_LOGIN_URL` to the same deployed login URL. Keep ZeptoMail and service-role secrets only in Supabase; never add them to Vercel frontend variables.

## Security and access notes

The migration enables RLS on profiles, teams, websites, SLA policies, tickets, comments, ticket history and notifications. Ticket visibility is scoped by role and ownership. Developers can read tickets assigned to them; the Development Lead can view the Engineering queue; Support Agents can view tickets they own or created; Support Managers and Admin can review the company queue.

The migration is a starter policy set and must be tested against the company's final access requirements before production. In particular, validate role transitions, update permissions and data visibility with separate test accounts for all five roles. Never expose the service-role key in the frontend.

## Important integration boundaries

- Phone/email tickets are currently created manually by Support; email inbox auto-ingestion and outbound email sending are not configured.
- Customer-visible replies are recorded as ticket comments; an email provider integration is needed to actually send those replies to customers.
- SLA deadlines are stored on tickets and shown in the ticket/report views. Scheduled SLA reminders and automatic escalation timers require a scheduled Edge Function or database cron job and business-hours/holiday rules.
- Website records are used to classify tickets and report by site. Site-specific customer support forms/API intake are not enabled in this release.
- The company must supply real website data, users, approved SLA targets and Supabase credentials before it can be used with live customer data.

## Quality checks

```bash
npm run build
npm run lint
```

Do not use live customer data until Supabase setup, RLS tests, role tests, backup and notification checks have been completed.

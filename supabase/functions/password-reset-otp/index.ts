import { createClient } from 'npm:@supabase/supabase-js@2';
import nodemailer from 'npm:nodemailer';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

async function hashOtp(otp: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(otp));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function normaliseEmail(value: unknown) {
  return String(value || '').trim().toLowerCase();
}

function randomHex(byteLength: number) {
  const bytes = new Uint8Array(byteLength);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function escapeHtml(value: unknown) {
  return String(value || '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[character] || character));
}

async function sendZeptoMail(body: { to: string; subject: string; text: string; html: string }) {
  const smtpHost = Deno.env.get('ZEPTOMAIL_SMTP_HOST');
  const smtpPort = Number(Deno.env.get('ZEPTOMAIL_SMTP_PORT') || 587);
  const smtpUser = Deno.env.get('ZEPTOMAIL_SMTP_USER');
  const smtpPassword = Deno.env.get('ZEPTOMAIL_SMTP_PASSWORD');
  const fromEmail = Deno.env.get('ZEPTOMAIL_FROM_EMAIL');
  const fromName = Deno.env.get('ZEPTOMAIL_FROM_NAME') || 'RicozDesk';
  if (!smtpHost || !smtpUser || !smtpPassword || !fromEmail) throw new Error('ZeptoMail SMTP is not configured.');

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPassword },
  });
  await transporter.sendMail({
    from: `"${fromName}" <${fromEmail}>`,
    ...body,
  });
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) throw new Error('Password reset service is not configured.');

    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const body = await request.json();
    const action = String(body.action || '');
    const email = normaliseEmail(body.email);

    if (!/^\S+@\S+\.\S+$/.test(email)) return json({ error: 'Enter a valid work email address.' }, 400);

    if (action === 'signup_email_request') {
      const { data: recent } = await admin.from('signup_email_otps')
        .select('created_at')
        .eq('email', email)
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) {
        return json({ success: true, message: 'A verification code has been sent to your email.' });
      }

      const randomValue = new Uint32Array(1);
      crypto.getRandomValues(randomValue);
      const otp = String((randomValue[0] % 900000) + 100000);
      const { error: insertError } = await admin.from('signup_email_otps').insert({
        email,
        otp_hash: await hashOtp(otp),
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
      if (insertError) throw insertError;

      await sendZeptoMail({
        to: email,
        subject: 'Verify your RicozDesk email address',
        text: `Your RicozDesk email verification code is ${otp}. It expires in 10 minutes.`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px"><h2>Verify your RicozDesk email</h2><p>Use this one-time code before creating your RicozDesk access request:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px">${otp}</p><p>This code expires in 10 minutes.</p></div>`,
      });
      return json({ success: true, message: 'A verification code has been sent to your email.' });
    }

    if (action === 'signup_email_verify') {
      const otp = String(body.otp || '').trim();
      if (!/^\d{6}$/.test(otp)) return json({ error: 'Enter the 6-digit verification code.' }, 400);
      const { data: row } = await admin.from('signup_email_otps')
        .select('id,otp_hash,expires_at,attempts')
        .eq('email', email)
        .is('used_at', null)
        .is('verified_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!row || row.attempts >= 5 || new Date(row.expires_at).getTime() < Date.now() || row.otp_hash !== await hashOtp(otp)) {
        if (row) await admin.from('signup_email_otps').update({ attempts: row.attempts + 1 }).eq('id', row.id);
        return json({ error: 'The verification code is invalid or expired.' }, 400);
      }
      const verificationToken = randomHex(32);
      const { error: verifyError } = await admin.from('signup_email_otps').update({
        verified_at: new Date().toISOString(),
        verification_token_hash: await hashOtp(verificationToken),
        token_expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
      }).eq('id', row.id);
      if (verifyError) throw verifyError;
      return json({ success: true, verification_token: verificationToken, message: 'Email verified.' });
    }

    if (action === 'signup_create') {
      const verificationToken = String(body.verification_token || '');
      const password = String(body.password || '');
      const fullName = String(body.full_name || '').trim();
      const requestedRole = String(body.requested_role || '');
      const skills = Array.isArray(body.skills) ? body.skills : [];
      if (!verificationToken || password.length < 8 || !fullName || !['support_manager', 'support_agent', 'tech_lead', 'developer'].includes(requestedRole)) {
        return json({ error: 'Complete the verified signup form with a valid password and role.' }, 400);
      }

      const { data: verification } = await admin.from('signup_email_otps')
        .select('id,verification_token_hash,token_expires_at')
        .eq('email', email)
        .not('verified_at', 'is', null)
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!verification || new Date(verification.token_expires_at).getTime() < Date.now() || verification.verification_token_hash !== await hashOtp(verificationToken)) {
        return json({ error: 'Your email verification has expired. Verify your email again.' }, 400);
      }

      const { data: createdUser, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          public_signup: true,
          public_signup_verified: false,
          requested_role: requestedRole,
          skills,
        },
      });
      if (createError || !createdUser?.user) throw createError || new Error('Unable to create the account.');

      const requestedTeam = ['tech_lead', 'developer'].includes(requestedRole)
        ? 'Engineering'
        : requestedRole === 'support_manager' ? 'Management' : 'Customer Support';
      const { error: requestError } = await admin.from('role_requests').insert({
        user_id: createdUser.user.id,
        full_name: fullName,
        email,
        requested_role: requestedRole,
        requested_team: requestedTeam,
        requested_skills: skills,
        status: 'pending',
      });
      if (requestError) throw requestError;
      const { error: usedError } = await admin.from('signup_email_otps').update({ used_at: new Date().toISOString() }).eq('id', verification.id);
      if (usedError) throw usedError;
      return json({ success: true, message: 'Your access request has been sent to an administrator.' });
    }

    if (action === 'request' || action === 'signup_request') {
      const { data: userData } = await admin.auth.admin.getUserByEmail(email);

      // Always return the same response for unknown emails to avoid account enumeration.
      if (!userData?.user) return json({ success: true, message: 'If an account exists, an OTP has been sent.' });
      if (action === 'signup_request' && userData.user.user_metadata?.public_signup_verified === true) {
        return json({ error: 'This email has already been verified. Please sign in or request access again.' }, 400);
      }
      if (action === 'signup_request') {
        // Remove requests created by an older trigger before the email is verified.
        // The request is inserted again only by the signup_verify action.
        const { error: cleanupError } = await admin.from('role_requests')
          .delete()
          .eq('user_id', userData.user.id)
          .eq('status', 'pending');
        if (cleanupError) throw cleanupError;
        const { error: profileError } = await admin.from('profiles')
          .update({ is_active: false })
          .eq('id', userData.user.id);
        if (profileError) throw profileError;
      }

      const { data: recent } = await admin.from('password_reset_otps')
        .select('created_at')
        .eq('user_id', userData.user.id)
        .eq('purpose', action === 'signup_request' ? 'signup_verification' : 'password_reset')
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (recent && Date.now() - new Date(recent.created_at).getTime() < 60_000) {
        return json({ success: true, message: 'If an account exists, an OTP has been sent.' });
      }

      const randomValue = new Uint32Array(1);
      crypto.getRandomValues(randomValue);
      const otp = String((randomValue[0] % 900000) + 100000);
      const { error: insertError } = await admin.from('password_reset_otps').insert({
        user_id: userData.user.id,
        email,
        otp_hash: await hashOtp(otp),
        purpose: action === 'signup_request' ? 'signup_verification' : 'password_reset',
        expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      });
      if (insertError) throw insertError;

      const signup = action === 'signup_request';
      await sendZeptoMail({
        to: email,
        subject: signup ? 'Verify your RicozDesk email address' : 'Your RicozDesk password reset code',
        text: signup
          ? `Your RicozDesk email verification code is ${otp}. It expires in 10 minutes.`
          : `Your RicozDesk password reset code is ${otp}. It expires in 10 minutes.`,
        html: signup
          ? `<div style="font-family:Arial,sans-serif;max-width:520px"><h2>Verify your RicozDesk email</h2><p>Use this one-time code to submit your workspace access request:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px">${otp}</p><p>This code expires in 10 minutes.</p></div>`
          : `<div style="font-family:Arial,sans-serif;max-width:520px"><h2>Reset your RicozDesk password</h2><p>Use this one-time code to continue:</p><p style="font-size:30px;font-weight:700;letter-spacing:8px">${otp}</p><p>This code expires in 10 minutes. If you did not request this, you can ignore this email.</p></div>`,
      });
      return json({ success: true, message: 'If an account exists, an OTP has been sent.' });
    }

    if (action === 'verify' || action === 'signup_verify') {
      const otp = String(body.otp || '').trim();
      const newPassword = String(body.new_password || '');
      if (!/^\d{6}$/.test(otp) || (action === 'verify' && newPassword.length < 8)) {
        return json({ error: action === 'signup_verify' ? 'Enter the 6-digit verification code.' : 'Enter the 6-digit OTP and a password with at least 8 characters.' }, 400);
      }

      const { data: userData } = await admin.auth.admin.getUserByEmail(email);
      if (!userData?.user) return json({ error: 'The OTP is invalid or expired.' }, 400);
      const { data: row } = await admin.from('password_reset_otps')
        .select('id,otp_hash,expires_at,attempts')
        .eq('user_id', userData.user.id)
        .eq('purpose', action === 'signup_verify' ? 'signup_verification' : 'password_reset')
        .is('used_at', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!row || row.attempts >= 5 || new Date(row.expires_at).getTime() < Date.now() || row.otp_hash !== await hashOtp(otp)) {
        if (row) await admin.from('password_reset_otps').update({ attempts: row.attempts + 1 }).eq('id', row.id);
        return json({ error: 'The OTP is invalid or expired.' }, 400);
      }

      if (action === 'signup_verify') {
        const metadata = userData.user.user_metadata || {};
        const { error: verifyError } = await admin.auth.admin.updateUserById(userData.user.id, {
          email_confirm: true,
          user_metadata: { ...metadata, public_signup_verified: true },
        });
        if (verifyError) throw verifyError;

        const requestedRole = ['support_manager', 'support_agent', 'tech_lead', 'developer'].includes(metadata.requested_role)
          ? metadata.requested_role
          : 'support_agent';
        const requestedTeam = ['tech_lead', 'developer'].includes(requestedRole)
          ? 'Engineering'
          : requestedRole === 'support_manager' ? 'Management' : 'Customer Support';
        const requestedSkills = Array.isArray(metadata.skills) ? metadata.skills : [];
        const { error: requestError } = await admin.from('role_requests').upsert({
          user_id: userData.user.id,
          full_name: metadata.full_name || email.split('@')[0],
          email,
          requested_role: requestedRole,
          requested_team: requestedTeam,
          requested_skills: requestedSkills,
          status: 'pending',
        }, { onConflict: 'user_id' });
        if (requestError) throw requestError;
        const { error: profileError } = await admin.from('profiles').update({ is_active: false }).eq('id', userData.user.id);
        if (profileError) throw profileError;
      } else {
        const { error: passwordError } = await admin.auth.admin.updateUserById(userData.user.id, { password: newPassword });
        if (passwordError) throw passwordError;
      }
      const { error: usedError } = await admin.from('password_reset_otps').update({ used_at: new Date().toISOString() }).eq('id', row.id);
      if (usedError) throw usedError;
      return json({ success: true, message: action === 'signup_verify' ? 'Email verified and access request submitted.' : 'Password updated. You can now sign in.' });
    }

    if (action === 'approval_notification' || action === 'access_decision_notification') {
      const authorization = request.headers.get('Authorization');
      const accessToken = authorization?.replace(/^Bearer\s+/i, '');
      if (!accessToken) return json({ error: 'Admin authentication is required.' }, 401);
      const { data: callerData, error: callerError } = await admin.auth.getUser(accessToken);
      if (callerError || !callerData.user) return json({ error: 'Admin authentication is required.' }, 401);
      const { data: callerProfile, error: callerProfileError } = await admin.from('profiles')
        .select('role,is_active')
        .eq('id', callerData.user.id)
        .maybeSingle();
      if (callerProfileError) throw callerProfileError;
      if (callerProfile?.role !== 'admin' || !callerProfile.is_active) {
        return json({ error: 'Only an active administrator can send approval notifications.' }, 403);
      }

      const requestId = String(body.request_id || '');
      const decision = action === 'access_decision_notification' ? String(body.status || '') : 'approved';
      if (!['approved', 'rejected'].includes(decision)) {
        return json({ error: 'Access decision must be approved or rejected.' }, 400);
      }
      const { data: roleRequest, error: requestError } = await admin.from('role_requests')
        .select('user_id,full_name,email,status')
        .eq('id', requestId)
        .eq('status', decision)
        .maybeSingle();
      if (requestError) throw requestError;
      if (!roleRequest) return json({ error: `${decision === 'approved' ? 'Approved' : 'Rejected'} access request not found.` }, 404);

      const roleLabels: Record<string, string> = {
        support_agent: 'Support Agent',
        support_manager: 'Support Manager',
        tech_lead: 'Technical Lead',
        developer: 'Developer',
      };
      const safeName = escapeHtml(roleRequest.full_name);
      if (decision === 'approved') {
        const loginUrl = Deno.env.get('APP_LOGIN_URL');
        if (!loginUrl) throw new Error('APP_LOGIN_URL is not configured.');
        const { data: profile, error: profileError } = await admin.from('profiles')
          .select('role')
          .eq('id', roleRequest.user_id)
          .maybeSingle();
        if (profileError) throw profileError;
        const roleLabel = roleLabels[profile?.role] || 'RicozDesk team member';
        const safeRole = escapeHtml(roleLabel);
        const safeUrl = escapeHtml(loginUrl);
        await sendZeptoMail({
          to: roleRequest.email,
          subject: 'Your RicozDesk account is now active',
          text: `Hello ${roleRequest.full_name}, your RicozDesk account is now active as ${roleLabel}. Sign in at ${loginUrl} using the email and password you created.`,
          html: `<div style="font-family:Arial,sans-serif;max-width:560px"><h2>Your RicozDesk account is active</h2><p>Hello ${safeName},</p><p>Your access request has been approved. Your account is now active as <strong>${safeRole}</strong>.</p><p>You can sign in using the email and password you created:</p><p><a href="${safeUrl}">${safeUrl}</a></p><p>If you did not request this account, please contact your administrator.</p></div>`,
        });
      } else {
        await sendZeptoMail({
          to: roleRequest.email,
          subject: 'Update on your RicozDesk access request',
          text: `Hello ${roleRequest.full_name}, your RicozDesk access request was not approved at this time. Please contact your administrator if you need more information.`,
          html: `<div style="font-family:Arial,sans-serif;max-width:560px"><h2>Update on your RicozDesk access request</h2><p>Hello ${safeName},</p><p>Your workspace access request was not approved at this time.</p><p>Please contact your administrator if you need more information.</p></div>`,
        });
      }
      return json({ success: true, message: `${decision === 'approved' ? 'Approval' : 'Rejection'} email sent.` });
    }

    return json({ error: 'Unsupported password reset action.' }, 400);
  } catch (error) {
    console.error('Password reset failed:', error);
    return json({ error: error instanceof Error ? error.message : 'Password reset is temporarily unavailable.' }, 500);
  }
});

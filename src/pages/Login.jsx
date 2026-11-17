import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { ShieldCheck, AlertCircle, Mail, Lock, ArrowLeft, UserRound, BriefcaseBusiness, CheckCircle2, KeyRound } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';

const roleOptions = [
  { value: 'support_agent', label: 'Support Agent' },
  { value: 'support_manager', label: 'Support Manager' },
  { value: 'tech_lead', label: 'Technical Lead' },
  { value: 'developer', label: 'Developer' },
];

export default function Login({ onLoginSuccess, configurationMissing = false, profileError = '' }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'signup' ? 'signup' : searchParams.get('mode') === 'forgot' ? 'forgot' : 'login';
  const [mode, setMode] = useState(initialMode);
  const [resetStep, setResetStep] = useState('request');
  const [signupStep, setSignupStep] = useState('email');
  const [verificationToken, setVerificationToken] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('support_agent');
  const [skills, setSkills] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(initialMode === 'login' ? profileError : '');

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setResetStep('request');
    setSignupStep('email');
    setVerificationToken('');
    setSearchParams(nextMode === 'login' ? {} : { mode: nextMode });
    setMessage('');
    setError('');
  };

  const getAuthErrorMessage = (authError) => {
    if (authError?.message?.toLowerCase().includes('failed to send a request to the edge function')
      || authError?.message?.toLowerCase().includes('404')) {
      return 'Email verification service is not deployed yet. Deploy the password-reset-otp Supabase Edge Function, then try again.';
    }
    if (authError?.message?.toLowerCase().includes('email rate limit')) {
      return 'Supabase email limit reached. Turn off email confirmation for this approval-first flow or configure ZeptoMail SMTP in the password reset function.';
    }
    return authError?.message || 'Something went wrong. Please try again.';
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (configurationMissing) {
      setError('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to your .env file first.');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');
    try {
      if (mode === 'signup') {
        if (signupStep === 'email') {
          const { error: otpError } = await supabase.functions.invoke('password-reset-otp', { body: { action: 'signup_email_request', email: email.trim() } });
          if (otpError) throw otpError;
          setSignupStep('otp');
          setMessage('We sent a verification code to your email.');
        } else if (signupStep === 'otp') {
          const { data: verificationData, error: verifyError } = await supabase.functions.invoke('password-reset-otp', {
            body: { action: 'signup_email_verify', email: email.trim(), otp: otp.trim() },
          });
          if (verifyError) throw verifyError;
          setVerificationToken(verificationData?.verification_token || '');
          setSignupStep('form');
          setOtp('');
          setMessage('Email verified. Complete the form below to send your access request.');
        } else {
          const { error: createError } = await supabase.functions.invoke('password-reset-otp', {
            body: {
              action: 'signup_create',
              email: email.trim(),
              verification_token: verificationToken,
              password,
              full_name: fullName.trim(),
              requested_role: role,
              skills: skills.split(',').map((item) => item.trim()).filter(Boolean),
            },
          });
          if (createError) throw createError;
          setSignupStep('email');
          setVerificationToken('');
          setPassword('');
          setFullName('');
          setSkills('');
          changeMode('login');
          setMessage('Your access request has been sent to an administrator. You will receive an email when your account is approved.');
        }
      } else if (mode === 'forgot') {
        if (resetStep === 'request') {
          const { error: functionError } = await supabase.functions.invoke('password-reset-otp', { body: { action: 'request', email: email.trim() } });
          if (functionError) throw functionError;
          setResetStep('verify');
          setMessage('If an account exists for this email, a 6-digit OTP has been sent.');
        } else {
          const { error: functionError } = await supabase.functions.invoke('password-reset-otp', {
            body: { action: 'verify', email: email.trim(), otp: otp.trim(), new_password: newPassword },
          });
          if (functionError) throw functionError;
          changeMode('login');
          setPassword('');
          setNewPassword('');
          setOtp('');
          setMessage('Password updated successfully. You can now sign in.');
        }
      } else {
        const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (authError) throw authError;
        if (data?.user) await onLoginSuccess(data.user.id);
      }
    } catch (submitError) {
      setError(getAuthErrorMessage(submitError));
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';
  const heading = isSignup ? (signupStep === 'email' ? 'Verify your email' : signupStep === 'otp' ? 'Enter your verification code' : 'Request workspace access') : isForgot ? (resetStep === 'request' ? 'Reset your password' : 'Enter your reset code') : 'Welcome back';

  return (
    <div className="login-shell">
      <div className="login-layout">
        <aside className="login-overview">
          <Link to="/" className="login-back"><ArrowLeft size={15}/> Back to RicozDesk</Link>
          <div className="login-overview-brand"><span className="login-overview-mark">rZ</span><span>RicozDesk</span></div>
          <div className="login-overview-copy">
            <span className="login-overview-kicker">SUPPORT OPERATIONS, CONNECTED</span>
            <h1>Keep every request moving with confidence.</h1>
            <p>One secure workspace for Support, Technical teams and administrators to turn customer issues into confirmed fixes.</p>
          </div>
          <div className="login-overview-points">
            <div><CheckCircle2/><span><b>Clear ownership</b><small>Every ticket has a responsible team.</small></span></div>
            <div><CheckCircle2/><span><b>Role-based access</b><small>Only the right workspace is visible.</small></span></div>
            <div><CheckCircle2/><span><b>Approval-first security</b><small>New team access is reviewed by Admin.</small></span></div>
          </div>
          <span className="login-overview-footer">From first contact to confirmed fix.</span>
        </aside>

        <main className="login-card">
          <div className="login-brand">
            <div className="login-brand-mark"><ShieldCheck size={23} color="#fff" /></div>
            <div><h2>RicozDesk</h2><p>Enterprise Support Operations</p></div>
          </div>
          <div className="login-heading-row"><div><span className="login-step-label">{isSignup ? 'NEW TEAM MEMBER' : isForgot ? 'ACCOUNT RECOVERY' : 'SECURE WORKSPACE'}</span><h3 className="login-heading">{heading}</h3></div>{isForgot && <KeyRound className="login-heading-icon" size={22}/>}</div>
          <p className="login-intro">{isSignup ? (signupStep === 'email' ? 'Enter your work email first. We will verify it before showing the access form.' : signupStep === 'otp' ? 'Enter the one-time code we sent to your work email.' : 'Your email is verified. Complete your details to send the request.') : isForgot ? 'We will send a one-time code to your work email.' : 'Sign in to continue to your approved RicozDesk workspace.'}</p>
          {configurationMissing && <div className="login-error" role="status"><AlertCircle size={16}/><span>Supabase setup is required. See <code>.env.example</code>.</span></div>}
          {error && <div className="login-error" role="alert"><AlertCircle size={16}/><span>{error}</span></div>}
          {message && <div className="login-success" role="status"><CheckCircle2 size={16}/><span>{message}</span></div>}
          <form onSubmit={handleSubmit} className="login-form">
            {isSignup ? <><label className="form-group"><span>Work email</span><div className="input-wrap"><Mail size={16}/><input type="email" autoComplete="email" required placeholder="name@company.com" readOnly={signupStep !== 'email'} value={email} onChange={(event) => setEmail(event.target.value)}/></div></label>{signupStep === 'otp' && <label className="form-group"><span>6-digit verification code</span><div className="input-wrap"><KeyRound size={16}/><input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="Enter code from email" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}/></div></label>}{signupStep === 'form' && <><label className="form-group"><span>Full name</span><div className="input-wrap"><UserRound size={16}/><input type="text" autoComplete="name" required placeholder="Your full name" value={fullName} onChange={(event) => setFullName(event.target.value)}/></div></label><label className="form-group"><span>Password</span><div className="input-wrap"><Lock size={16}/><input type="password" autoComplete="new-password" minLength={8} required placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)}/></div></label><label className="form-group"><span>Requested role</span><div className="input-wrap role-select-wrap"><BriefcaseBusiness size={16}/><select value={role} onChange={(event) => setRole(event.target.value)}>{roleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div></label><label className="form-group"><span>Skills or work area <small>(optional)</small></span><input className="form-control" placeholder="Authentication, API, customer support" value={skills} onChange={(event) => setSkills(event.target.value)}/></label></>}</> : <><label className="form-group"><span>Work email</span><div className="input-wrap"><Mail size={16}/><input type="email" autoComplete="email" required placeholder="name@company.com" value={email} onChange={(event) => setEmail(event.target.value)}/></div></label>{isForgot && resetStep === 'verify' ? <><label className="form-group"><span>6-digit OTP</span><div className="input-wrap"><KeyRound size={16}/><input inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="Enter code from email" value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))}/></div></label><label className="form-group"><span>New password</span><div className="input-wrap"><Lock size={16}/><input type="password" autoComplete="new-password" minLength={8} required placeholder="At least 8 characters" value={newPassword} onChange={(event) => setNewPassword(event.target.value)}/></div></label></> : <label className="form-group"><span>Password</span><div className="input-wrap"><Lock size={16}/><input type="password" autoComplete="current-password" required minLength={8} placeholder="Enter your password" value={password} onChange={(event) => setPassword(event.target.value)}/></div></label>}</>}
            <button type="submit" className="btn btn-primary login-button" disabled={loading || configurationMissing}>{loading ? (isSignup ? (signupStep === 'email' ? 'Sending verification code...' : signupStep === 'otp' ? 'Verifying email...' : 'Sending access request...') : isForgot ? (resetStep === 'request' ? 'Sending code...' : 'Updating password...') : 'Signing in...') : (isSignup ? (signupStep === 'email' ? 'Verify email' : signupStep === 'otp' ? 'Verify code' : 'Send access request') : isForgot ? (resetStep === 'request' ? 'Send OTP' : 'Reset password') : 'Sign in securely')}</button>
          </form>
          <div className="login-links">{isForgot ? <button type="button" onClick={() => changeMode('login')}>Back to sign in</button> : <>{!isSignup && <button type="button" onClick={() => changeMode('forgot')}>Forgot password?</button>} <button type="button" onClick={() => changeMode(isSignup ? 'login' : 'signup')}>{isSignup ? 'Already approved? Sign in' : 'Need workspace access? Request access'}</button></>}</div>
        </main>
      </div>
    </div>
  );
}

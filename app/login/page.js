"use client";

import { createClient } from "../../lib/supabase-client";

export default function LoginPage() {
  const supabase = createClient();

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <a href="/" className="login-logo">bilbax</a>
        <h1>Welcome</h1>
        <p>Continue to manage your Instagram automations.</p>
        <button onClick={handleGoogleLogin} className="google-btn">
          <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
            <path fill="#4285F4" d="M19.6 10.23c0-.68-.06-1.36-.18-2H10v3.79h5.38a4.6 4.6 0 0 1-2 3.02v2.5h3.23c1.9-1.75 2.99-4.33 2.99-7.31z"/>
            <path fill="#34A853" d="M10 20c2.7 0 4.96-.89 6.62-2.42l-3.23-2.5c-.9.6-2.05.95-3.39.95-2.6 0-4.8-1.76-5.59-4.12H1.06v2.59A10 10 0 0 0 10 20z"/>
            <path fill="#FBBC05" d="M4.41 11.91a5.99 5.99 0 0 1 0-3.82V5.5H1.06a10 10 0 0 0 0 9l3.35-2.59z"/>
            <path fill="#EA4335" d="M10 3.98c1.47 0 2.79.5 3.82 1.49l2.87-2.87A9.94 9.94 0 0 0 10 0 10 10 0 0 0 1.06 5.5l3.35 2.59C5.2 5.74 7.4 3.98 10 3.98z"/>
          </svg>
          Continue with Google
        </button>
        <p className="login-fine-print">
          By continuing, you agree to Bilbax's terms and privacy policy.
        </p>
      </div>

      <style jsx>{`
        .login-shell {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #14121f;
          padding: 24px;
        }
        .login-card {
          background: #fff8ed;
          border: 3px solid #14121f;
          border-radius: 20px;
          box-shadow: 8px 8px 0 #ff4fa3;
          padding: 40px 32px;
          max-width: 380px;
          width: 100%;
          text-align: center;
        }
        .login-logo {
          font-weight: 800;
          font-size: 24px;
          color: #14121f;
          text-decoration: none;
          display: inline-block;
          margin-bottom: 24px;
        }
        h1 {
          font-size: 28px;
          font-weight: 800;
          margin: 0 0 8px;
          color: #14121f;
        }
        p {
          color: #4a4658;
          margin: 0 0 24px;
          font-size: 15px;
        }
        .google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 12px;
          padding: 14px 20px;
          font-size: 16px;
          font-weight: 700;
          color: #14121f;
          cursor: pointer;
          box-shadow: 4px 4px 0 #14121f;
          transition: transform 0.15s ease;
        }
        .google-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0 #14121f;
        }
        .google-btn:active {
          transform: translate(0, 0);
          box-shadow: 2px 2px 0 #14121f;
        }
        .login-fine-print {
          margin-top: 20px;
          font-size: 12px;
          color: #8a8496;
        }
      `}</style>
    </div>
  );
}

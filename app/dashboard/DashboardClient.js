"use client";

import { createClient } from "../../lib/supabase-client";
import { useRouter } from "next/navigation";

export default function DashboardClient({ user, igAccount }) {
  const supabase = createClient();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleConnectInstagram() {
    // This points to the Instagram OAuth flow we'll wire up in the next part.
    window.location.href = "/api/instagram/connect";
  }

  return (
    <div className="dash-shell">
      <header className="dash-header">
        <a href="/" className="dash-logo">bilbax</a>
        <div className="dash-user">
          <span>{user.email}</span>
          <button onClick={handleLogout} className="logout-btn">Log out</button>
        </div>
      </header>

      <main className="dash-main">
        {!igAccount ? (
          <div className="empty-state">
            <div className="empty-icon">📸</div>
            <h2>Connect your Instagram Business account</h2>
            <p>
              Bilbax needs access to your Instagram Business or Creator
              account to start automating comments and DMs.
            </p>
            <button onClick={handleConnectInstagram} className="connect-btn">
              Connect Instagram →
            </button>
          </div>
        ) : (
          <div className="connected-state">
            <div className="connected-card">
              <div className="connected-badge">✓ Connected</div>
              <h2>@{igAccount.ig_username}</h2>
              <p>Your Instagram account is linked and ready.</p>
            </div>
            <div className="empty-state" style={{ marginTop: 32 }}>
              <div className="empty-icon">⚡</div>
              <h2>No automations yet</h2>
              <p>Create your first comment-to-DM automation to get started.</p>
              <button className="connect-btn" disabled>
                Create automation (coming next)
              </button>
            </div>
          </div>
        )}
      </main>

      <style jsx>{`
        .dash-shell {
          min-height: 100vh;
          background: #fff8ed;
        }
        .dash-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 32px;
          background: #14121f;
        }
        .dash-logo {
          font-weight: 800;
          font-size: 22px;
          color: #fff8ed;
          text-decoration: none;
        }
        .dash-user {
          display: flex;
          align-items: center;
          gap: 16px;
          color: #fff8ed;
          font-size: 14px;
        }
        .logout-btn {
          background: transparent;
          border: 2px solid #fff8ed;
          color: #fff8ed;
          padding: 8px 16px;
          border-radius: 8px;
          font-weight: 700;
          cursor: pointer;
          font-size: 13px;
        }
        .logout-btn:hover {
          background: #fff8ed;
          color: #14121f;
        }
        .dash-main {
          max-width: 640px;
          margin: 0 auto;
          padding: 64px 24px;
        }
        .empty-state {
          text-align: center;
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 20px;
          padding: 48px 32px;
          box-shadow: 6px 6px 0 #7c3aed;
        }
        .empty-icon {
          font-size: 40px;
          margin-bottom: 16px;
        }
        .empty-state h2 {
          font-size: 22px;
          font-weight: 800;
          color: #14121f;
          margin: 0 0 8px;
        }
        .empty-state p {
          color: #4a4658;
          margin: 0 0 24px;
          font-size: 15px;
          line-height: 1.5;
        }
        .connect-btn {
          background: linear-gradient(135deg, #ff4fa3, #7c3aed);
          color: #fff;
          border: 3px solid #14121f;
          border-radius: 999px;
          padding: 14px 28px;
          font-weight: 800;
          font-size: 15px;
          cursor: pointer;
          box-shadow: 4px 4px 0 #14121f;
        }
        .connect-btn:hover:not(:disabled) {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0 #14121f;
        }
        .connect-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .connected-card {
          text-align: center;
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 20px;
          padding: 32px;
          box-shadow: 6px 6px 0 #00d4b8;
        }
        .connected-badge {
          display: inline-block;
          background: #00d4b8;
          color: #14121f;
          font-weight: 800;
          font-size: 12px;
          padding: 4px 12px;
          border-radius: 999px;
          margin-bottom: 12px;
        }
        .connected-card h2 {
          font-size: 22px;
          margin: 0 0 8px;
          color: #14121f;
        }
        .connected-card p {
          color: #4a4658;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

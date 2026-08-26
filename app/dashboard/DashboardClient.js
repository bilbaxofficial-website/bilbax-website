"use client";

import { createClient } from "../../lib/supabase-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

const MAX_ACCOUNTS_PER_USER = 5;

const ERROR_MESSAGES = {
  1: "Instagram connection didn't go through. Give it another try below.",
  account_limit: `You've hit the limit of ${MAX_ACCOUNTS_PER_USER} Instagram accounts. Disconnect one to add another.`,
  already_connected: "That Instagram account is already connected to a different Bilbax account.",
};

// props:
//   user           - the logged-in Bilbax user
//   igAccounts     - array of ALL Instagram accounts connected to this user (can be empty)
export default function DashboardClient({ user, igAccounts = [] }) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const igError = searchParams.get("ig_error");

  // Which connected account is currently "active" in the dashboard view.
  // Defaults to the ?account=<id> URL param if present (e.g. coming back
  // from the automations list), otherwise the first connected account.
  const accountFromUrl = searchParams.get("account");
  const initialSelectedId =
    (accountFromUrl && igAccounts.some((a) => a.id === accountFromUrl))
      ? accountFromUrl
      : igAccounts[0]?.id || null;
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const selectedAccount = igAccounts.find((a) => a.id === selectedId) || igAccounts[0] || null;

  // Welcome Message settings (simple - no gates, no follow-ups)
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeEnabled, setWelcomeEnabled] = useState(selectedAccount?.welcome_enabled || false);
  const [welcomeMessage, setWelcomeMessage] = useState(selectedAccount?.welcome_message || "");
  const [welcomeButtonTitle, setWelcomeButtonTitle] = useState(selectedAccount?.welcome_button_title || "");
  const [welcomeButtonUrl, setWelcomeButtonUrl] = useState(selectedAccount?.welcome_button_url || "");
  const [savingWelcome, setSavingWelcome] = useState(false);

  function openWelcomeSettings() {
    setWelcomeEnabled(selectedAccount?.welcome_enabled || false);
    setWelcomeMessage(selectedAccount?.welcome_message || "");
    setWelcomeButtonTitle(selectedAccount?.welcome_button_title || "");
    setWelcomeButtonUrl(selectedAccount?.welcome_button_url || "");
    setWelcomeOpen(true);
  }

  async function saveWelcomeSettings() {
    setSavingWelcome(true);
    await supabase
      .from("instagram_accounts")
      .update({
        welcome_enabled: welcomeEnabled,
        welcome_message: welcomeMessage.trim() || null,
        welcome_button_title: welcomeButtonTitle.trim() || null,
        welcome_button_url: welcomeButtonUrl.trim() || null,
      })
      .eq("id", selectedAccount.id);
    setSavingWelcome(false);
    setWelcomeOpen(false);
    router.refresh();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function handleConnectInstagram() {
    window.location.href = "/api/instagram/connect";
  }

  async function handleDisconnect(accountId) {
    const confirmed = window.confirm(
      "Disconnect this Instagram account? Its automations will stop running."
    );
    if (!confirmed) return;

    await supabase.from("instagram_accounts").delete().eq("id", accountId);
    router.refresh();
  }

  const initials = (user.email || "?").charAt(0).toUpperCase();
  const canAddMore = igAccounts.length < MAX_ACCOUNTS_PER_USER;

  return (
    <div className="dash-shell">
      <header className="dash-header">
        <a href="/" className="dash-logo"><img src="/bilbax-logo.png" alt="bilbax" className="brand-logo-img" /></a>
        <div className="dash-user">
          <div className="dash-identity">
            <div className="dash-avatar">{initials}</div>
            <span className="dash-email">{user.email}</span>
          </div>
          <button onClick={handleLogout} className="logout-btn">Log out</button>
        </div>
      </header>

      <main className="dash-main">
        {igError && (
          <div className="error-banner">
            {ERROR_MESSAGES[igError] || ERROR_MESSAGES[1]}
          </div>
        )}

        {igAccounts.length === 0 ? (
          <div className="hero-card">
            <div className="hero-badge">Step 1 of 1</div>
            <h1>Connect your Instagram Professional account</h1>
            <p>
              Connect your Instagram Professional account to start Automation.
              It only takes about 30 seconds.
            </p>
            <button onClick={handleConnectInstagram} className="connect-btn">
              Connect Instagram
              <span className="btn-arrow">→</span>
            </button>
            <div className="hero-footnote">
              Uses Meta's official Instagram API. Bilbax never sees your
              password.
            </div>
          </div>
        ) : (
          <>
            {/* Account switcher - only shows the tab row if there's more than one */}
            {igAccounts.length > 1 && (
              <div className="account-tabs">
                {igAccounts.map((acc) => (
                  <button
                    key={acc.id}
                    className={`account-tab ${acc.id === selectedId ? "active" : ""}`}
                    onClick={() => setSelectedId(acc.id)}
                  >
                    @{acc.ig_username}
                  </button>
                ))}
                {canAddMore && (
                  <button className="account-tab account-tab-add" onClick={handleConnectInstagram}>
                    + Add account
                  </button>
                )}
              </div>
            )}

            <div className="connected-banner">
              <div className="connected-left">
                <div className="pulse-dot" />
                <div>
                  <div className="connected-label">
                    {igAccounts.length > 1 ? "Viewing" : "Connected account"}
                  </div>
                  <div className="connected-username">@{selectedAccount.ig_username}</div>
                </div>
              </div>
              <div className="connected-actions">
                <button
                  className="disconnect-btn"
                  onClick={() => handleDisconnect(selectedAccount.id)}
                  title="Disconnect this account"
                >
                  Disconnect
                </button>
                <div className="connected-check">✓</div>
              </div>
            </div>

            {igAccounts.length === 1 && canAddMore && (
              <button className="add-account-link" onClick={handleConnectInstagram}>
                + Connect another Instagram account ({igAccounts.length}/{MAX_ACCOUNTS_PER_USER})
              </button>
            )}
            {!canAddMore && (
              <div className="limit-note">
                You've connected {MAX_ACCOUNTS_PER_USER}/{MAX_ACCOUNTS_PER_USER} accounts (the current max).
              </div>
            )}

            {/* Welcome Message settings card */}
            <div className="welcome-card">
              <div className="welcome-card-left">
                <div className="welcome-icon">👋</div>
                <div>
                  <div className="welcome-title">Welcome Message</div>
                  <div className="welcome-sub">
                    {selectedAccount.welcome_enabled
                      ? "On — greets anyone who DMs you for the first time"
                      : "Off — greet first-time DM senders automatically"}
                  </div>
                </div>
              </div>
              <button className="welcome-edit-btn" onClick={openWelcomeSettings}>
                {selectedAccount.welcome_enabled ? "Edit" : "Set up"}
              </button>
            </div>

            {welcomeOpen && (
              <div className="welcome-modal-overlay" onClick={() => setWelcomeOpen(false)}>
                <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
                  <h3>Welcome Message</h3>
                  <p className="welcome-modal-sub">
                    Send a welcome DM automatically when someone messages you for the first time.
                  </p>

                  <div className="welcome-switch-row">
                    <span>Enabled</span>
                    <button
                      type="button"
                      className={`w-switch ${welcomeEnabled ? "on" : ""}`}
                      onClick={() => setWelcomeEnabled(!welcomeEnabled)}
                    />
                  </div>

                  <label className="w-label">Message</label>
                  <textarea
                    className="w-textarea"
                    rows={3}
                    placeholder="Hey! Thanks for reaching out 👋"
                    value={welcomeMessage}
                    onChange={(e) => setWelcomeMessage(e.target.value)}
                  />

                  <label className="w-label">Button text (optional)</label>
                  <input
                    className="w-input"
                    placeholder="Check it out"
                    maxLength={20}
                    value={welcomeButtonTitle}
                    onChange={(e) => setWelcomeButtonTitle(e.target.value)}
                  />

                  <label className="w-label">Button link (optional)</label>
                  <input
                    className="w-input"
                    placeholder="https://your-link.com"
                    value={welcomeButtonUrl}
                    onChange={(e) => setWelcomeButtonUrl(e.target.value)}
                  />

                  <div className="welcome-modal-actions">
                    <button className="w-btn-plain" onClick={() => setWelcomeOpen(false)}>
                      Cancel
                    </button>
                    <button className="w-btn-save" onClick={saveWelcomeSettings} disabled={savingWelcome}>
                      {savingWelcome ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="next-card">
              <div className="next-icon">+</div>
              <h2>Create an automation</h2>
              <p>
                Pick a trigger, set a keyword, and write the DM that gets
                sent automatically for @{selectedAccount.ig_username}.
              </p>
              <a
                href={`/dashboard/automations/new?account=${selectedAccount.id}`}
                className="connect-btn next-card-cta"
              >
                Create automation
              </a>
              <div className="next-card-row">
                <a
                  href={`/dashboard/automations?account=${selectedAccount.id}`}
                  className="secondary-btn"
                >
                  View all automations
                  <span className="btn-arrow-sm">→</span>
                </a>
                <a
                  href={`/dashboard/analytics?account=${selectedAccount.id}`}
                  className="secondary-btn"
                >
                  View analytics
                  <span className="btn-arrow-sm">→</span>
                </a>
              </div>
            </div>
          </>
        )}
      </main>

      <style jsx>{`
        .dash-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 15% 10%, rgba(255, 79, 163, 0.08), transparent 40%),
            radial-gradient(circle at 85% 25%, rgba(124, 58, 237, 0.08), transparent 40%),
            #fff8ed;
        }
        .dash-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 14px 20px;
          background: #14121f;
          border-bottom: 3px solid #14121f;
          flex-wrap: wrap;
        }
        .dash-logo {
          display: inline-flex;
          align-items: center;
          text-decoration: none;
          flex-shrink: 0;
        }
        .dash-logo img {
          height: 24px;
          width: auto;
          display: block;
        }
        .dash-user {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-left: auto;
        }
        .dash-identity {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(255, 248, 237, 0.08);
          border: 1px solid rgba(255, 248, 237, 0.18);
          padding: 5px 12px 5px 5px;
          border-radius: 999px;
          max-width: 220px;
        }
        .dash-avatar {
          width: 26px;
          height: 26px;
          flex-shrink: 0;
          border-radius: 999px;
          background: linear-gradient(135deg, #ff4fa3, #7c3aed);
          color: #fff;
          font-weight: 800;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .dash-email {
          color: #fff8ed;
          font-size: 12px;
          opacity: 0.85;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: none;
        }
        @media (min-width: 420px) {
          .dash-email {
            display: inline;
          }
        }
        .logout-btn {
          background: #fff8ed;
          border: 2px solid #14121f;
          color: #14121f;
          padding: 7px 16px;
          border-radius: 999px;
          font-weight: 800;
          cursor: pointer;
          font-size: 12px;
          box-shadow: 2px 2px 0 #ff4fa3;
          transition: transform 0.12s ease;
          flex-shrink: 0;
        }
        .logout-btn:hover {
          transform: translate(-1px, -1px);
          box-shadow: 3px 3px 0 #ff4fa3;
        }
        .logout-btn:active {
          transform: translate(0, 0);
          box-shadow: 1px 1px 0 #ff4fa3;
        }
        .dash-main {
          max-width: 620px;
          margin: 0 auto;
          padding: 40px 20px 80px;
        }
        .error-banner {
          background: #fff0f0;
          border: 2px solid #ff4fa3;
          color: #14121f;
          padding: 14px 18px;
          border-radius: 12px;
          font-size: 14px;
          margin-bottom: 24px;
          font-weight: 600;
        }
        .hero-card {
          position: relative;
          text-align: center;
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 24px;
          padding: 48px 36px;
          box-shadow: 8px 8px 0 #7c3aed;
        }
        .hero-badge {
          display: inline-block;
          background: #ffd23f;
          border: 2px solid #14121f;
          color: #14121f;
          font-weight: 800;
          font-size: 11px;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          padding: 5px 14px;
          border-radius: 999px;
          margin-bottom: 20px;
        }
        .hero-card h1 {
          font-size: 26.7px;
          font-weight: 800;
          color: #14121f;
          margin: 0 0 12px;
          line-height: 1.2;
        }
        .hero-card p {
          color: #4a4658;
          font-size: 15.4px;
          line-height: 1.6;
          margin: 0 0 28px;
        }
        .connect-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          background: linear-gradient(135deg, #ff4fa3, #7c3aed);
          color: #fff;
          border: 3px solid #14121f;
          border-radius: 999px;
          padding: 16px 32px;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          box-shadow: 4px 4px 0 #14121f;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          text-decoration: none;
        }
        .connect-btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0 #14121f;
        }
        .connect-btn:active {
          transform: translate(0, 0);
          box-shadow: 2px 2px 0 #14121f;
        }
        .btn-arrow {
          font-size: 18px;
        }
        .hero-footnote {
          margin-top: 20px;
          font-size: 12.3px;
          color: #8a8496;
        }

        /* Account switcher tabs */
        .account-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 16px;
        }
        .account-tab {
          border: 2px solid #14121f;
          border-radius: 999px;
          padding: 8px 16px;
          background: #fff;
          color: #14121f;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .account-tab.active {
          background: #14121f;
          color: #fff8ed;
        }
        .account-tab-add {
          border-style: dashed;
          background: transparent;
          color: #7c3aed;
        }

        .connected-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #14121f;
          border: 3px solid #14121f;
          border-radius: 20px;
          padding: 22px 28px;
          box-shadow: 6px 6px 0 #00d4b8;
          gap: 12px;
          flex-wrap: wrap;
        }
        .connected-left {
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .pulse-dot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: #00d4b8;
          box-shadow: 0 0 0 4px rgba(0, 212, 184, 0.25);
          flex-shrink: 0;
        }
        .connected-label {
          color: #a9a3b8;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-weight: 700;
        }
        .connected-username {
          color: #fff8ed;
          font-size: 18px;
          font-weight: 800;
        }
        .connected-actions {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .disconnect-btn {
          background: transparent;
          border: 1.5px solid rgba(255, 248, 237, 0.35);
          color: #fff8ed;
          padding: 6px 12px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
          opacity: 0.85;
        }
        .disconnect-btn:hover {
          opacity: 1;
          border-color: #ff4fa3;
          color: #ff4fa3;
        }
        .connected-check {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: #00d4b8;
          color: #14121f;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .add-account-link {
          display: block;
          width: 100%;
          text-align: center;
          background: transparent;
          border: 2px dashed #14121f;
          border-radius: 14px;
          padding: 14px;
          margin-top: 14px;
          color: #7c3aed;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .add-account-link:hover {
          background: #f5f0ff;
        }
        .limit-note {
          text-align: center;
          font-size: 12px;
          color: #8a8496;
          margin-top: 14px;
        }

        .welcome-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 16px;
          padding: 16px 20px;
          margin-top: 14px;
          box-shadow: 4px 4px 0 #ffd23f;
        }
        .welcome-card-left {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .welcome-icon {
          font-size: 22px;
        }
        .welcome-title {
          font-weight: 800;
          font-size: 14px;
          color: #14121f;
        }
        .welcome-sub {
          font-size: 12px;
          color: #8a8496;
          margin-top: 2px;
        }
        .welcome-edit-btn {
          border: 2px solid #14121f;
          background: #fff8ed;
          color: #14121f;
          padding: 8px 16px;
          border-radius: 999px;
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
          flex-shrink: 0;
        }
        .welcome-edit-btn:hover {
          background: #ffd23f;
        }

        .welcome-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(20, 18, 31, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 50;
        }
        .welcome-modal {
          background: #fff8ed;
          border: 3px solid #14121f;
          border-radius: 20px;
          padding: 26px;
          max-width: 420px;
          width: 100%;
          box-shadow: 8px 8px 0 #7c3aed;
        }
        .welcome-modal h3 {
          margin: 0 0 6px;
          font-size: 20px;
          font-weight: 800;
          color: #14121f;
        }
        .welcome-modal-sub {
          font-size: 12px;
          color: #8a8496;
          margin: 0 0 18px;
          line-height: 1.5;
        }
        .welcome-switch-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          border: 2px solid #14121f;
          border-radius: 10px;
          padding: 10px 14px;
          margin-bottom: 16px;
          background: #fff;
          font-weight: 700;
          font-size: 13px;
        }
        .w-switch {
          width: 44px;
          height: 25px;
          border: 2px solid #14121f;
          border-radius: 20px;
          background: #fff;
          position: relative;
          cursor: pointer;
          padding: 0;
        }
        .w-switch.on {
          background: #00d4b8;
        }
        .w-switch::after {
          content: "";
          position: absolute;
          width: 17px;
          height: 17px;
          background: #14121f;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: transform 0.15s ease;
        }
        .w-switch.on::after {
          transform: translateX(19px);
        }
        .w-label {
          display: block;
          font-weight: 700;
          font-size: 12px;
          color: #14121f;
          margin: 0 0 6px;
        }
        .w-textarea,
        .w-input {
          width: 100%;
          border: 2px solid #14121f;
          border-radius: 8px;
          padding: 10px 12px;
          font-size: 13px;
          font-family: inherit;
          color: #14121f;
          background: #fff;
          margin-bottom: 14px;
          box-sizing: border-box;
        }
        .w-textarea {
          resize: vertical;
        }
        .welcome-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 10px;
          margin-top: 6px;
        }
        .w-btn-plain {
          border: none;
          background: none;
          color: #8a8496;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          padding: 10px 8px;
        }
        .w-btn-save {
          background: linear-gradient(135deg, #ff4fa3, #7c3aed);
          color: #fff;
          border: 2px solid #14121f;
          border-radius: 999px;
          padding: 10px 20px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
        }
        .w-btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .next-card {
          text-align: center;
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 24px;
          padding: 44px 32px;
          box-shadow: 8px 8px 0 #ffd23f;
          margin-top: 28px;
        }
        .next-icon {
          width: 48px;
          height: 48px;
          margin: 0 auto 16px;
          border-radius: 999px;
          background: #fff8ed;
          border: 3px solid #14121f;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 26px;
          font-weight: 800;
          color: #14121f;
        }
        .next-card h2 {
          font-size: 21px;
          font-weight: 800;
          color: #14121f;
          margin: 0 0 10px;
        }
        .next-card p {
          color: #4a4658;
          font-size: 14px;
          line-height: 1.6;
          margin: 0 0 24px;
        }
        .next-card-cta {
          width: 100%;
          box-sizing: border-box;
        }
        .next-card-row {
          display: flex;
          gap: 12px;
          margin-top: 14px;
        }
        .secondary-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #fff8ed;
          color: #14121f;
          border: 3px solid #14121f;
          border-radius: 999px;
          padding: 13px 18px;
          font-weight: 800;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 3px 3px 0 #14121f;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
          text-decoration: none;
          white-space: nowrap;
        }
        .secondary-btn:hover {
          background: #fff;
          transform: translate(-2px, -2px);
          box-shadow: 5px 5px 0 #14121f;
        }
        .secondary-btn:active {
          transform: translate(0, 0);
          box-shadow: 1px 1px 0 #14121f;
        }
        .btn-arrow-sm {
          font-size: 14px;
          transition: transform 0.15s ease;
        }
        .secondary-btn:hover .btn-arrow-sm {
          transform: translateX(3px);
        }
        @media (max-width: 480px) {
          .next-card-row {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
}

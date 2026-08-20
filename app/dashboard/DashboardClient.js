"use client";

import { createClient } from "../../lib/supabase-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

const MAX_ACCOUNTS_PER_USER = 5;

const ERROR_MESSAGES = {
  1: "Instagram connection didn't go through. Give it another try below.",
  account_limit: `You've hit the limit of ${MAX_ACCOUNTS_PER_USER} Instagram accounts. Disconnect one to add another.`,
  already_connected: "That Instagram account is already connected to a different Bilbax account.",
};

export default function DashboardClient({ user, igAccounts = [] }) {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const igError = searchParams.get("ig_error");

  const accountFromUrl = searchParams.get("account");
  const initialSelectedId =
    (accountFromUrl && igAccounts.some((a) => a.id === accountFromUrl))
      ? accountFromUrl
      : igAccounts[0]?.id || null;
      
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const selectedAccount = igAccounts.find((a) => a.id === selectedId) || igAccounts[0] || null;

  // Welcome Message local states
  const [welcomeEnabled, setWelcomeEnabled] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [welcomeBtnTitle, setWelcomeBtnTitle] = useState("");
  const [welcomeBtnUrl, setWelcomeBtnUrl] = useState("");
  const [savingWelcome, setSavingWelcome] = useState(false);
  const [welcomeSavedMsg, setWelcomeSavedMsg] = useState("");
  
  // UI Mode: whether user is currently editing the welcome message
  const [isEditingWelcome, setIsEditingWelcome] = useState(false);

  // Sync welcome state when selected account changes
  useEffect(() => {
    if (selectedAccount) {
      const isEnabled = !!selectedAccount.welcome_enabled;
      setWelcomeEnabled(isEnabled);
      setWelcomeMessage(selectedAccount.welcome_message || "");
      setWelcomeBtnTitle(selectedAccount.welcome_button_title || "");
      setWelcomeBtnUrl(selectedAccount.welcome_button_url || "");
      setWelcomeSavedMsg("");
      // If message is already saved/enabled, default to view mode (not editing)
      setIsEditingWelcome(!isEnabled && !selectedAccount.welcome_message);
    }
  }, [selectedId, selectedAccount]);

  async function handleSaveWelcome(e) {
    e.preventDefault();
    if (!selectedAccount) return;
    setSavingWelcome(true);
    setWelcomeSavedMsg("");

    const { error } = await supabase
      .from("instagram_accounts")
      .update({
        welcome_enabled: welcomeEnabled,
        welcome_message: welcomeMessage,
        welcome_button_title: welcomeBtnTitle,
        welcome_button_url: welcomeBtnUrl,
      })
      .eq("id", selectedAccount.id);

    setSavingWelcome(false);
    if (error) {
      alert("Error saving welcome settings: " + error.message);
    } else {
      setWelcomeSavedMsg("Saved successfully! ✅");
      setIsEditingWelcome(false); // Close edit mode and go back to clean view card
      setTimeout(() => setWelcomeSavedMsg(""), 3000);
      router.refresh();
    }
  }

  async function handleToggleWelcomeQuick(newStatus) {
    if (!selectedAccount) return;
    setWelcomeEnabled(newStatus);

    await supabase
      .from("instagram_accounts")
      .update({ welcome_enabled: newStatus })
      .eq("id", selectedAccount.id);

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
        <a href="/" className="dash-logo">bilbax</a>
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
            <h1>Connect your Instagram Business account</h1>
            <p>
              Bilbax needs access to your Instagram Business or Creator
              account to start automating comments and DMs. This takes
              about 30 seconds.
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

            {/* WELCOME MESSAGE CARD SECTION */}
            <div className="welcome-card">
              <div className="welcome-header">
                <div className="welcome-title-group">
                  <h3>👋 Welcome Message</h3>
                  <p>Automatically reply to first-time DMs for @{selectedAccount.ig_username}.</p>
                </div>
                <label className="switch">
                  <input
                    type="checkbox"
                    checked={welcomeEnabled}
                    onChange={(e) => handleToggleWelcomeQuick(e.target.checked)}
                  />
                  <span className="slider round"></span>
                </label>
              </div>

              {welcomeSavedMsg && <div className="saved-alert">{welcomeSavedMsg}</div>}

              {/* VIEW MODE (When not editing and message exists) */}
              {!isEditingWelcome && welcomeMessage ? (
                <div className="welcome-preview-box">
                  <div className="preview-content">
                    <span className="preview-badge">{welcomeEnabled ? "🟢 Active" : "⚪ Paused"}</span>
                    <p className="preview-text">"{welcomeMessage}"</p>
                    {welcomeBtnTitle && (
                      <div className="preview-btn-pill">
                        🔗 {welcomeBtnTitle} ({welcomeBtnUrl || "No URL"})
                      </div>
                    )}
                  </div>
                  <button 
                    onClick={() => setIsEditingWelcome(true)} 
                    className="edit-welcome-btn"
                  >
                    ✏️ Edit Message
                  </button>
                </div>
              ) : (
                /* EDIT / SETUP FORM MODE */
                <form onSubmit={handleSaveWelcome} className="welcome-form">
                  <div className="form-group">
                    <label>Welcome Message Text</label>
                    <textarea
                      value={welcomeMessage}
                      onChange={(e) => setWelcomeMessage(e.target.value)}
                      placeholder="Hey! Thanks for reaching out 👋"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Button Title (Optional)</label>
                      <input
                        type="text"
                        value={welcomeBtnTitle}
                        onChange={(e) => setWelcomeBtnTitle(e.target.value)}
                        placeholder="Visit Website"
                        maxLength={20}
                      />
                    </div>
                    <div className="form-group">
                      <label>Button URL (Optional)</label>
                      <input
                        type="url"
                        value={welcomeBtnUrl}
                        onChange={(e) => setWelcomeBtnUrl(e.target.value)}
                        placeholder="https://yourlink.com"
                      />
                    </div>
                  </div>

                  <div className="welcome-actions">
                    <button type="submit" disabled={savingWelcome} className="save-welcome-btn">
                      {savingWelcome ? "Saving..." : "Save Welcome Message"}
                    </button>
                    {welcomeMessage && (
                      <button 
                        type="button" 
                        onClick={() => setIsEditingWelcome(false)} 
                        className="cancel-btn"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>

            <div className="next-card">
              <div className="next-icon">+</div>
              <h2>Create an automation</h2>
              <p>
                Pick a trigger, set a keyword, and write the DM that gets
                sent automatically for @{selectedAccount.ig_username}.
              </p>
              <a
                href={`/dashboard/automations/new?account=${selectedAccount.id}`}
                className="connect-btn"
              >
                Create automation
              </a>
              <a
                href={`/dashboard/automations?account=${selectedAccount.id}`}
                className="view-all-link"
              >
                View all automations →
              </a>
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
          font-weight: 800;
          font-size: 20px;
          color: #fff8ed;
          text-decoration: none;
          letter-spacing: -0.5px;
          flex-shrink: 0;
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
          text-transform: uppercase;
          padding: 5px 14px;
          border-radius: 999px;
          margin-bottom: 20px;
        }
        .hero-card h1 {
          font-size: 26px;
          font-weight: 800;
          color: #14121f;
          margin: 0 0 12px;
        }
        .hero-card p {
          color: #4a4658;
          font-size: 15px;
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
          text-decoration: none;
        }
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
        }
        .connected-label {
          color: #a9a3b8;
          font-size: 11px;
          text-transform: uppercase;
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
        .limit-note {
          text-align: center;
          font-size: 12px;
          color: #8a8496;
          margin-top: 14px;
        }

        /* WELCOME CARD STYLES */
        .welcome-card {
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 24px;
          padding: 28px;
          box-shadow: 8px 8px 0 #7c3aed;
          margin-top: 28px;
        }
        .welcome-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 15px;
        }
        .welcome-title-group h3 {
          font-size: 18px;
          font-weight: 800;
          color: #14121f;
          margin: 0 0 4px;
        }
        .welcome-title-group p {
          font-size: 13px;
          color: #666;
          margin: 0;
        }
        .switch {
          position: relative;
          display: inline-block;
          width: 50px;
          height: 28px;
          flex-shrink: 0;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0; left: 0; right: 0; bottom: 0;
          background-color: #ccc;
          transition: .3s;
          border: 2px solid #14121f;
          border-radius: 34px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: .3s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: #00d4b8;
        }
        input:checked + .slider:before {
          transform: translateX(22px);
        }
        .saved-alert {
          margin-top: 12px;
          background: #e6f9f6;
          border: 1.5px solid #00d4b8;
          color: #007a68;
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 12px;
          font-weight: 700;
        }
        .welcome-preview-box {
          margin-top: 16px;
          background: #fff8ed;
          border: 2px solid #14121f;
          border-radius: 14px;
          padding: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .preview-badge {
          display: inline-block;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 6px;
        }
        .preview-text {
          font-size: 14px;
          color: #14121f;
          margin: 0 0 6px;
          font-weight: 600;
        }
        .preview-btn-pill {
          display: inline-block;
          font-size: 11px;
          background: #fff;
          border: 1px solid #14121f;
          padding: 3px 8px;
          border-radius: 6px;
          color: #7c3aed;
          font-weight: 700;
        }
        .edit-welcome-btn {
          background: #14121f;
          color: #fff8ed;
          border: 2px solid #14121f;
          padding: 8px 14px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 12px;
          cursor: pointer;
        }
        .welcome-form {
          margin-top: 20px;
          border-top: 2px dashed #ddd;
          padding-top: 16px;
        }
        .form-group {
          margin-bottom: 14px;
        }
        .form-group label {
          display: block;
          font-size: 12px;
          font-weight: 800;
          color: #14121f;
          margin-bottom: 6px;
        }
        .form-group textarea,
        .form-group input {
          width: 100%;
          padding: 12px;
          border: 2px solid #14121f;
          border-radius: 12px;
          font-size: 14px;
          background: #fff8ed;
          outline: none;
        }
        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .welcome-actions {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-top: 16px;
        }
        .save-welcome-btn {
          background: #14121f;
          color: #fff8ed;
          border: 2px solid #14121f;
          padding: 10px 20px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
        }
        .cancel-btn {
          background: transparent;
          color: #14121f;
          border: 2px solid #14121f;
          padding: 10px 16px;
          border-radius: 10px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
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
        .view-all-link {
          display: block;
          margin-top: 16px;
          color: #7c3aed;
          font-weight: 700;
          font-size: 13px;
          text-decoration: none;
        }
      `}</style>
    </div>
  );
}

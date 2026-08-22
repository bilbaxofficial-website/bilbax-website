"use client";

import { createClient } from "../../lib/supabase-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useRef, useEffect } from "react";

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

  // UI States
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Welcome Message State & Logic (100% UNCHANGED)
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

  const canAddMore = igAccounts.length < MAX_ACCOUNTS_PER_USER;

  return (
    <div className="dash-container">
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
          <button onClick={handleConnectInstagram} className="brutal-btn primary">
            Connect Instagram →
          </button>
        </div>
      ) : (
        <>
          {/* Top Header & Dropdown */}
          <header className="dash-header">
            <div>
              <h1 className="page-title">DASHBOARD</h1>
              <h2 className="page-subtitle">Overview</h2>
            </div>

            <div className="user-controls">
              <span className="welcome-text">Welcome back, {user.email?.split('@')[0] || "User"}!</span>
              
              <div className="dropdown-container" ref={dropdownRef}>
                <button 
                  className="account-dropdown-btn" 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                >
                  <div className="pink-dot"></div>
                  <span>IG Connected: @{selectedAccount.ig_username}</span>
                  <span className="green-dot"></span>
                  <span className="arrow">⌄</span>
                </button>

                {dropdownOpen && (
                  <div className="dropdown-menu">
                    {igAccounts.map((acc) => (
                      <button
                        key={acc.id}
                        className={`dropdown-item ${acc.id === selectedId ? 'active' : ''}`}
                        onClick={() => {
                          setSelectedId(acc.id);
                          setDropdownOpen(false);
                        }}
                      >
                        @{acc.ig_username} {acc.id === selectedId && "(Current)"}
                      </button>
                    ))}
                    {canAddMore && (
                      <button className="dropdown-item add-new" onClick={handleConnectInstagram}>
                        + Add New Account
                      </button>
                    )}
                    <button className="dropdown-item disconnect" onClick={() => handleDisconnect(selectedAccount.id)}>
                      Disconnect Current
                    </button>
                  </div>
                )}
              </div>
            </div>
          </header>

          {/* Metrics Cards (Static for now to match design) */}
          <div className="metrics-grid">
            <div className="metric-card yellow-card">
              <div className="metric-title">TOTAL DMS SENT</div>
              <div className="metric-value">
                14,892 <span className="metric-growth">+12%</span>
              </div>
              {/* Decorative Chart Placeholder */}
              <div className="chart-placeholder">
                 <svg viewBox="0 0 200 40" preserveAspectRatio="none" style={{width: '100%', height: '40px', marginTop: '10px'}}>
                    <polyline points="0,30 20,20 40,35 70,15 90,25 120,5 150,20 180,10 200,5" fill="none" stroke="#d4b43c" strokeWidth="3" />
                    <polygon points="0,40 0,30 20,20 40,35 70,15 90,25 120,5 150,20 180,10 200,5 200,40" fill="#f8e597" opacity="0.5" />
                 </svg>
              </div>
            </div>

            <div className="metric-card white-card">
              <div className="metric-title">LEADS CAPTURED</div>
              <div className="metric-value">
                1,204 <span className="metric-growth">+15%</span>
              </div>
              <div className="icon-bottom-left">👤</div>
            </div>

            <div className="metric-card white-card">
               {/* Empty placeholder card to match the 3-column layout in design */}
               <div className="icon-bottom-left" style={{marginTop: 'auto', paddingTop: '40px'}}>🔗</div>
            </div>
          </div>

          {/* Automations Table */}
          <div className="automations-section">
            <h3 className="section-title">CURRENT AUTOMATIONS</h3>
            
            <div className="table-header">
              <div className="col-name">Name</div>
              <div className="col-trigger">Trigger</div>
              <div className="col-status">Status</div>
              <div className="col-activity">Last Activity</div>
              <div className="col-actions">Actions</div>
            </div>

            <div className="table-rows">
              {/* Welcome Message mapped as an Automation Row */}
              <div className="table-row">
                <div className="col-name row-flex">
                  <div className="icon-box">✉️</div>
                  <div>
                    <div className="row-title">Welcome DM</div>
                    <div className="row-date">Set up automated greeting</div>
                  </div>
                </div>
                <div className="col-trigger">First Time DM</div>
                <div className="col-status">
                  <div className={`status-pill ${selectedAccount.welcome_enabled ? 'active' : 'inactive'}`}>
                    {selectedAccount.welcome_enabled ? 'Active' : 'Off'} <span className="dot"></span>
                  </div>
                </div>
                <div className="col-activity">-</div>
                <div className="col-actions">
                  <button className="action-btn edit-btn" onClick={openWelcomeSettings}>
                    {selectedAccount.welcome_enabled ? "Edit" : "Set up"}
                  </button>
                </div>
              </div>

              {/* Placeholder for real automations (when you add the database for them later) */}
              <div className="table-row">
                <div className="col-name row-flex">
                  <div className="icon-box">💬</div>
                  <div>
                    <div className="row-title">Story Reply</div>
                    <div className="row-date">Oct 26, 2023</div>
                  </div>
                </div>
                <div className="col-trigger">Story Mention</div>
                <div className="col-status">
                  <div className="status-pill active">Active <span className="dot"></span></div>
                </div>
                <div className="col-activity">5h ago</div>
                <div className="col-actions">
                  <button className="action-btn edit-btn">Edit</button>
                  <button className="action-btn delete-btn">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Welcome Message Modal (Keeping functionality 100% same, just styled to match) */}
      {welcomeOpen && (
        <div className="welcome-modal-overlay" onClick={() => setWelcomeOpen(false)}>
          <div className="welcome-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Welcome Message Setup</h3>
            <p className="welcome-modal-sub">
              Sent once to anyone who DMs @{selectedAccount.ig_username} for the
              first time.
            </p>

            <div className="welcome-switch-row">
              <span>Enable Automation</span>
              <button
                type="button"
                className={`w-switch ${welcomeEnabled ? "on" : ""}`}
                onClick={() => setWelcomeEnabled(!welcomeEnabled)}
              />
            </div>

            <label className="w-label">Message Content</label>
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
              <button className="brutal-btn primary" onClick={saveWelcomeSettings} disabled={savingWelcome}>
                {savingWelcome ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .dash-container {
          padding: 40px;
          max-width: 1200px;
          margin: 0 auto;
        }

        /* Typography & Headers */
        .dash-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
        }

        .page-title {
          font-size: 32px;
          font-weight: 800;
          margin: 0;
          color: #000;
          text-transform: uppercase;
        }
        
        .page-subtitle {
          font-size: 28px;
          font-weight: 700;
          margin: 0;
          color: #000;
        }

        /* User Controls & Dropdown */
        .user-controls {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 10px;
        }

        .welcome-text {
          font-weight: 700;
          font-size: 16px;
          color: #000;
        }

        .dropdown-container {
          position: relative;
        }

        .account-dropdown-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          border: 3px solid #000;
          border-radius: 12px;
          padding: 10px 16px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          box-shadow: 4px 4px 0 #ff4fa3; /* Pink shadow like image */
          transition: transform 0.1s;
        }

        .account-dropdown-btn:active {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0 #ff4fa3;
        }

        .pink-dot {
          width: 14px;
          height: 14px;
          background-color: #ff4fa3;
          border: 2px solid #000;
          border-radius: 50%;
        }

        .green-dot {
          width: 8px;
          height: 8px;
          background-color: #00d4b8;
          border-radius: 50%;
        }

        .dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: #e6e2d3; /* Darker cream like image */
          border: 3px solid #000;
          border-radius: 8px;
          width: 250px;
          box-shadow: 4px 4px 0 #000;
          z-index: 10;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .dropdown-item {
          padding: 12px 16px;
          background: none;
          border: none;
          border-bottom: 2px solid #000;
          text-align: left;
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
        }

        .dropdown-item:last-child {
          border-bottom: none;
        }

        .dropdown-item:hover {
          background: #d4d0c1;
        }
        
        .dropdown-item.active {
          background: #ccc8ba;
        }

        .dropdown-item.add-new {
          color: #7c3aed;
          font-weight: 700;
        }
        
        .dropdown-item.disconnect {
          color: #ff4fa3;
        }

        /* Metrics Grid */
        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 50px;
        }

        .metric-card {
          border: 3px solid #000;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 6px 6px 0 #000;
          display: flex;
          flex-direction: column;
          position: relative;
        }

        .yellow-card {
          background-color: #fceea7; /* Pale yellow */
        }

        .white-card {
          background-color: #fff;
        }

        .metric-title {
          font-weight: 800;
          font-size: 14px;
          text-transform: uppercase;
          margin-bottom: 10px;
        }

        .metric-value {
          font-size: 36px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .metric-growth {
          font-size: 16px;
          color: #2b8a3e; /* Green text */
          font-weight: 700;
        }

        .icon-bottom-left {
          margin-top: auto;
          font-size: 24px;
          border: 2px solid #000;
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 50%;
        }

        /* Automations Table */
        .automations-section {
          margin-top: 20px;
        }

        .section-title {
          font-size: 20px;
          font-weight: 800;
          margin-bottom: 20px;
          text-transform: uppercase;
        }

        .table-header {
          display: flex;
          font-weight: 800;
          font-size: 14px;
          padding: 0 20px 10px;
          border-bottom: 3px solid transparent; /* Aligning columns */
        }

        .table-rows {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .table-row {
          display: flex;
          align-items: center;
          background: #fff;
          border: 3px solid #000;
          border-radius: 12px;
          padding: 16px 20px;
          box-shadow: 4px 4px 0 #000;
        }

        .col-name { flex: 2; }
        .col-trigger { flex: 1.5; font-weight: 600; font-size: 14px; }
        .col-status { flex: 1; }
        .col-activity { flex: 1; font-weight: 600; font-size: 14px; }
        .col-actions { flex: 1; display: flex; gap: 8px; justify-content: flex-end; }

        .row-flex {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .icon-box {
          width: 44px;
          height: 44px;
          border: 3px solid #000;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
        }

        .row-title {
          font-weight: 800;
          font-size: 16px;
        }

        .row-date {
          font-size: 12px;
          color: #666;
          font-weight: 600;
          margin-top: 2px;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border: 2px solid #000;
          border-radius: 20px;
          font-weight: 700;
          font-size: 12px;
          text-transform: uppercase;
        }

        .status-pill.active { background: #ff4fa3; color: #fff; }
        .status-pill.inactive { background: #e5e5e5; color: #000; }
        
        .status-pill .dot {
          width: 8px;
          height: 8px;
          background: #000;
          border-radius: 50%;
        }

        .action-btn {
          padding: 8px 16px;
          border: 2px solid #000;
          border-radius: 8px;
          font-weight: 800;
          font-size: 13px;
          cursor: pointer;
          background: #e6e2d3;
          box-shadow: 2px 2px 0 #000;
          transition: transform 0.1s;
        }

        .action-btn:active {
          transform: translate(2px, 2px);
          box-shadow: 0 0 0 #000;
        }
        
        .delete-btn { background: #fff; }

        /* Modal Styles */
        .welcome-modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
        }
        .welcome-modal {
          background: #fff8ed;
          border: 4px solid #000;
          border-radius: 16px;
          padding: 30px;
          width: 100%;
          max-width: 450px;
          box-shadow: 8px 8px 0 #000;
        }
        
        .welcome-switch-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fff;
          border: 3px solid #000;
          padding: 12px;
          border-radius: 10px;
          margin-bottom: 20px;
          font-weight: 700;
        }
        
        .w-switch {
          width: 50px;
          height: 28px;
          border: 3px solid #000;
          border-radius: 20px;
          background: #fff;
          position: relative;
          cursor: pointer;
        }
        .w-switch.on { background: #00d4b8; }
        .w-switch::after {
          content: "";
          position: absolute;
          width: 16px;
          height: 16px;
          background: #000;
          border-radius: 50%;
          top: 3px;
          left: 3px;
          transition: transform 0.2s;
        }
        .w-switch.on::after { transform: translateX(22px); }

        .w-label { font-weight: 800; margin-bottom: 8px; display: block; }
        .w-textarea, .w-input {
          width: 100%;
          border: 3px solid #000;
          border-radius: 8px;
          padding: 12px;
          font-family: inherit;
          margin-bottom: 16px;
          background: #fff;
          box-sizing: border-box;
          font-weight: 600;
        }

        .welcome-modal-actions {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          margin-top: 10px;
        }
        
        .w-btn-plain {
          background: transparent;
          border: none;
          font-weight: 700;
          cursor: pointer;
        }

        .brutal-btn.primary {
          background: #ffd23f;
          border: 3px solid #000;
          border-radius: 12px;
          padding: 12px 24px;
          font-weight: 800;
          box-shadow: 4px 4px 0 #000;
          cursor: pointer;
        }
        
        .brutal-btn.primary:active {
          transform: translate(2px, 2px);
          box-shadow: 2px 2px 0 #000;
        }
      `}</style>
    </div>
  );
}

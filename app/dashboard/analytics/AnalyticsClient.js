"use client";

import { useMemo, useState, useEffect } from "react";

const TRIGGER_LABELS = {
  comment: { icon: "💬", label: "Post/Reel comment" },
  story_reply: { icon: "📖", label: "Story reply" },
  live_comment: { icon: "🔴", label: "Live comment" },
};

function timeAgo(dateStr) {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function AnalyticsClient({ accounts, selectedAccountId, automations, logs, accessTokenByAccount }) {
  const [activeTab, setActiveTab] = useState(selectedAccountId);
  const [range, setRange] = useState("today"); // "today" | "yesterday" | "all"
  const [postPreviews, setPostPreviews] = useState({});

  const isOverview = activeTab === "overview";
  const showSwitcher = accounts.length > 1;

  const currentAccount = accounts.find((a) => a.id === activeTab);

  // Scope automations/logs to the active tab.
  const scopedAutomations = useMemo(() => {
    if (isOverview) return automations;
    return automations.filter((a) => a.ig_account_id === activeTab);
  }, [automations, activeTab, isOverview]);

  const scopedAutomationIds = useMemo(() => new Set(scopedAutomations.map((a) => a.id)), [scopedAutomations]);

  const scopedLogs = useMemo(
    () => logs.filter((l) => scopedAutomationIds.has(l.automation_id)),
    [logs, scopedAutomationIds]
  );

  const filteredLogs = useMemo(() => {
    if (range === "all") return scopedLogs;
    
    const now = new Date();
    // Midnight of today
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    // Midnight of yesterday
    const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;

    return scopedLogs.filter((l) => {
      const logTime = new Date(l.created_at).getTime();
      if (range === "today") return logTime >= startOfToday;
      if (range === "yesterday") return logTime >= startOfYesterday && logTime < startOfToday;
      return true;
    });
  }, [scopedLogs, range]);

  const totalDMs = filteredLogs.filter((l) => l.dm_sent).length;
  const totalLeads = filteredLogs.filter((l) => l.collected_value).length;
  const activeAutomations = scopedAutomations.filter((a) => a.status === "active").length;

  // 50,000 Quota Logic for DMs
  const dmQuotaLimit = 50000;
  const dmQuotaPercent = Math.min((totalDMs / dmQuotaLimit) * 100, 100);

  // Fetch thumbnails for post-locked automations
  useEffect(() => {
    if (isOverview) return;
    const token = accessTokenByAccount?.[activeTab];
    if (!token) return;

    const postIds = scopedAutomations
      .filter((a) => a.post_id && !postPreviews[a.post_id])
      .map((a) => a.post_id);
    const uniqueIds = [...new Set(postIds)];
    if (uniqueIds.length === 0) return;

    uniqueIds.forEach((id) => {
      setPostPreviews((prev) => ({ ...prev, [id]: "loading" }));
      fetch(`/api/instagram/media-single?id=${id}&token=${token}`)
        .then((res) => res.json())
        .then((data) => {
          setPostPreviews((prev) => ({ ...prev, [id]: data.error ? "error" : data }));
        })
        .catch(() => setPostPreviews((prev) => ({ ...prev, [id]: "error" })));
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopedAutomations, activeTab, isOverview]);

  const perAutomation = useMemo(() => {
    if (isOverview) return [];
    const map = new Map();
    scopedAutomations.forEach((a) => {
      map.set(a.id, { automation: a, triggered: 0, dmSent: 0, leads: 0 });
    });
    filteredLogs.forEach((l) => {
      const entry = map.get(l.automation_id);
      if (!entry) return;
      entry.triggered += 1;
      if (l.dm_sent) entry.dmSent += 1;
      if (l.collected_value) entry.leads += 1;
    });
    return Array.from(map.values()).sort((a, b) => b.triggered - a.triggered);
  }, [scopedAutomations, filteredLogs, isOverview]);

  const recentActivity = isOverview ? [] : filteredLogs.slice(0, 20);

  const automationById = useMemo(() => {
    const map = new Map();
    automations.forEach((a) => map.set(a.id, a));
    return map;
  }, [automations]);

  const dashboardHref = isOverview ? "/dashboard" : `/dashboard?account=${activeTab}`;

  return (
    <div className="page-shell">
      <header className="page-header">
        <a href="/" className="page-logo">bilbax</a>
        <a href={dashboardHref} className="back-link">← Back to dashboard</a>
      </header>

      <main className="page-main">
        <div className="page-title-row">
          <div>
            <div className="page-eyebrow">Performance</div>
            <h1>Analytics</h1>
            <p className="page-subhead">
              {isOverview
                ? `Combined across ${accounts.length} connected accounts`
                : `for @${currentAccount?.ig_username}`}
            </p>
          </div>
          {!isOverview && (
            <div className="range-tabs">
              {[
                { key: "today", label: "Today" },
                { key: "yesterday", label: "Yesterday" },
                { key: "all", label: "All time" },
              ].map((r) => (
                <button
                  key={r.key}
                  className={`range-tab ${range === r.key ? "active" : ""}`}
                  onClick={() => setRange(r.key)}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Account switcher */}
        {showSwitcher && (
          <div className="account-switcher">
            <button
              className={`switcher-tab overview-tab ${isOverview ? "active" : ""}`}
              onClick={() => setActiveTab("overview")}
            >
              ◆ Overview
            </button>
            {accounts.map((acc) => (
              <button
                key={acc.id}
                className={`switcher-tab ${activeTab === acc.id ? "active" : ""}`}
                onClick={() => setActiveTab(acc.id)}
              >
                @{acc.ig_username}
              </button>
            ))}
          </div>
        )}

        {/* Top stats - PRO SAAS REDESIGN */}
        <div className="stats-grid">
          <div className="stat-card stat-pink">
            <div className="stat-header">
              <div className="stat-icon-wrap bg-pink-light">📩</div>
              <div className="stat-label">DMs Sent</div>
            </div>
            <div className="stat-number">{totalDMs.toLocaleString()}</div>
            
            {/* Dynamic Quota Progress Bar */}
            <div className="quota-container">
              <div className="quota-bar-bg">
                <div className="quota-bar-fill" style={{ width: `${dmQuotaPercent}%` }}></div>
              </div>
              <div className="quota-text">
                <span>Usage</span>
                <span>{dmQuotaLimit.toLocaleString()} limit</span>
              </div>
            </div>
          </div>

          <div className="stat-card stat-teal">
            <div className="stat-header">
              <div className="stat-icon-wrap bg-teal-light">📋</div>
              <div className="stat-label">Leads Captured</div>
            </div>
            <div className="stat-number">{totalLeads.toLocaleString()}</div>
          </div>

          <div className="stat-card stat-yellow">
            <div className="stat-header">
              <div className="stat-icon-wrap bg-yellow-light">⚡</div>
              <div className="stat-label">Active Automations</div>
            </div>
            <div className="stat-number">{activeAutomations}</div>
          </div>
        </div>

        {isOverview ? (
          <section className="section-block">
            <div className="overview-note">
              <div className="overview-note-icon">◆</div>
              <div>
                <div className="overview-note-title">This is your combined total</div>
                <p className="overview-note-body">
                  Switch to a specific account above to see its individual automations,
                  which posts they're tied to, and recent activity.
                </p>
              </div>
            </div>

            <div className="account-breakdown">
              {accounts.map((acc) => {
                const accAutos = automations.filter((a) => a.ig_account_id === acc.id);
                const accAutoIds = new Set(accAutos.map((a) => a.id));
                const accLogs = filteredLogs.filter((l) => accAutoIds.has(l.automation_id));
                const accDMs = accLogs.filter((l) => l.dm_sent).length;
                const accLeads = accLogs.filter((l) => l.collected_value).length;
                return (
                  <button key={acc.id} className="account-row" onClick={() => setActiveTab(acc.id)}>
                    <span className="account-row-name">@{acc.ig_username}</span>
                    <span className="account-row-stats">
                      <span>{accDMs} DMs</span>
                      <span className="account-row-dot">·</span>
                      <span>{accLeads} leads</span>
                      <span className="account-row-arrow">→</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <>
            {/* Per-automation breakdown */}
            <section className="section-block">
              <h2 className="section-title">By automation</h2>
              {perAutomation.length === 0 ? (
                <div className="empty-note">No automations yet for this account.</div>
              ) : (
                <div className="automation-perf-list">
                  {perAutomation.map(({ automation, triggered, dmSent, leads }) => {
                    const trigger = TRIGGER_LABELS[automation.trigger_type] || TRIGGER_LABELS.comment;
                    const isAny = automation.keywords?.includes("*");
                    const preview = automation.post_id ? postPreviews[automation.post_id] : null;
                    const hasThumb = preview && preview !== "loading" && preview !== "error" && preview.thumbnailUrl;

                    return (
                      <div key={automation.id} className="perf-card">
                        <div className="perf-top">
                          {automation.trigger_type === "comment" && automation.post_id && (
                            <div className="perf-thumb">
                              {hasThumb ? (
                                <img src={preview.thumbnailUrl} alt="" />
                              ) : (
                                <span className="perf-thumb-fallback">{preview === "error" ? "🖼️" : "⏳"}</span>
                              )}
                            </div>
                          )}
                          <div className="perf-top-text">
                            <div className="perf-chips">
                              <span className="perf-trigger-chip">
                                {trigger.icon} {trigger.label}
                              </span>
                              {automation.trigger_type === "comment" && (
                                <span className="perf-scope-chip">
                                  {automation.post_id ? "locked" : "all posts"}
                                </span>
                              )}
                            </div>
                            <div className="perf-keyword">
                              {isAny ? "Any comment" : automation.keywords?.join(", ") || "—"}
                            </div>
                          </div>
                          <span className={`perf-status ${automation.status}`}>
                            {automation.status === "active" ? "Active" : "Paused"}
                          </span>
                        </div>
                        <div className="perf-numbers">
                          <div className="perf-number-item">
                            <span className="perf-number">{triggered}</span>
                            <span className="perf-number-label">Triggered</span>
                          </div>
                          <div className="perf-number-item">
                            <span className="perf-number">{dmSent}</span>
                            <span className="perf-number-label">DMs sent</span>
                          </div>
                          <div className="perf-number-item">
                            <span className="perf-number">{leads}</span>
                            <span className="perf-number-label">Leads</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Recent activity feed */}
            <section className="section-block">
              <h2 className="section-title">Recent activity</h2>
              {recentActivity.length === 0 ? (
                <div className="empty-note">No activity yet in this time range.</div>
              ) : (
                <div className="activity-feed">
                  {recentActivity.map((log) => {
                    const automation = automationById.get(log.automation_id);
                    const trigger = automation ? (TRIGGER_LABELS[automation.trigger_type] || TRIGGER_LABELS.comment) : null;
                    return (
                      <div key={log.id} className="activity-item">
                        <div className="activity-avatar">
                          {(log.commenter_username || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="activity-body">
                          <div className="activity-line">
                            <b>@{log.commenter_username || "unknown"}</b>{" "}
                            {log.collected_value ? (
                              <>shared their info {trigger ? `via ${trigger.label.toLowerCase()}` : ""}</>
                            ) : log.matched_keyword?.startsWith("followup_") ? (
                              <>got a follow-up reminder</>
                            ) : log.matched_keyword === "follow_verified" ? (
                              <>completed the follow gate</>
                            ) : (
                              <>triggered {trigger ? trigger.label.toLowerCase() : "an automation"}</>
                            )}
                          </div>
                          <div className="activity-meta">
                            {log.dm_sent ? "✅ DM sent" : "⚠️ DM failed"} · {timeAgo(log.created_at)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <style jsx>{`
        .page-shell {
          position: relative;
          min-height: 100vh;
          background:
            radial-gradient(circle at 10% 0%, rgba(255, 79, 163, 0.05), transparent 45%),
            radial-gradient(circle at 90% 15%, rgba(124, 58, 237, 0.05), transparent 45%),
            radial-gradient(circle at 50% 100%, rgba(0, 212, 184, 0.04), transparent 50%),
            #fdfcfb; /* Cleaner SaaS background */
        }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          background: #14121f;
          position: relative;
          z-index: 1;
        }
        .page-logo {
          font-weight: 800;
          font-size: 20px;
          color: #fff8ed;
          text-decoration: none;
          letter-spacing: -0.5px;
        }
        .back-link {
          color: #fff8ed;
          font-size: 13px;
          text-decoration: none;
          opacity: 0.85;
        }
        .page-main {
          position: relative;
          z-index: 1;
          max-width: 720px;
          margin: 0 auto;
          padding: 36px 20px 90px;
        }
        .page-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 16px;
          margin-bottom: 22px;
        }
        .page-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #7c3aed;
          font: 700 11px "DM Mono", monospace;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          margin-bottom: 6px;
        }
        .page-eyebrow::before {
          content: "";
          width: 8px;
          height: 8px;
          background: #ff4fa3;
          border: 2px solid #14121f;
          display: block;
          transform: rotate(45deg);
        }
        .page-title-row h1 {
          font-size: 30px;
          font-weight: 800;
          color: #14121f;
          margin: 0;
          letter-spacing: -0.02em;
        }
        .page-subhead {
          font-size: 13px;
          color: #6b6578;
          margin: 5px 0 0;
        }
        
        /* Updated Date Tabs - Professional Pill shape */
        .range-tabs {
          display: flex;
          gap: 4px;
          background: #fff;
          padding: 4px;
          border-radius: 999px;
          box-shadow: 0 4px 12px rgba(20, 18, 31, 0.04);
          border: 1px solid rgba(20, 18, 31, 0.06);
        }
        .range-tab {
          border: none;
          border-radius: 999px;
          padding: 8px 16px;
          background: transparent;
          font-weight: 700;
          font-size: 12px;
          color: #6b6578;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .range-tab.active {
          background: #14121f;
          color: #fff;
          box-shadow: 0 4px 10px rgba(20, 18, 31, 0.15);
        }

        .account-switcher {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 24px;
          padding-bottom: 20px;
          border-bottom: 1px dashed rgba(20, 18, 31, 0.15);
        }
        .switcher-tab {
          border: 1.5px solid rgba(20,18,31,0.1);
          border-radius: 999px;
          padding: 9px 18px;
          background: #fff;
          color: #6b6578;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .switcher-tab:hover {
          background: #fdfcfb;
          color: #14121f;
        }
        .switcher-tab.active {
          border-color: #14121f;
          background: #14121f;
          color: #fff;
          box-shadow: 0 4px 12px rgba(20, 18, 31, 0.15);
        }
        .overview-tab {
          background: #fdfcfb;
        }

        /* REDESIGNED STAT CARDS - SaaS Look with Maximalist Accents */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 36px;
        }
        .stat-card {
          background: #fff;
          border-radius: 20px;
          padding: 24px 20px;
          box-shadow: 0 12px 32px rgba(20, 18, 31, 0.03), 0 2px 6px rgba(20, 18, 31, 0.02);
          border: 1px solid rgba(20, 18, 31, 0.05);
          position: relative;
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .stat-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 40px rgba(20, 18, 31, 0.06), 0 4px 8px rgba(20, 18, 31, 0.03);
        }
        
        /* Colorful Top Borders instead of full box borders */
        .stat-pink { border-top: 4px solid #ff4fa3; }
        .stat-teal { border-top: 4px solid #00d4b8; }
        .stat-yellow { border-top: 4px solid #ffd23f; }

        .stat-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
        }
        .stat-icon-wrap {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        .bg-pink-light { background: #ffe0ef; color: #ff4fa3; }
        .bg-teal-light { background: #d9f9f4; color: #00d4b8; }
        .bg-yellow-light { background: #fff3d0; color: #f59e0b; }

        .stat-label {
          font-size: 12px;
          font-weight: 700;
          color: #6b6578;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .stat-number {
          font-size: 36px;
          font-weight: 800;
          color: #14121f;
          line-height: 1;
          letter-spacing: -0.03em;
        }

        /* QUOTA PROGRESS BAR */
        .quota-container {
          margin-top: 18px;
          padding-top: 14px;
          border-top: 1px dashed rgba(20,18,31,0.08);
        }
        .quota-bar-bg {
          width: 100%;
          height: 6px;
          background: #f0eee8;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 8px;
        }
        .quota-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff4fa3, #7c3aed);
          border-radius: 999px;
          transition: width 1s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .quota-text {
          display: flex;
          justify-content: space-between;
          font-size: 10.5px;
          color: #8a8496;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        /* Rest of UI Styles */
        .overview-note {
          display: flex;
          gap: 14px;
          background: #fff;
          border: 1px solid rgba(124, 58, 237, 0.2);
          border-radius: 16px;
          padding: 18px 20px;
          margin-bottom: 20px;
          box-shadow: 0 8px 24px rgba(124, 58, 237, 0.05);
        }
        .overview-note-icon {
          color: #7c3aed;
          font-size: 16px;
          flex-shrink: 0;
        }
        .overview-note-title {
          font-weight: 800;
          font-size: 14px;
          color: #14121f;
          margin-bottom: 4px;
        }
        .overview-note-body {
          font-size: 12.5px;
          color: #6b6578;
          margin: 0;
          line-height: 1.5;
        }
        .account-breakdown {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .account-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #fff;
          border: 1px solid rgba(20, 18, 31, 0.06);
          border-radius: 16px;
          padding: 18px 20px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s ease;
          box-shadow: 0 4px 12px rgba(20, 18, 31, 0.02);
        }
        .account-row:hover {
          transform: translateX(4px);
          border-color: #00d4b8;
          box-shadow: 0 8px 24px rgba(0, 212, 184, 0.1);
        }
        .account-row-name {
          font-weight: 800;
          font-size: 15px;
          color: #14121f;
        }
        .account-row-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #6b6578;
          font-weight: 600;
        }
        .account-row-dot {
          color: #d8d4c8;
        }
        .account-row-arrow {
          color: #7c3aed;
          font-weight: 800;
          margin-left: 4px;
        }

        .section-block {
          margin-bottom: 34px;
        }
        .section-title {
          font-size: 18px;
          font-weight: 800;
          color: #14121f;
          margin: 0 0 16px;
          letter-spacing: -0.01em;
        }
        .empty-note {
          background: #fff;
          border: 1px dashed rgba(20, 18, 31, 0.2);
          border-radius: 16px;
          padding: 32px;
          text-align: center;
          color: #8a8496;
          font-size: 14px;
        }

        .automation-perf-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .perf-card {
          background: #fff;
          border: 1px solid rgba(20, 18, 31, 0.06);
          border-radius: 18px;
          padding: 20px;
          box-shadow: 0 8px 24px rgba(20, 18, 31, 0.03);
          transition: transform 0.2s ease;
        }
        .perf-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(20, 18, 31, 0.06);
        }
        .perf-top {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          margin-bottom: 16px;
        }
        .perf-thumb {
          width: 52px;
          height: 52px;
          border-radius: 12px;
          border: 1px solid rgba(20, 18, 31, 0.08);
          overflow: hidden;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f8f7f5;
        }
        .perf-thumb img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .perf-thumb-fallback {
          font-size: 18px;
        }
        .perf-top-text {
          flex: 1;
          min-width: 0;
        }
        .perf-chips {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-bottom: 8px;
        }
        .perf-trigger-chip {
          font-size: 10.5px;
          font-weight: 800;
          color: #7c3aed;
          background: #f5f0ff;
          padding: 4px 10px;
          border-radius: 6px;
        }
        .perf-scope-chip {
          font-size: 10px;
          font-weight: 700;
          color: #8a8496;
          background: #f8f7f5;
          padding: 4px 10px;
          border-radius: 6px;
          text-transform: uppercase;
        }
        .perf-keyword {
          font-weight: 800;
          font-size: 15px;
          color: #14121f;
        }
        .perf-status {
          font-size: 10.5px;
          font-weight: 800;
          padding: 4px 12px;
          border-radius: 999px;
          text-transform: uppercase;
          flex-shrink: 0;
        }
        .perf-status.active {
          background: #d9f9f4;
          color: #009985;
        }
        .perf-status.paused {
          background: #f0eee8;
          color: #8a8496;
        }
        .perf-numbers {
          display: flex;
          gap: 32px;
          padding-top: 16px;
          border-top: 1px solid rgba(20, 18, 31, 0.06);
        }
        .perf-number-item {
          display: flex;
          flex-direction: column;
        }
        .perf-number {
          font-size: 22px;
          font-weight: 800;
          color: #14121f;
        }
        .perf-number-label {
          font-size: 11px;
          color: #8a8496;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.03em;
          margin-top: 2px;
        }

        .activity-feed {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .activity-item {
          display: flex;
          gap: 14px;
          align-items: flex-start;
          background: #fff;
          border: 1px solid rgba(20, 18, 31, 0.06);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 4px 12px rgba(20, 18, 31, 0.02);
        }
        .activity-avatar {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ff4fa3, #7c3aed);
          color: #fff;
          font-weight: 800;
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .activity-body {
          flex: 1;
          min-width: 0;
        }
        .activity-line {
          font-size: 13.5px;
          color: #14121f;
          line-height: 1.5;
        }
        .activity-meta {
          font-size: 11.5px;
          color: #8a8496;
          margin-top: 4px;
        }
      `}</style>
    </div>
  );
}

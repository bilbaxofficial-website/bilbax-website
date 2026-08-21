"use client";

import { useMemo, useState } from "react";

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

export default function AnalyticsClient({ igAccountId, igUsername, automations, logs }) {
  const [range, setRange] = useState("7d"); // "7d" | "30d" | "all"

  const filteredLogs = useMemo(() => {
    if (range === "all") return logs;
    const days = range === "7d" ? 7 : 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return logs.filter((l) => new Date(l.created_at).getTime() >= cutoff);
  }, [logs, range]);

  const totalDMs = filteredLogs.filter((l) => l.dm_sent).length;
  const totalLeads = filteredLogs.filter((l) => l.collected_value).length;
  const activeAutomations = automations.filter((a) => a.status === "active").length;

  // Per-automation breakdown: how many times each automation's logs appear.
  const perAutomation = useMemo(() => {
    const map = new Map();
    automations.forEach((a) => {
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
  }, [automations, filteredLogs]);

  const recentActivity = filteredLogs.slice(0, 20);

  const automationById = useMemo(() => {
    const map = new Map();
    automations.forEach((a) => map.set(a.id, a));
    return map;
  }, [automations]);

  return (
    <div className="page-shell">
      <header className="page-header">
        <a href="/" className="page-logo">bilbax</a>
        <a href={`/dashboard?account=${igAccountId}`} className="back-link">← Back to dashboard</a>
      </header>

      <main className="page-main">
        <div className="page-title-row">
          <div>
            <h1>Analytics</h1>
            <p className="page-subhead">for @{igUsername}</p>
          </div>
          <div className="range-tabs">
            {[
              { key: "7d", label: "7 days" },
              { key: "30d", label: "30 days" },
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
        </div>

        {/* Top stats */}
        <div className="stats-grid">
          <div className="stat-card stat-pink">
            <div className="stat-icon">📩</div>
            <div className="stat-number">{totalDMs}</div>
            <div className="stat-label">DMs sent</div>
          </div>
          <div className="stat-card stat-teal">
            <div className="stat-icon">📋</div>
            <div className="stat-number">{totalLeads}</div>
            <div className="stat-label">Leads captured</div>
          </div>
          <div className="stat-card stat-yellow">
            <div className="stat-icon">⚡</div>
            <div className="stat-number">{activeAutomations}</div>
            <div className="stat-label">Active automations</div>
          </div>
        </div>

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
                return (
                  <div key={automation.id} className="perf-card">
                    <div className="perf-top">
                      <span className="perf-trigger-chip">
                        {trigger.icon} {trigger.label}
                      </span>
                      <span className={`perf-status ${automation.status}`}>
                        {automation.status === "active" ? "Active" : "Paused"}
                      </span>
                    </div>
                    <div className="perf-keyword">
                      {isAny ? "Any comment" : automation.keywords?.join(", ") || "—"}
                    </div>
                    <div className="perf-numbers">
                      <div className="perf-number-item">
                        <span className="perf-number">{triggered}</span>
                        <span className="perf-number-label">triggered</span>
                      </div>
                      <div className="perf-number-item">
                        <span className="perf-number">{dmSent}</span>
                        <span className="perf-number-label">DMs sent</span>
                      </div>
                      <div className="perf-number-item">
                        <span className="perf-number">{leads}</span>
                        <span className="perf-number-label">leads</span>
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
                        <b>@{log.commenter_username || "unknown"}</b>
                        {" "}
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
      </main>

      <style jsx>{`
        .page-shell {
          min-height: 100vh;
          background: #fff8ed;
        }
        .page-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 24px;
          background: #14121f;
        }
        .page-logo {
          font-weight: 800;
          font-size: 20px;
          color: #fff8ed;
          text-decoration: none;
        }
        .back-link {
          color: #fff8ed;
          font-size: 13px;
          text-decoration: none;
          opacity: 0.85;
        }
        .page-main {
          max-width: 680px;
          margin: 0 auto;
          padding: 32px 20px 80px;
        }
        .page-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          flex-wrap: wrap;
          gap: 14px;
          margin-bottom: 24px;
        }
        .page-title-row h1 {
          font-size: 26px;
          font-weight: 800;
          color: #14121f;
          margin: 0;
        }
        .page-subhead {
          font-size: 13px;
          color: #8a8496;
          margin: 4px 0 0;
        }
        .range-tabs {
          display: flex;
          gap: 6px;
        }
        .range-tab {
          border: 2px solid #14121f;
          border-radius: 999px;
          padding: 7px 14px;
          background: #fff;
          font-weight: 700;
          font-size: 12px;
          color: #14121f;
          cursor: pointer;
        }
        .range-tab.active {
          background: #14121f;
          color: #fff8ed;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-bottom: 32px;
        }
        .stat-card {
          border: 3px solid #14121f;
          border-radius: 16px;
          padding: 18px 12px;
          text-align: center;
        }
        .stat-pink {
          background: #ffe0ef;
          box-shadow: 4px 4px 0 #ff4fa3;
        }
        .stat-teal {
          background: #d9f9f4;
          box-shadow: 4px 4px 0 #00d4b8;
        }
        .stat-yellow {
          background: #fff3d0;
          box-shadow: 4px 4px 0 #ffd23f;
        }
        .stat-icon {
          font-size: 20px;
          margin-bottom: 4px;
        }
        .stat-number {
          font-size: 28px;
          font-weight: 800;
          color: #14121f;
          line-height: 1;
        }
        .stat-label {
          font-size: 11px;
          font-weight: 700;
          color: #4a4658;
          margin-top: 6px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .section-block {
          margin-bottom: 32px;
        }
        .section-title {
          font-size: 17px;
          font-weight: 800;
          color: #14121f;
          margin: 0 0 14px;
        }
        .empty-note {
          background: #fff;
          border: 2px dashed #14121f;
          border-radius: 14px;
          padding: 24px;
          text-align: center;
          color: #8a8496;
          font-size: 13px;
        }
        .automation-perf-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .perf-card {
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 14px;
          padding: 14px 16px;
          box-shadow: 3px 3px 0 #7c3aed;
        }
        .perf-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 6px;
        }
        .perf-trigger-chip {
          font-size: 10px;
          font-weight: 800;
          color: #7c3aed;
          background: #f5f0ff;
          border: 1.5px solid #7c3aed;
          padding: 2px 8px;
          border-radius: 999px;
        }
        .perf-status {
          font-size: 10px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 999px;
          text-transform: uppercase;
        }
        .perf-status.active {
          background: #00d4b8;
          color: #14121f;
        }
        .perf-status.paused {
          background: #eee;
          color: #8a8496;
        }
        .perf-keyword {
          font-weight: 800;
          font-size: 14px;
          color: #14121f;
          margin-bottom: 12px;
        }
        .perf-numbers {
          display: flex;
          gap: 20px;
        }
        .perf-number-item {
          display: flex;
          flex-direction: column;
        }
        .perf-number {
          font-size: 20px;
          font-weight: 800;
          color: #14121f;
        }
        .perf-number-label {
          font-size: 10px;
          color: #8a8496;
          text-transform: uppercase;
          font-weight: 700;
        }
        .activity-feed {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .activity-item {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          background: #fff;
          border: 2px solid #14121f;
          border-radius: 12px;
          padding: 12px 14px;
        }
        .activity-avatar {
          width: 32px;
          height: 32px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ff4fa3, #7c3aed);
          color: #fff;
          font-weight: 800;
          font-size: 13px;
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
          font-size: 13px;
          color: #14121f;
          line-height: 1.4;
        }
        .activity-meta {
          font-size: 11px;
          color: #8a8496;
          margin-top: 3px;
        }
      `}</style>
    </div>
  );
}

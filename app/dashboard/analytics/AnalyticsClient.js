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

function dayKey(d) {
  return d.toISOString().slice(0, 10);
}

// Builds one bucket per day between `start` and now (inclusive), so the
// chart always has a continuous x-axis even on days with zero activity.
function buildDailySeries(logs, numDays) {
  const buckets = [];
  const map = new Map();

  for (let i = numDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const entry = { key, date: d, dms: 0, leads: 0, triggered: 0 };
    buckets.push(entry);
    map.set(key, entry);
  }

  logs.forEach((l) => {
    const key = dayKey(new Date(l.created_at));
    const entry = map.get(key);
    if (!entry) return;
    entry.triggered += 1;
    if (l.dm_sent) entry.dms += 1;
    if (l.collected_value) entry.leads += 1;
  });

  return buckets;
}

function formatDayLabel(date, numDays) {
  if (numDays <= 7) {
    return date.toLocaleDateString(undefined, { weekday: "short" });
  }
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Lightweight dependency-free SVG line chart with a soft gradient fill,
// grid lines, hover tooltip and a legend. No charting library required.
function TrendChart({ series, numDays }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const width = 640;
  const height = 220;
  const padL = 34;
  const padR = 12;
  const padT = 16;
  const padB = 28;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const maxVal = Math.max(1, ...series.map((s) => Math.max(s.dms, s.leads)));
  const niceMax = Math.ceil(maxVal / 4) * 4 || 4;

  const stepX = series.length > 1 ? innerW / (series.length - 1) : 0;

  const xFor = (i) => padL + i * stepX;
  const yFor = (v) => padT + innerH - (v / niceMax) * innerH;

  const linePath = (key) =>
    series
      .map((s, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(s[key]).toFixed(2)}`)
      .join(" ");

  const areaPath = (key) => {
    if (series.length === 0) return "";
    const line = series
      .map((s, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(s[key]).toFixed(2)}`)
      .join(" ");
    return `${line} L ${xFor(series.length - 1).toFixed(2)} ${yFor(0).toFixed(2)} L ${xFor(0).toFixed(2)} ${yFor(0).toFixed(2)} Z`;
  };

  const gridLines = [0, 0.25, 0.5, 0.75, 1];

  // Show a manageable number of x-axis labels regardless of range length.
  const labelEvery = Math.max(1, Math.ceil(series.length / (numDays <= 7 ? 7 : 6)));

  const hovered = hoverIdx !== null ? series[hoverIdx] : null;

  return (
    <div className="trend-chart-wrap">
      <div className="trend-legend">
        <span className="legend-item">
          <span className="legend-dot dot-dms" /> DMs sent
        </span>
        <span className="legend-item">
          <span className="legend-dot dot-leads" /> Leads captured
        </span>
      </div>

      <div className="trend-svg-box">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="trend-svg"
          onMouseLeave={() => setHoverIdx(null)}
        >
          <defs>
            <linearGradient id="dmsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00b8a0" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#00b8a0" stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridLines.map((g, i) => {
            const y = padT + innerH * (1 - g);
            return (
              <g key={i}>
                <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#eceaf5" strokeWidth="1" />
                <text x={padL - 8} y={y + 3} textAnchor="end" className="axis-label">
                  {Math.round(niceMax * g)}
                </text>
              </g>
            );
          })}

          <path d={areaPath("dms")} fill="url(#dmsFill)" />
          <path d={areaPath("leads")} fill="url(#leadsFill)" />

          <path d={linePath("dms")} fill="none" stroke="#7c3aed" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          <path d={linePath("leads")} fill="none" stroke="#00b8a0" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

          {series.map((s, i) =>
            i % labelEvery === 0 || i === series.length - 1 ? (
              <text key={s.key} x={xFor(i)} y={height - 8} textAnchor="middle" className="axis-label">
                {formatDayLabel(s.date, numDays)}
              </text>
            ) : null
          )}

          {series.map((s, i) => (
            <rect
              key={s.key}
              x={xFor(i) - stepX / 2}
              y={padT}
              width={stepX || width}
              height={innerH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
            />
          ))}

          {hovered && (
            <g>
              <line x1={xFor(hoverIdx)} x2={xFor(hoverIdx)} y1={padT} y2={padT + innerH} stroke="#c9c4de" strokeWidth="1" strokeDasharray="3 3" />
              <circle cx={xFor(hoverIdx)} cy={yFor(hovered.dms)} r="4" fill="#7c3aed" stroke="#fff" strokeWidth="1.5" />
              <circle cx={xFor(hoverIdx)} cy={yFor(hovered.leads)} r="4" fill="#00b8a0" stroke="#fff" strokeWidth="1.5" />
            </g>
          )}
        </svg>

        {hovered && (
          <div className="trend-tooltip" style={{ left: `${(xFor(hoverIdx) / width) * 100}%` }}>
            <div className="tooltip-date">
              {hovered.date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
            </div>
            <div className="tooltip-row">
              <span className="legend-dot dot-dms" /> DMs sent <b>{hovered.dms}</b>
            </div>
            <div className="tooltip-row">
              <span className="legend-dot dot-leads" /> Leads <b>{hovered.leads}</b>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Trend({ current, previous }) {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) {
    return <span className="trend-pill trend-up">▲ New</span>;
  }
  const pct = Math.round(((current - previous) / previous) * 100);
  if (pct === 0) return <span className="trend-pill trend-flat">— 0%</span>;
  const up = pct > 0;
  return (
    <span className={`trend-pill ${up ? "trend-up" : "trend-down"}`}>
      {up ? "▲" : "▼"} {Math.abs(pct)}%
    </span>
  );
}

export default function AnalyticsClient({ igAccountId, igUsername, automations, logs }) {
  const [range, setRange] = useState("7d"); // "7d" | "30d" | "all"

  const numDays = useMemo(() => {
    if (range === "7d") return 7;
    if (range === "30d") return 30;
    if (logs.length === 0) return 14;
    const oldest = Math.min(...logs.map((l) => new Date(l.created_at).getTime()));
    const days = Math.ceil((Date.now() - oldest) / (24 * 60 * 60 * 1000)) + 1;
    return Math.min(90, Math.max(14, days));
  }, [range, logs]);

  const filteredLogs = useMemo(() => {
    if (range === "all") return logs;
    const cutoff = Date.now() - numDays * 24 * 60 * 60 * 1000;
    return logs.filter((l) => new Date(l.created_at).getTime() >= cutoff);
  }, [logs, range, numDays]);

  const series = useMemo(() => buildDailySeries(filteredLogs, numDays), [filteredLogs, numDays]);

  // Compare current window vs the equivalent prior window, for trend arrows.
  const prevWindowLogs = useMemo(() => {
    if (range === "all") return [];
    const cutoffStart = Date.now() - numDays * 2 * 24 * 60 * 60 * 1000;
    const cutoffEnd = Date.now() - numDays * 24 * 60 * 60 * 1000;
    return logs.filter((l) => {
      const t = new Date(l.created_at).getTime();
      return t >= cutoffStart && t < cutoffEnd;
    });
  }, [logs, range, numDays]);

  const totalDMs = filteredLogs.filter((l) => l.dm_sent).length;
  const totalLeads = filteredLogs.filter((l) => l.collected_value).length;
  const activeAutomations = automations.filter((a) => a.status === "active").length;

  const prevDMs = prevWindowLogs.filter((l) => l.dm_sent).length;
  const prevLeads = prevWindowLogs.filter((l) => l.collected_value).length;

  const conversionRate = totalDMs > 0 ? Math.round((totalLeads / totalDMs) * 100) : 0;

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

  const maxTriggered = Math.max(1, ...perAutomation.map((p) => p.triggered));

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

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon stat-icon-purple">📩</div>
              {range !== "all" && <Trend current={totalDMs} previous={prevDMs} />}
            </div>
            <div className="stat-number">{totalDMs}</div>
            <div className="stat-label">DMs sent</div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon stat-icon-teal">📋</div>
              {range !== "all" && <Trend current={totalLeads} previous={prevLeads} />}
            </div>
            <div className="stat-number">{totalLeads}</div>
            <div className="stat-label">Leads captured</div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon stat-icon-amber">📈</div>
            </div>
            <div className="stat-number">{conversionRate}%</div>
            <div className="stat-label">Conversion rate</div>
          </div>
          <div className="stat-card">
            <div className="stat-top">
              <div className="stat-icon stat-icon-dark">⚡</div>
            </div>
            <div className="stat-number">{activeAutomations}</div>
            <div className="stat-label">Active automations</div>
          </div>
        </div>

        <section className="section-block">
          <div className="panel">
            <div className="panel-head">
              <h2 className="section-title">Performance over time</h2>
            </div>
            {filteredLogs.length === 0 ? (
              <div className="empty-note">No activity yet in this time range.</div>
            ) : (
              <TrendChart series={series} numDays={numDays} />
            )}
          </div>
        </section>

        <section className="section-block">
          <h2 className="section-title">By automation</h2>
          {perAutomation.length === 0 ? (
            <div className="empty-note">No automations yet for this account.</div>
          ) : (
            <div className="panel automation-perf-list">
              {perAutomation.map(({ automation, triggered, dmSent, leads }) => {
                const trigger = TRIGGER_LABELS[automation.trigger_type] || TRIGGER_LABELS.comment;
                const isAny = automation.keywords?.includes("*");
                const barPct = Math.round((triggered / maxTriggered) * 100);
                return (
                  <div key={automation.id} className="perf-row">
                    <div className="perf-row-top">
                      <div className="perf-row-title">
                        <span className="perf-trigger-chip">
                          {trigger.icon} {trigger.label}
                        </span>
                        <span className="perf-keyword">
                          {isAny ? "Any comment" : automation.keywords?.join(", ") || "—"}
                        </span>
                      </div>
                      <span className={`perf-status ${automation.status}`}>
                        {automation.status === "active" ? "Active" : "Paused"}
                      </span>
                    </div>

                    <div className="perf-bar-track">
                      <div className="perf-bar-fill" style={{ width: `${barPct}%` }} />
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
                      <div className="perf-number-item">
                        <span className="perf-number">
                          {triggered > 0 ? Math.round((leads / triggered) * 100) : 0}%
                        </span>
                        <span className="perf-number-label">Conv. rate</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="section-block">
          <h2 className="section-title">Recent activity</h2>
          {recentActivity.length === 0 ? (
            <div className="empty-note">No activity yet in this time range.</div>
          ) : (
            <div className="panel activity-feed">
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
                      <div className="activity-meta">{timeAgo(log.created_at)}</div>
                    </div>
                    <div className={`activity-status ${log.dm_sent ? "ok" : "fail"}`}>
                      {log.dm_sent ? "DM sent" : "DM failed"}
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
          background: #f6f5fb;
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
          max-width: 760px;
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
          letter-spacing: -0.01em;
        }
        .page-subhead {
          font-size: 13px;
          color: #8a8496;
          margin: 4px 0 0;
        }
        .range-tabs {
          display: flex;
          gap: 4px;
          background: #ece9f6;
          padding: 4px;
          border-radius: 999px;
        }
        .range-tab {
          border: none;
          border-radius: 999px;
          padding: 7px 14px;
          background: transparent;
          font-weight: 700;
          font-size: 12px;
          color: #6b6580;
          cursor: pointer;
          transition: all 0.15s ease;
        }
        .range-tab.active {
          background: #14121f;
          color: #fff;
          box-shadow: 0 2px 6px rgba(20, 18, 31, 0.25);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          margin-bottom: 28px;
        }
        @media (min-width: 620px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .stat-card {
          background: #fff;
          border: 1px solid #eae7f5;
          border-radius: 16px;
          padding: 16px 16px 14px;
          box-shadow: 0 1px 2px rgba(20, 18, 31, 0.04), 0 8px 20px -12px rgba(20, 18, 31, 0.15);
        }
        .stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }
        .stat-icon {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
        }
        .stat-icon-purple {
          background: #f1eafe;
        }
        .stat-icon-teal {
          background: #e2faf5;
        }
        .stat-icon-amber {
          background: #fef3d9;
        }
        .stat-icon-dark {
          background: #eeecf5;
        }
        .trend-pill {
          font-size: 11px;
          font-weight: 800;
          padding: 3px 7px;
          border-radius: 999px;
        }
        .trend-up {
          color: #0d9268;
          background: #e3f9ef;
        }
        .trend-down {
          color: #d1425a;
          background: #fdeced;
        }
        .trend-flat {
          color: #8a8496;
          background: #f2f1f8;
        }
        .stat-number {
          font-size: 26px;
          font-weight: 800;
          color: #14121f;
          line-height: 1;
          letter-spacing: -0.02em;
        }
        .stat-label {
          font-size: 12px;
          font-weight: 600;
          color: #8a8496;
          margin-top: 6px;
        }
        .section-block {
          margin-bottom: 28px;
        }
        .section-title {
          font-size: 15px;
          font-weight: 800;
          color: #14121f;
          margin: 0 0 12px;
        }
        .panel {
          background: #fff;
          border: 1px solid #eae7f5;
          border-radius: 18px;
          box-shadow: 0 1px 2px rgba(20, 18, 31, 0.04), 0 8px 20px -12px rgba(20, 18, 31, 0.12);
          padding: 20px;
        }
        .panel-head {
          margin-bottom: 4px;
        }
        .panel-head .section-title {
          margin: 0;
        }
        .empty-note {
          background: #fafafd;
          border: 1.5px dashed #d8d4e8;
          border-radius: 14px;
          padding: 28px;
          text-align: center;
          color: #8a8496;
          font-size: 13px;
        }
        .trend-chart-wrap {
          margin-top: 8px;
        }
        .trend-legend {
          display: flex;
          gap: 16px;
          margin-bottom: 10px;
        }
        .legend-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 700;
          color: #4a4658;
        }
        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          display: inline-block;
        }
        .dot-dms {
          background: #7c3aed;
        }
        .dot-leads {
          background: #00b8a0;
        }
        .trend-svg-box {
          position: relative;
          width: 100%;
        }
        .trend-svg {
          width: 100%;
          height: 220px;
          display: block;
          overflow: visible;
        }
        .axis-label {
          font-size: 9px;
          fill: #a39cc0;
          font-weight: 600;
        }
        .trend-tooltip {
          position: absolute;
          top: 8px;
          transform: translateX(-50%);
          background: #14121f;
          color: #fff;
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 11px;
          pointer-events: none;
          white-space: nowrap;
          box-shadow: 0 6px 18px rgba(20, 18, 31, 0.3);
          z-index: 5;
        }
        .tooltip-date {
          font-weight: 800;
          margin-bottom: 4px;
          opacity: 0.9;
        }
        .tooltip-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 2px;
        }
        .tooltip-row b {
          margin-left: auto;
        }
        .automation-perf-list {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }
        .perf-row:not(:last-child) {
          padding-bottom: 18px;
          border-bottom: 1px solid #f0eef8;
        }
        .perf-row-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 10px;
        }
        .perf-row-title {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }
        .perf-trigger-chip {
          font-size: 10px;
          font-weight: 800;
          color: #7c3aed;
          background: #f1eafe;
          padding: 3px 9px;
          border-radius: 999px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .perf-keyword {
          font-weight: 800;
          font-size: 14px;
          color: #14121f;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .perf-status {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 9px;
          border-radius: 999px;
          text-transform: uppercase;
          flex-shrink: 0;
        }
        .perf-status.active {
          background: #dcfaf1;
          color: #0d9268;
        }
        .perf-status.paused {
          background: #f2f1f8;
          color: #8a8496;
        }
        .perf-bar-track {
          width: 100%;
          height: 8px;
          background: #f0eef8;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 14px;
        }
        .perf-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #7c3aed, #a78bfa);
          border-radius: 999px;
          transition: width 0.3s ease;
        }
        .perf-numbers {
          display: flex;
          gap: 28px;
        }
        .perf-number-item {
          display: flex;
          flex-direction: column;
        }
        .perf-number {
          font-size: 17px;
          font-weight: 800;
          color: #14121f;
        }
        .perf-number-label {
          font-size: 10px;
          color: #8a8496;
          text-transform: uppercase;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        .activity-feed {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 8px 20px;
        }
        .activity-item {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 12px 0;
        }
        .activity-item:not(:last-child) {
          border-bottom: 1px solid #f0eef8;
        }
        .activity-avatar {
          width: 34px;
          height: 34px;
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
          margin-top: 2px;
        }
        .activity-status {
          font-size: 10px;
          font-weight: 800;
          padding: 4px 9px;
          border-radius: 999px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .activity-status.ok {
          background: #dcfaf1;
          color: #0d9268;
        }
        .activity-status.fail {
          background: #fdeced;
          color: #d1425a;
        }
      `}</style>
    </div>
  );
}

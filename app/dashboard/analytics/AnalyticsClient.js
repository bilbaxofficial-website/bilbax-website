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

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
function dayKey(d) {
  return d.toISOString().slice(0, 10);
}
function toInputDate(d) {
  return d.toISOString().slice(0, 10);
}
function formatFullDate(d) {
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}
function formatRangeLabel(start, end) {
  if (toInputDate(start) === toInputDate(end)) return formatFullDate(start);
  return `${formatFullDate(start)} – ${formatFullDate(end)}`;
}

function buildLeadsHref(accountId, range, rangeStart, rangeEnd) {
  const params = new URLSearchParams({ account: accountId, range });
  if (range !== "all") {
    params.set("start", rangeStart.toISOString());
    params.set("end", rangeEnd.toISOString());
  }
  return `/dashboard/analytics/leads?${params.toString()}`;
}

// Builds either hourly buckets (single-day ranges) or daily buckets
// (multi-day ranges) so the chart always has a continuous x-axis.
function buildSeries(logs, rangeStart, rangeEnd, hourly) {
  const buckets = [];
  const map = new Map();

  if (hourly) {
    for (let h = 0; h < 24; h++) {
      const key = `h${h}`;
      const entry = { key, label: h, dms: 0, leads: 0, triggered: 0 };
      buckets.push(entry);
      map.set(key, entry);
    }
    logs.forEach((l) => {
      const d = new Date(l.sent_at);
      const key = `h${d.getHours()}`;
      const entry = map.get(key);
      if (!entry) return;
      entry.triggered += 1;
      if (l.dm_sent) entry.dms += 1;
      if (l.collected_value) entry.leads += 1;
    });
  } else {
    const numDays = Math.max(1, Math.round((endOfDay(rangeEnd) - startOfDay(rangeStart)) / 86400000) + 1);
    for (let i = 0; i < numDays; i++) {
      const d = new Date(startOfDay(rangeStart));
      d.setDate(d.getDate() + i);
      const key = dayKey(d);
      const entry = { key, label: d, dms: 0, leads: 0, triggered: 0 };
      buckets.push(entry);
      map.set(key, entry);
    }
    logs.forEach((l) => {
      const key = dayKey(new Date(l.sent_at));
      const entry = map.get(key);
      if (!entry) return;
      entry.triggered += 1;
      if (l.dm_sent) entry.dms += 1;
      if (l.collected_value) entry.leads += 1;
    });
  }

  return buckets;
}

function formatLabel(entry, hourly) {
  if (hourly) {
    const h = entry.label;
    const ampm = h < 12 ? "AM" : "PM";
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}${ampm}`;
  }
  return entry.label.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Dependency-free SVG line chart — bold outline + bright gradient fills,
// matching the site's maximalist look instead of a soft minimal chart.
function TrendChart({ series, hourly }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const width = 640;
  const height = 240;
  const padL = 34;
  const padR = 12;
  const padT = 20;
  const padB = 30;
  const innerW = width - padL - padR;
  const innerH = height - padT - padB;

  const maxVal = Math.max(1, ...series.map((s) => Math.max(s.dms, s.leads)));
  const niceMax = Math.ceil(maxVal / 4) * 4 || 4;

  const stepX = series.length > 1 ? innerW / (series.length - 1) : 0;
  const xFor = (i) => padL + i * stepX;
  const yFor = (v) => padT + innerH - (v / niceMax) * innerH;

  const linePath = (key) =>
    series.map((s, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(s[key]).toFixed(2)}`).join(" ");

  const areaPath = (key) => {
    if (series.length === 0) return "";
    const line = series.map((s, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(2)} ${yFor(s[key]).toFixed(2)}`).join(" ");
    return `${line} L ${xFor(series.length - 1).toFixed(2)} ${yFor(0).toFixed(2)} L ${xFor(0).toFixed(2)} ${yFor(0).toFixed(2)} Z`;
  };

  const gridLines = [0, 0.25, 0.5, 0.75, 1];
  const labelEvery = Math.max(1, Math.ceil(series.length / (hourly ? 6 : 7)));
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
        <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="trend-svg" onMouseLeave={() => setHoverIdx(null)}>
          <defs>
            <linearGradient id="dmsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff4fa3" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#ff4fa3" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="leadsFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#00d4b8" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#00d4b8" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {gridLines.map((g, i) => {
            const y = padT + innerH * (1 - g);
            return (
              <g key={i}>
                <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#e5daef" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x={padL - 8} y={y + 3} textAnchor="end" className="axis-label">
                  {Math.round(niceMax * g)}
                </text>
              </g>
            );
          })}

          <path d={areaPath("dms")} fill="url(#dmsFill)" />
          <path d={areaPath("leads")} fill="url(#leadsFill)" />

          <path d={linePath("dms")} fill="none" stroke="#ff4fa3" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />
          <path d={linePath("leads")} fill="none" stroke="#00b8a0" strokeWidth="3.5" strokeLinejoin="round" strokeLinecap="round" />

          {series.map((s, i) =>
            i % labelEvery === 0 || i === series.length - 1 ? (
              <text key={s.key} x={xFor(i)} y={height - 10} textAnchor="middle" className="axis-label">
                {formatLabel(s, hourly)}
              </text>
            ) : null
          )}

          {series.map((s, i) => (
            <rect key={s.key} x={xFor(i) - stepX / 2} y={padT} width={stepX || width} height={innerH} fill="transparent" onMouseEnter={() => setHoverIdx(i)} />
          ))}

          {hovered && (
            <g>
              <line x1={xFor(hoverIdx)} x2={xFor(hoverIdx)} y1={padT} y2={padT + innerH} stroke="#14121f" strokeWidth="1.5" strokeDasharray="4 3" />
              <circle cx={xFor(hoverIdx)} cy={yFor(hovered.dms)} r="5.5" fill="#ff4fa3" stroke="#14121f" strokeWidth="2" />
              <circle cx={xFor(hoverIdx)} cy={yFor(hovered.leads)} r="5.5" fill="#00d4b8" stroke="#14121f" strokeWidth="2" />
            </g>
          )}
        </svg>

        {hovered && (
          <div className="trend-tooltip" style={{ left: `${(xFor(hoverIdx) / width) * 100}%` }}>
            <div className="tooltip-date">{formatLabel(hovered, hourly)}</div>
            <div className="tooltip-row">
              <span className="legend-dot dot-dms" /> DMs <b>{hovered.dms}</b>
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
  if (previous === 0) return <span className="trend-pill trend-up">▲ New</span>;
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
  const [range, setRange] = useState("today"); // "today" | "yesterday" | "custom" | "all"
  const [customStart, setCustomStart] = useState(toInputDate(new Date()));
  const [customEnd, setCustomEnd] = useState(toInputDate(new Date()));

  const { rangeStart, rangeEnd, hourly, prevStart, prevEnd, hasPrev } = useMemo(() => {
    const now = new Date();
    if (range === "today") {
      const s = startOfDay(now);
      const e = endOfDay(now);
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      return { rangeStart: s, rangeEnd: e, hourly: true, prevStart: startOfDay(y), prevEnd: endOfDay(y), hasPrev: true };
    }
    if (range === "yesterday") {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const s = startOfDay(y);
      const e = endOfDay(y);
      const y2 = new Date(y);
      y2.setDate(y2.getDate() - 1);
      return { rangeStart: s, rangeEnd: e, hourly: true, prevStart: startOfDay(y2), prevEnd: endOfDay(y2), hasPrev: true };
    }
    if (range === "custom") {
      const s = startOfDay(new Date(customStart));
      const e = endOfDay(new Date(customEnd));
      const spanMs = e - s;
      const pS = new Date(s.getTime() - spanMs - 1);
      const pE = new Date(s.getTime() - 1);
      const isSingleDay = toInputDate(s) === toInputDate(e);
      return { rangeStart: s, rangeEnd: e, hourly: isSingleDay, prevStart: pS, prevEnd: pE, hasPrev: true };
    }
    // all time
    if (logs.length === 0) {
      return { rangeStart: startOfDay(now), rangeEnd: endOfDay(now), hourly: true, prevStart: null, prevEnd: null, hasPrev: false };
    }
    const oldest = new Date(Math.min(...logs.map((l) => new Date(l.sent_at).getTime())));
    return { rangeStart: startOfDay(oldest), rangeEnd: endOfDay(now), hourly: false, prevStart: null, prevEnd: null, hasPrev: false };
  }, [range, customStart, customEnd, logs]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => {
      const t = new Date(l.sent_at).getTime();
      return t >= rangeStart.getTime() && t <= rangeEnd.getTime();
    });
  }, [logs, rangeStart, rangeEnd]);

  const prevWindowLogs = useMemo(() => {
    if (!hasPrev) return [];
    return logs.filter((l) => {
      const t = new Date(l.sent_at).getTime();
      return t >= prevStart.getTime() && t <= prevEnd.getTime();
    });
  }, [logs, prevStart, prevEnd, hasPrev]);

  const series = useMemo(() => buildSeries(filteredLogs, rangeStart, rangeEnd, hourly), [filteredLogs, rangeStart, rangeEnd, hourly]);

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

  const leadsHref = useMemo(
    () => buildLeadsHref(igAccountId, range, rangeStart, rangeEnd),
    [igAccountId, range, rangeStart, rangeEnd]
  );

  return (
    <div className="page-shell">
      <header className="page-header">
        <a href="/" className="page-logo"><img src="/bilbax-logo.png" alt="bilbax" className="brand-logo-img" /></a>
        <a href={`/dashboard?account=${igAccountId}`} className="back-link">← Back to dashboard</a>
      </header>

      <main className="page-main">
        <div className="page-title-row">
          <div>
            <h1>Analytics</h1>
            <p className="page-subhead">for @{igUsername}</p>
          </div>
        </div>

        <div className="range-tabs">
          {[
            { key: "today", label: "Today" },
            { key: "yesterday", label: "Yesterday" },
            { key: "custom", label: "Custom" },
            { key: "all", label: "All time" },
          ].map((r) => (
            <button key={r.key} className={`range-tab ${range === r.key ? "active" : ""}`} onClick={() => setRange(r.key)}>
              {r.label}
            </button>
          ))}
        </div>

        {range === "custom" && (
          <div className="custom-date-row">
            <div className="custom-date-field">
              <label>From</label>
              <input type="date" value={customStart} max={customEnd} onChange={(e) => setCustomStart(e.target.value)} />
            </div>
            <div className="custom-date-field">
              <label>To</label>
              <input type="date" value={customEnd} min={customStart} max={toInputDate(new Date())} onChange={(e) => setCustomEnd(e.target.value)} />
            </div>
          </div>
        )}

        <div className="selected-range-label">
          Showing data for <b>{formatRangeLabel(rangeStart, rangeEnd)}</b>
        </div>

        <div className="stats-grid">
          <div className="stat-card stat-pink">
            <div className="stat-top">
              <div className="stat-icon">📩</div>
              {hasPrev && <Trend current={totalDMs} previous={prevDMs} />}
            </div>
            <div className="stat-number">{totalDMs}</div>
            <div className="stat-label">DMs sent</div>
          </div>
          <a
            href={leadsHref}
            className="stat-card stat-teal stat-card-link"
            aria-label={`See ${totalLeads} captured leads for ${formatRangeLabel(rangeStart, rangeEnd)}`}
          >
            <div className="stat-top">
              <div className="stat-icon">📋</div>
              <span className="stat-corner-dot" aria-hidden="true" />
            </div>
            <div className="stat-number">{totalLeads}</div>
            <div className="stat-label">Leads captured</div>
          </a>
          <div className="stat-card stat-yellow">
            <div className="stat-top">
              <div className="stat-icon">📈</div>
            </div>
            <div className="stat-number">{conversionRate}%</div>
            <div className="stat-label">Conversion rate</div>
          </div>
          <div className="stat-card stat-purple">
            <div className="stat-top">
              <div className="stat-icon">⚡</div>
            </div>
            <div className="stat-number">{activeAutomations}</div>
            <div className="stat-label">Active automations</div>
          </div>
        </div>

        <section className="section-block">
          <div className="panel panel-chart">
            <h2 className="section-title">Performance over time</h2>
            {filteredLogs.length === 0 ? (
              <div className="empty-note">No activity yet in this time range.</div>
            ) : (
              <TrendChart series={series} hourly={hourly} />
            )}
          </div>
        </section>

        <section className="section-block">
          <h2 className="section-title">By automation</h2>
          {perAutomation.length === 0 ? (
            <div className="empty-note">No automations yet for this account.</div>
          ) : (
            <div className="automation-perf-list">
              {perAutomation.map(({ automation, triggered, dmSent, leads }, i) => {
                const trigger = TRIGGER_LABELS[automation.trigger_type] || TRIGGER_LABELS.comment;
                const isAny = automation.keywords?.includes("*");
                const barPct = Math.round((triggered / maxTriggered) * 100);
                const accents = ["perf-accent-pink", "perf-accent-teal", "perf-accent-yellow", "perf-accent-purple"];
                const accent = accents[i % accents.length];
                return (
                  <div key={automation.id} className={`perf-card ${accent}`}>
                    <div className="perf-row-top">
                      <div className="perf-row-title">
                        <span className="perf-trigger-chip">
                          {trigger.icon} {trigger.label}
                        </span>
                        <span className="perf-keyword">{isAny ? "Any comment" : automation.keywords?.join(", ") || "—"}</span>
                      </div>
                      <span className={`perf-status ${automation.status}`}>{automation.status === "active" ? "Active" : "Paused"}</span>
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
                        <span className="perf-number">{triggered > 0 ? Math.round((leads / triggered) * 100) : 0}%</span>
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
                    <div className="activity-avatar">{(log.commenter_username || "?").charAt(0).toUpperCase()}</div>
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
                      <div className="activity-meta">{timeAgo(log.sent_at)}</div>
                    </div>
                    <div className={`activity-status ${log.dm_sent ? "ok" : "fail"}`}>{log.dm_sent ? "DM sent" : "DM failed"}</div>
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
          display: inline-flex;
          align-items: center;
          text-decoration: none;
        }
        .page-logo img {
          height: 24px;
          width: auto;
          display: block;
        }
        .back-link {
          color: #fff8ed;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          opacity: 0.85;
        }
        .back-link:hover {
          opacity: 1;
        }
        .page-main {
          max-width: 720px;
          margin: 0 auto;
          padding: 32px 20px 80px;
        }
        .page-title-row {
          margin-bottom: 20px;
        }
        .page-title-row h1 {
          font-family: var(--font-display), 'Syne', sans-serif;
          font-size: 34px;
          font-weight: 800;
          color: #14121f;
          margin: 0;
          letter-spacing: -0.04em;
        }
        .page-subhead {
          font-size: 13px;
          color: #8a8496;
          margin: 4px 0 0;
        }

        .range-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 16px;
        }
        .range-tab {
          border: 2px solid #14121f;
          border-radius: 10px;
          padding: 9px 18px;
          background: #fff;
          font-weight: 700;
          font-size: 13px;
          color: #14121f;
          cursor: pointer;
          box-shadow: 3px 3px 0 #14121f;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .range-tab:hover {
          transform: translate(-1px, -1px);
          box-shadow: 4px 4px 0 #14121f;
        }
        .range-tab.active {
          background: #14121f;
          color: #ffd23f;
          box-shadow: 3px 3px 0 #ff4fa3;
        }

        .custom-date-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 20px;
          box-shadow: 4px 4px 0 #ffd23f;
        }
        .custom-date-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .custom-date-field label {
          font-size: 11px;
          font-weight: 800;
          color: #8a8496;
          text-transform: uppercase;
        }
        .custom-date-field input {
          border: 2px solid #14121f;
          border-radius: 10px;
          padding: 8px 10px;
          font-family: inherit;
          font-weight: 700;
          font-size: 13px;
          color: #14121f;
          background: #fff8ed;
        }

        .selected-range-label {
          font-size: 12px;
          font-weight: 700;
          color: #8a8496;
          margin-bottom: 18px;
        }
        .selected-range-label b {
          color: #14121f;
          font-weight: 800;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 14px;
          margin-bottom: 28px;
        }
        @media (min-width: 620px) {
          .stats-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }
        .stat-card {
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 10px;
          padding: 18px 16px 16px;
        }
        .stat-pink {
          box-shadow: 5px 5px 0 #ff4fa3;
        }
        .stat-teal {
          box-shadow: 5px 5px 0 #00d4b8;
        }
        .stat-yellow {
          box-shadow: 5px 5px 0 #ffd23f;
        }
        .stat-purple {
          box-shadow: 5px 5px 0 #7c3aed;
        }
        .stat-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 14px;
        }

        .stat-card-link {
          display: block;
          position: relative;
          color: inherit;
          text-decoration: none;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .stat-card-link:hover {
          transform: translate(-2px, -2px);
          box-shadow: 7px 7px 0 #00d4b8;
        }
        .stat-card-link:active {
          transform: translate(1px, 1px);
          box-shadow: 3px 3px 0 #00d4b8;
        }
        .stat-card-link:focus-visible {
          outline: 3px solid #7c3aed;
          outline-offset: 4px;
        }
        .stat-corner-dot {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #ff2d55;
          border: none;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.25);
          pointer-events: none;
          animation: dot-pulse 2.2s ease-in-out infinite;
        }
        @keyframes dot-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.25); }
        }
        .stat-icon {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: #fff8ed;
          border: 2px solid #14121f;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
        }
        .trend-pill {
          font-size: 11px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 10px;
          border: 2px solid #14121f;
        }
        .trend-up {
          color: #14121f;
          background: #00d4b8;
        }
        .trend-down {
          color: #14121f;
          background: #ff8fbf;
        }
        .trend-flat {
          color: #14121f;
          background: #fff;
        }
        .stat-number {
          font-family: var(--font-display), 'Syne', sans-serif;
          font-size: 30px;
          font-weight: 800;
          color: #14121f;
          line-height: 1;
          letter-spacing: -0.03em;
        }
        .stat-label {
          font-size: 11px;
          font-weight: 700;
          color: #4a4658;
          margin-top: 8px;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }

        .section-block {
          margin-bottom: 28px;
        }
        .section-title {
          font-family: var(--font-display), 'Syne', sans-serif;
          font-size: 21px;
          font-weight: 800;
          color: #14121f;
          margin: 0 0 14px;
          letter-spacing: -0.03em;
        }
        .panel {
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 10px;
          box-shadow: 6px 6px 0 #7c3aed;
          padding: 22px;
        }
        .panel-chart .section-title {
          margin-bottom: 6px;
        }
        .empty-note {
          background: #fff;
          border: 3px dashed #14121f;
          border-radius: 10px;
          padding: 30px;
          text-align: center;
          color: #8a8496;
          font-weight: 700;
          font-size: 13px;
        }

        .trend-chart-wrap {
          margin-top: 10px;
        }
        .trend-legend {
          display: flex;
          gap: 18px;
          margin-bottom: 12px;
        }
        .legend-item {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 12px;
          font-weight: 800;
          color: #14121f;
        }
        .legend-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          border: 2px solid #14121f;
          display: inline-block;
        }
        .dot-dms {
          background: #ff4fa3;
        }
        .dot-leads {
          background: #00d4b8;
        }
        .trend-svg-box {
          position: relative;
          width: 100%;
        }
        .trend-svg {
          width: 100%;
          height: 240px;
          display: block;
          overflow: visible;
        }
        .axis-label {
          font-size: 10px;
          fill: #8a8496;
          font-weight: 700;
        }
        .trend-tooltip {
          position: absolute;
          top: 8px;
          transform: translateX(-50%);
          background: #14121f;
          color: #fff8ed;
          padding: 9px 13px;
          border-radius: 10px;
          font-size: 12px;
          pointer-events: none;
          white-space: nowrap;
          border: 2px solid #ffd23f;
          z-index: 5;
        }
        .tooltip-date {
          font-weight: 800;
          margin-bottom: 5px;
        }
        .tooltip-row {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 3px;
          font-weight: 700;
        }
        .tooltip-row b {
          margin-left: auto;
        }

        .automation-perf-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .perf-card {
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 10px;
          padding: 16px 18px;
        }
        .perf-accent-pink {
          box-shadow: 5px 5px 0 #ff4fa3;
        }
        .perf-accent-teal {
          box-shadow: 5px 5px 0 #00d4b8;
        }
        .perf-accent-yellow {
          box-shadow: 5px 5px 0 #ffd23f;
        }
        .perf-accent-purple {
          box-shadow: 5px 5px 0 #7c3aed;
        }
        .perf-row-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          margin-bottom: 12px;
          flex-wrap: nowrap;
        }
        .perf-row-title {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
          overflow: hidden;
        }
        .perf-trigger-chip {
          font-size: 10px;
          font-weight: 800;
          color: #7c3aed;
          background: #f1eafe;
          border: 1.5px solid #7c3aed;
          padding: 3px 9px;
          border-radius: 999px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .perf-keyword {
          font-weight: 800;
          font-size: 15px;
          color: #14121f;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          min-width: 0;
        }
        .perf-status {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 10px;
          border-radius: 999px;
          text-transform: uppercase;
          border: 2px solid #14121f;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .perf-status.active {
          background: #00d4b8;
          color: #14121f;
        }
        .perf-status.paused {
          background: #eee;
          color: #8a8496;
        }
        .perf-bar-track {
          width: 100%;
          height: 12px;
          background: #f4f2fb;
          border: 2px solid #14121f;
          border-radius: 999px;
          overflow: hidden;
          margin-bottom: 14px;
        }
        .perf-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #ff4fa3, #7c3aed);
          transition: width 0.3s ease;
        }
        .perf-numbers {
          display: flex;
          gap: 24px;
          flex-wrap: wrap;
        }
        .perf-number-item {
          display: flex;
          flex-direction: column;
        }
        .perf-number {
          font-size: 18px;
          font-weight: 800;
          color: #14121f;
        }
        .perf-number-label {
          font-size: 10px;
          color: #8a8496;
          text-transform: uppercase;
          font-weight: 800;
          letter-spacing: 0.02em;
        }

        .activity-feed {
          display: flex;
          flex-direction: column;
          gap: 2px;
          box-shadow: 6px 6px 0 #ffd23f;
        }
        .activity-item {
          display: flex;
          gap: 12px;
          align-items: center;
          padding: 13px 0;
        }
        .activity-item:not(:last-child) {
          border-bottom: 2px solid #f0eef8;
        }
        .activity-avatar {
          width: 36px;
          height: 36px;
          border-radius: 999px;
          background: linear-gradient(135deg, #ff4fa3, #7c3aed);
          border: 2px solid #14121f;
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
          font-weight: 700;
        }
        .activity-status {
          font-size: 10px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 999px;
          border: 2px solid #14121f;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .activity-status.ok {
          background: #00d4b8;
          color: #14121f;
        }
        .activity-status.fail {
          background: #ff8fbf;
          color: #14121f;
        }
      `}</style>
    </div>
  );
}

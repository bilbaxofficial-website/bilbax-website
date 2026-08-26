"use client";

const TRIGGER_LABELS = {
  comment: { icon: "💬", label: "Post/Reel comment" },
  story_reply: { icon: "📖", label: "Story reply" },
  live_comment: { icon: "🔴", label: "Live comment" },
};

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatRangeDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function rangeLabel(selectedRange, rangeStart, rangeEnd) {
  if (selectedRange === "today") return "Today";
  if (selectedRange === "yesterday") return "Yesterday";
  if (selectedRange === "custom") {
    const start = formatRangeDate(rangeStart);
    const end = formatRangeDate(rangeEnd);
    if (!start) return "Custom range";
    return start === end || !end ? start : `${start} – ${end}`;
  }
  return "All time";
}

export default function LeadsClient({ igAccountId, igUsername, leads, selectedRange = "all", rangeStart, rangeEnd }) {
  const selectedLabel = rangeLabel(selectedRange, rangeStart, rangeEnd);
  const backParams = new URLSearchParams({ account: igAccountId, range: selectedRange });
  if (rangeStart) backParams.set("start", rangeStart);
  if (rangeEnd) backParams.set("end", rangeEnd);
  const backHref = `/dashboard/analytics?${backParams.toString()}`;
  return (
    <div className="leads-shell">
      <header className="page-header">
        <a href="/" className="page-logo"><img src="/bilbax-logo.png" alt="bilbax" className="brand-logo-img" /></a>
        <a
          href={backHref}
          className="back-link"
        >
          ← Back to analytics
        </a>
      </header>

      <main className="leads-main">
        <div className="page-title-row">
          <div>
            <h1>Captured Leads</h1>
            <p className="page-subhead">for @{igUsername}</p>
            <div className="range-context">Showing {selectedLabel.toLowerCase()}</div>
          </div>
        </div>

        <div className="lead-count-card">
          <div className="lead-count-icon">📋</div>
          <div>
            <div className="lead-count-number">{leads.length}</div>
            <div className="lead-count-label">{leads.length === 1 ? "lead" : "leads"}</div>
          </div>
        </div>

        {leads.length === 0 ? (
          <div className="empty-note">
            No captured leads in this time range. Try another date range in Analytics to see more.
          </div>
        ) : (
          <section className="lead-list" aria-label="Captured leads list">
            {leads.map((lead) => {
              const trigger = TRIGGER_LABELS[lead.automation?.trigger_type] || TRIGGER_LABELS.comment;
              const fieldLabel = lead.automation?.collect_field === "phone" ? "Phone" : "Email";
              const username = lead.commenter_username || "unknown";

              return (
                <article className="lead-card" key={lead.id}>
                  <div className="lead-top-row">
                    <div className="lead-avatar">
                      {username.charAt(0).toUpperCase()}
                    </div>
                    <div className="lead-person">
                      <div className="lead-username">@{username}</div>
                      <div className="lead-source">
                        {trigger.icon} {trigger.label} • {formatDate(lead.sent_at)}
                      </div>
                    </div>
                  </div>

                  <div className="lead-info-row">
                    <span className="lead-info-label">✅ {fieldLabel} captured</span>
                    <span className="lead-info-value">{lead.collected_value}</span>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </main>

      <style jsx>{`
        .leads-shell {
          min-height: 100vh;
          background:
            radial-gradient(circle at 15% 10%, rgba(255, 79, 163, 0.08), transparent 40%),
            radial-gradient(circle at 85% 25%, rgba(124, 58, 237, 0.08), transparent 40%),
            #fff8ed;
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
          text-decoration: none;
          opacity: 0.85;
        }
        .back-link:hover {
          opacity: 1;
        }
        .leads-main {
          max-width: 720px;
          margin: 0 auto;
          padding: 32px 20px 80px;
        }
        .page-title-row {
          margin-bottom: 20px;
        }
        .page-title-row h1 {
          font-size: 30px;
          font-weight: 800;
          color: #14121f;
          margin: 0;
        }
        .page-subhead {
          font-size: 13px;
          color: #8a8496;
          margin: 4px 0 0;
        }
        .range-context {
          display: inline-flex;
          margin-top: 10px;
          padding: 5px 10px;
          border: 2px solid #14121f;
          border-radius: 999px;
          background: #fff;
          color: #4a4658;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .lead-count-card {
          display: flex;
          align-items: center;
          gap: 14px;
          background: #d9f9f4;
          border: 3px solid #14121f;
          border-radius: 18px;
          padding: 16px 18px;
          box-shadow: 5px 5px 0 #00d4b8;
          margin-bottom: 24px;
        }
        .lead-count-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          background: #fff;
          border: 2px solid #14121f;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 21px;
        }
        .lead-count-number {
          font-size: 25px;
          font-weight: 800;
          line-height: 1;
          color: #14121f;
        }
        .lead-count-label {
          margin-top: 4px;
          font-size: 12px;
          font-weight: 800;
          color: #4a4658;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }
        .lead-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .lead-card {
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 18px;
          box-shadow: 5px 5px 0 #7c3aed;
          padding: 16px;
        }
        .lead-top-row {
          display: flex;
          gap: 12px;
          align-items: center;
        }
        .lead-avatar {
          width: 42px;
          height: 42px;
          border-radius: 50%;
          background: linear-gradient(135deg, #ff4fa3, #7c3aed);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 800;
          flex: 0 0 auto;
        }
        .lead-person {
          min-width: 0;
        }
        .lead-username {
          font-size: 17px;
          font-weight: 800;
          color: #14121f;
          overflow-wrap: anywhere;
        }
        .lead-source {
          margin-top: 3px;
          font-size: 12px;
          line-height: 1.4;
          color: #8a8496;
        }
        .lead-info-row {
          margin-top: 14px;
          padding: 12px 13px;
          border: 2px solid #14121f;
          border-radius: 12px;
          background: #fff8ed;
        }
        .lead-info-label {
          display: block;
          font-size: 11px;
          font-weight: 800;
          color: #14121f;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }
        .lead-info-value {
          display: block;
          margin-top: 5px;
          font-size: 14px;
          font-weight: 700;
          color: #14121f;
          overflow-wrap: anywhere;
        }
        .empty-note {
          background: #fff;
          border: 3px dashed #14121f;
          border-radius: 16px;
          padding: 30px;
          text-align: center;
          color: #8a8496;
          font-weight: 700;
          font-size: 13px;
          line-height: 1.5;
        }
        @media (max-width: 520px) {
          .page-header {
            padding: 17px 18px;
          }
          .leads-main {
            padding: 28px 16px 60px;
          }
          .page-title-row h1 {
            font-size: 28px;
          }
          .back-link {
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
}

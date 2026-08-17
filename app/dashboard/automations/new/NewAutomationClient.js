"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase-client";

export default function NewAutomationClient({ igAccountId, igUsername }) {
  const router = useRouter();
  const supabase = createClient();

  const [triggerType, setTriggerType] = useState("keyword"); // "keyword" or "any"
  const [keywords, setKeywords] = useState("");
  const [dmMessage, setDmMessage] = useState("");
  const [commentReply, setCommentReply] = useState("Sent you a DM! 📩");

  // Phase 3: growth features
  const [requireFollow, setRequireFollow] = useState(false);
  const [followPrompt, setFollowPrompt] = useState(
    "Follow me first, then comment again and I'll send it right over! 🙌"
  );
  const [collectField, setCollectField] = useState("none"); // "none" | "email" | "phone"
  const [collectPrompt, setCollectPrompt] = useState(
    "What's the best email to send this to?"
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");

    if (triggerType === "keyword" && !keywords.trim()) {
      setError("Add at least one keyword, or switch to 'Any comment'.");
      return;
    }
    if (!dmMessage.trim()) {
      setError("Write the DM message that gets sent.");
      return;
    }

    setSaving(true);

    const keywordArray =
      triggerType === "any"
        ? ["*"] // "*" means match any comment
        : keywords.split(",").map((k) => k.trim()).filter(Boolean);

    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("automations").insert({
      user_id: user.id,
      ig_account_id: igAccountId,
      post_id: null, // null = applies to all posts for now
      keywords: keywordArray,
      dm_message: dmMessage,
      comment_reply: commentReply || null,
      status: "active",
      // Phase 3 fields
      require_follow: requireFollow,
      follow_prompt: requireFollow ? followPrompt : null,
      collect_field: collectField === "none" ? null : collectField,
      collect_prompt: collectField === "none" ? null : collectPrompt,
    });

    setSaving(false);

    if (insertError) {
      setError("Couldn't save this automation. Try again.");
      return;
    }

    router.push("/dashboard/automations");
  }

  return (
    <div className="page-shell">
      <header className="page-header">
        <a href="/" className="page-logo">bilbax</a>
        <a href="/dashboard" className="back-link">← Back to dashboard</a>
      </header>

      <main className="page-main">
        <div className="form-card">
          <div className="form-badge">New automation</div>
          <h1>Turn comments into DMs</h1>
          <p className="form-sub">for @{igUsername}</p>

          {error && <div className="form-error">{error}</div>}

          <div className="field-group">
            <label className="field-label">When someone comments...</label>
            <div className="toggle-row">
              <button
                type="button"
                className={`toggle-btn ${triggerType === "keyword" ? "active" : ""}`}
                onClick={() => setTriggerType("keyword")}
              >
                A specific word
              </button>
              <button
                type="button"
                className={`toggle-btn ${triggerType === "any" ? "active" : ""}`}
                onClick={() => setTriggerType("any")}
              >
                Anything at all
              </button>
            </div>
          </div>

          {triggerType === "keyword" && (
            <div className="field-group">
              <label className="field-label">Trigger keywords</label>
              <input
                type="text"
                className="field-input"
                placeholder="e.g. PRICE, LINK, INFO"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />
              <div className="field-hint">Separate multiple keywords with commas. Not case-sensitive.</div>
            </div>
          )}

          {/* ---------- Phase 3: Ask to Follow ---------- */}
          <div className="field-group">
            <div className="switch-row">
              <div className="switch-text">
                <label className="field-label" style={{ marginBottom: 2 }}>
                  Ask them to follow first
                </label>
                <div className="field-hint" style={{ marginTop: 0 }}>
                  If they don't follow you yet, they'll get a "follow to unlock" reply instead of the DM.
                </div>
              </div>
              <button
                type="button"
                className={`switch ${requireFollow ? "on" : ""}`}
                onClick={() => setRequireFollow(!requireFollow)}
                aria-pressed={requireFollow}
              />
            </div>
            {requireFollow && (
              <input
                type="text"
                className="field-input"
                style={{ marginTop: 12 }}
                placeholder="Follow me first, then comment again..."
                value={followPrompt}
                onChange={(e) => setFollowPrompt(e.target.value)}
              />
            )}
          </div>

          {/* ---------- Phase 3: Data Collection ---------- */}
          <div className="field-group">
            <label className="field-label">Collect info before sending the link</label>
            <div className="toggle-row toggle-row-3">
              <button
                type="button"
                className={`toggle-btn ${collectField === "none" ? "active" : ""}`}
                onClick={() => setCollectField("none")}
              >
                Don't ask
              </button>
              <button
                type="button"
                className={`toggle-btn ${collectField === "email" ? "active" : ""}`}
                onClick={() => setCollectField("email")}
              >
                Ask email
              </button>
              <button
                type="button"
                className={`toggle-btn ${collectField === "phone" ? "active" : ""}`}
                onClick={() => setCollectField("phone")}
              >
                Ask phone
              </button>
            </div>
            {collectField !== "none" && (
              <>
                <input
                  type="text"
                  className="field-input"
                  style={{ marginTop: 12 }}
                  placeholder={`What's the best ${collectField} to send this to?`}
                  value={collectPrompt}
                  onChange={(e) => setCollectPrompt(e.target.value)}
                />
                <div className="field-hint">
                  Sent as a DM before the main message. Their reply is saved as the lead's {collectField}.
                </div>
              </>
            )}
          </div>

          <div className="field-group">
            <label className="field-label">
              {collectField !== "none" || requireFollow ? "Final DM message" : "DM message to send"}
            </label>
            <textarea
              className="field-textarea"
              placeholder="Hey {first_name}! Here's the link you asked for: ..."
              value={dmMessage}
              onChange={(e) => setDmMessage(e.target.value)}
              rows={4}
            />
            <div className="field-hint">Use {"{first_name}"} to personalize with the commenter's name.</div>
          </div>

          <div className="field-group">
            <label className="field-label">Public comment reply (optional)</label>
            <input
              type="text"
              className="field-input"
              placeholder="Sent you a DM! 📩"
              value={commentReply}
              onChange={(e) => setCommentReply(e.target.value)}
            />
            <div className="field-hint">Shown publicly under their comment. Leave blank to skip.</div>
          </div>

          {/* Flow summary so the user can see what they've built */}
          {(requireFollow || collectField !== "none") && (
            <div className="flow-preview">
              <div className="flow-preview-label">What happens, in order</div>
              <ol>
                <li>Someone comments {triggerType === "keyword" ? `"${keywords || "your keyword"}"` : "on your post"}</li>
                {requireFollow && <li>If not following → sends: "{followPrompt}"</li>}
                {collectField !== "none" && <li>Asks: "{collectPrompt}"</li>}
                <li>Sends the final DM message above</li>
              </ol>
            </div>
          )}

          <button className="save-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save automation"}
          </button>
        </div>
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
          max-width: 560px;
          margin: 0 auto;
          padding: 40px 20px 80px;
        }
        .form-card {
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 24px;
          padding: 36px 28px;
          box-shadow: 8px 8px 0 #7c3aed;
        }
        .form-badge {
          display: inline-block;
          background: #ffd23f;
          border: 2px solid #14121f;
          color: #14121f;
          font-weight: 800;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          padding: 5px 14px;
          border-radius: 999px;
          margin-bottom: 16px;
        }
        h1 {
          font-size: 24px;
          font-weight: 800;
          color: #14121f;
          margin: 0 0 4px;
        }
        .form-sub {
          color: #8a8496;
          font-size: 14px;
          margin: 0 0 24px;
        }
        .form-error {
          background: #fff0f0;
          border: 2px solid #ff4fa3;
          color: #14121f;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 20px;
        }
        .field-group {
          margin-bottom: 22px;
        }
        .field-label {
          display: block;
          font-weight: 700;
          font-size: 13px;
          color: #14121f;
          margin-bottom: 8px;
        }
        .toggle-row {
          display: flex;
          gap: 8px;
        }
        .toggle-row-3 .toggle-btn {
          font-size: 12px;
          padding: 12px 6px;
        }
        .toggle-btn {
          flex: 1;
          padding: 12px;
          border: 2px solid #14121f;
          border-radius: 10px;
          background: #fff8ed;
          font-weight: 700;
          font-size: 13px;
          color: #14121f;
          cursor: pointer;
        }
        .toggle-btn.active {
          background: linear-gradient(135deg, #ff4fa3, #7c3aed);
          color: #fff;
        }
        .field-input,
        .field-textarea {
          width: 100%;
          border: 2px solid #14121f;
          border-radius: 10px;
          padding: 12px 14px;
          font-size: 14px;
          font-family: inherit;
          color: #14121f;
          background: #fff8ed;
          box-sizing: border-box;
        }
        .field-textarea {
          resize: vertical;
        }
        .field-hint {
          font-size: 12px;
          color: #8a8496;
          margin-top: 6px;
        }
        .switch-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          border: 2px solid #14121f;
          border-radius: 12px;
          padding: 14px 16px;
          background: #fff8ed;
        }
        .switch-text {
          flex: 1;
        }
        .switch {
          flex-shrink: 0;
          width: 46px;
          height: 26px;
          border: 2px solid #14121f;
          border-radius: 20px;
          background: #fff;
          position: relative;
          cursor: pointer;
          padding: 0;
        }
        .switch.on {
          background: #00d4b8;
        }
        .switch::after {
          content: "";
          position: absolute;
          width: 18px;
          height: 18px;
          background: #14121f;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: transform 0.15s ease;
        }
        .switch.on::after {
          transform: translateX(19px);
        }
        .flow-preview {
          border: 2px dashed #14121f;
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 22px;
          background: #f5f0ff;
        }
        .flow-preview-label {
          font-weight: 800;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #7c3aed;
          margin-bottom: 8px;
        }
        .flow-preview ol {
          margin: 0;
          padding-left: 18px;
          font-size: 13px;
          color: #14121f;
          line-height: 1.6;
        }
        .save-btn {
          width: 100%;
          background: linear-gradient(135deg, #ff4fa3, #7c3aed);
          color: #fff;
          border: 3px solid #14121f;
          border-radius: 999px;
          padding: 16px;
          font-weight: 800;
          font-size: 16px;
          cursor: pointer;
          box-shadow: 4px 4px 0 #14121f;
          margin-top: 8px;
        }
        .save-btn:hover:not(:disabled) {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0 #14121f;
        }
        .save-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

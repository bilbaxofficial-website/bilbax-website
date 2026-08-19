"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase-client";

const STEP_LABELS = ["Trigger", "Gate", "Message", "Review"];

export default function NewAutomationClient({ igAccountId, igUsername }) {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Step 1: trigger
  const [eventType, setEventType] = useState("comment"); // "comment" | "story_reply"
  const [triggerType, setTriggerType] = useState("keyword"); // "keyword" | "any"
  const [keywords, setKeywords] = useState("");

  // Step 2: gate
  const [requireFollow, setRequireFollow] = useState(false);
  const [followPrompt, setFollowPrompt] = useState(
    "Follow me first, then tap the button below and I'll send it right over! 🙌"
  );
  const [collectField, setCollectField] = useState("none"); // "none" | "email" | "phone"
  const [collectPrompt, setCollectPrompt] = useState("What's the best email to send this to?");

  // Step 3: message
  const [dmMessage, setDmMessage] = useState("");
  const [commentReply, setCommentReply] = useState("Sent you a DM! 📩");
  const [useButton, setUseButton] = useState(false);
  const [buttonTitle, setButtonTitle] = useState("Get the link");
  const [buttonUrl, setButtonUrl] = useState("");

  function validateStep(n) {
    if (n === 1 && triggerType === "keyword" && !keywords.trim()) {
      return "Add at least one keyword, or switch to 'Any comment'.";
    }
    if (n === 3) {
      if (!dmMessage.trim()) return "Write the final DM message.";
      if (useButton && (!buttonTitle.trim() || !buttonUrl.trim())) {
        return "Add both a button label and a link, or turn the button off.";
      }
      if (useButton && buttonUrl.trim() && !/^https?:\/\//i.test(buttonUrl.trim())) {
        return "The link should start with http:// or https://";
      }
    }
    return "";
  }

  function goTo(n) {
    const msg = n > step ? validateStep(step) : "";
    if (msg) {
      setError(msg);
      return;
    }
    setError("");
    setStep(n);
  }

  async function handleSave() {
    const msg = validateStep(3);
    if (msg) {
      setError(msg);
      return;
    }
    setError("");
    setSaving(true);

    const keywordArray =
      triggerType === "any"
        ? ["*"]
        : keywords.split(",").map((k) => k.trim()).filter(Boolean);

    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("automations").insert({
      user_id: user.id,
      ig_account_id: igAccountId,
      post_id: null,
      trigger_type: eventType,
      keywords: keywordArray,
      dm_message: dmMessage,
      comment_reply: commentReply || null,
      status: "active",
      require_follow: requireFollow,
      follow_prompt: requireFollow ? followPrompt : null,
      collect_field: collectField === "none" ? null : collectField,
      collect_prompt: collectField === "none" ? null : collectPrompt,
      button_title: useButton ? buttonTitle.trim() : null,
      button_url: useButton ? buttonUrl.trim() : null,
    });

    setSaving(false);

    if (insertError) {
      setError("Couldn't save this automation. Try again.");
      return;
    }

    router.push("/dashboard/automations");
  }

  const previewName = "Riya";

  return (
    <div className="page-shell">
      <header className="page-header">
        <a href="/" className="page-logo">bilbax</a>
        <a href="/dashboard" className="back-link">← Back to dashboard</a>
      </header>

      <main className="page-main">
        <div className="page-eyebrow">New automation</div>
        <h1 className="page-title">Turn a comment into a conversation.</h1>
        <p className="page-sub">for @{igUsername} · 4 quick steps</p>

        <div className="stepper">
          {STEP_LABELS.map((label, i) => {
            const n = i + 1;
            const done = n < step;
            const active = n === step;
            return (
              <div className="stepper-item" key={label}>
                <div
                  className={`step ${done ? "done" : ""} ${active ? "active" : ""}`}
                  onClick={() => {
                    if (n <= step) goTo(n);
                  }}
                >
                  <div className="step-num">{done ? "✓" : n}</div>
                  <div className="step-label">{label}</div>
                </div>
                {n < 4 && <div className={`step-connector ${done ? "done" : ""}`} />}
              </div>
            );
          })}
        </div>

        {error && <div className="form-error">{error}</div>}

        <div className="card">
          <div className="card-body">
            {/* ---------------- STEP 1: TRIGGER ---------------- */}
            {step === 1 && (
              <>
                <div className="card-kicker">Step 1 of 4</div>
                <h2 className="card-title">What should trigger the DM?</h2>
                <p className="card-help">
                  Choose where you're listening, and what counts as a match.
                </p>

                <div className="field-group">
                  <label className="field-label">Where</label>
                  <div className="pill-row">
                    <button
                      type="button"
                      className={`pill ${eventType === "comment" ? "selected" : ""}`}
                      onClick={() => setEventType("comment")}
                    >
                      💬 Post/Reel comments
                    </button>
                    <button
                      type="button"
                      className={`pill ${eventType === "story_reply" ? "selected" : ""}`}
                      onClick={() => setEventType("story_reply")}
                    >
                      📖 Story replies
                    </button>
                    <button
                      type="button"
                      className={`pill ${eventType === "live_comment" ? "selected" : ""}`}
                      onClick={() => setEventType("live_comment")}
                    >
                      🔴 Live comments
                    </button>
                  </div>
                </div>

                <div className="field-group">
                  <label className="field-label">What counts as a match</label>
                  <div className="pill-row">
                    <button
                      type="button"
                      className={`pill ${triggerType === "any" ? "selected" : ""}`}
                      onClick={() => setTriggerType("any")}
                    >
                      {eventType === "comment" ? "Any comment" : eventType === "story_reply" ? "Any reply" : "Any live comment"}
                    </button>
                    <button
                      type="button"
                      className={`pill ${triggerType === "keyword" ? "selected" : ""}`}
                      onClick={() => setTriggerType("keyword")}
                    >
                      A specific keyword
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
                    <p className="hint">
                      Separate multiple keywords with commas. Not case-sensitive.
                      {eventType === "story_reply" && " Matched against the text someone types when replying to your story."}
                      {eventType === "live_comment" && " Matched against comments posted while you're live."}
                    </p>
                  </div>
                )}
              </>
            )}

            {/* ---------------- STEP 2: GATE ---------------- */}
            {step === 2 && (
              <>
                <div className="card-kicker">Step 2 of 4</div>
                <h2 className="card-title">
                  Add a gate? <span className="muted">(optional)</span>
                </h2>
                <p className="card-help">
                  Make people follow you, or share their email/phone, before they get the link.
                </p>

                <div className="toggle-row">
                  <div>
                    <strong>Ask them to follow first</strong>
                    <span className="desc">They'll get a "follow to unlock" DM with a button</span>
                  </div>
                  <button
                    type="button"
                    className={`switch ${requireFollow ? "on" : ""}`}
                    onClick={() => setRequireFollow(!requireFollow)}
                    aria-pressed={requireFollow}
                  />
                </div>
                {requireFollow && (
                  <div className="sub-field">
                    <label className="field-label">Follow-request message</label>
                    <input
                      type="text"
                      className="field-input"
                      value={followPrompt}
                      onChange={(e) => setFollowPrompt(e.target.value)}
                    />
                  </div>
                )}

                <div className="toggle-row">
                  <div>
                    <strong>Collect their email or phone</strong>
                    <span className="desc">Asked after the follow step, before the final DM</span>
                  </div>
                  <button
                    type="button"
                    className={`switch ${collectField !== "none" ? "on" : ""}`}
                    onClick={() => setCollectField(collectField === "none" ? "email" : "none")}
                    aria-pressed={collectField !== "none"}
                  />
                </div>
                {collectField !== "none" && (
                  <div className="sub-field">
                    <div className="pill-row" style={{ marginBottom: 10 }}>
                      <button
                        type="button"
                        className={`pill ${collectField === "email" ? "selected" : ""}`}
                        onClick={() => setCollectField("email")}
                      >
                        Email
                      </button>
                      <button
                        type="button"
                        className={`pill ${collectField === "phone" ? "selected" : ""}`}
                        onClick={() => setCollectField("phone")}
                      >
                        Phone
                      </button>
                    </div>
                    <label className="field-label">What to ask</label>
                    <input
                      type="text"
                      className="field-input"
                      value={collectPrompt}
                      onChange={(e) => setCollectPrompt(e.target.value)}
                    />
                  </div>
                )}
              </>
            )}

            {/* ---------------- STEP 3: MESSAGE ---------------- */}
            {step === 3 && (
              <>
                <div className="card-kicker">Step 3 of 4</div>
                <h2 className="card-title">Write the messages</h2>
                <p className="card-help">This is what actually gets sent, in order.</p>

                <div className="field-group">
                  <label className="field-label">Final DM message</label>
                  <textarea
                    className="field-textarea"
                    placeholder="Hey {first_name}! Here's what you asked for..."
                    value={dmMessage}
                    onChange={(e) => setDmMessage(e.target.value)}
                    rows={4}
                  />
                  <p className="hint">Use {"{first_name}"} to personalize with the commenter's name.</p>
                </div>

                <div className="field-group">
                  <div className="switch-row">
                    <div className="switch-text">
                      <label className="field-label" style={{ marginBottom: 2 }}>
                        Add a button with a link
                      </label>
                      <div className="hint" style={{ margin: 0 }}>
                        Instead of a plain text link, it shows as a tappable button in the DM.
                      </div>
                    </div>
                    <button
                      type="button"
                      className={`switch ${useButton ? "on" : ""}`}
                      onClick={() => setUseButton(!useButton)}
                      aria-pressed={useButton}
                    />
                  </div>
                  {useButton && (
                    <div className="sub-field button-fields">
                      <div className="field-group" style={{ marginBottom: 12 }}>
                        <label className="field-label">Button text</label>
                        <input
                          type="text"
                          className="field-input"
                          placeholder="Get the link"
                          maxLength={20}
                          value={buttonTitle}
                          onChange={(e) => setButtonTitle(e.target.value)}
                        />
                      </div>
                      <div className="field-group" style={{ marginBottom: 0 }}>
                        <label className="field-label">Link (where the button goes)</label>
                        <input
                          type="text"
                          className="field-input"
                          placeholder="https://your-link.com"
                          value={buttonUrl}
                          onChange={(e) => setButtonUrl(e.target.value)}
                        />
                      </div>
                    </div>
                  )}
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
                  <p className="hint">Shown publicly under their comment. Leave blank to skip.</p>
                </div>
              </>
            )}

            {/* ---------------- STEP 4: REVIEW ---------------- */}
            {step === 4 && (
              <>
                <div className="card-kicker">Step 4 of 4</div>
                <h2 className="card-title">Review & save</h2>
                <p className="card-help">Here's exactly what will happen, in order.</p>

                <ol className="review-list">
                  <li className="review-item">
                    <div className="review-num">1</div>
                    <div className="review-text">
                      {eventType === "comment" && (
                        triggerType === "keyword" ? (
                          <>Someone comments <span className="chip-kw">{keywords || "your keyword"}</span></>
                        ) : (
                          "Someone comments anything on this post"
                        )
                      )}
                      {eventType === "story_reply" && (
                        triggerType === "keyword" ? (
                          <>Someone replies to your story with <span className="chip-kw">{keywords || "your keyword"}</span></>
                        ) : (
                          "Someone replies to your story with anything"
                        )
                      )}
                      {eventType === "live_comment" && (
                        triggerType === "keyword" ? (
                          <>Someone comments <span className="chip-kw">{keywords || "your keyword"}</span> during your Live</>
                        ) : (
                          "Someone comments anything during your Live"
                        )
                      )}
                    </div>
                  </li>

                  {commentReply && (
                    <li className="review-item">
                      <div className="review-num">2</div>
                      <div className="review-text">
                        Public reply posted: <b>"{commentReply}"</b>
                      </div>
                    </li>
                  )}

                  {requireFollow && (
                    <li className="review-item">
                      <div className="review-num">•</div>
                      <div className="review-text">
                        DM sent: <b>"{followPrompt}"</b>
                        <div className="chip-btn">🔘 I followed, unlock now</div>
                      </div>
                    </li>
                  )}

                  {collectField !== "none" && (
                    <li className="review-item">
                      <div className="review-num">•</div>
                      <div className="review-text">
                        DM sent asking: <b>"{collectPrompt}"</b> — their reply is saved as the lead's {collectField}
                      </div>
                    </li>
                  )}

                  <li className="review-item">
                    <div className="review-num">✓</div>
                    <div className="review-text">
                      Final DM sent: <b>"{dmMessage.replace("{first_name}", previewName) || "(write your message in step 3)"}"</b>
                      {useButton && buttonTitle && (
                        <div className="chip-btn">🔗 {buttonTitle}</div>
                      )}
                    </div>
                  </li>
                </ol>
              </>
            )}
          </div>

          <div className="card-footer">
            {step > 1 ? (
              <button className="btn btn-plain" onClick={() => goTo(step - 1)}>
                ← Back
              </button>
            ) : (
              <span />
            )}

            {step < 4 ? (
              <button className="btn btn-ink" onClick={() => goTo(step + 1)}>
                Continue →
              </button>
            ) : (
              <button className="btn btn-save" onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : "✓ Save automation"}
              </button>
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        .page-shell {
          min-height: 100vh;
          background: #fff8ed;
          color: #14121f;
          font-family: "Space Grotesk", sans-serif;
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
          max-width: 640px;
          margin: 0 auto;
          padding: 30px 20px 90px;
        }
        .page-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #7c3aed;
          font: 700 11px "DM Mono", monospace;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 8px;
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
        .page-title {
          font: 800 28px/1.1 "Syne", sans-serif;
          letter-spacing: -0.03em;
          margin: 0 0 6px;
        }
        .page-sub {
          color: #585466;
          font-size: 13px;
          margin: 0 0 24px;
        }
        .stepper {
          display: flex;
          align-items: center;
          margin-bottom: 22px;
        }
        .stepper-item {
          display: flex;
          align-items: center;
          flex: 1;
        }
        .stepper-item:last-child {
          flex: 0;
        }
        .step {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }
        .step-num {
          width: 30px;
          height: 30px;
          border: 3px solid #14121f;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font: 700 13px "DM Mono", monospace;
          background: #fff8ed;
          flex-shrink: 0;
        }
        .step.done .step-num {
          background: #00d4b8;
        }
        .step.active .step-num {
          background: #ffd23f;
          box-shadow: 4px 4px 0 #14121f;
        }
        .step-label {
          font: 600 12px inherit;
          color: #b0aabb;
          display: none;
        }
        .step.active .step-label,
        .step.done .step-label {
          color: #14121f;
        }
        @media (min-width: 480px) {
          .step-label {
            display: block;
          }
        }
        .step-connector {
          flex: 1;
          height: 3px;
          background: #14121f;
          opacity: 0.15;
          margin: 0 8px;
          min-width: 12px;
        }
        .step-connector.done {
          opacity: 1;
          background: #00d4b8;
        }
        .form-error {
          background: #fff0f0;
          border: 2px solid #ff4fa3;
          color: #14121f;
          padding: 10px 14px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 16px;
        }
        .card {
          background: #fff;
          border: 3px solid #14121f;
          border-radius: 14px;
          box-shadow: 7px 7px 0 #14121f;
          padding: 26px 22px;
          display: flex;
          flex-direction: column;
          min-height: 360px;
        }
        .card-body {
          flex: 1;
        }
        .card-kicker {
          font: 700 11px "DM Mono", monospace;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #ff4fa3;
          margin-bottom: 8px;
        }
        .card-title {
          font: 700 21px "Syne", sans-serif;
          letter-spacing: -0.02em;
          margin: 0 0 4px;
        }
        .muted {
          color: #b0aabb;
          font-weight: 600;
        }
        .card-help {
          color: #585466;
          font-size: 13px;
          margin: 0 0 20px;
        }
        .pill-row {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
          margin-bottom: 18px;
        }
        .pill {
          border: 3px solid #14121f;
          border-radius: 8px;
          padding: 11px 16px;
          font: 700 13px inherit;
          cursor: pointer;
          background: #fff;
          color: #14121f;
        }
        .pill.selected {
          background: #ffd23f;
          box-shadow: 4px 4px 0 #14121f;
        }
        .field-group {
          margin-bottom: 18px;
        }
        .field-label {
          display: block;
          font-weight: 700;
          font-size: 12px;
          color: #14121f;
          margin-bottom: 6px;
        }
        .field-input,
        .field-textarea {
          width: 100%;
          border: 3px solid #14121f;
          border-radius: 8px;
          padding: 11px 13px;
          font-size: 14px;
          font-family: inherit;
          color: #14121f;
          background: #fff8ed;
          box-sizing: border-box;
        }
        .field-textarea {
          resize: vertical;
        }
        .hint {
          font-size: 11px;
          color: #8a8496;
          margin-top: 6px;
        }
        .toggle-row,
        .switch-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          border: 2px solid #14121f;
          border-radius: 10px;
          padding: 13px 15px;
          margin-bottom: 12px;
          background: #fbf7ee;
        }
        .switch-text {
          flex: 1;
        }
        .toggle-row strong {
          font-size: 13px;
          display: block;
        }
        .toggle-row span.desc {
          font-size: 11px;
          color: #8a8496;
        }
        .switch {
          flex-shrink: 0;
          width: 44px;
          height: 25px;
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
          width: 17px;
          height: 17px;
          background: #14121f;
          border-radius: 50%;
          top: 2px;
          left: 2px;
          transition: transform 0.15s ease;
        }
        .switch.on::after {
          transform: translateX(19px);
        }
        .sub-field {
          margin: -4px 0 14px;
        }
        .button-fields {
          border: 2px dashed #14121f;
          border-radius: 10px;
          padding: 14px;
          margin-top: 10px;
        }
        .review-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }
        .review-item {
          display: flex;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 2px dashed rgba(20, 18, 31, 0.15);
        }
        .review-item:last-child {
          border-bottom: none;
        }
        .review-num {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #7c3aed;
          color: #fff;
          font: 700 11px "DM Mono", monospace;
          display: grid;
          place-items: center;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .review-text {
          font-size: 13px;
          line-height: 1.5;
        }
        .chip-kw {
          display: inline-block;
          background: #ff4fa3;
          border: 1px solid #14121f;
          padding: 1px 6px;
          font: 700 11px "DM Mono", monospace;
          border-radius: 3px;
        }
        .chip-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffd23f;
          border: 2px solid #14121f;
          padding: 3px 10px 3px 12px;
          font: 700 11px "DM Mono", monospace;
          border-radius: 3px;
          margin-top: 8px;
        }
        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 22px;
          padding-top: 18px;
          border-top: 2px dashed #14121f;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 3px solid #14121f;
          border-radius: 8px;
          padding: 12px 22px;
          color: #14121f;
          font-weight: 700;
          cursor: pointer;
          font-size: 13px;
          background: #fff;
          box-shadow: 4px 4px 0 #14121f;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .btn:hover {
          transform: translate(-2px, -2px);
          box-shadow: 6px 6px 0 #14121f;
        }
        .btn-ink {
          background: #14121f;
          color: #fff8ed;
        }
        .btn-plain {
          border: none;
          box-shadow: none;
          padding: 12px 4px;
        }
        .btn-plain:hover {
          box-shadow: none;
          transform: translateX(-3px);
        }
        .btn-save {
          background: linear-gradient(135deg, #ff4fa3, #7c3aed);
          color: #fff;
        }
        .btn-save:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}

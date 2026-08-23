"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "../../../../lib/supabase-client";

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

  // Step 1b: which specific post/reel this automation applies to.
  // Only relevant when eventType === "comment" - story_reply automations
  // apply to whichever story the person replies to, there's no picker for it.
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsError, setPostsError] = useState("");
  const [selectedPostId, setSelectedPostId] = useState(null); // null = "all posts"

  useEffect(() => {
    if (eventType !== "comment") return;
    if (posts.length > 0 || postsLoading) return; // already fetched or fetching

    setPostsLoading(true);
    setPostsError("");
    fetch(`/api/instagram/media?account=${igAccountId}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          setPostsError("Couldn't load your posts. You can still apply this to all posts.");
        } else {
          setPosts(data.posts || []);
        }
      })
      .catch(() => {
        setPostsError("Couldn't load your posts. You can still apply this to all posts.");
      })
      .finally(() => setPostsLoading(false));
  }, [eventType, igAccountId]);

  // Step 2: gate
  const [requireFollow, setRequireFollow] = useState(false);
  const [followPrompt, setFollowPrompt] = useState(
    "Follow me first, then tap the button below and I'll send it right over! 🙌"
  );
  const [collectField, setCollectField] = useState("none"); // "none" | "email" | "phone"
  const [collectPrompt, setCollectPrompt] = useState("What's the best email to send this to?");

  // Step 2b: follow-up reminders (only relevant if a gate is set - otherwise
  // there's nothing to wait on a reply for)
  const [followups, setFollowups] = useState([]); // [{ after_minutes, message }]

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

    // Only keep follow-ups that have both a valid wait time and a message.
    const cleanedFollowups = followups
      .filter((f) => f.after_minutes > 0 && f.message && f.message.trim())
      .map((f) => ({ after_minutes: f.after_minutes, message: f.message.trim() }));

    const { data: { user } } = await supabase.auth.getUser();

    const { error: insertError } = await supabase.from("automations").insert({
      user_id: user.id,
      ig_account_id: igAccountId,
      post_id: eventType === "comment" ? selectedPostId : null,
      trigger_type: eventType,
      keywords: keywordArray,
      dm_message: dmMessage,
      comment_reply: eventType === "comment" ? (commentReply || null) : null,
      status: "active",
      require_follow: requireFollow,
      follow_prompt: requireFollow ? followPrompt : null,
      collect_field: collectField === "none" ? null : collectField,
      collect_prompt: collectField === "none" ? null : collectPrompt,
      button_title: useButton ? buttonTitle.trim() : null,
      button_url: useButton ? buttonUrl.trim() : null,
      followups: cleanedFollowups,
    });

    setSaving(false);

    if (insertError) {
      setError("Couldn't save this automation. Try again.");
      return;
    }

    router.push(`/dashboard/automations?account=${igAccountId}`);
  }

  const previewName = "Riya";

  return (
    <div className="page-shell">
      <header className="page-header">
        <a href="/" className="page-logo">bilbax</a>
        <a href={`/dashboard?account=${igAccountId}`} className="back-link">← Back to dashboard</a>
      </header>

      <main className="page-main">
        <div className="page-eyebrow">New automation</div>
        <h1 className="page-title">Turn a comment into a conversation.</h1>
        <p className="page-sub">for @{igUsername} · 4 quick steps</p>

        <div className="stepper" aria-label="Automation setup progress">
          {[1, 2, 3, 4].map((n) => {
            const done = n < step;
            const active = n === step;

            return (
              <div className="stepper-item" key={n}>
                <button
                  type="button"
                  className={`step ${done ? "done" : ""} ${active ? "active" : ""}`}
                  onClick={() => {
                    if (n <= step) goTo(n);
                  }}
                  aria-label={`Step ${n}${active ? ", current step" : done ? ", completed" : ""}`}
                  aria-current={active ? "step" : undefined}
                >
                  <span className="step-num">{n}</span>
                </button>
                {n < 4 && (
                  <span
                    className={`step-connector ${done ? "done" : ""}`}
                    aria-hidden="true"
                  />
                )}
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

                {/* Post/Reel picker - only for the "comment" trigger type.
                    Story replies and live comments don't have a picker:
                    a story reply always applies to whichever story someone
                    replies to, and a live comment applies to whichever
                    broadcast is currently live. */}
                {eventType === "comment" && (
                  <div className="field-group">
                    <label className="field-label">Which post or reel?</label>
                    <p className="hint" style={{ marginTop: 0, marginBottom: 10 }}>
                      Leave on "All posts" to catch this keyword everywhere, or lock it to one post/reel.
                    </p>

                    <button
                      type="button"
                      className={`pill post-all-pill ${selectedPostId === null ? "selected" : ""}`}
                      onClick={() => setSelectedPostId(null)}
                      style={{ marginBottom: 12 }}
                    >
                      🌐 All posts
                    </button>

                    {postsLoading && <div className="posts-status">Loading your posts...</div>}
                    {postsError && <div className="posts-status posts-status-error">{postsError}</div>}

                    {!postsLoading && !postsError && posts.length > 0 && (
                      <div className="post-grid">
                        {posts.map((p) => (
                          <button
                            type="button"
                            key={p.id}
                            className={`post-tile ${selectedPostId === p.id ? "selected" : ""}`}
                            onClick={() => setSelectedPostId(p.id)}
                            style={{ backgroundImage: p.thumbnailUrl ? `url(${p.thumbnailUrl})` : "none" }}
                            title={p.caption?.slice(0, 60) || "No caption"}
                          >
                            {p.mediaType === "VIDEO" && <span className="post-tile-badge">▶</span>}
                          </button>
                        ))}
                      </div>
                    )}

                    {!postsLoading && !postsError && posts.length === 0 && (
                      <div className="posts-status">No posts found yet - this will apply to all posts.</div>
                    )}
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

                {(requireFollow || collectField !== "none") && (
                  <div className="field-group">
                    <label className="field-label">Follow-up if they don't reply</label>
                    <p className="hint" style={{ marginTop: 0, marginBottom: 12 }}>
                      Nudge people who saw the gate but never replied. Add as many as you want.
                    </p>

                    {followups.map((f, i) => (
                      <div className="followup-row" key={i}>
                        <div className="followup-row-header">
                          <span className="followup-badge">Follow-up #{i + 1}</span>
                          <button
                            type="button"
                            className="followup-remove"
                            onClick={() => setFollowups(followups.filter((_, idx) => idx !== i))}
                          >
                            Remove
                          </button>
                        </div>
                        <div className="followup-fields">
                          <div>
                            <label className="field-label" style={{ fontSize: 11 }}>
                              Wait time
                            </label>
                            <div className="followup-time-row">
                              <input
                                type="number"
                                min="1"
                                className="field-input followup-time-input"
                                value={f.displayValue ?? f.after_minutes}
                                onChange={(e) => {
                                  const updated = [...followups];
                                  const raw = Number(e.target.value) || 0;
                                  updated[i] = {
                                    ...updated[i],
                                    displayValue: e.target.value,
                                    after_minutes: raw * (updated[i].unit === "hours" ? 60 : 1),
                                  };
                                  setFollowups(updated);
                                }}
                              />
                              <select
                                className="followup-unit-select"
                                value={f.unit || "minutes"}
                                onChange={(e) => {
                                  const updated = [...followups];
                                  const unit = e.target.value;
                                  const raw = Number(updated[i].displayValue ?? updated[i].after_minutes) || 0;
                                  updated[i] = {
                                    ...updated[i],
                                    unit,
                                    after_minutes: raw * (unit === "hours" ? 60 : 1),
                                  };
                                  setFollowups(updated);
                                }}
                              >
                                <option value="minutes">minutes</option>
                                <option value="hours">hours</option>
                              </select>
                              <span className="followup-time-suffix">after the gate is sent</span>
                            </div>
                          </div>
                          <div style={{ marginTop: 10 }}>
                            <label className="field-label" style={{ fontSize: 11 }}>
                              Message
                            </label>
                            <input
                              type="text"
                              className="field-input"
                              placeholder="Still there? Don't miss out 👋"
                              value={f.message || ""}
                              onChange={(e) => {
                                const updated = [...followups];
                                updated[i] = { ...updated[i], message: e.target.value };
                                setFollowups(updated);
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    <button
                      type="button"
                      className="add-followup-btn"
                      onClick={() =>
                        setFollowups([
                          ...followups,
                          { after_minutes: 60, unit: "hours", displayValue: "1", message: "" },
                        ])
                      }
                    >
                      + Add a follow-up
                    </button>
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

                {eventType === "comment" && (
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
                )}
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
                          "Someone comments anything"
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
                      {eventType === "comment" && (
                        <div style={{ marginTop: 6, fontSize: 12, color: "#8a8496" }}>
                          on {selectedPostId ? "the selected post/reel" : "any of your posts"}
                        </div>
                      )}
                    </div>
                  </li>

                  {eventType === "comment" && commentReply && (
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

                  {followups
                    .filter((f) => f.after_minutes > 0 && f.message?.trim())
                    .map((f, i) => (
                      <li className="review-item" key={i}>
                        <div className="review-num">⏰</div>
                        <div className="review-text">
                          If no reply after <b>{f.unit === "hours" ? f.after_minutes / 60 : f.after_minutes} {f.unit || "minutes"}</b>: <b>"{f.message}"</b>
                        </div>
                      </li>
                    ))}
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
          justify-content: center;
          width: 100%;
          max-width: 360px;
          margin: 0 auto 22px;
          padding: 0 4px;
          box-sizing: border-box;
        }
        .stepper-item {
          display: flex;
          align-items: center;
          flex: 1 1 auto;
          min-width: 0;
        }
        .stepper-item:last-child {
          flex: 0 0 auto;
        }
        .step {
          width: 30px;
          height: 30px;
          padding: 0;
          border: 0;
          background: transparent;
          display: grid;
          place-items: center;
          cursor: pointer;
          flex: 0 0 30px;
        }
        .step-num {
          width: 26px;
          height: 26px;
          border: 2px solid #14121f;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font: 700 12px "DM Mono", monospace;
          background: #fff8ed;
          color: #14121f;
          box-sizing: border-box;
          transition: transform 0.15s ease, box-shadow 0.15s ease, background 0.15s ease;
        }
        .step.done .step-num {
          background: #00d4b8;
        }
        .step.active .step-num {
          background: #ffd23f;
          box-shadow: 3px 3px 0 #14121f;
        }
        .step:not(.active):not(.done) {
          cursor: default;
        }
        .step:focus-visible {
          outline: 2px solid #7c3aed;
          outline-offset: 3px;
          border-radius: 50%;
        }
        .step-connector {
          flex: 1 1 auto;
          height: 2px;
          background: #14121f;
          opacity: 0.16;
          margin: 0 8px;
          min-width: 20px;
        }
        .step-connector.done {
          opacity: 1;
          background: #00d4b8;
        }
        @media (max-width: 420px) {
          .stepper {
            max-width: 320px;
            margin-bottom: 18px;
          }
          .step {
            width: 28px;
            height: 28px;
            flex-basis: 28px;
          }
          .step-num {
            width: 25px;
            height: 25px;
            font-size: 11px;
          }
          .step-connector {
            margin: 0 6px;
            min-width: 14px;
          }
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
        .post-all-pill {
          width: 100%;
        }
        .posts-status {
          font-size: 12px;
          color: #8a8496;
          padding: 10px 0;
        }
        .posts-status-error {
          color: #ff4fa3;
        }
        .post-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }
        .post-tile {
          position: relative;
          aspect-ratio: 1;
          border: 3px solid #14121f;
          border-radius: 8px;
          background-size: cover;
          background-position: center;
          background-color: #eee;
          cursor: pointer;
          padding: 0;
        }
        .post-tile.selected {
          outline: 3px solid #00d4b8;
          outline-offset: 2px;
        }
        .post-tile-badge {
          position: absolute;
          top: 4px;
          right: 4px;
          background: rgba(20, 18, 31, 0.75);
          color: #fff;
          font-size: 10px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
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
        .followup-row {
          border: 2px solid #14121f;
          border-radius: 10px;
          padding: 12px 14px;
          margin-bottom: 12px;
          background: #f5f0ff;
        }
        .followup-row-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 10px;
        }
        .followup-badge {
          font: 700 11px "DM Mono", monospace;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #7c3aed;
        }
        .followup-remove {
          border: none;
          background: none;
          color: #ff4fa3;
          font-weight: 700;
          font-size: 12px;
          cursor: pointer;
          padding: 0;
        }
        .followup-time-row {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }
        .followup-time-input {
          width: 70px;
          flex: none;
        }
        .followup-unit-select {
          border: 3px solid #14121f;
          border-radius: 8px;
          padding: 10px 8px;
          font: 700 13px inherit;
          background: #fff8ed;
          color: #14121f;
        }
        .followup-time-suffix {
          font-size: 12px;
          color: #8a8496;
        }
        .add-followup-btn {
          width: 100%;
          border: 2px dashed #14121f;
          border-radius: 10px;
          padding: 12px;
          background: transparent;
          color: #7c3aed;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }
        .add-followup-btn:hover {
          background: #f5f0ff;
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

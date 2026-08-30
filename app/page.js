import BilbaxScript from "./BilbaxScript";

export default function Home() {
  return (
    <>
    <div dangerouslySetInnerHTML={{ __html: `

<div class="bilbax-page" data-bilbax>
  <a class="skip-link" href="#bilbax-main">Skip to content</a>

  <header class="nav-wrap">
    <div class="container nav">
      <a class="logo" href="#"><img src="/bilbax-front-logo.png" alt="bilbax" class="brand-logo-img" /></a>
      <nav class="nav-links" data-mobile-nav aria-label="Main navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#features">Features</a>
        <a href="#pricing">Pricing</a>
        <a href="#faq">FAQ</a>
      </nav>
      <div class="nav-actions">
        <a class="nav-login" href="#demo">See live demo</a>
        <button class="menu-btn" type="button" data-menu-toggle aria-label="Open menu" aria-expanded="false">
          <svg data-menu-open viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          <svg data-menu-close viewBox="0 0 24 24" aria-hidden="true" hidden><path d="M6 6l12 12M18 6L6 18"/></svg>
        </button>
        <a class="btn btn-pink nav-cta" href="#pricing">Start free <span aria-hidden="true">→</span></a>
      </div>
    </div>
  </header>

  <main id="bilbax-main">
    <section class="hero" id="top">
      <div class="container hero-grid">
        <div>
          <div class="hero-kicker">Instagram automation for people with things to do</div>
          <h1 class="display">Turn comments into <span>customers.</span></h1>
          <p class="hero-sub">Your Instagram DMs, on autopilot. Bilbax replies to comments, sends the right DM, and keeps every warm lead moving.</p>
          <div class="hero-actions">
            <a class="btn btn-pink" href="#pricing">Start free <span aria-hidden="true">→</span></a>
            <a class="btn btn-plain" href="#demo">See live demo <span aria-hidden="true">›</span></a>
          </div>
          <div class="micro-proof">
            <span><i></i>500 free DMs/month</span>
            <span><i></i>No code needed</span>
          </div>
        </div>

        <div class="hero-art" aria-label="Illustration of an Instagram comment becoming an automatic DM">
          <div class="burst"></div>
          <span class="sticker sticker-one">while you sleep</span>
          <span class="sticker sticker-two">lead captured</span>
          <span class="sticker sticker-three">no code</span>
          <div class="phone">
            <div class="phone-screen">
              <div class="phone-top"><span>bilbax / automation</span><span>09:41</span></div>
              <div class="phone-title"><strong>Comment → DM</strong><small>New conversation, handled.</small></div>
              <div class="comment-card">
                <div class="comment-user"><span class="avatar">RS</span><span>riya.styles</span><span class="push-right muted-small">now</span></div>
                <p class="comment-text">“Drop the link for this one?”</p>
                <span class="keyword">LINK</span>
              </div>
              <div class="auto-dm">
                <header><span><span aria-hidden="true">✦</span> BILBAX AI</span><span>sent instantly</span></header>
                <p>Hey Riya — here’s the link you asked for. Want the size guide too?</p>
              </div>
              <div class="lead-row"><span class="lead-dot"></span><strong>Lead saved</strong><span class="push-right">riya.styles</span></div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="ticker" aria-label="Bilbax benefits">
      <div class="ticker-track">
        
          <div class="ticker-line">
            <span>Comment to DM</span><b>+</b><span>AI replies</span><b>+</b><span>Leads while you sleep</span><b>+</b><span>No code needed</span><b>+</b>
          </div>
        
          <div class="ticker-line">
            <span>Comment to DM</span><b>+</b><span>AI replies</span><b>+</b><span>Leads while you sleep</span><b>+</b><span>No code needed</span><b>+</b>
          </div>
        
      </div>
    </div>

    <section class="section dark-section" id="how-it-works">
      <div class="container">
        <div class="section-head reveal">
          <div><div class="eyebrow">The shortcut</div><h2 class="section-title">Three steps.<br><span class="pink-text">Zero chasing.</span></h2></div>
          <p class="section-copy">Someone comments a keyword → Bilbax sends them a DM instantly → You capture the lead.</p>
        </div>
        <div class="steps">
          <article class="step reveal"><div class="step-number"><span>01</span><span class="step-icon">◌</span></div><h3>Pick a keyword</h3><p>Choose the words your audience already uses: “LINK”, “PRICE”, “YES”.</p></article>
          <article class="step reveal"><div class="step-number"><span>02</span><span class="step-icon">✦</span></div><h3>Bilbax jumps in</h3><p>A perfectly timed DM lands the second someone comments. No chasing.</p></article>
          <article class="step reveal"><div class="step-number"><span>03</span><span class="step-icon">◎</span></div><h3>You close the loop</h3><p>Capture the lead, answer the question, and sell while your phone is away.</p></article>
        </div>
      </div>
    </section>

    <section class="section" id="features">
      <div class="container">
        <div class="section-head reveal">
          <div><div class="eyebrow">What it does</div><h2 class="section-title">Your inbox has<br><span class="purple-text">backup.</span></h2></div>
          <p class="section-copy">Bilbax takes care of the repetitive bits, without making your brand sound like a robot.</p>
        </div>
        <div class="features-grid">
          <article class="feature feature-pink reveal"><div class="feature-label">◎ Comment triggers</div><h3>Catch intent in the comments.</h3><p>Turn a simple “send it” into a personal DM before the scroll moves on.</p></article>
          <article class="feature feature-yellow reveal"><div class="feature-label">✦ AI replies</div><h3>Let AI handle the repeat questions.</h3><p>Give it your tone, your offers, and your boundaries. It stays helpful, never robotic.</p></article>
          <article class="feature feature-cream reveal"><div class="feature-label">↗ Lead capture</div><h3>Every warm lead, neatly saved.</h3><p>Collect names and details automatically, so the next step is always obvious.</p></article>
          <article class="feature feature-purple reveal"><div class="feature-label">◈ Made for Instagram</div><h3>Your account. Your rules.</h3><p>Official connections, clear controls, and a pause button whenever you need one.</p></article>
        </div>
      </div>
    </section>

    <section class="section demo-section" id="demo">
      <div class="container demo-shell">
        <div class="demo-copy reveal">
          <div class="eyebrow">Your turn</div>
          <h2>See the little bit of magic.</h2>
          <p>Type what a follower might ask. Bilbax has a reply ready — and it will not leave you on read.</p>
          <a class="btn btn-ink" href="#pricing">Connect Instagram <span aria-hidden="true">↗</span></a>
        </div>
        <div class="demo-window reveal">
          <div class="window-bar"><span>bilbax / live inbox</span><span class="window-dots"><i></i><i></i><i></i></span></div>
          <div class="demo-content">
            <div class="demo-inbox">
              <h4>Inbox <span class="mono new-label">new</span></h4>
              <div class="inbox-item active"><strong>riya.styles</strong><span>“Drop the link?”</span></div>
              <div class="inbox-item"><strong>the.daily.studio</strong><span>“What is the price?”</span></div>
              <div class="inbox-item"><strong>mangoandmint</strong><span>“Need this in blue.”</span></div>
            </div>
            <div class="demo-chat">
              <div class="chat-person"><span class="avatar avatar-orange">RS</span><strong>riya.styles</strong><span class="push-right muted-small">commented LINK</span></div>
              <div class="chat-bubble">Hey! Can I get the link for the co-ord set?</div>
              <div class="chat-bubble bot" data-demo-reply>Hey Riya — here’s the link you asked for. Want the size guide too?</div>
              <form class="demo-form" data-demo-form>
                <input aria-label="Try a reply" placeholder="Try a reply..." data-demo-input>
                <button type="submit" aria-label="Send demo reply">↗</button>
              </form>
              <p class="demo-status" role="status" data-demo-status>AI suggestion · ready to send</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="section pricing-section" id="pricing">
      <div class="container">
        <div class="section-head reveal">
          <div><div class="eyebrow">Simple plans</div><h2 class="section-title">Start free.<br><span class="orange-text">Stay in control.</span></h2></div>
          <p class="section-copy">No surprise invoices. No “book a sales call” maze. Pick a plan and get moving.</p>
        </div>
        <div class="price-grid">
          <article class="price-card reveal"><h3>Free</h3><p>For getting your first automation live.</p><div class="price">₹0</div><ul class="price-list"><li>✓ 1 Instagram account</li><li>✓ 100 DMs / month</li><li>✗ Welcome DM</li><li>✓ Post &amp; Reel automation only</li><li>✗ Follow-up DM</li><li>✓ Basic analytics</li></ul><button class="btn" type="button" data-plan="Free">Start free <span>→</span></button><div class="price-feedback" data-plan-feedback></div></article>
          <article class="price-card reveal"><h3>Starter</h3><p>For your first real automation setup.</p><div class="price">₹149 <small>/ month</small></div><ul class="price-list"><li>✓ 2 Instagram accounts</li><li>✓ 3,000 DMs / month</li><li>✓ Welcome DM</li><li>✓ All automation (incl. Story &amp; Live)</li><li>✓ Follow-up DM</li><li>✓ Basic analytics</li></ul><button class="btn" type="button" data-plan="Starter">Get started <span>→</span></button><div class="price-feedback" data-plan-feedback></div></article>
          <article class="price-card featured reveal"><span class="price-tag">Most popular</span><h3>Growth</h3><p>For creators with a busy inbox.</p><div class="price">₹349 <small>/ month</small></div><ul class="price-list"><li>✓ 3 Instagram accounts</li><li>✓ 20,000 DMs / month</li><li>✓ Welcome DM</li><li>✓ All automation (incl. Story &amp; Live)</li><li>✓ Follow-up DM</li><li>✓ Advanced analytics</li></ul><button class="btn" type="button" data-plan="Growth">Start growing <span>→</span></button><div class="price-feedback" data-plan-feedback></div></article>
          <article class="price-card reveal"><h3>Pro</h3><p>For teams running multiple accounts.</p><div class="price">₹699 <small>/ month</small></div><ul class="price-list"><li>✓ 5 Instagram accounts</li><li>✓ Unlimited DMs</li><li>✓ Welcome DM</li><li>✓ All automation (incl. Story &amp; Live)</li><li>✓ Follow-up DM</li><li>✓ Advanced analytics + Priority support</li></ul><button class="btn" type="button" data-plan="Pro">Talk to us <span>→</span></button><div class="price-feedback" data-plan-feedback></div></article>
        </div>

        <div class="compare-wrap reveal">
          <h3 class="compare-title">Compare every feature</h3>
          <div class="compare-scroll">
          <table class="compare-table">
            <thead>
              <tr><th class="compare-feature-col">Feature</th><th>Free</th><th>Starter</th><th class="compare-highlight">Growth</th><th>Pro</th></tr>
            </thead>
            <tbody>
              <tr><td class="compare-feature-col">Connected Instagram accounts</td><td>1</td><td>2</td><td class="compare-highlight">3</td><td>5</td></tr>
              <tr><td class="compare-feature-col">DM sending limit</td><td>100 / month</td><td>3,000 / month</td><td class="compare-highlight">20,000 / month</td><td>Unlimited</td></tr>
              <tr><td class="compare-feature-col">Welcome DM</td><td class="no">✗</td><td class="yes">✓</td><td class="compare-highlight yes">✓</td><td class="yes">✓</td></tr>
              <tr><td class="compare-feature-col">Automation type</td><td>Post &amp; Reel only</td><td>All (incl. Story &amp; Live)</td><td class="compare-highlight">All (incl. Story &amp; Live)</td><td>All (incl. Story &amp; Live)</td></tr>
              <tr><td class="compare-feature-col">Follow-up DM</td><td class="no">✗</td><td class="yes">✓</td><td class="compare-highlight yes">✓</td><td class="yes">✓</td></tr>
              <tr><td class="compare-feature-col">Analytics</td><td>Basic</td><td>Basic</td><td class="compare-highlight">Advanced</td><td>Advanced</td></tr>
              <tr><td class="compare-feature-col">Number of automations</td><td>2</td><td>Unlimited</td><td class="compare-highlight">Unlimited</td><td>Unlimited</td></tr>
              <tr><td class="compare-feature-col">DM character length</td><td>500 characters</td><td>1,000 characters</td><td class="compare-highlight">No limit</td><td>No limit</td></tr>
              <tr><td class="compare-feature-col">Links per DM</td><td>1</td><td>3</td><td class="compare-highlight">5</td><td>5</td></tr>
              <tr><td class="compare-feature-col">Email / phone data collection</td><td class="no">✗</td><td class="yes">✓</td><td class="compare-highlight yes">✓</td><td class="yes">✓</td></tr>
              <tr><td class="compare-feature-col">Priority support</td><td class="no">✗</td><td class="no">✗</td><td class="compare-highlight no">✗</td><td class="yes">✓</td></tr>
              <tr><td class="compare-feature-col">Follow-before-DM gate</td><td class="no">✗</td><td class="yes">✓</td><td class="compare-highlight yes">✓</td><td class="yes">✓</td></tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="use-cases">
      <div class="container">
        <div class="section-head reveal">
          <div><div class="eyebrow">For your kind of busy</div><h2 class="section-title">Made for the<br><span class="pink-text">in-between.</span></h2></div>
          <p class="section-copy">The launch day. The client call. The school run. Bilbax is there for the moments you cannot be.</p>
        </div>
        <div class="usecase-grid">
          <article class="usecase-main reveal"><span class="quote-mark">“</span><blockquote>“I stopped opening Instagram just to answer the same question on repeat.”</blockquote><div class="persona"><span class="avatar avatar-yellow">AC</span><span>Ayesha<br><small>Content Creator · illustrative persona</small></span></div></article>
          <div class="usecase-side">
            <article class="persona-card reveal"><div class="eyebrow">For coaches</div><h3>Turn “how?” into a conversation.</h3><p>Answer the first question fast, then save the lead for the real chat.</p></article>
            <article class="persona-card reveal"><div class="eyebrow">For D2C brands</div><h3>Sell without living in your inbox.</h3><p>Make every product drop and comment section work a little harder.</p></article>
          </div>
        </div>
      </div>
    </section>

    <section class="section faq-section" id="faq">
      <div class="container faq-grid">
        <div class="faq-intro reveal"><div class="eyebrow">Good questions</div><h2>FAQ,<br><span class="purple-text">without the fluff.</span></h2><p>Still curious? That is a good sign. Here are the things people usually ask before they switch it on.</p></div>
        <div class="faq-list reveal">
          <div class="faq-item"><button class="faq-question" type="button" aria-expanded="false"><span>Is my Instagram account safe?</span><span>+</span></button><div class="faq-answer" hidden>Yes. Bilbax uses Instagram’s official connection and messaging permissions. We never ask for your password, and you can pause automations or disconnect your account whenever you want.</div></div>
          <div class="faq-item"><button class="faq-question" type="button" aria-expanded="false"><span>Do I need to know how to code?</span><span>+</span></button><div class="faq-answer" hidden>Not even a little. Pick a keyword, write the message you want sent, and switch it on. The whole setup takes a few minutes, without a developer or a complicated flow builder.</div></div>
          <div class="faq-item"><button class="faq-question" type="button" aria-expanded="false"><span>Is the free plan free forever?</span><span>+</span></button><div class="faq-answer" hidden>Yes. The free plan includes 500 DMs each month and stays free forever. When your conversations grow, you can upgrade for more automation capacity.</div></div>
          <div class="faq-item"><button class="faq-question" type="button" aria-expanded="false"><span>Can Bilbax reply with AI?</span><span>+</span></button><div class="faq-answer" hidden>It can. Set a brand voice and give Bilbax a little context, then let AI handle the repeat questions while you focus on the conversations that need a human.</div></div>
        </div>
      </div>
    </section>

    <section class="final-cta">
      <div class="container cta-inner reveal">
        <div class="eyebrow">Your inbox called</div>
        <h2>Go make the thing.<br><span class="purple-text">Bilbax has the DMs.</span></h2>
        <p>Get your first automation live in a few minutes. Your next customer might already be in the comments.</p>
        <a class="btn btn-yellow" href="#pricing">Start free <span>→</span></a>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="container">
      <div class="footer-top">
        <div class="footer-brand"><a class="logo" href="#top"><img src="/bilbax-logo.png" alt="bilbax" class="brand-logo-img" /></a><p class="footer-blurb">The fast lane from Instagram comment to customer conversation.</p></div>
        <div class="footer-links">
          <div><h4>Product</h4><a href="#how-it-works">How it works</a><a href="#features">Features</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></div>
          <div><h4>Company</h4><a href="/about">About</a><a href="/contact">Contact &amp; Support</a><a href="#demo">See live demo</a><a href="#pricing">Start free</a></div>
          <div><h4>Legal</h4><a href="/privacy">Privacy Policy</a><a href="/terms">Terms of Service</a><a href="/refund">Refund &amp; Cancellation</a><a href="/data-deletion">Data Deletion</a></div>
        </div>
      </div>
      <div class="footer-bottom"><span>© 2026 bilbax. Built for the busy.</span><span><a href="/privacy">Privacy</a><a href="/terms">Terms</a><a href="/contact">Support</a></span></div>
    </div>
  </footer>
</div>

` }} />
      <BilbaxScript />
    </>
  );
}

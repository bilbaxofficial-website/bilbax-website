import Link from "next/link";

export default function LegalPage({
  title,
  lastUpdated,
  children,
}) {
  return (
    <main className="legal-page">
      <div className="legal-container">
        <Link href="/" className="legal-back">
          ← Back to home
        </Link>

        <div className="legal-content">
          <header className="legal-header">
            <h1>{title}</h1>

            {lastUpdated && (
              <p className="legal-updated">
                Last updated: {lastUpdated}
              </p>
            )}
          </header>

          <article className="legal-article">
            {children}
          </article>
        </div>
      </div>
    </main>
  );
}

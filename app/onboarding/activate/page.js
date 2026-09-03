export default async function ActivatePage({ searchParams }) {
  const params = await searchParams;
  const hasError = params?.error === "activation_failed";

  if (hasError) {
    return (
      <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
        <section style={{ maxWidth: "480px", textAlign: "center" }}>
          <h1>We couldn't activate your plan</h1>
          <p>Please try connecting your Instagram again.</p>
          <a href="/onboarding/instagram">Back to Instagram connection</a>
        </section>
      </main>
    );
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: "24px" }}>
      <section style={{ maxWidth: "480px", textAlign: "center" }}>
        <h1>Setting up your account</h1>
        <p>We're activating your selected Bilbax plan.</p>
        <a href="/api/onboarding/activate">Activate & Continue</a>
      </section>
    </main>
  );
}

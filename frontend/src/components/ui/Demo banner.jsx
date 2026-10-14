export default function DemoBanner() {
  if (import.meta.env.VITE_USE_MOCKS !== "true") return null;
  return (
    <p
      role="note"
      style={{
        margin: 0,
        padding: "8px 16px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface-raised)",
        color: "var(--text-primary)",
      }}
    >
      <strong>Demo data.</strong> Reports here are pre-built samples, not your uploaded file. Uploads are not processed in this hosted demo.
    </p>
  );
}
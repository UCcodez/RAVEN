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
      <strong>Prototype preview on sample data.</strong> RAVEN analyses captures on a local backend, so evidence never
      leaves the analyst's machine. That backend is not hosted in this preview, so the reports here are pre-built
      samples and uploaded files are not processed.
    </p>
  );
}
import { useEffect, useState } from "react";
console.log("API base:", import.meta.env.VITE_API_URL);
import { Link, useNavigate } from "react-router-dom";
import Panel from "../components/ui/Panel";
import Button from "../components/ui/Button";
import DataTable from "../components/ui/DataTable";
import SeverityBadge from "../components/ui/SeverityBadge";  
import DropZone from "../components/upload/DropZone";
import { listAnalyses, createAnalysis } from "../api/client"; import { SCENARIOS } from "../data/scenarios";
import { formatDate } from "../utils/format";
import styles from "./UploadPage.module.css";

const SEV_RANK = { critical: 4, high: 3, medium: 2, low: 1, info: 0, clean: -1 };

const toRow = (a) => ({
  id: a.id ?? a.analysis_id,
  file: a.file_name ?? a.filename ?? a.name ?? "unnamed capture",
  date: a.created_at ?? a.uploaded_at ?? null,
  posture: a.posture_score ?? a.overall_score ?? null,
  worst: String(a.worst_severity ?? a.max_severity ?? "").toLowerCase() || null,
});

const columns = [
  {
    key: "file", label: "File", sortable: true, mono: true,
    render: (r) => <Link className={styles.file} to={`/analyses/${r.id}`}>{r.file}</Link>,
  },
  { key: "date", label: "Date", sortable: true, mono: true, render: (r) => formatDate(r.date) },
  { key: "posture", label: "Posture", sortable: true, mono: true, render: (r) => (r.posture == null ? "-" : `${r.posture} / 100`) },
  {
    key: "worst", label: "Worst finding", sortable: true,
    sortValue: (r) => (r.worst ? SEV_RANK[r.worst] : null),
    render: (r) => (r.worst ? <SeverityBadge level={r.worst} /> : "-"),
  },
];

export default function UploadPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recent, setRecent] = useState({ status: "loading", rows: [] });

  useEffect(() => {
    document.title = "| RAVEN |";
    listAnalyses()
      .then((list) => setRecent({ status: "ready", rows: list.map(toRow).slice(0, 8) }))
      .catch(() => setRecent({ status: "error", rows: [] }));
  }, []);

  async function handleFile(file) {
    setBusy(true);
    setError("");
    try {
      const created = await createAnalysis(file);
      const id = created.id ?? created.analysis_id;
      navigate(`/analyses/${id}/progress`);
    } catch (e) {
      setError(`Upload failed: ${e.message}`);
      setBusy(false);
    }
  }

  const emptyText =
    recent.status === "loading" ? "Loading analyses..."
      : recent.status === "error" ? "Could not reach the backend. Is it running on the API URL in .env?"
        : "No analyses yet. Upload a capture to begin.";

  return (
    <div className={styles.page}>
      <header>
        <h1 className={styles.title}>Analyze an email traffic capture</h1>
        <p className={styles.sub}>
          Upload a PCAP to assess the cryptographic posture of SMTP, IMAP and POP3 traffic.
        </p>
      </header>

      <DropZone onFile={handleFile} busy={busy} error={error} />

      <div className={styles.grid}>
        <Panel title="Recent analyses" padded={false}>
          <DataTable columns={columns} rows={recent.rows} rowKey={(r) => r.id} empty={emptyText} />
        </Panel>

        <Panel title="Security Lab" padded={false}>
          <ul className={styles.labList}>
            {SCENARIOS.map((s) => (
              <li key={s.id} className={styles.labRow}>
                <div>
                  <div className={styles.labName}>{s.name}</div>
                  <div className={styles.labDesc}>{s.description}</div>
                </div>
                <Button
                  size="sm"
                  disabled={!s.available}
                  title={s.available ? undefined : "Available once this scenario capture is generated"}
                >
                  Load
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
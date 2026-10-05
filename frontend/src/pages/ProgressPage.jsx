import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import ProgressChecklist from "../components/ui/ProgressChecklist";
import useAnalysisStatus from "../hooks/useAnalysisStatus";
import usePageTitle from "../hooks/usePageTitle";
import styles from "./ProgressPage.module.css";

const LABELS = {
  validated: "Capture validated",
  protocols: "Email protocols identified",
  streams: "TCP streams reconstructed",
  tls: "TLS handshakes analysed",
  certs: "Certificates checked",
  risk: "Risk assessed",
  report: "Report prepared",
};

export default function ProgressPage() {
  const { analysisId } = useParams();
  const navigate = useNavigate();
  usePageTitle("Analysing capture");
  const { status, error } = useAnalysisStatus(analysisId);

  useEffect(() => {
    if (status?.state !== "completed") return;
    const t = setTimeout(() => navigate(`/analyses/${analysisId}/overview`), 1500);
    return () => clearTimeout(t);
  }, [status?.state, analysisId, navigate]);

  if (!status) {
    return (
      <main className={styles.page}>
        <h1>Analysing capture</h1>
        {error
          ? <p role="alert" className={styles.error}>{error}</p>
          : <p role="status">Waiting for the analysis to start...</p>}
      </main>
    );
  }

  const stages = status.stages.map((s) => ({ ...s, label: LABELS[s.key] ?? s.key }));
  const failed = stages.find((s) => s.state === "failed");
  const c = status.counts ?? {};
  const counts = [
    ["Packets", c.packets], ["Streams", c.streams], ["Sessions", c.sessions], ["Findings", c.findings],
  ];

  return (
    <main className={styles.page}>
      <h1>{status.state === "failed" ? "Analysis failed" : status.state === "running" ? "Analysing capture" : "Analysis finished"}</h1>
      <p className={styles.elapsed}>Elapsed: {Math.round(status.elapsed_seconds ?? 0)} s</p>

      <ProgressChecklist stages={stages} />

      <dl className={styles.counts}>
        {counts.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v ?? 0}</dd></div>
        ))}
      </dl>

      {status.state === "failed" && (
        <p role="alert" className={styles.error}>
          Failed at: {failed?.label ?? "unknown stage"}. {status.error ?? ""}
        </p>
      )}
      {status.state === "partial" && (
        <p role="status" className={styles.warn}>
          Partial result: {c.streams_unreconstructed ?? 0} stream(s) could not be reconstructed. Findings cover the rest.
        </p>
      )}
      {(status.state === "completed" || status.state === "partial") && (
        <Link to={`/analyses/${analysisId}/overview`} className={styles.link}>View overview</Link>
      )}
      {status.state === "failed" && <Link to="/" className={styles.link}>Back to upload</Link>}
    </main>
  );
}
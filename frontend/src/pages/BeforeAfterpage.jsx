import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { api, createAnalysis } from "../api/client";
import useApiData from "../hooks/useApiData";
import usePageTitle from "../hooks/usePageTitle";
import Panel from "../components/ui/Panel";
import SeverityBadge from "../components/ui/SeverityBadge";
import ErrorState from "../components/ui/ErrorState";
import styles from "./BeforeAfterPage.module.css";

function FindingList({ items, empty }) {
  if (!items?.length) return <p>{empty}</p>;
  return (
    <ul className={styles.findings}>
      {items.map((f) => (
        <li key={`${f.server}-${f.rule_id}`}>
          <SeverityBadge severity={f.severity} />
          <span className={styles.mono}>{f.rule_id}</span> on {f.server}
          {f.status === "UNKNOWN" && <strong> · UNKNOWN</strong>}
        </li>
      ))}
    </ul>
  );
}

export default function BeforeAfterPage() {
  usePageTitle("Before / After");
  const { analysisId } = useParams();
  const [params, setParams] = useSearchParams();
  const after = params.get("after");
  const { data, error, loading, reload } = useApiData(after && `/compare?before=${analysisId}&after=${after}`);
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  async function uploadAfter(file) {
    if (!file) return;
    setBusy(true);
    setUploadError(null);
    try {
      const created = await createAnalysis(file);
      const id = created.analysis_id ?? created.id;
      await api(`/analyses/${id}/run`, { method: "POST" });
      setParams({ after: id });
    } catch (e) {
      setUploadError(e);
    } finally {
      setBusy(false);
    }
  }

  if (!after) {
    return (
      <Panel title="Upload the AFTER capture">
        <p>Capture the same servers after applying the fix. Remediation is only confirmed by this capture.</p>
        <input type="file" accept=".pcap,.pcapng" disabled={busy} onChange={(e) => uploadAfter(e.target.files[0])} />
        {busy && <p>Analyzing…</p>}
        {uploadError && <ErrorState message={uploadError.message} />}
      </Panel>
    );
  }

  if (loading) return <p>Comparing captures…</p>;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!data) return null;

  const delta = data.after.posture_score - data.before.posture_score;

  return (
    <div className={styles.page}>
      <div className={data.verified ? styles.verified : styles.unverified} role="status">
        {data.verified
          ? "Remediation verified"
          : "Remediation not verified. Fixed findings are still present, or their server is missing from the AFTER capture (UNKNOWN)."}
      </div>

      <div className={styles.scores}>
        <Panel title="Before">
          <p className={styles.score}>{data.before.posture_score}</p>
        </Panel>
        <Panel title="After">
          <p className={styles.score}>{data.after.posture_score}</p>
          <p>{delta >= 0 ? "+" : ""}{delta} points</p>
        </Panel>
      </div>

      <Panel title="Metrics">
        <table className={styles.table}>
          <thead>
            <tr><th>Metric</th><th>Before</th><th>After</th></tr>
          </thead>
          <tbody>
            {data.metrics.map((m) => (
              <tr key={m.label}>
                <td>{m.label}</td><td>{m.before}</td><td>{m.after}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <div className={styles.scores}>
        <Panel title="Resolved findings">
          <FindingList items={data.resolved} empty="Nothing resolved." />
        </Panel>
        <Panel title="New findings">
          <FindingList items={data.new} empty="No new findings." />
        </Panel>
      </div>
    </div>
  );
}
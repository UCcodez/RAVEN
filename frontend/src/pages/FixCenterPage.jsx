import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useApiData from "../hooks/useApiData";
import usePageTitle from "../hooks/usePageTitle";
import Panel from "../components/ui/Panel";
import Button from "../components/ui/Button";
import SeverityBadge from "../components/ui/SeverityBadge";
import CodeBlock from "../components/ui/CodeBlock";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import styles from "./FixCenterPage.module.css";

function Remediation({ findingId, analysisId }) {
  const navigate = useNavigate();
  const { data: fix, error, loading, reload } = useApiData(`/findings/${findingId}/remediation`);

  if (loading) return <p>Loading remediation…</p>;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!fix) return null;

  if (fix.kind === "no_config_fix") {
  return (
    <div className={styles.detail}>
      <Panel title="No configuration fix"><p>{fix.snippet}</p></Panel>
    </div>
  );
}

  return (
    <div className={styles.detail}>
      <Panel title={`Config for ${fix.software}`}>
        <CodeBlock code={fix.snippet} label={fix.software} />
        <p className={styles.warn}>{fix.warning ?? "Test in staging first."}</p>
      </Panel>

      <Panel title="Break-risk preview">
        {fix.break_risk?.length ? (
          <>
            {fix.break_summary && <p>{fix.break_summary}</p>}
            <table className={styles.table}>
              <thead>
                <tr><th>Client</th><th>Fingerprint</th><th>Sessions</th><th>After change</th></tr>
              </thead>
              <tbody>
                {fix.break_risk.map((c) => (
                  <tr key={`${c.client_ip}-${c.ja3}`}>
                    <td>{c.name} · {c.client_ip}</td>
                    <td className={styles.mono}>{c.ja3}</td>
                    <td>{c.sessions}</td>
                    <td>{c.would_fail ? "WOULD FAIL" : "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : (
          <p>No client seen in this capture would fail. Clients absent from the capture are not covered.</p>
        )}
      </Panel>

      <Panel title="Test the change">
        <CodeBlock code={fix.test_command} label="command" />
        <p>Expected: <span className={styles.mono}>{fix.expected}</span></p>
      </Panel>

      <Button onClick={() => navigate(`/analyses/${analysisId}/compare`)}>Verify fix</Button>
    </div>
  );
}

export default function FixCenterPage() {
  usePageTitle("Fix Center");
  const { analysisId } = useParams();
  const { data: findings, error, loading, reload } = useApiData(`/analyses/${analysisId}/findings`);
  const [picked, setPicked] = useState(null);

  if (loading) return <p>Loading findings…</p>;
  if (error) return <ErrorState message={error.message} onRetry={reload} />;
  if (!findings?.length) {
    return <EmptyState title="Nothing to fix" message="No security findings detected. Review session and posture data for additional context." />;
  }

  const active = picked ?? findings[0].id;

  return (
    <div className={styles.layout}>
      <ul className={styles.list}>
        {findings.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              className={f.id === active ? styles.itemActive : styles.item}
              onClick={() => setPicked(f.id)}
            >
              <SeverityBadge level={f.severity} />
              <strong>{f.title}</strong>
              <span>{f.server} · {f.server_software} · {f.affected_sessions} sessions</span>
            </button>
          </li>
        ))}
      </ul>
      <Remediation key={active} findingId={active} analysisId={analysisId} />
    </div>
  );
}
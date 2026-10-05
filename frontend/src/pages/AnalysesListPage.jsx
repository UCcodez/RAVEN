import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listAnalyses } from "../api/client";
import StatusBadge from "../components/ui/StatusBadge";

export default function AnalysesListPage() {
  const [analyses, setAnalyses] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    listAnalyses().then(setAnalyses).catch((err) => setError(err.message));
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>Analyses</h1>
      <p><Link to="/">+ New analysis</Link></p>

      {error && <p style={{ color: "#dc2626" }}>{error}</p>}
      {!analyses && !error && <p>Loading...</p>}
      {analyses && analyses.length === 0 && <p>No analyses yet — upload a PCAP to get started.</p>}

      {analyses && analyses.length > 0 && (
        <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
              <th>File</th>
              <th>Format</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {analyses.map((a) => (
              <tr key={a.analysis_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                <td><Link to={`/analyses/${a.analysis_id}`}>{a.file_name}</Link></td>
                <td>{a.capture_format}</td>
                <td><StatusBadge status={a.status} /></td>
                <td>{new Date(a.created_at).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

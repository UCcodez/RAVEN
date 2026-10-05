import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  getAnalysis,
  getFindings,
  getPosture,
  getRecommendations,
  getSessions,
} from "../api/client";
import SeverityBadge from "../components/ui/SeverityBadge";
import StatusBadge from "../components/ui/StatusBadge";

export default function AnalysisPage() {
  const { analysisId } = useParams();
  const [analysis, setAnalysis] = useState(null);
  const [sessions, setSessions] = useState(null);
  const [findings, setFindings] = useState(null);
  
  const [posture, setPosture] = useState(null);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    getAnalysis(analysisId).then(setAnalysis).catch((err) => setError(err.message));
    getSessions(analysisId).then(setSessions).catch((err) => setError(err.message));
    getFindings(analysisId).then(setFindings).catch((err) => setError(err.message));

    getPosture(analysisId)
      .then(setPosture)
      .catch((err) => setPosture(err.notImplemented ? "unavailable" : "error"));

    getRecommendations(analysisId)
      .then(setRecommendations)
      .catch((err) => setRecommendations(err.notImplemented ? "unavailable" : "error"));
  }, [analysisId]);

  if (error) return <p style={{ padding: "2rem", color: "#dc2626" }}>{error}</p>;
  if (!analysis) return <p style={{ padding: "2rem" }}>Loading...</p>;

  // Group findings 
  const findingsBySession = {};
  (findings ?? []).forEach((f) => {
    (findingsBySession[f.session_id] ??= []).push(f);
  });

  return (
    <div style={{ maxWidth: 900, margin: "2rem auto", padding: "0 1rem" }}>
      <h1>{analysis.file_name}</h1>
      <p>
        <StatusBadge status={analysis.status} />
        {" "}
        {sessions ? `${sessions.length} session(s) found` : "..."}
      </p>
      {analysis.failure_reason && (
        <p style={{ color: "#dc2626" }}>Note: {analysis.failure_reason}</p>
      )}

      {/* Posture summary  */}
      <section style={{ margin: "1.5rem 0" }}>
        <h2>Security Posture</h2>
        {posture === null && <p>Loading...</p>}
        {posture === "unavailable" && (
          <p style={{ color: "#64748b" }}>
            Posture scoring isn't available yet — this layer of the pipeline hasn't been built.
          </p>
        )}
        {posture === "error" && <p style={{ color: "#dc2626" }}>Couldn't load posture.</p>}
        {posture && typeof posture === "object" && (
          <div style={{ display: "flex", gap: "2rem" }}>
            <Stat label="Overall score" value={posture.overall_score} />
            <Stat label="Risk band" value={posture.risk_band} />
            <Stat label="Secure sessions" value={posture.secure_sessions} />
            <Stat label="At-risk sessions" value={posture.at_risk_sessions} />
            <Stat label="Critical findings" value={posture.critical_findings} />
          </div>
        )}
      </section>

      {/* Sessions */}
      <section style={{ margin: "1.5rem 0" }}>
        <h2>Sessions</h2>
        {!sessions && <p>Loading...</p>}
        {sessions && sessions.length === 0 && <p>No sessions identified.</p>}
        {sessions && sessions.length > 0 && (
          <table width="100%" cellPadding={8} style={{ borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>
                <th>Protocol</th>
                <th>Client → Server</th>
                <th>Encryption</th>
                <th>Findings</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => {
                const sessionFindings = findingsBySession[s.session_id] ?? [];
                return (
                  <tr key={s.session_id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td>{s.protocol}</td>
                    <td>
                      {s.client.ip}:{s.client.port} → {s.server.ip}:{s.server.port}
                    </td>
                    <td>{s.encryption_state}</td>
                    <td>
                      {sessionFindings.length === 0 ? (
                        "None"
                      ) : (
                        sessionFindings.map((f) => (
                          <div key={f.finding_id} style={{ marginBottom: 4 }}>
                            <SeverityBadge severity={f.severity} /> {f.title}
                          </div>
                        ))
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      {/* Findings detail   */}
      <section style={{ margin: "1.5rem 0" }}>
        <h2>Findings detail</h2>
        {!findings && <p>Loading...</p>}
        {findings && findings.length === 0 && <p>No weaknesses detected.</p>}
        {findings &&
          findings.map((f) => (
            <div
              key={f.finding_id}
              style={{ borderLeft: "4px solid #cbd5e1", padding: "0.5rem 1rem", marginBottom: 8 }}
            >
              <div>
                <SeverityBadge severity={f.severity} /> <strong>{f.title}</strong>{" "}
                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>({f.rule_id})</span>
              </div>
              <div style={{ fontSize: "0.9rem", color: "#475569" }}>{f.category}</div>
              <div><em>Recommendation:</em> {f.recommendation}</div>
              {f.standard_reference && (
                <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Ref: {f.standard_reference}</div>
              )}
            </div>
          ))}
      </section>

      {/* Recommendations  */}
      <section style={{ margin: "1.5rem 0" }}>
        <h2>Recommendations</h2>
        {recommendations === "unavailable" && (
          <p style={{ color: "#64748b" }}>
            The dedicated recommendation engine isn't available yet — see the "Recommendation" text
            on each finding above in the meantime.
          </p>
        )}
        {recommendations === "error" && <p style={{ color: "#dc2626" }}>Couldn't load recommendations.</p>}
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: "1.5rem", fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>{label}</div>
    </div>
  );
}

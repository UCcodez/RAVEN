import { Link, useParams } from "react-router-dom";

const linkStyle = {
  padding: "8px 16px",
  border: "1px solid var(--border)",
  borderRadius: 6,
  background: "var(--surface-raised)",
  color: "var(--text-primary)",
  textDecoration: "none",
  fontWeight: 600,
};

export default function PageActions() {
  const { analysisId } = useParams();
  const base = `/analyses/${analysisId}`;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", margin: "16px 0" }}>
      <Link to={`${base}/fix-center`} style={linkStyle}>Open Fix Center</Link>
      <Link to={`${base}/evidence`} style={linkStyle}>Evidence and custody</Link>
    </div>
  );
}

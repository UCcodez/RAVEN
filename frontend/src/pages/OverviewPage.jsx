import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Diamond, Info, ShieldCheck, ShieldSlash, ShieldWarning, Warning } from "@phosphor-icons/react";
import Panel from "../components/ui/Panel";
import SeverityBadge from "../components/ui/SeverityBadge";
import DistributionBars from "../components/ui/DistributionBars";
import EmptyState from "../components/ui/EmptyState";
import ErrorState from "../components/ui/ErrorState";
import useOverview from "../hooks/useOverview";
import usePageTitle from "../hooks/usePageTitle";
import styles from "./OverviewPage.module.css";

 
// Helpers

function bandFor(score) {
  if (score >= 90) return "Strong";
  if (score >= 75) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Weak";
  return "Critical";
}

const BAND_STYLE = {
  Strong: { Icon: ShieldCheck, tone: "success" },
  Good: { Icon: ShieldCheck, tone: "success" },
  Fair: { Icon: ShieldWarning, tone: "medium" },
  Weak: { Icon: ShieldWarning, tone: "high" },
  Critical: { Icon: ShieldSlash, tone: "critical" },
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low", "info", "clean"];
const TLS_ORDER = ["TLS 1.3", "TLS 1.2", "TLS 1.1", "TLS 1.0", "None observed"];

const CERT_LABELS = {
  valid: "Valid",
  unknown: "Unknown (not observed)",
  not_observable: "Not observable (encrypted in TLS 1.3)",
};

const FS_LABELS = {
  pfs: "Forward secrecy used",
  no_pfs: "No forward secrecy",
  not_applicable: "Not applicable (no TLS observed)",
};

function prettify(key) {
  const text = key.replace(/_/g, " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function severityItems(dist = {}) {
  return SEVERITY_ORDER.filter((k) => k in dist).map((k) => ({
    key: k,
    label: <SeverityBadge level={k} />,
    value: dist[k],
    tone: k === "clean" ? "success" : k,
  }));
}

function protocolItems(dist = {}) {
  return Object.entries(dist)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => ({ key: k, label: k, value: v }));
}

function tlsItems(dist = {}) {
  const rank = (k) => (TLS_ORDER.includes(k) ? TLS_ORDER.indexOf(k) : TLS_ORDER.length);
  return Object.entries(dist)
    .sort((a, b) => rank(a[0]) - rank(b[0]))
    .map(([k, v]) => ({ key: k, label: k, value: v }));
}

function labelledItems(dist = {}, labels) {
  return Object.entries(dist).map(([k, v]) => ({ key: k, label: labels[k] ?? prettify(k), value: v }));
}

function sortFindings(groups) {
  const rank = (s) => {
    const i = SEVERITY_ORDER.indexOf(String(s).toLowerCase());
    return i === -1 ? SEVERITY_ORDER.length : i;
  };
  return [...groups].sort((a, b) => rank(a.severity) - rank(b.severity));
}

function plural(n, one, many) {
  return `${n} ${n === 1 ? one : many}`;
}

function summaryText(posture, groups, sessionTotal) {
  const score = posture.score;
  const band = posture.band ?? bandFor(score);
  if (groups.length === 0) {
    return `Posture score ${score} out of 100 (${band}). No security findings detected. Review session and posture data for additional context.`;
  }
  const affected = new Set(groups.flatMap((g) => g.session_ids ?? [])).size;
  const critical = groups.filter((g) => String(g.severity).toLowerCase() === "critical").length;
  const tail = critical > 0 ? `, including ${critical} critical` : "";
  return `Posture score ${score} out of 100 (${band}). ${plural(groups.length, "root-cause finding", "root-cause findings")} affect ${affected} of ${sessionTotal} sessions${tail}.`;
}

 
// Small pieces
 

function SubScoreRow({ label, score }) {
  const band = bandFor(score);
  return (
    <li className={styles.subRow}>
      <span>{label}</span>
      <span className={styles.subTrack} aria-hidden="true">
        <span className={styles.subFill} style={{ width: `${score}%` }} />
      </span>
      <span className={styles.subValue}>
        {score} / 100 <span className={styles.muted}>{band}</span>
      </span>
    </li>
  );
}

function Kpi({ label, value, hint, alert = false }) {
  return (
    <div className={styles.kpi}>
      <dt className={styles.kpiLabel}>{label}</dt>
      <dd className={`${styles.kpiValue} ${alert ? styles.tone_critical : ""}`}>
        {alert && <Diamond size={20} weight="fill" aria-hidden="true" />}
        {value}
      </dd>
      {hint && <dd className={styles.kpiHint}>{hint}</dd>}
    </div>
  );
}

function ViewToggle({ mode, onChange }) {
  return (
    <div className={styles.toggle} role="group" aria-label="Overview detail level">
      {[
        ["executive", "Executive"],
        ["analyst", "Analyst"],
      ].map(([key, label]) => (
        <button
          key={key}
          type="button"
          className={styles.toggleBtn}
          aria-pressed={mode === key}
          onClick={() => onChange(key)}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

// page

export default function OverviewPage() {
  const { analysisId } = useParams();
  const [mode, setMode] = useState("executive");
  const { status, data, error, retry } = useOverview(analysisId);
  usePageTitle("Overview");

  const analysis = data?.analysis;
  const showToggle = status === "ready" && analysis?.status === "completed";

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Overview</h1>
          {analysis && (
            <p className={styles.meta}>
              <span className={styles.mono}>{analysis.filename}</span>
              {" · "}
              {analysis.id}
            </p>
          )}
        </div>
        {showToggle && <ViewToggle mode={mode} onChange={setMode} />}
      </header>

      {status === "loading" && (
        <p className={styles.muted} role="status">
          Loading overview…
        </p>
      )}

      {status === "unavailable" && (
        <EmptyState
          title="Overview is not available yet"
          message="The backend does not provide overview data yet. Set VITE_USE_MOCKS=true in frontend/.env.development to preview it with mock data."
        />
      )}

      {status === "error" && (
        <ErrorState
          title="Could not load the overview"
          message={error?.message || "The request failed."}
          onRetry={retry}
        />
      )}

      {status === "ready" && <OverviewBody data={data} mode={mode} analysisId={analysisId} />}
    </div>
  );
}

function OverviewBody({ data, mode, analysisId }) {
  const { analysis, posture } = data;
  const groups = sortFindings(data.findings ?? []);

  if (analysis.status === "failed") {
    return (
      <ErrorState
        title="This analysis failed"
        message="No overview can be shown. Upload the capture again or check the backend log."
      />
    );
  }
  if (analysis.status !== "completed") {
    return (
      <EmptyState
        title="Analysis is not finished"
        message={`Current status: ${analysis.status}. The overview appears when the analysis completes.`}
      />
    );
  }

  const counts = analysis.counts ?? {};
  const kpis = posture.kpis ?? {};
  const dist = posture.distributions ?? {};
  const sessionTotal = kpis.sessions ?? counts.sessions ?? 0;

  if (sessionTotal === 0) {
    return (
      <EmptyState
        title="No email sessions found"
        message="The capture was analysed but no SMTP, IMAP or POP3 sessions were reconstructed. Check that the capture contains mail traffic."
      />
    );
  }

  const band = posture.band ?? bandFor(posture.score);
  const { Icon: BandIcon, tone } = BAND_STYLE[band] ?? BAND_STYLE.Weak;
  const subScores = Object.entries(posture.sub_scores ?? {});
  const unreconstructed = counts.unreconstructed_streams ?? 0;

  const fs = dist.forward_secrecy ?? {};
  const fsApplicable = (fs.pfs ?? 0) + (fs.no_pfs ?? 0);
  const fsPct = fsApplicable > 0 ? Math.round(((fs.pfs ?? 0) / fsApplicable) * 100) : null;
  const exposure = posture.retroactive_decryption_exposure ?? 0;

  return (
    <>
      {posture.regression && (
        <div className={styles.banner} role="alert">
          <Warning size={20} weight="fill" aria-hidden="true" />
          <p>
            Posture dropped compared with the previous capture
            {posture.previous_score != null && ` (${posture.previous_score} to ${posture.score})`}.
            {posture.previous_analysis_id && (
              <>
                {" "}
                <Link to={`/analyses/${posture.previous_analysis_id}/overview`}>Open the previous overview</Link>
              </>
            )}
          </p>
        </div>
      )}

      {unreconstructed > 0 && (
        <div className={styles.notice} role="status">
          <Info size={20} weight="fill" aria-hidden="true" />
          <p>
            {unreconstructed} of {counts.streams} streams could not be reconstructed. The figures below cover the
            remaining sessions only.
          </p>
        </div>
      )}

      <div className={styles.top}>
        <Panel title="Posture score">
          <div className={styles.scoreBlock}>
            <p className={styles.score}>
              {posture.score}
              <span className={styles.outOf}> / 100</span>
            </p>
            <p className={`${styles.band} ${styles[`tone_${tone}`]}`}>
              <BandIcon size={20} weight="fill" aria-hidden="true" />
              {band}
            </p>
            <p className={styles.muted}>{posture.band_note ?? "Presentation band, not a certified rating"}</p>
          </div>
        </Panel>

        <div className={styles.rightCol}>
          <dl className={styles.kpis}>
            <Kpi label="Sessions analysed" value={kpis.sessions ?? sessionTotal} />
            <Kpi
              label="Findings"
              value={kpis.findings ?? groups.length}
              hint="Grouped by root cause"
            />
            <Kpi label="Critical findings" value={kpis.critical ?? 0} alert={(kpis.critical ?? 0) > 0} />
            <Kpi
              label="Encryption observed"
              value={kpis.encrypted_pct != null ? `${kpis.encrypted_pct}%` : "n/a"}
              hint="Sessions with a TLS handshake seen"
            />
          </dl>

          <Panel title="Summary">
            <p className={styles.summary}>{summaryText(posture, groups, sessionTotal)}</p>
            {exposure > 0 && (
              <p className={styles.summary}>
                {plural(exposure, "session", "sessions")} without forward secrecy could be decrypted later if the
                server key leaks.
              </p>
            )}
          </Panel>
        </div>
      </div>

      <Panel
        title="Findings to fix first"
        actions={
          <Link className={styles.link} to={`/analyses/${analysisId}`}>
            Open sessions and findings
          </Link>
        }
      >
        {groups.length === 0 ? (
          <p className={styles.muted}>
            No security findings detected. Review session and posture data for additional context.
          </p>
        ) : (
          <ul className={styles.findings}>
            {groups.map((g) => (
              <li key={g.id} className={styles.finding}>
                <div className={styles.findingHead}>
                  <SeverityBadge level={g.severity} />
                  <span className={styles.findingTitle}>{g.title}</span>
                </div>
                <p className={styles.findingMeta}>
                  <span className={styles.mono}>
                    {g.server}:{g.port}
                  </span>
                  {" · "}
                  {g.protocol}
                  {" · "}
                  {plural(g.affected_sessions, "session", "sessions")}
                  {" · "}
                  Confidence {Math.round(g.confidence * 100)}%
                  {g.attribution && ` · ${g.attribution}`}
                </p>
                {g.why_it_matters && <p className={styles.findingWhy}>{g.why_it_matters}</p>}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {mode === "analyst" && (
        <>
          <Panel title="Sub-scores">
            <ul className={styles.subList} aria-label="Posture sub-scores">
              {subScores.map(([label, score]) => (
                <SubScoreRow key={label} label={label} score={score} />
              ))}
            </ul>
            <p className={`${styles.muted} ${styles.note}`}>Higher is better. Bands are presentation bands only.</p>
          </Panel>

          <div className={styles.grid}>
            <Panel title="Sessions by worst severity">
              <DistributionBars label="Sessions by worst severity" items={severityItems(dist.severity)} />
            </Panel>
            <Panel title="Protocols">
              <DistributionBars label="Sessions by protocol" items={protocolItems(dist.protocol)} />
            </Panel>
            <Panel title="TLS versions">
              <DistributionBars label="Sessions by TLS version" items={tlsItems(dist.tls_version)} />
            </Panel>
            <Panel title="Certificate health">
              <DistributionBars
                label="Sessions by certificate status"
                items={labelledItems(dist.cert_health, CERT_LABELS)}
              />
              <p className={`${styles.muted} ${styles.note}`}>
                Unknown and not observable are never counted as safe.
              </p>
            </Panel>
            <Panel title="Forward secrecy coverage">
              <DistributionBars label="Sessions by forward secrecy" items={labelledItems(fs, FS_LABELS)} />
              <p className={`${styles.muted} ${styles.note}`}>
                {fsPct != null
                  ? `Forward secrecy on ${fs.pfs ?? 0} of ${fsApplicable} sessions where it applies (${fsPct}%).`
                  : "No TLS sessions where forward secrecy applies."}
              </p>
            </Panel>
            <Panel title="Capture">
              <dl className={styles.facts}>
                <dt>Packets</dt>
                <dd>{counts.packets ?? "n/a"}</dd>
                <dt>Streams</dt>
                <dd>{counts.streams ?? "n/a"}</dd>
                <dt>Sessions</dt>
                <dd>{counts.sessions ?? "n/a"}</dd>
                <dt>Not reconstructed</dt>
                <dd>{unreconstructed}</dd>
                <dt>Analysis time</dt>
                <dd>{analysis.elapsed_ms != null ? `${(analysis.elapsed_ms / 1000).toFixed(1)} s` : "n/a"}</dd>
              </dl>
            </Panel>
          </div>
        </>
      )}
    </>
  );
}
import { useState } from "react";
import { useParams } from "react-router-dom";
import { ShieldCheck, ShieldWarning } from "@phosphor-icons/react";
import Button from "../components/ui/Button";
import Panel from "../components/ui/Panel";
import HashRow from "../components/ui/HashRow";
import usePageTitle from "../hooks/usePageTitle";
import { useEvidence } from "../hooks/useEvidence";

export default function EvidencePage() {
  usePageTitle("Evidence and Custody");
  const { analysisId } = useParams();
  const { data, error, loading, verify, proof } = useEvidence(analysisId);
  const [result, setResult] = useState(null);
  const [pf, setPf] = useState(null);

  if (loading) return <p>Loading evidence…</p>;
  if (error || !data) return <p role="alert">Could not load evidence for this analysis.</p>;

  const status = Object.fromEntries((result?.entries ?? []).map((e) => [e.seq, e.status]));
  const mid = data.entries[Math.floor(data.entries.length / 2)]?.seq;
  const bad = result?.entries.find((e) => e.status !== "ok");
  const sig = data.signature;

  return (
    <>
      <h1>Evidence and Custody</h1>
      <p>Proves integrity and custody of the evidence, not that the analysis is correct.</p>

      <Panel>
        <h2>Hashes</h2>
        <HashRow label="PCAP SHA-256" hash={data.pcap_sha256 ?? "not recorded"} />
        <HashRow label="Merkle root" hash={data.merkle_root} />
        <p>
          {sig ? (sig.valid ? <ShieldCheck weight="fill" aria-hidden="true" /> : <ShieldWarning weight="fill" aria-hidden="true" />) : null}{" "}
          {sig ? `Report signature ${sig.valid ? "valid" : "INVALID"} (Ed25519, key ${sig.public_key.slice(0, 16)}…)` : "Report not signed yet"}
        </p>
      </Panel>

      <Panel>
        <h2>Custody ledger</h2>
        {data.entries.map((e) => (
          <HashRow key={e.seq} label={`#${e.seq} ${e.event}`} hash={e.entry_hash} status={status[e.seq]} />
        ))}
        <Button onClick={() => verify().then(setResult)}>Verify Evidence</Button>
        <Button disabled={mid == null} onClick={() => verify(mid).then(setResult)}>Run tamper test</Button>
        {result && (
          <p role="status">
            {result.valid
              ? "Ledger intact: every entry matches its hash and link."
              : `Chain break at entry #${bad.seq}${result.simulated ? " (simulation: one byte changed in memory, stored evidence untouched)" : ""}.`}
          </p>
        )}
      </Panel>

      <Panel>
        <h2>Finding inclusion proof</h2>
        <label>
          Finding{" "}
          <select defaultValue="" onChange={(e) => e.target.value && proof(e.target.value).then(setPf)}>
            <option value="" disabled>Select</option>
            {data.finding_ids.map((id) => <option key={id}>{id}</option>)}
          </select>
        </label>
        {pf && (
          <>
            <HashRow label="Leaf" hash={pf.leaf} status={pf.valid ? "ok" : "tampered"} />
            <HashRow label="Root" hash={pf.root} />
            <p>{pf.path.length} hashes link this finding to the root.</p>
          </>
        )}
      </Panel>
    </>
  );
}
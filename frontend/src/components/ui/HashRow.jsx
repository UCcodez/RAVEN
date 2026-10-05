import { CheckCircle, XCircle, LinkBreak, Copy } from "@phosphor-icons/react";
import s from "./HashRow.module.css";

const META = {
  ok: [CheckCircle, "Verified"],
  tampered: [XCircle, "Tampered"],
  broken_link: [LinkBreak, "Chain broken"],
};

export default function HashRow({ label, hash, status }) {
  const m = META[status];
  const Icon = m?.[0];
  return (
    <div className={`${s.row} ${status ? s[status] : ""}`}>
      <span className={s.label}>{label}</span>
      <code className={s.hash}>{hash}</code>
      {m && <span className={s.status}><Icon weight="fill" aria-hidden="true" /> {m[1]}</span>}
      <button type="button" className={s.copy} aria-label={`Copy ${label}`}
        onClick={() => navigator.clipboard.writeText(hash)}>
        <Copy weight="fill" aria-hidden="true" />
      </button>
    </div>
  );
}
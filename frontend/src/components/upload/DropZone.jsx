import { useRef, useState } from "react";
import { FileArrowUp, LockKey } from "@phosphor-icons/react";
import Button from "../ui/Button";
import styles from "./DropZone.module.css";

const MAX_MB = 250;
const ACCEPT = [".pcap", ".pcapng"];

function validate(file) {
  const name = file.name.toLowerCase();
  if (!ACCEPT.some((ext) => name.endsWith(ext))) return "Unsupported file type. Use a .pcap or .pcapng capture.";
  if (file.size === 0) return "This file is empty.";
  if (file.size > MAX_MB * 1024 * 1024) return `This file is larger than ${MAX_MB} MB.`;
  return null;
}

export default function DropZone({ onFile, busy = false, error = "" }) {
  const inputRef = useRef(null);
  const [over, setOver] = useState(false);
  const [localError, setLocalError] = useState("");

  function pick(file) {
    if (!file || busy) return;
    const problem = validate(file);
    setLocalError(problem ?? "");
    if (!problem) onFile(file);
  }

  const message = localError || error;

  return (
    <div
      className={`${styles.zone} ${over ? styles.over : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); pick(e.dataTransfer.files?.[0]); }}
    >
      <FileArrowUp size={32} weight="fill" className={styles.icon} aria-hidden="true" />
      <p className={styles.prompt}>
        {busy ? "Uploading capture..." : "Drop a .pcap or .pcapng file here"}
      </p>
      <Button variant="primary" onClick={() => inputRef.current?.click()} disabled={busy}>
        Browse files
      </Button>
      <input
        ref={inputRef}
        type="file"
        accept=".pcap,.pcapng"
        hidden
        onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }}
      />
      <p className={styles.limits}>ACCEPTED: .pcap .pcapng &nbsp; MAX: {MAX_MB} MB</p>
      {message && <p className={styles.error} role="alert">{message}</p>}
      <div className={styles.privacy}>
        <LockKey size={14} weight="fill" aria-hidden="true" />
        No message body content is read or stored. Analysis is passive and runs locally.
      </div>
    </div>
  );
}
import { useState } from "react";
import { Copy, Check } from "@phosphor-icons/react";
import styles from "./CodeBlock.module.css";

export default function CodeBlock({ code, label }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={styles.block}>
      <div className={styles.bar}>
        <span>{label}</span>
        <button type="button" onClick={copy} className={styles.copy}>
          {copied ? <Check weight="fill" /> : <Copy weight="fill" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className={styles.code}>{code}</pre>
    </div>
  );
}
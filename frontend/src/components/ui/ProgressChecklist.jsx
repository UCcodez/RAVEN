import { CheckCircle, CircleNotch, XCircle, Circle } from "@phosphor-icons/react";
import styles from "./ProgressChecklist.module.css";

const ICONS = { done: CheckCircle, running: CircleNotch, failed: XCircle, pending: Circle };
const LABELS = { done: "Done", running: "In progress", failed: "Failed", pending: "Waiting" };

export default function ProgressChecklist({ stages }) {
  return (
    <ol className={styles.list} aria-label="Analysis stages">
      {stages.map((s) => {
        const Icon = ICONS[s.state] ?? Circle;
        return (
          <li key={s.key} className={`${styles.item} ${styles[s.state]}`} aria-current={s.state === "running" ? "step" : undefined}>
            <Icon weight="fill" size={20} className={s.state === "running" ? styles.spin : undefined} aria-hidden="true" />
            <span className={styles.label}>{s.label}</span>
            <span className={styles.status}>{LABELS[s.state] ?? "Waiting"}</span>
            {s.detail ? <span className={styles.detail}>{s.detail}</span> : null}
          </li>
        );
      })}
    </ol>
  );
}
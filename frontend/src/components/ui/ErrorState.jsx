import { WarningOctagon } from "@phosphor-icons/react";
import styles from "./States.module.css";

export default function ErrorState({ title = "Could not load this page", message, onRetry }) {
  return (
    <div className={`${styles.block} ${styles.error}`} role="alert">
      <div className={styles.head}>
        <WarningOctagon size={20} weight="fill" aria-hidden="true" />
        <h2 className={styles.title}>{title}</h2>
      </div>
      {message && <p className={styles.message}>{message}</p>}
      {onRetry && (
        <button type="button" className={styles.action} onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
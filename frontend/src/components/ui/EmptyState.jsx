import { Tray } from "@phosphor-icons/react";
import styles from "./States.module.css";

export default function EmptyState({ title, message, children }) {
  return (
    <div className={styles.block} role="status">
      <div className={styles.head}>
        <Tray size={20} weight="fill" aria-hidden="true" />
        <h2 className={styles.title}>{title}</h2>
      </div>
      {message && <p className={styles.message}>{message}</p>}
      {children}
    </div>
  );
}
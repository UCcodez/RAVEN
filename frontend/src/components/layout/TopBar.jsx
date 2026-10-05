import ThemeToggle from "../ui/ThemeToggle";
import styles from "./TopBar.module.css";

export default function TopBar({ theme, onThemeChange }) {
  return (
    <header className={styles.bar}>
      <div className={styles.context}>
        <span className={styles.label}>Analysis</span>
        <span className={styles.value}>none loaded</span>
      </div>
      <div className={styles.right}>
        <span className={styles.status}>
          <span className={styles.dot} aria-hidden="true" />
          Idle
        </span>
        <ThemeToggle theme={theme} onChange={onThemeChange} />
      </div>
    </header>
  );
}
import { List } from "@phosphor-icons/react";
import ThemeToggle from "../ui/ThemeToggle";
import styles from "./TopBar.module.css";

export default function TopBar({ theme, onThemeChange, onMenu, menuOpen }) {
  return (
    <header className={styles.bar}>
      <div className={styles.context}>
        <button
          type="button"
          className={styles.menuBtn}
          onClick={onMenu}
          aria-label="Open navigation"
          aria-controls="sidebar"
          aria-expanded={menuOpen}
        >
          <List size={24} weight="fill" aria-hidden="true" />
        </button>
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
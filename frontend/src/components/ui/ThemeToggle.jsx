import { Moon, Sun } from "@phosphor-icons/react";
import styles from "./ThemeToggle.module.css";

export default function ThemeToggle({ theme, onChange }) {
  return (
    <div className={styles.group} role="group" aria-label="Colour theme">
      <button
        className={styles.opt}
        aria-pressed={theme === "dark"}
        aria-label="Dark theme"
        onClick={() => onChange("dark")}
      >
        <Moon size={16} weight="fill" />
      </button>
      <button
        className={styles.opt}
        aria-pressed={theme === "light"}
        aria-label="Light theme"
        onClick={() => onChange("light")}
      >
        <Sun size={16} weight="fill" />
      </button>
    </div>
  );
}
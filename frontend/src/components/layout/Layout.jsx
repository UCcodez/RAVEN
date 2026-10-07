import { useState, useCallback } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { useTheme } from "../../hooks/useTheme";
import { APP } from "../../config";
import styles from "./Layout.module.css";

export default function Layout() {
  const [theme, setTheme] = useTheme();
  const [navOpen, setNavOpen] = useState(false);
  const closeNav = useCallback(() => setNavOpen(false), []);

  return (
    <div className={styles.shell}>
      <Sidebar theme={theme} open={navOpen} onClose={closeNav} />
      {navOpen && <div className={styles.backdrop} onClick={closeNav} aria-hidden="true" />}
      <TopBar
        theme={theme}
        onThemeChange={setTheme}
        onMenu={() => setNavOpen(true)}
        menuOpen={navOpen}
      />
      <main className={styles.main}>
        <Outlet />
      </main>
      <footer className={styles.footer}>
        <span>PARSER {APP.parser}</span>
        <span>RULE SET {APP.ruleSet}</span>
        <span>{APP.mode}</span>
        <span className={styles.spacer} />
        <span>RAVEN</span>
      </footer>
    </div>
  );
}
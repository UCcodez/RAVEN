import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { NAV_MAIN, NAV_TOOLS } from "./navItems";
import styles from "./Sidebar.module.css";
import darkLogo from "../../assets/raven.png";
import lightLogo from "../../assets/light-raven.png";

function Item({ item }) {
  const { label, to, icon: Icon, ready } = item;
  const content = (
    <>
      <Icon size={16} weight="fill" aria-hidden="true" />
      {label}
    </>
  );

  if (!ready) {
    return (
      <span className={`${styles.item} ${styles.disabled}`} aria-disabled="true">
        {content}
      </span>
    );
  }
  return (
    <NavLink
      to={to}
      end
      className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ""}`}
    >
      {content}
    </NavLink>
  );
}

export default function Sidebar({ theme, open, onClose }) {
  const { pathname } = useLocation();

  useEffect(() => { onClose(); }, [pathname, onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <aside id="sidebar" className={`${styles.sidebar} ${open ? styles.open : ""}`}>
      <div className={styles.brand}>
        <img src={theme === "dark" ? lightLogo : darkLogo} alt="RAVEN" />
        <span className={styles.fullForm}>
          Rapid Analysis &amp; Verification of Email Networks
        </span>
      </div>
      <nav aria-label="Primary" className={styles.nav}>
        {NAV_MAIN.map((i) => <Item key={i.label} item={i} />)}
        <div className={styles.divider} />
        {NAV_TOOLS.map((i) => <Item key={i.label} item={i} />)}
      </nav>
    </aside>
  );
}
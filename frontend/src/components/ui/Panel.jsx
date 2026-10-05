import styles from "./Panel.module.css";

export default function Panel({ title, actions, children, padded = true }) {
  return (
    <section className={styles.panel}>
      {(title || actions) && (
        <header className={styles.header}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {actions}
        </header>
      )}
      <div className={padded ? styles.body : undefined}>{children}</div>
    </section>
  );
}
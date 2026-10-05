import styles from "./DistributionBars.module.css";

 
export default function DistributionBars({ items, label }) {
  const total = items.reduce((n, i) => n + i.value, 0);
  if (total === 0) return <p className={styles.empty}>No data</p>;

  return (
    <ul className={styles.list} aria-label={label}>
      {items.map((i) => {
        const pct = Math.round((i.value / total) * 100);
        return (
          <li key={i.key} className={styles.row}>
            <span>{i.label}</span>
            <span className={styles.track} aria-hidden="true">
              <span
                className={`${styles.fill} ${i.tone ? styles[`tone_${i.tone}`] : ""}`}
                style={{ width: `${pct}%` }}
              />
            </span>
            <span className={styles.value}>
              {i.value} <span className={styles.pct}>({pct}%)</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
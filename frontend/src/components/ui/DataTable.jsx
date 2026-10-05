import { useMemo, useState } from "react";
import { CaretUp, CaretDown } from "@phosphor-icons/react";
import styles from "./DataTable.module.css";

export default function DataTable({ columns, rows, rowKey, empty = "No data" }) {
  const [sort, setSort] = useState(null); // { key, dir }

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const col = columns.find((c) => c.key === sort.key);
    const val = col?.sortValue ?? ((r) => r[sort.key]);
    return [...rows].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (x == null) return 1;
      if (y == null) return -1;
      const c = x < y ? -1 : x > y ? 1 : 0;
      return sort.dir === "asc" ? c : -c;
    });
  }, [rows, sort, columns]);

  function toggle(key) {
    setSort((s) => (s?.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" }));
  }

  if (rows.length === 0) return <p className={styles.empty}>{empty}</p>;

  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key;
              return (
                <th
                  key={c.key}
                  className={styles.th}
                  scope="col"
                  aria-sort={active ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                >
                  {c.sortable ? (
                    <button className={styles.sortBtn} onClick={() => toggle(c.key)}>
                      {c.label}
                      {active && (sort.dir === "asc"
                        ? <CaretUp size={10} weight="fill" aria-hidden="true" />
                        : <CaretDown size={10} weight="fill" aria-hidden="true" />)}
                    </button>
                  ) : c.label}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={rowKey(r)} className={styles.tr}>
              {columns.map((c) => (
                <td key={c.key} className={`${styles.td} ${c.mono ? styles.mono : ""}`}>
                  {c.render ? c.render(r) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
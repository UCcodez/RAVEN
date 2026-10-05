import styles from "./SeverityBadge.module.css";

import {
  Diamond,
  Warning,
  WarningCircle,
  MinusCircle,
  Info,
  CheckCircle,
} from "@phosphor-icons/react";

const MAP = {
  critical: { label: "Critical", Icon: Diamond },
  high: { label: "High", Icon: Warning },
  medium: { label: "Medium", Icon: WarningCircle },
  low: { label: "Low", Icon: MinusCircle },
  info: { label: "Info", Icon: Info },
  clean: { label: "Clean", Icon: CheckCircle },
};

export default function SeverityBadge({ level }) {
  const key = String(level ?? "info").toLowerCase();
  const { label, Icon } = MAP[key] ?? MAP.info;

  return (
    <span className={`${styles.badge} ${styles[key] ?? styles.info}`}>
      <Icon
        size={14}
        weight="fill"
        aria-hidden="true"
      />
      {label}
    </span>
  );
}
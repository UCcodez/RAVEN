 
const COLORS = {
  queued: "#6b7280",
  processing: "#2563eb",
  completed: "#16a34a",
  failed: "#dc2626",
  partial: "#ca8a04",
};

export default function StatusBadge({ status }) {
  const color = COLORS[status] ?? "#6b7280";
  return (
    <span
      style={{
        backgroundColor: color,
        color: "white",
        padding: "2px 10px",
        borderRadius: "999px",
        fontSize: "0.8rem",
        fontWeight: 600,
        textTransform: "uppercase",
      }}
    >
      {status}
    </span>
  );
}

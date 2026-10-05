import {
  House, ListBullets, Warning, LockKey, Certificate, Clock,
  SquaresFour, ShareNetwork, FileText, Flask, GearSix,
} from "@phosphor-icons/react";

ready: true 


export const NAV_MAIN = [
  { label: "Overview", to: "/", icon: House, ready: true },
  { label: "Sessions", to: "/sessions", icon: ListBullets },
  { label: "Findings", to: "/findings", icon: Warning },
  { label: "TLS / Crypto", to: "/tls", icon: LockKey },
  { label: "Certificates", to: "/certificates", icon: Certificate },
  { label: "Timeline", to: "/timeline", icon: Clock },
  { label: "Heatmap", to: "/heatmap", icon: SquaresFour },
  { label: "Topology", to: "/topology", icon: ShareNetwork },
];

export const NAV_TOOLS = [
  { label: "Reports", to: "/reports", icon: FileText },
  { label: "Security Lab", to: "/lab", icon: Flask },
  { label: "Settings", to: "/settings", icon: GearSix },
];
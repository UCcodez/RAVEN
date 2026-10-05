export const SCENARIOS = [
  { id: "clean-baseline", name: "Clean Baseline", description: "Strong TLS 1.3 settings, valid certificate.", available: false },
  { id: "weak-cipher-downgrade", name: "Weak Cipher Downgrade", description: "TLS 1.0 with RC4/3DES after STARTTLS.", available: false },
  { id: "starttls-stripped", name: "STARTTLS Stripped", description: "STARTTLS sent, no handshake follows.", available: false },
  { id: "expired-certificate", name: "Expired Certificate", description: "Valid negotiation, expired server certificate.", available: false },
  { id: "hostname-mismatch", name: "Hostname Mismatch / Self-Signed", description: "Certificate name mismatch or self-signed.", available: false },
  { id: "weak-key-signature", name: "Weak Key / Deprecated Signature", description: "1024-bit RSA key or SHA-1 signature.", available: false },
];
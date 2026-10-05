"""
module imports from here
"""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


#enums

class AnalysisStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    PARTIAL = "partial"


class Protocol(str, Enum):
    SMTP = "SMTP"
    IMAP = "IMAP"
    POP3 = "POP3"
    UNKNOWN = "UNKNOWN"


class EncryptionState(str, Enum):
    PLAINTEXT = "PLAINTEXT"
    STARTTLS_OFFERED = "STARTTLS_OFFERED"
    STARTTLS_UPGRADED = "STARTTLS_UPGRADED"
    TLS_WRAPPED = "TLS_WRAPPED"
    TLS_FAILED = "TLS_FAILED"
    UNKNOWN = "UNKNOWN"


class ChainPosition(str, Enum):
    LEAF = "Leaf"
    INTERMEDIATE = "Intermediate"
    ROOT = "Root"


class Severity(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class FindingSource(str, Enum):
    DETERMINISTIC = "Deterministic"
    ML_ANOMALY = "MLAnomaly"


class FindingCategory(str, Enum):
    PROTOCOL = "PROTOCOL"
    STARTTLS = "STARTTLS"
    TLS_CONFIGURATION = "TLS_CONFIGURATION"
    CIPHER = "CIPHER"
    KEY_EXCHANGE = "KEY_EXCHANGE"
    CERTIFICATE = "CERTIFICATE"
    FORWARD_SECRECY = "FORWARD_SECRECY"
    ANOMALY = "ANOMALY"
    POLICY = "POLICY"
    OTHER = "OTHER"


class FindingStatus(str, Enum):
    OPEN = "OPEN"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"


 
class RuleId(str, Enum):
    TLS_DEPRECATED_VERSION = "TLS-DEPRECATED-VERSION"
    TLS_WEAK_CIPHER = "TLS-WEAK-CIPHER"
    KEYEX_WEAK = "KEYEX-WEAK"
    CERT_EXPIRED = "CERT-EXPIRED"
    CERT_HOSTNAME_MISMATCH = "CERT-HOSTNAME-MISMATCH"
    CERT_WEAK_KEY = "CERT-WEAK-KEY"
    CERT_WEAK_SIGNATURE = "CERT-WEAK-SIGNATURE"
    CERT_INCOMPLETE_CHAIN = "CERT-INCOMPLETE-CHAIN"
    PFS_NOT_OBSERVED = "PFS-NOT-OBSERVED"
    STARTTLS_UPGRADE_FAILED = "STARTTLS-UPGRADE-FAILED"


#Analysis

class Analysis(BaseModel):
    analysis_id: str
    file_name: str
    file_sha256: str
    file_size_bytes: int
    capture_format: str  # "pcap" | "pcapng"
    created_at: datetime
    status: AnalysisStatus = AnalysisStatus.QUEUED
    tool_version: str = "0.1.0"
    rule_set_version: str = "1.0.0"
    failure_reason: Optional[str] = None


#NetworkEndpoint 

class NetworkEndpoint(BaseModel):
    ip: str
    port: int
    transport: str = "TCP"
    role: str  # "client" | "server"
    hostname: Optional[str] = None


#EmailSession 

class EmailSession(BaseModel):
    session_id: str
    analysis_id: str
    protocol: Protocol
    identification_method: str
    application_variant: Optional[str] = None
    client: NetworkEndpoint
    server: NetworkEndpoint
    start_time: datetime
    end_time: datetime
    encryption_state: EncryptionState
    tls_session_id: Optional[str] = None


#STARTTLSObservation 

class STARTTLSObservation(BaseModel):
    starttls_id: str
    session_id: str
    server_advertised: bool
    upgrade_attempted: bool
    upgrade_successful: bool
    upgrade_timestamp: Optional[datetime] = None
    risk_flags: list[str] = Field(default_factory=list)

    @property
    def is_stripped(self) -> bool:
         
        return self.upgrade_attempted and not self.upgrade_successful


#TLSSession 

class TLSSession(BaseModel):
    tls_session_id: str
    session_id: str
    version: Optional[str] = None
    negotiated_cipher_suite: Optional[str] = None
    key_exchange: Optional[str] = None
    forward_secrecy: Optional[bool] = None
    handshake_complete: bool = False
    server_name: Optional[str] = None
    offered_versions: list[str] = Field(default_factory=list)
    offered_ciphers: list[str] = Field(default_factory=list)
    compression_enabled: bool = False


#Certificate 

class Certificate(BaseModel):
    certificate_id: str
    tls_session_id: str
    subject: str
    san: list[str] = Field(default_factory=list)
    issuer: str
    not_before: Optional[datetime] = None
    not_after: Optional[datetime] = None
    public_key_algorithm: Optional[str] = None
    public_key_bits: Optional[int] = None
    signature_algorithm: Optional[str] = None
    chain_position: ChainPosition = ChainPosition.LEAF
    is_expired: Optional[bool] = None  # None == UNKNOWN, never default to False
    is_self_signed: Optional[bool] = None
    chain_valid: Optional[bool] = None
    hostname_match: Optional[bool] = None


#Cryptographic Feature Vector

class CryptoFeatureVector(BaseModel):
    session_id: str
    negotiated_tls_version: int  # ordinal SSLv3=0 .. TLS1.3=4
    cipher_strength_score: float  # 0-10
    key_exchange_class: str  # Static-RSA | DHE | ECDHE
    forward_secrecy: bool
    cert_key_size: Optional[int] = None
    cert_days_to_expiry: Optional[int] = None
    cert_is_self_signed: Optional[bool] = None
    cert_signature_deprecated: bool = False
    starttls_completed: bool
    num_deterministic_findings: int
    max_finding_severity: int  # ordinal Low=0 .. Critical=3
    protocol: Protocol


#Findings 

class EvidenceRef(BaseModel):
    type: str  # e.g. "tls_session" | "handshake" | "certificate"
    id: str


class Finding(BaseModel):
    finding_id: str
    session_id: str
    category: FindingCategory
    rule_id: RuleId
    title: str
    severity: Severity
    confidence: float = Field(ge=0.0, le=1.0)
    evidence_refs: list[EvidenceRef] = Field(min_length=1)
    standard_reference: Optional[str] = None
    recommendation: str
    status: FindingStatus = FindingStatus.OPEN
    source: FindingSource


#AIAssessment 

class AIAssessment(BaseModel):
    model_config = {"protected_namespaces":()}
    model_name: str
    model_version: str
    session_id: str
    risk_score: int = Field(ge=0, le=100)
    risk_class: Severity
    anomaly_score: float
    threat_priority: int
    confidence: float = Field(ge=0.0, le=1.0)
    reason_codes: list[RuleId] = Field(default_factory=list)


#RiskBand + PostureReport ache ekhane

class RiskBand(str, Enum):
    STRONG = "STRONG"
    GOOD = "GOOD"
    NEEDS_ATTENTION = "NEEDS_ATTENTION"
    ELEVATED = "ELEVATED"
    CRITICAL_EXPOSURE = "CRITICAL_EXPOSURE"


class PostureReport(BaseModel):
    overall_score: int = Field(ge=0, le=100)
    risk_band: RiskBand
    sessions_analyzed: int
    secure_sessions: int
    at_risk_sessions: int
    critical_findings: int
    high_findings: int
    medium_findings: int
    low_findings: int

    @staticmethod
    def band_for_score(score: int) -> "RiskBand":
        if score >= 90:
            return RiskBand.STRONG
        if score >= 75:
            return RiskBand.GOOD
        if score >= 60:
            return RiskBand.NEEDS_ATTENTION
        if score >= 40:
            return RiskBand.ELEVATED
        return RiskBand.CRITICAL_EXPOSURE

TEMPLATES = {
    ("postfix", "TLS-DEPRECATED-VERSION"): {
        "file": "/etc/postfix/main.cf",
        "snippet": "smtpd_tls_mandatory_protocols = >=TLSv1.2\nsmtpd_tls_protocols = >=TLSv1.2",
        "apply": "postfix reload",
        "verify": "openssl s_client -starttls smtp -connect {host}:{port} -tls1",
        "expect": "handshake failure",
        "removes": {"versions": ["TLS 1.0", "TLS 1.1"]},
    },
    ("dovecot", "TLS-DEPRECATED-VERSION"): {
        "file": "/etc/dovecot/conf.d/10-ssl.conf",
        "snippet": "ssl_min_protocol = TLSv1.2",
        "apply": "doveadm reload",
        "verify": "openssl s_client -connect {host}:{port} -tls1",
        "expect": "handshake failure",
        "removes": {"versions": ["TLS 1.0", "TLS 1.1"]},
    },
}
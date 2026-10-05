from .templates import TEMPLATES

def get_remediation(server_sw, rule_id, host, port):
    t = TEMPLATES.get((server_sw, rule_id)) or TEMPLATES.get(("generic", rule_id))
    if not t:
        return None
    return {**t, "verify": t["verify"].format(host=host, port=port)}

def break_risk(hellos, removes):
    bad_v = set(removes.get("versions", []))
    bad_c = set(removes.get("ciphers", []))
    failing = {}
    for h in hellos:
        if not set(h["offered_versions"]) - bad_v or not set(h["offered_ciphers"]) - bad_c:
            failing.setdefault(h.get("ja3") or "unknown", set()).add(h["client_ip"])
    return [{"fingerprint": k, "client_ips": sorted(v)} for k, v in failing.items()]
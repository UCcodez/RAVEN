def compare(before, after):
    key = lambda f: (f["server"], f["rule_id"])
    b = {key(f) for f in before["findings"]}
    a = {key(f) for f in after["findings"]}
    seen = {s["server"] for s in after["sessions"]}
    gone = b - a
    resolved = {k for k in gone if k[0] in seen}
    unknown = gone - resolved
    return {
        "posture_delta": after["posture"]["score"] - before["posture"]["score"],
        "resolved": sorted(resolved),
        "unresolved": sorted(b & a),
        "new": sorted(a - b),
        "unknown": sorted(unknown),
        "verified": bool(resolved) and not (b & a) and not unknown,
    }
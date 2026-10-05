import hashlib
import json

def h(b):
    return hashlib.sha256(b).digest()

def leaf(obj):
    return h(json.dumps(obj, sort_keys=True, separators=(",", ":")).encode())

def build(leaves):
    levels = [leaves or [h(b"")]]
    while len(levels[-1]) > 1:
        cur = levels[-1]
        if len(cur) % 2:
            cur = cur + [cur[-1]]
        levels.append([h(cur[i] + cur[i + 1]) for i in range(0, len(cur), 2)])
    return levels

def root(levels):
    return levels[-1][0].hex()

def proof(levels, idx):
    out = []
    for lvl in levels[:-1]:
        s = idx ^ 1 if idx ^ 1 < len(lvl) else idx
        out.append({"hash": lvl[s].hex(), "side": "L" if s < idx else "R"})
        idx //= 2
    return out

def verify(leaf_hex, path, root_hex):
    cur = bytes.fromhex(leaf_hex)
    for p in path:
        sib = bytes.fromhex(p["hash"])
        cur = h(sib + cur) if p["side"] == "L" else h(cur + sib)
    return cur.hex() == root_hex
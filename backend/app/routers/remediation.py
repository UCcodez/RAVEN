from fastapi import APIRouter
from ..core.db import load_finding, load_hellos
from ..remediation.engine import break_risk, get_remediation

router = APIRouter(prefix="/api")

@router.get("/findings/{finding_id}/remediation")
def remediation(finding_id: str):
    f = load_finding(finding_id)
    r = get_remediation(f["server_software"], f["rule_id"], f["server"], f["port"])
    if not r:
        return {"note": "no configuration fix"}
    r["break_risk"] = break_risk(load_hellos(f["server"]), r["removes"])
    return r
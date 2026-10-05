from fastapi import APIRouter
from pydantic import BaseModel
from ..core.db import load_analysis
from ..services.compare import compare

router = APIRouter(prefix="/api")

class CompareIn(BaseModel):
    before_id: str
    after_id: str

@router.post("/compare")
def run_compare(body: CompareIn):
    return compare(load_analysis(body.before_id), load_analysis(body.after_id))
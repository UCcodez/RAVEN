from app.evidence import merkle

def test_proofs():
    lv = [merkle.leaf({"i": i}) for i in range(5)]
    levels = merkle.build(lv)
    r = merkle.root(levels)
    assert all(merkle.verify(lv[i].hex(), merkle.proof(levels, i), r) for i in range(5))
    assert not merkle.verify(merkle.leaf({"i": 9}).hex(), merkle.proof(levels, 0), r)
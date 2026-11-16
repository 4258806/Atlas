"""Explicit synthetic minute/hour history in a disposable native lab only."""
import hashlib
import json
import pathlib
import sqlite3
import sys

root = pathlib.Path(__file__).resolve().parents[2]
database = pathlib.Path(sys.argv[1]).resolve(strict=True)
relative = database.relative_to((root / "test-results/full").resolve())
assert len(relative.parts) == 3 and relative.parts[0].startswith("native-lab-reset-")
assert relative.parts[1:] == ("data", "metrics.db")
plan = json.loads(pathlib.Path(sys.argv[2]).read_text())
con = sqlite3.connect("file:" + database.as_posix() + ("?mode=ro" if "--verify" in sys.argv else "?mode=rw"), uri=True)
names = ["traffic.up", "traffic.down", "net.total.up", "net.total.down"]


def fingerprint():
    rows = con.execute("SELECT r.* FROM metric_rollups r JOIN metric_series s ON s.id=r.series_id WHERE s.entity_id=? ORDER BY r.series_id,r.resolution_id,r.bucket_milli", (plan["a"],)).fetchall()
    return hashlib.sha256(json.dumps(rows, separators=(",", ":")).encode()).hexdigest()


try:
    if "--verify" in sys.argv:
        print(json.dumps({"sha256": fingerprint()}))
        sys.exit(0)
    digest = hashlib.sha256(b"{}").hexdigest()
    con.execute("INSERT OR IGNORE INTO metric_label_sets(labels_hash,labels) VALUES (?,?)", (digest, "{}"))
    label = con.execute("SELECT id FROM metric_label_sets WHERE labels=? LIMIT 1", ("{}",)).fetchone()[0]
    inserted = 0
    samples = list(range(plan["start"] - 3600000, plan["asOf"], 60000))
    for name in names:
        con.execute("INSERT OR IGNORE INTO metric_series(metric_name,entity_id,tags_hash,tags) VALUES (?,?,?,?)", (name, plan["a"], digest, "{}"))
        series = con.execute("SELECT id FROM metric_series WHERE metric_name=? AND entity_id=?", (name, plan["a"])).fetchone()[0]
        for step in (60000, 300000, 3600000):
            con.execute("INSERT OR IGNORE INTO metric_resolutions(resolution_milli) VALUES (?)", (step,))
            resolution = con.execute("SELECT id FROM metric_resolutions WHERE resolution_milli=?", (step,)).fetchone()[0]
            buckets = {}
            for i, stamp in enumerate(samples):
                value = (100 if name == "traffic.up" else 200) if name.startswith("traffic.") else (1000000 + i * 100)
                buckets.setdefault(stamp // step * step, []).append((stamp, value))
            for bucket, values in buckets.items():
                # Constant traffic buckets have lossless omitted digests. Counter
                # buckets use a single endpoint, as only last is requested.
                if not name.startswith("traffic."):
                    values = [values[-1]]
                numbers = [v for _, v in values]
                con.execute("INSERT INTO metric_rollups(series_id,resolution_id,label_id,bucket_milli,count,sum,sum_sq,min_val,max_val,first_val,first_ts_milli,last_val,last_ts_milli,digest,created_at_milli) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", (series, resolution, label, bucket, len(values), sum(numbers), sum(v*v for v in numbers), min(numbers), max(numbers), values[0][1], values[0][0], values[-1][1], values[-1][0], None, plan["asOf"]))
                inserted += 1
    con.commit()
    minutes = sum(plan["start"] <= stamp < plan["asOf"] for stamp in samples)
    print(json.dumps({"kind": "SYNTHETIC_NATIVE_LAB_HISTORY", "rows": inserted, "expectedUp": minutes * 100, "expectedDown": minutes * 200, "sha256": fingerprint(), "productionTouched": False}))
finally:
    con.close()

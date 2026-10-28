"""Fetch Investing.com prices + monthly averages (last 5 years) and rewrite data.json.
Keeps the AI summary fields (ai, aiAt) written by the Claude task."""
import json, sys, time, datetime as dt
from curl_cffi import requests

IDS = {"cu": 8831, "ni": 959208, "al": 49768, "st": 961730, "pl": 8833,
       "fx": 650, "eurkrw": 158, "jpykrw": 159, "cnykrw": 9511, "eurusd": 1}
URL = "https://api.investing.com/api/financialdata/historical/{id}?start-date={s}&end-date={e}&time-frame=Daily&add-missing-rows=false"
HDR = {"domain-id": "kr", "Origin": "https://kr.investing.com", "Referer": "https://kr.investing.com/"}
KST = dt.timezone(dt.timedelta(hours=9))
now = dt.datetime.now(KST)
stamp = f"{now.month}/{now.day} {now:%H:%M}"
end = now.strftime("%Y-%m-%d")
# 최근 5년: 5년 전 다음 달부터 (예: 2026-10 기준 2021-11~)
START_Y, START_M = (now.year - 5, now.month + 1) if now.month < 12 else (now.year - 4, 1)

s = requests.Session(impersonate="chrome")
def get(i, a, b):
    for k in range(4):
        try:
            r = s.get(URL.format(id=i, s=a, e=b), headers=HDR, timeout=30)
            if r.status_code == 200:
                return [(d["rowDateTimestamp"][:10], float(d["last_closeRaw"]), float(d["change_precentRaw"]))
                        for d in (r.json().get("data") or [])]
            print("HTTP", r.status_code, i, a, file=sys.stderr)
        except Exception as e:
            print("ERR", i, a, e, file=sys.stderr)
        time.sleep(3 + 3 * k)
    raise SystemExit(f"failed to fetch {i} {a}")

prices, history, last_day = {}, {}, ""
for key, i in IDS.items():
    rows = []
    for y in range(START_Y, now.year + 1):
        a = f"{y}-{START_M:02d}-01" if y == START_Y else f"{y}-01-01"
        rows += get(i, a, end if y == now.year else f"{y}-12-31")
        time.sleep(0.6)
    rows.sort()
    seen, g = set(), {}
    for d, v, _ in rows:
        if d in seen or v != v: continue
        seen.add(d); g.setdefault(d[:7], []).append(v)
    ms = sorted(g)
    history[key] = {"m0": ms[0], "avg": [round(sum(g[m]) / len(g[m]), 4) for m in ms]}
    d, v, c = rows[-1]
    last_day = max(last_day, d)
    prices[key] = {"price": round(v, 4), "chg": round(c, 2), "asOf": d[5:].replace("-", "/"), "at": stamp}

history["lastDay"] = last_day
history["updatedAt"] = stamp
try:
    old = json.load(open("data.json", encoding="utf-8"))
except Exception:
    old = {}
out = {"prices": {**prices, "finishedAt": stamp, "status": "done",
                  "message": "원자재 5종·환율 5종 현재가와 최근 5년 월평균 (Investing.com)"},
       "history": history}
for k in ("ai", "aiAt"):
    if k in old: out[k] = old[k]
json.dump(out, open("data.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("updated", stamp, {k: v["price"] for k, v in prices.items()})

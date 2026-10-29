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
    # 연속된 월 목록으로 만들고, 거래가 없던 달은 null (예: 2022-03 LME 니켈 거래정지)
    allm, (y, m) = [], map(int, ms[0].split("-"))
    while f"{y}-{m:02d}" <= ms[-1]:
        allm.append(f"{y}-{m:02d}"); m += 1
        if m > 12: y, m = y + 1, 1
    history[key] = {"m0": ms[0], "avg": [round(sum(g[k]) / len(g[k]), 4) if k in g else None for k in allm]}
    gaps = [k for k in allm if k not in g]
    if gaps: print("gap", key, gaps)
    d, v, c = rows[-1]
    last_day = max(last_day, d)
    prices[key] = {"price": round(v, 4), "chg": round(c, 2), "asOf": d[5:].replace("-", "/"), "at": stamp}

# 스테인리스(SUS): Investing에 지표가 없어 상하이선물거래소(SHFE) SS 연속물을 Sina Finance에서 가져옴 (위안/t)
def get_sus():
    url = "https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_SS0=/InnerFuturesNewService.getDailyKLine"
    for k in range(4):
        try:
            r = s.get(url, params={"symbol": "SS0"}, headers={"Referer": "https://finance.sina.com.cn/"}, timeout=30)
            t = r.text
            arr = json.loads(t[t.find("(") + 1:t.rfind(")")])
            return [(d["d"], float(d["c"])) for d in arr if d.get("c")]
        except Exception as e:
            print("ERR sus", e, file=sys.stderr); time.sleep(3 + 3 * k)
    return []
try:
    sus = sorted(get_sus())
    start = f"{START_Y}-{START_M:02d}"
    g = {}
    for d, v in sus:
        if d[:7] >= start: g.setdefault(d[:7], []).append(v)
    if g and len(sus) > 1:
        ms = sorted(g); allm, (y, m) = [], map(int, ms[0].split("-"))
        while f"{y}-{m:02d}" <= ms[-1]:
            allm.append(f"{y}-{m:02d}"); m += 1
            if m > 12: y, m = y + 1, 1
        history["ss"] = {"m0": ms[0], "avg": [round(sum(g[k]) / len(g[k]), 2) if k in g else None for k in allm], "src": "SHFE SS (Sina Finance)"}
        (d1, v1), (_, v0) = sus[-1], sus[-2]
        prices["ss"] = {"price": round(v1, 2), "chg": round((v1 / v0 - 1) * 100, 2), "asOf": d1[5:].replace("-", "/"), "at": stamp, "src": "SHFE"}
except Exception as e:
    print("sus skipped", e, file=sys.stderr)

# 철광석: KOMIS(한국광해광업공단) Australian 62% Fe CNF China, USD/t — 월평균 + 최근 일별가
def komis_iron():
    K = "https://www.komis.or.kr"
    H = {"X-Requested-With": "XMLHttpRequest", "Referer": K + "/Komis/RsrcPrice/IronOre",
         "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"}
    s.get(K + "/Komis/RsrcPrice/IronOre", timeout=30)
    base = {"mnrkndUnqRadioCd": "MNRL1011", "srchMnrkndUnqCd": "MNRL1011", "srchPrcCrtr": "793", "srchCompareMnrkndUnqCd": "",
            "srchComparePrcCrtr": "", "lmeInvt": "Y", "HP000": "HP003"}
    c = s.post(K + "/Komis/RsrcPrice/ajax/getChartData", headers=H, timeout=30,
               data=dict(base, srchAvgOpt="MONTH", srchField="year", srchStartDate=str(START_Y), srchEndDate=str(now.year))).json()["data"]
    xs = [x.replace(".", "-") for x in c["xaxis"]]; ys = c["series"][0]["data"]
    g = {m: float(v) for m, v in zip(xs, ys) if v not in (None, "", "-")}
    start = f"{START_Y}-{START_M:02d}"
    ms = sorted(m for m in g if m >= start)
    allm, (y, m) = [], map(int, ms[0].split("-"))
    while f"{y}-{m:02d}" <= ms[-1]:
        allm.append(f"{y}-{m:02d}"); m += 1
        if m > 12: y, m = y + 1, 1
    history["io"] = {"m0": ms[0], "avg": [round(g[k], 2) if k in g else None for k in allm], "src": "KOMIS Iron Ore Fines 62% CNF China"}
    d = s.post(K + "/Komis/RsrcPrice/ajax/getMnrlPrcByMnrkndUnqCd", headers=H, timeout=30,
               data=dict(base, srchAvgOpt="DAY", srchField="month", srchStartDate=now.strftime("%Y-%m"), srchEndDate=now.strftime("%Y-%m"))).json()
    st = d["dataAvg"]["stdMap"]; day = st.get("DAY", {}); ymd = st.get("CRTRYMD", {}).get("crtrYmd", "")
    price = float(day.get("cmercPrc") or st["CRTRYMD"]["cmercPrc"])
    prices["io"] = {"price": round(price, 2), "chg": float(day.get("flctnPrcnt") or 0), "asOf": f"{ymd[4:6]}/{ymd[6:8]}" if len(ymd) == 8 else "", "at": stamp, "src": "KOMIS"}
try:
    komis_iron()
except Exception as e:
    print("iron ore skipped", repr(e), file=sys.stderr)

history["lastDay"] = last_day
history["updatedAt"] = stamp
try:
    old = json.load(open("data.json", encoding="utf-8"))
except Exception:
    old = {}
out = {"prices": {**prices, "finishedAt": stamp, "status": "done",
                  "message": "원자재 7종·환율 5종 현재가와 최근 5년 월평균 (Investing.com)"},
       "history": history}
for k in ("ai", "aiAt"):
    if k in old: out[k] = old[k]
json.dump(out, open("data.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("updated", stamp, {k: v["price"] for k, v in prices.items()})

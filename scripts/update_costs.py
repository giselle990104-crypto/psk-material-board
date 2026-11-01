"""원료 외 추세(에너지·인건비·물류비·유류비) 10년 월별 데이터 → costs.json (하루 한 번)
자동: FRED(유가·디젤·천연가스·운임 PPI·전력 PPI·환율), Investing(런던 가스오일·BDI·USD/VND), KOMIS(유연탄)
고정(공식 발표값, 변경 시 이 파일 수정): 국가별 최저임금, 한국 용접공 노임단가, 한국 산업용 전기 판매단가·SMP"""
import io, json, sys, time, datetime as dt
from curl_cffi import requests

KST = dt.timezone(dt.timedelta(hours=9)); now = dt.datetime.now(KST)
PATH = "costs.json"
try:
    old = json.load(open(PATH, encoding="utf-8"))
    if old.get("day") == now.strftime("%Y-%m-%d") and "--force" not in sys.argv:
        print("costs: already updated today"); sys.exit(0)
except Exception:
    old = {}
s = requests.Session(impersonate="chrome")
Y0 = now.year - 10
months = []; y, m = Y0, 1
while (y, m) <= (now.year, now.month):
    months.append(f"{y}-{m:02d}"); m += 1
    if m > 12: y, m = y + 1, 1

def fred(sid):
    r = s.get("https://fred.stlouisfed.org/graph/fredgraph.csv", params={"id": sid, "cosd": f"{Y0}-01-01"}, timeout=60)
    g = {}
    for ln in r.text.strip().split("\n")[1:]:
        d, v = ln.split(",")[:2]
        try: g.setdefault(d[:7], []).append(float(v))
        except ValueError: pass
    return {k: sum(v) / len(v) for k, v in g.items()}
def investing(pid):
    HD = {"domain-id": "kr", "Origin": "https://kr.investing.com", "Referer": "https://kr.investing.com/"}; g = {}
    for yy in range(Y0, now.year + 1):
        e = now.strftime("%Y-%m-%d") if yy == now.year else f"{yy}-12-31"
        for k in range(3):
            r = s.get(f"https://api.investing.com/api/financialdata/historical/{pid}?start-date={yy}-01-01&end-date={e}&time-frame=Daily&add-missing-rows=false", headers=HD, timeout=30)
            if r.status_code == 200: break
            time.sleep(3)
        for d in (r.json().get("data") or []): g.setdefault(d["rowDateTimestamp"][:7], []).append(float(d["last_closeRaw"]))
        time.sleep(0.5)
    return {k: sum(v) / len(v) for k, v in g.items()}
def komis_coal():
    K = "https://www.komis.or.kr"; H = {"X-Requested-With": "XMLHttpRequest", "Referer": K + "/Komis/RsrcPrice/IronOre", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"}
    s.get(K + "/Komis/RsrcPrice/IronOre", timeout=30)
    lst = s.post(K + "/Komis/RsrcPrice/ajax/getMnrlPriceCrtr", data={"HP000": "HP003", "mnrkndUnqCd": "MNRL0032"}, headers=H, timeout=30).json().get("data", [])
    cr = lst[0]["cdKey"]
    z = s.post(K + "/Komis/RsrcPrice/ajax/getChartData", headers=H, timeout=40, data={"mnrkndUnqRadioCd": "MNRL0032", "srchMnrkndUnqCd": "MNRL0032", "srchPrcCrtr": cr, "srchAvgOpt": "MONTH", "srchField": "year",
        "srchStartDate": str(Y0), "srchEndDate": str(now.year), "srchCompareMnrkndUnqCd": "", "srchComparePrcCrtr": "", "lmeInvt": "Y", "HP000": "HP003"}).json()["data"]
    info = z.get("mnrlInfo", {})
    return {x.replace(".", "-"): float(v) for x, v in zip(z["xaxis"], z["series"][0]["data"]) if v not in (None, "", "-")}, f"{info.get('prcCrtr','')}"
arr = lambda g, nd=3: [round(g[mm], nd) if mm in g else None for mm in months]

AUTO = {  # id: (category, name, unit, currency, fetcher, note)
 "brent":   ("fuel", "브렌트유", "$/bbl", "USD", lambda: fred("DCOILBRENTEU"), "FRED (EIA) Europe Brent Spot 월평균"),
 "wti":     ("fuel", "WTI 원유", "$/bbl", "USD", lambda: fred("DCOILWTICO"), "FRED (EIA) WTI Spot 월평균"),
 "gasoil":  ("fuel", "경유(런던 가스오일 선물)", "$/t", "USD", lambda: investing(8861), "Investing ICE London Gas Oil 선물 월평균 — 아시아·유럽 경유 가격 지표"),
 "diesel":  ("fuel", "미국 경유 소매가", "$/gal", "USD", lambda: fred("GASDESW"), "FRED (EIA) US No 2 Diesel Retail 주간 → 월평균"),
 "hh":      ("energy", "천연가스(헨리허브)", "$/MMBtu", "USD", lambda: fred("DHHNGSP"), "FRED (EIA) Henry Hub Spot 월평균"),
 "elec_us": ("energy", "미국 전력 생산자물가(배전)", "지수(2003.12=100)", "", lambda: fred("PCU221122221122"), "FRED (BLS) PPI Electric Power Distribution"),
 "bdi":     ("logi", "발틱건화물지수(BDI)", "지수", "", lambda: investing(940793), "Investing Baltic Dry Index 월평균 — 벌크선 운임"),
 "ocean":   ("logi", "해상화물 운임 물가(원양)", "지수(1988.6=100)", "", lambda: fred("PCU483111483111"), "FRED (BLS) PPI Deep Sea Freight Transportation"),
 "air":     ("logi", "항공화물 운임 물가", "지수(2003.12=100)", "", lambda: fred("PCU481112481112"), "FRED (BLS) PPI Scheduled Freight Air Transportation"),
 "truck":   ("logi", "트럭 운송 물가(장거리 FTL)", "지수(1992.6=100)", "", lambda: fred("PCU4841214841212"), "FRED (BLS) PPI General Freight Trucking, Long-Distance TL"),
 "fwd":     ("logi", "운송 주선(포워딩) 물가", "지수(1994.12=100)", "", lambda: fred("PCU488510488510"), "FRED (BLS) PPI Freight Transportation Arrangement"),
}
out = {"day": now.strftime("%Y-%m-%d"), "updatedAt": now.strftime("%-m/%-d %H:%M"), "months": months, "series": {}, "fx": {}}
for k, (cat, nm, unit, cur, fn, note) in AUTO.items():
    try:
        out["series"][k] = {"cat": cat, "name": nm, "unit": unit, "cur": cur, "src": note, "v": arr(fn())}; print("ok", k)
    except Exception as e:
        print("ERR", k, repr(e), file=sys.stderr)
        if k in old.get("series", {}): out["series"][k] = old["series"][k]
try:
    g, crit = komis_coal(); out["series"]["coal"] = {"cat": "energy", "name": "유연탄(발전용 석탄)", "unit": "$/t", "cur": "USD", "src": "KOMIS " + crit + " 월평균", "v": arr(g)}; print("ok coal")
except Exception as e:
    print("ERR coal", repr(e), file=sys.stderr)
    if "coal" in old.get("series", {}): out["series"]["coal"] = old["series"]["coal"]
# 환율: 원/통화 (월평균)
try:
    krw = fred("DEXKOUS"); jpy = fred("DEXJPUS"); chf = fred("DEXSZUS"); myr = fred("DEXMAUS"); vnd = investing(2214)
    out["fx"] = {"USD": arr(krw, 2),
                 "JPY": [round(krw[m] / jpy[m], 4) if m in krw and m in jpy else None for m in months],
                 "CHF": [round(krw[m] / chf[m], 2) if m in krw and m in chf else None for m in months],
                 "MYR": [round(krw[m] / myr[m], 2) if m in krw and m in myr else None for m in months],
                 "VND": [round(krw[m] / vnd[m], 6) if m in krw and m in vnd else None for m in months]}
    print("ok fx")
except Exception as e:
    print("ERR fx", repr(e), file=sys.stderr); out["fx"] = old.get("fx", {})
# 최근 달에 값이 하나도 없으면(월초) 그 달은 뺌
while out["months"] and all((v["v"][-1] is None) for v in out["series"].values()):
    out["months"].pop()
    for v in out["series"].values(): v["v"] = v["v"][:len(out["months"])]
    for c in out["fx"]: out["fx"][c] = out["fx"][c][:len(out["months"])]
if len(out["series"]) < 8:
    print("too few series; keep old", file=sys.stderr); sys.exit(0)
json.dump(out, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("costs.json saved", len(out["series"]), "series", len(out["months"]), "months")

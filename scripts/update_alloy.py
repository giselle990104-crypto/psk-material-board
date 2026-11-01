"""합금시세: 원소별 10년 월평균 시세(USD/t)와 원/달러 환율을 모아 alloy.json 저장.
합금 가격(원소 구성비 × 원소 시세)은 화면에서 계산 (구성비는 GUESS, 화면에서 바꿀 수 있음).
- 비철 LME Cash, 희유금속(합금철 포함): KOMIS(한국광해광업공단) 월평균
- 철(Fe): Investing 미국 열연코일(HRC) 선물 월평균 ($/short ton → $/t)
- 원/달러: Investing USD/KRW 월평균
하루 한 번만 새로 받음."""
import json, sys, time, datetime as dt
from curl_cffi import requests

KST = dt.timezone(dt.timedelta(hours=9)); now = dt.datetime.now(KST)
PATH = "alloy.json"
try:
    old = json.load(open(PATH, encoding="utf-8"))
    if old.get("day") == now.strftime("%Y-%m-%d") and "--force" not in sys.argv:
        print("alloy: already updated today"); sys.exit(0)
except Exception:
    old = {}
s = requests.Session(impersonate="chrome")
Y0 = now.year - 10
M0 = f"{Y0}-{now.month:02d}"   # 10년 전 같은 달부터
months = []
y, m = Y0, now.month
while (y, m) <= (now.year, now.month):
    months.append(f"{y}-{m:02d}"); m += 1
    if m > 12: y, m = y + 1, 1

K = "https://www.komis.or.kr"
H = {"X-Requested-With": "XMLHttpRequest", "Referer": K + "/Komis/RsrcPrice/IronOre", "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"}
s.get(K + "/Komis/RsrcPrice/IronOre", timeout=30)
# 원소: (KOMIS 그룹, 광종코드, 가격기준 키 or 'CASH', 순원소 환산 배수, 단위 설명)
EL = {
 "al": ("알루미늄", "HP001", "MNRL0009", 495, 1, "LME Cash"),
 "cu": ("구리", "HP001", "MNRL0008", "CASH", 1, "LME Cash"),
 "zn": ("아연", "HP001", "MNRL0023", 561, 1, "LME Cash"),
 "sn": ("주석", "HP001", "MNRL0016", 493, 1, "LME Cash"),
 "pb": ("납", "HP001", "MNRL0022", "CASH", 1, "LME Cash"),
 "ni": ("니켈", "HP001", "MNRL0002", 502, 1, "LME Cash"),
 "mg": ("마그네슘", "HP002", "MNRL0011", 766, 1, "마그네슘 잉곳 99.9% FOB China"),
 "si": ("규소", "HP002", "MNRL0010", 765, 1, "실리콘 메탈 553 FOB China"),
 "cr": ("크롬", "HP002", "MNRL0021", 794, 1000 / 0.60, "페로크롬(HC) Cr60% ÷ 0.60 (유럽 창고)"),
 "mo": ("몰리브덴", "HP002", "MNRL0012", 763, 1 / 0.60, "페로몰리브덴 Mo60% ÷ 0.60 (EXW China)"),
 "mn": ("망간", "HP002", "MNRL0004", 815, 1 / 0.75, "페로망간 Mn75% ÷ 0.75 (2020.9 이전은 첫 값 고정)"),
 "nb": ("니오븀", "HP002", "MNRL0007", 770, 1 / 0.66, "페로니오븀 Nb66% ÷ 0.66"),
 "w":  ("텅스텐", "HP002", "MNRL0018", 796, 1000 / 0.75, "페로텅스텐 W75% ÷ 0.75"),
 "co": ("코발트", "HP002", "MNRL0003", 791, 1000, "코발트 메탈 99.8% (로테르담)"),
}
def komis(g, code, cr):
    if cr == "CASH":
        lst = s.post(K + "/Komis/RsrcPrice/ajax/getMnrlPriceCrtr", data={"HP000": g, "mnrkndUnqCd": code}, headers=H, timeout=30).json().get("data", [])
        cr = next((d["cdKey"] for d in lst if "CASH" in str(d.get("cdVal", "")).upper()), lst[0]["cdKey"] if lst else None)
    z = s.post(K + "/Komis/RsrcPrice/ajax/getChartData", headers=H, timeout=40, data={"mnrkndUnqRadioCd": code, "srchMnrkndUnqCd": code, "srchPrcCrtr": cr,
        "srchAvgOpt": "MONTH", "srchField": "year", "srchStartDate": str(Y0), "srchEndDate": str(now.year), "srchCompareMnrkndUnqCd": "", "srchComparePrcCrtr": "", "lmeInvt": "Y", "HP000": g}).json()["data"]
    return {x.replace(".", "-"): float(v) for x, v in zip(z["xaxis"], z["series"][0]["data"]) if v not in (None, "", "-")}, z.get("mnrlInfo", {})

def investing_monthly(pid, conv=lambda v: v):
    HD = {"domain-id": "kr", "Origin": "https://kr.investing.com", "Referer": "https://kr.investing.com/"}
    g = {}
    for yy in range(Y0, now.year + 1):
        e = now.strftime("%Y-%m-%d") if yy == now.year else f"{yy}-12-31"
        for k in range(3):
            r = s.get(f"https://api.investing.com/api/financialdata/historical/{pid}?start-date={yy}-01-01&end-date={e}&time-frame=Daily&add-missing-rows=false", headers=HD, timeout=30)
            if r.status_code == 200: break
            time.sleep(3)
        for d in (r.json().get("data") or []):
            g.setdefault(d["rowDateTimestamp"][:7], []).append(float(d["last_closeRaw"]))
        time.sleep(0.5)
    return {k: conv(sum(v) / len(v)) for k, v in g.items()}

out = {"day": now.strftime("%Y-%m-%d"), "updatedAt": now.strftime("%-m/%-d %H:%M"), "months": months, "unit": "USD/t (순원소 기준)", "elements": {}, "fx": []}
for k, (nm, g, code, cr, mult, desc) in EL.items():
    try:
        data, info = komis(g, code, cr)
        vals = [round(data[mm] * mult, 2) if mm in data else None for mm in months]
        # 앞쪽 빈 달은 첫 값으로 채움(망간 등), 중간 빈 달은 직전 값으로
        first = next((v for v in vals if v is not None), None); last = first; filled = []
        for v in vals:
            if v is None: filled.append(last)
            else: filled.append(v); last = v
        out["elements"][k] = {"name": nm, "src": "KOMIS " + desc, "usd": filled, "from": next((mm for mm, v in zip(months, vals) if v is not None), None)}
        print("ok", k, out["elements"][k]["from"], filled[-1])
    except Exception as e:
        print("ERR", k, repr(e), file=sys.stderr)
        if old.get("elements", {}).get(k): out["elements"][k] = old["elements"][k]
try:
    hrc = investing_monthly(961730, lambda v: v / 0.907185)
    vals = [round(hrc[mm], 2) if mm in hrc else None for mm in months]
    first = next((v for v in vals if v is not None), None); last = first; filled = []
    for v in vals:
        filled.append(v if v is not None else last); last = v if v is not None else last
    out["elements"]["fe"] = {"name": "철(탄소강)", "src": "Investing 미국 열연코일(HRC) 선물 $/st → $/t", "usd": filled, "from": months[0]}
    fx = investing_monthly(650)
    out["fx"] = [round(fx[mm], 2) if mm in fx else None for mm in months]
    print("ok fe", filled[-1], "fx", out["fx"][-1])
except Exception as e:
    print("ERR investing", repr(e), file=sys.stderr)
    if old.get("elements", {}).get("fe"): out["elements"]["fe"] = old["elements"]["fe"]
    if old.get("fx"): out["fx"] = old["fx"]
if len(out["elements"]) < 10 or not out["fx"]:
    print("too few series; keeping old file", file=sys.stderr); sys.exit(0)
json.dump(out, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("alloy.json saved", len(out["elements"]), "elements", len(months), "months")

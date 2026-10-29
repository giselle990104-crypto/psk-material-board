"""Acerinox 공식 '판재 합금할증료(Alloy Surcharge, Flat Product)' 월별 PDF에서
SUS316L(1.4404)·SUS304(1.4301) 할증료를 읽어 sus316.json에 저장.
단위: EUR/kg (Acerinox 표기 그대로). 이미 받은 달은 다시 받지 않음."""
import io, json, re, sys, datetime as dt
from curl_cffi import requests
from pypdf import PdfReader

BASE = "https://www.acerinox.com/export/sites/acerinox/.content/galerias/galeria-descargas/galeria-extras-aleacion/"
ALT = "https://www.acerinox.com/export/sites/acerinox/es/soluciones/.galleries/Documentacion-Productos-Largo-Extra-de-aleacion-espanol/"
MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"]
ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
PATH = "sus316.json"
KST = dt.timezone(dt.timedelta(hours=9))
now = dt.datetime.now(KST)

try:
    data = json.load(open(PATH, encoding="utf-8"))
except Exception:
    data = {}
rows = {r["m"]: r for r in data.get("rows", [])}
tried = data.get("tried", {}) if data.get("v") == 2 else {}
s = requests.Session(impersonate="chrome")

def num(x):
    return float(x.replace(".", "").replace(",", ".")) if re.match(r"^\d{1,2}[.,]\d{3}$", x) is None else float(x.replace(",", "."))

def parse(pdf):
    t = "\n".join((p.extract_text() or "") for p in PdfReader(io.BytesIO(pdf)).pages)
    def grab(aisi, en):
        m = re.search(rf"\b{aisi}\s+{re.escape(en)}\s+(\d+[.,]\d+)", t)
        return float(m.group(1).replace(",", ".")) if m else None
    return grab("316L", "1.4404"), grab("304", "1.4301"), grab("316", "1.4401"), t

def fetch(y, m):
    names = [f"Alloy-Surcharge-Flat-Product-{MONTHS[m-1]}-{y}.pdf", f"Alloy-Surcharge-Flat-Product-{MONTHS[m-1]}{y}.pdf",
             f"{y}-{m:02d}-Alloy-Surcharge-Flat-Product.pdf", f"{y}-{m:02d}-Alloy-Surcharge-Flat-Products.pdf",
             f"Alloy-Surcharge-Flat-Products-{MONTHS[m-1]}-{y}.pdf", f"Extras-de-aleacion-Producto-Plano-{ES[m-1]}-{y}.pdf"]
    urls = [BASE + n for n in names] + [ALT + n for n in names[:3]]
    for u in urls:
        try:
            r = s.get(u, timeout=30)
            if r.status_code == 200 and r.content[:4] == b"%PDF":
                return u, r.content
        except Exception as e:
            print("ERR", u, e, file=sys.stderr)
    return None, None

# 최근 5년 + 다음 달(보통 전월 21일경 발표)
ny, nm = (now.year, now.month + 1) if now.month < 12 else (now.year + 1, 1)
y, m = now.year - 5, now.month + 1
if m > 12: y, m = y + 1, 1
months = []
while (y, m) <= (ny, nm):
    months.append((y, m)); m += 1
    if m > 12: y, m = y + 1, 1
recent = {f"{a}-{b:02d}" for a, b in months[-3:]}
today = now.strftime("%Y-%m-%d")
changed = False
for y, m in months:
    key = f"{y}-{m:02d}"
    if key in rows: continue
    if key not in recent and tried.get(key) == "none": continue      # 예전 달인데 PDF가 없던 달은 다시 시도 안 함
    url, pdf = fetch(y, m)
    if not pdf:
        tried[key] = "none" if key not in recent else today; continue
    v316l, v304, v316, text = parse(pdf)
    if v316l is None:
        print("parse fail", key, text[:300].replace("\n", " | "), file=sys.stderr); tried[key] = "parse"; continue
    rows[key] = {"m": key, "s316l": v316l, "s304": v304, "s316": v316, "src": url}
    tried.pop(key, None); changed = True
    print("got", key, v316l, v304)

out = {"v": 2, "unit": "EUR/kg", "source": "Acerinox Flat Product Alloy Surcharge (공식 월별 PDF)",
       "grades": {"s316l": "316L (1.4404)", "s304": "304 (1.4301)", "s316": "316 (1.4401)"},
       "updatedAt": now.strftime("%-m/%-d %H:%M") if changed or "updatedAt" not in data else data["updatedAt"],
       "rows": [rows[k] for k in sorted(rows)], "tried": tried}
json.dump(out, open(PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("rows", len(rows), "first", min(rows) if rows else None, "last", max(rows) if rows else None)
print("::notice title=sus316::rows=%d %s" % (len(rows), " ".join(f"{k}:{rows[k]['s316l']}" for k in sorted(rows))))
missing = [k for k, v in tried.items() if v != "parse"]
print("::notice title=sus316 missing::" + " ".join(sorted(tried)))

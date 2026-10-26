#!/usr/bin/env python3
"""Fetch Google News RSS headlines for a procurement-focused briefing.

Runs from GitHub Actions twice on weekdays (Asia/Seoul).
No fabricated analysis: the digest is a categorized headline index, not an LLM summary.
"""
import json, re, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

KST=timezone(timedelta(hours=9))
NOW=datetime.now(KST)
QUERIES={
 "구리":'copper mine supply price LME',
 "니켈":'nickel Indonesia supply price LME',
 "알루미늄":'aluminium smelter price supply',
 "철강":'steel hot rolled coil price supply',
 "플라스틱":'polyethylene polypropylene resin naphtha oil price',
 "환율":'USD KRW Korean won exchange rate',
 "반도체":'semiconductor equipment supply chain materials',
}
ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/"news.json"

def collect(group,search):
    query=urllib.parse.urlencode({"q":search+" when:7d","hl":"en-US","gl":"US","ceid":"US:en"})
    url="https://news.google.com/rss/search?"+query
    req=urllib.request.Request(url,headers={"User-Agent":"Mozilla/5.0 (compatible; PSK-Material-Board/1.0)"})
    with urllib.request.urlopen(req,timeout=22) as response:
        xml=response.read(1200000)
    root=ET.fromstring(xml)
    result=[]
    for item in root.findall(".//channel/item")[:8]:
        title=(item.findtext("title") or "").strip()
        link=(item.findtext("link") or "").strip()
        date=(item.findtext("pubDate") or "").strip()
        publisher=(item.findtext("source") or "").strip()
        if not title or not link.startswith("https://"):continue
        try: published=parsedate_to_datetime(date).astimezone(KST)
        except Exception:continue
        if published<NOW-timedelta(days=7) or published>NOW+timedelta(hours=3):continue
        if not publisher and " - " in title: title,publisher=title.rsplit(" - ",1)
        result.append({"date":published.date().isoformat(),"category":group,"title":title[:230],"source":publisher[:80] or "Google News","url":link})
    return result

def main():
    items=[];errors=[]
    for group,query in QUERIES.items():
        try: items.extend(collect(group,query)[:5])
        except Exception as exc:errors.append(group+": "+str(exc))
    old={}
    if OUT.exists():
        try:old=json.loads(OUT.read_text(encoding="utf-8"))
        except Exception:pass
    if not items:
        raise SystemExit("No sources retrieved: "+", ".join(errors)+"; existing news.json remains unchanged")
    seen=set();unique=[]
    for r in sorted(items,key=lambda x:x["date"],reverse=True):
        normalized=re.sub(r"\W+","",r["title"].lower())[:90]
        if normalized in seen:continue
        seen.add(normalized);unique.append(r)
    # Only the article headlines are indexed. No guessed causality or advice.
    by_group={}
    for group in QUERIES:
        batch=[v for v in unique if v["category"]==group][:3]
        if batch:by_group[group]=batch
    output={"updatedAt":NOW.isoformat(timespec="minutes"),"timezone":"Asia/Seoul","source":"Google News RSS","status":"partial" if errors else "ok","errors":errors,"items":unique[:40],"brief":[{"category":g,"headlines":[v["title"] for v in batch]} for g,batch in by_group.items()],"briefMethod":"기사 제목 기반 자동 분류 요약 (AI 분석 아님)"}
    OUT.write_text(json.dumps(output,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("saved",len(output["items"]),"articles, errors",len(errors))
if __name__=="__main__":main()

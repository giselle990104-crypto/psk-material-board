/* PSK Dashboard add-on. Load immediately before the existing inline application script. */
(() => {
  'use strict';
  const main = document.querySelector('#panes');
  if (!main || document.querySelector('#dashboard')) return;
  const style = document.createElement('style');
  style.textContent = `
  #dashboard{--d-accent:var(--copper);font-size:14px}
  #dashboard .d-intro{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
  #dashboard .d-kicker{font:600 11px var(--font-data);color:var(--copper);letter-spacing:.12em}
  #dashboard h2{font:700 clamp(22px,3vw,28px) var(--font-display);margin:3px 0 2px}
  #dashboard .d-muted{color:var(--ink-3);font-size:12px}
  #dashboard .d-actions{display:flex;gap:7px;flex-wrap:wrap}
  #dashboard .d-metrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}
  #dashboard .d-card{border:1px solid var(--line);border-radius:12px;background:var(--panel);padding:16px;min-width:0}
  #dashboard .d-label{color:var(--ink-3);font-size:12px;font-weight:600}
  #dashboard .d-value{font:700 clamp(21px,2.8vw,29px) var(--font-display);letter-spacing:-.02em;margin:8px 0 3px;overflow-wrap:anywhere}
  #dashboard .d-change{font:600 12px var(--font-data)}
  #dashboard .d-up{color:var(--up)} #dashboard .d-down{color:var(--down)} #dashboard .d-neutral{color:var(--ink-3)}
  #dashboard .d-grid{display:grid;grid-template-columns:minmax(0,1.55fr) minmax(250px,1fr);gap:14px;margin-bottom:16px}
  #dashboard .d-h{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;flex-wrap:wrap}
  #dashboard .d-h h3{font-size:15px;margin:0}
  #dashboard .d-chipset{display:flex;gap:5px;flex-wrap:wrap}
  #dashboard .d-chip{cursor:pointer;border:1px solid var(--line);background:var(--panel);color:var(--ink-2);border-radius:7px;padding:5px 9px;font:500 12px var(--font-body)}
  #dashboard .d-chip[aria-pressed="true"]{background:var(--copper-soft);border-color:var(--copper);color:var(--copper)}
  #dashboard .d-chart{width:100%;height:256px;display:block}
  #dashboard .d-legend{display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--ink-2)}
  #dashboard .d-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px}
  #dashboard .d-list{display:grid;gap:0}
  #dashboard .d-listitem{padding:10px 0;border-bottom:1px solid var(--line);display:flex;justify-content:space-between;gap:8px;align-items:center}
  #dashboard .d-listitem:last-child{border:0}
  #dashboard .d-listitem small{display:block;color:var(--ink-3);font-size:11px;margin-top:3px}
  #dashboard .d-badge{font:600 11px var(--font-data);white-space:nowrap;padding:4px 7px;border-radius:8px;background:var(--sunk);color:var(--ink-2)}
  #dashboard .d-bottom{margin-top:2px}
  #dashboard .d-table{width:100%;border-collapse:collapse}
  #dashboard .d-table th,#dashboard .d-table td{font-size:12px;padding:10px 8px}
  #dashboard .d-link{white-space:nowrap;background:none;border:0;text-align:left;color:var(--copper);cursor:pointer;font:600 12px var(--font-body);padding:0}
  #dashboard .d-action{display:flex;gap:12px;align-items:flex-start;border:1px solid var(--copper);background:var(--copper-soft);border-radius:12px;padding:13px 16px;margin-bottom:14px}
  #dashboard .d-action b{font:700 11px var(--font-data);color:var(--copper);letter-spacing:.08em;white-space:nowrap;padding-top:2px}
  #dashboard .d-action p{margin:0;font-size:14px;line-height:1.55;color:var(--ink)}
  #dashboard .d-fx{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:0}
  #dashboard .d-fxi{padding:2px 12px;border-left:1px solid var(--line);min-width:0}
  #dashboard .d-fxi:first-child{border-left:0;padding-left:0}
  #dashboard .d-fxi .d-value{font-size:19px;margin:5px 0 2px}
  #dashboard .d-issues{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 22px}
  #dashboard .d-issue{padding:10px 0;border-bottom:1px solid var(--line);font-size:13px;line-height:1.5;color:var(--ink-2)}
  #dashboard .d-issue strong{color:var(--ink);margin-right:6px}
  #dashboard .d-sp{margin-bottom:16px}
  @media(max-width:900px){#dashboard .d-fx{grid-template-columns:repeat(3,minmax(0,1fr));gap:12px 0}#dashboard .d-fxi:nth-child(4){border-left:0;padding-left:0}#dashboard .d-issues{grid-template-columns:1fr}}
  @media(max-width:600px){#dashboard .d-table{min-width:520px}}
  @media(max-width:470px){#dashboard .d-fx{grid-template-columns:repeat(2,minmax(0,1fr))}#dashboard .d-fxi{border-left:0;padding-left:0}#dashboard .d-action{flex-direction:column;gap:4px}}
  #dashboard .d-error{padding:16px;border:1px solid var(--line);border-radius:10px;background:var(--sunk)}
  @media(max-width:780px){#dashboard .d-grid{grid-template-columns:1fr}#dashboard .d-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:470px){#dashboard .d-metrics{grid-template-columns:1fr}#dashboard .d-card{padding:12px}#dashboard .d-table th,#dashboard .d-table td{font-size:11px;padding:8px 5px}}
  @media print{body:has(#dashboard:not([hidden])) .bar,body:has(#dashboard:not([hidden])) .tabhandle,body:has(#dashboard:not([hidden])) .side,body:has(#dashboard:not([hidden])) footer{display:none!important}#dashboard .d-actions,#dashboard .d-chipset{display:none!important}#dashboard{border:none!important;padding:0!important}#dashboard .d-grid{grid-template-columns:1.5fr 1fr}#dashboard .d-card{break-inside:avoid}}
  `;
  document.head.appendChild(style);
  const pane = document.createElement('section');
  pane.className = 'pane'; pane.id = 'dashboard';
  pane.dataset.label = 'Dashboard'; pane.dataset.desc = '원자재·환율 시장 현황과 구매 검토 포인트를 한눈에 확인';
  pane.setAttribute('role', 'tabpanel'); pane.hidden = true;
  pane.innerHTML = `
    <div class="d-intro"><div><div class="d-kicker">PROCUREMENT INTELLIGENCE / OVERVIEW</div><h2>Market Dashboard</h2><div class="d-muted" id="d-updated">데이터 확인 중…</div></div>
      <div class="d-actions"><button type="button" class="btn" id="d-reload">↻ 데이터 새로고침</button><button type="button" class="btn primary" id="d-print">PDF / 인쇄</button></div></div>
    <div class="d-action" id="d-action" hidden><b>이번 주 구매 액션</b><p id="d-action-t"></p></div><div class="d-metrics" id="d-metrics" aria-live="polite"></div><div class="d-card d-sp"><div class="d-h"><h3>환율 현황</h3><span class="d-muted">현재가 · 전월 대비는 월평균 비교 · <button type="button" class="d-link" data-go="fx">환율 정보 보기</button></span></div><div class="d-fx" id="d-fx"></div></div>
    <div class="d-grid"><div class="d-card"><div class="d-h"><h3>주요 원자재 가격지수 비교</h3><div class="d-chipset" id="d-period"><button class="d-chip" data-months="3" aria-pressed="false">3개월</button><button class="d-chip" data-months="6" aria-pressed="true">6개월</button><button class="d-chip" data-months="12" aria-pressed="false">12개월</button></div></div><div id="d-chart" aria-label="월별 가격 지수 추이"></div><div class="d-legend" id="d-legend"></div><div class="d-muted" style="margin-top:9px">각 원자재의 조회 시작월 = 100 · 월평균 기준 · 서로 다른 단위 비교용</div></div>
      <div class="d-card"><div class="d-h"><h3>구매 관점 체크포인트</h3></div><div class="d-list" id="d-points"></div><div class="d-muted" style="margin-top:12px">전월 대비 가격 변화에 따른 자동 점검 항목이며, 실제 발주·협상 판단은 계약조건과 BP 원가구조 확인이 필요합니다.</div></div></div>
    <div class="d-card d-sp"><div class="d-h"><h3>시장 주요 이슈</h3><span class="d-muted" id="d-issue-src"></span></div><div class="d-issues" id="d-issues"></div><div style="margin-top:10px;display:flex;gap:14px;flex-wrap:wrap"><button type="button" class="d-link" data-go="ai">AI 뉴스요약 보기</button><button type="button" class="d-link" data-go="analysis">시장분석 보기</button><button type="button" class="d-link" data-go="implication">구매시사점 보기</button><button type="button" class="d-link" data-go="bp">BP 논의점 보기</button></div></div>
    <div class="d-card d-bottom"><div class="d-h"><h3>원자재 현황 및 전월 대비 변동</h3><span class="d-muted">가격은 최신 수집값 · 증감률은 월평균 비교</span></div><div style="overflow-x:auto"><table class="d-table"><thead><tr><th>원자재 / 지표</th><th>현재가</th><th>전월 대비 월평균</th><th>기준일</th><th>상세</th></tr></thead><tbody id="d-rows"></tbody></table></div></div>`;
  main.insertBefore(pane, main.firstElementChild);
  // Dashboard is the default page, independent of previously selected tabs.

  const materials = [
    {id:'cu',name:'구리',unit:'$/lb',color:'#7754cc'},
    {id:'al',name:'알루미늄',unit:'$/t',color:'#168b86'},
    {id:'st',name:'철강 (미국 HRC 선물)',unit:'$/short ton',color:'#3976bc'},
    {id:'io',name:'철광석 (62% Fe CNF China)',unit:'$/t',color:'#9a6b4f'},
    {id:'ni',name:'니켈',unit:'$/t',color:'#d27b30'},
    {id:'ss',name:'스테인리스 (SHFE SUS304)',unit:'¥/t',cur:'¥',color:'#8a8f98'},
    {id:'pl',name:'브렌트유 (플라스틱 참고)',unit:'$/bbl',color:'#bd579c'}
  ];
  const byId = id => document.getElementById(id);
  const num = (v,d=2) => Number(v).toLocaleString('ko-KR',{maximumFractionDigits:d,minimumFractionDigits:d});
  const signed = n => `${n>0?'+':''}${num(n,1)}%`;
  const tone = n => n>0?'d-up':n<0?'d-down':'d-neutral';
  const safe = x => String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const histFor = (data,id) => {
    const h=data.history?.[id]; if(!h || !Array.isArray(h.avg)) return [];
    const [year,month] = String(h.m0||'').split('-').map(Number);
    if(!year || !month) return [];
    return h.avg.map((value,i)=>({label:`${year+Math.floor((month-1+i)/12)}-${String((month-1+i)%12+1).padStart(2,'0')}`,value:Number(value)})).filter(x=>Number.isFinite(x.value)&&x.value>0);
  };
  const move = id => {
    const b=document.querySelector(`#side button[data-id="${id}"]`);
    if(b) { b.click(); window.scrollTo({top:0,behavior:'smooth'}); }
  };
  let cache=null, months=6;
  function chart(data){
    const view = materials.slice(0,3).map(m=>({ ...m,arr:histFor(data,m.id).slice(-months)}));
    const labels=view[0]?.arr.map(p=>p.label)??[];
    if(labels.length<2){byId('d-chart').textContent='차트 데이터가 부족합니다.';return;}
    const w=720,h=250,l=48,r=12,t=12,b=35,innerW=w-l-r,innerH=h-t-b;
    const datasets=view.map(v=>({...v,values:v.arr.map(p=>p.value/v.arr[0].value*100)}));
    const all=datasets.flatMap(s=>s.values),lo=Math.floor((Math.min(...all)-4)/10)*10,hi=Math.ceil((Math.max(...all)+4)/10)*10;
    const y=v=>t+(hi-v)/(hi-lo||1)*innerH;const x=i=>l+i/(labels.length-1)*innerW;
    let s=`<svg class="d-chart" viewBox="0 0 ${w} ${h}" role="img" aria-label="구리 알루미늄 철강 월별 가격지수 비교"><g fill="none" stroke="var(--line)" stroke-width="1">`;
    for(let i=0;i<=4;i++){const val=lo+(hi-lo)*i/4;s+=`<path d="M${l} ${y(val)}H${w-r}"/>`;}
    s+='</g><g fill="var(--ink-3)" font-size="11" font-family="sans-serif">';
    for(let i=0;i<=4;i++){const val=lo+(hi-lo)*i/4;s+=`<text x="${l-8}" y="${y(val)+4}" text-anchor="end">${num(val,0)}</text>`;}
    labels.forEach((lab,i)=>{if(i===0||i===labels.length-1||i%Math.max(1,Math.ceil(labels.length/6))===0)s+=`<text x="${x(i)}" y="${h-10}" text-anchor="middle">${safe(lab.slice(2))}</text>`;});s+='</g>';
    datasets.forEach(v=>{s+=`<polyline fill="none" stroke="${v.color}" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" points="${v.values.map((n,i)=>`${x(i)},${y(n)}`).join(' ')}"/>`;});
    byId('d-chart').innerHTML=s+'</svg>';
    byId('d-legend').innerHTML=datasets.map(v=>`<span><i class="d-dot" style="background:${v.color}"></i>${safe(v.name)} <b>${num(v.values.at(-1),1)}</b></span>`).join('');
  }
  function draw(data){
    cache=data;
    const px=data.prices||{};
    const fx=px.fx,cu=px.cu,ni=px.ni;
    const metric=(label,v,change,sub)=>`<div class="d-card"><div class="d-label">${label}</div><div class="d-value">${v}</div><div class="d-change ${tone(change)}">${Number.isFinite(change)?signed(change):'—'} <span class="d-muted">수집 시점 변동률</span></div><div class="d-muted" style="margin-top:6px">${sub}</div></div>`;
    byId('d-metrics').innerHTML=[metric('USD / KRW',fx?num(fx.price,2)+' 원':'—',Number(fx?.chg),safe(fx?.asOf||'기준일 미상')),
      metric('구리 COMEX',cu?'$'+num(cu.price,4)+' /lb':'—',Number(cu?.chg),safe(cu?.asOf||'기준일 미상')),
      metric('니켈 LME',ni?'$'+num(ni.price,0)+' /t':'—',Number(ni?.chg),safe(ni?.asOf||'기준일 미상'))].join('');
    byId('d-updated').textContent=`데이터 업데이트: ${px.finishedAt||data.history?.updatedAt||'시간 미상'} · 출처: 기존 data.json`;chart(data);
    const points=[];
    const rows=materials.map(m=>{
      const p=px[m.id]; const arr=histFor(data,m.id); const a=arr.at(-1)?.value,b=arr.at(-2)?.value;
      const mom=Number.isFinite(a)&&Number.isFinite(b)&&b!==0?(a/b-1)*100:NaN;
      if(Number.isFinite(mom) && Math.abs(mom)>=3){points.push({name:m.name,mom,kind:mom>0?'원가 상승 영향 점검':'단가 인하 협상 근거 검토'});}
      const change=Number.isFinite(mom)?`<span class="${tone(mom)}">${signed(mom)}</span>`:'—';
      return `<tr><td><strong>${safe(m.name)}</strong><div class="d-muted">${safe(m.unit)}</div></td><td>${p&&Number.isFinite(+p.price)?(m.cur||'$')+num(p.price,m.id==='cu'?4:m.cur?0:2):'—'}</td><td>${change}</td><td>${safe(p?.asOf||'—')}</td><td><button type="button" class="d-link" data-go="prices">상세 보기</button></td></tr>`;
    });
    byId('d-rows').innerHTML=rows.join('');
    const momOf=id=>{const h=histFor(data,id),a=h.at(-1)?.value,b=h.at(-2)?.value;return a&&b?(a/b-1)*100:NaN;};
    const FXS=[['fx','USD/KRW','원',1,2],['eurkrw','EUR/KRW','원',1,2],['jpykrw','JPY/KRW','원 (100엔)',100,2],['cnykrw','CNY/KRW','원',1,2],['eurusd','EUR/USD','$',1,4]];
    byId('d-fx').innerHTML=FXS.map(([id,lab,u,k,dg])=>{const p=px[id],m=momOf(id);return `<div class="d-fxi"><div class="d-label">${lab}</div><div class="d-value">${p&&Number.isFinite(+p.price)?num(p.price*k,dg):'—'}<span class="d-muted" style="font-size:11px;font-weight:500"> ${u}</span></div><div class="d-change ${tone(m)}">${Number.isFinite(m)?'전월 '+signed(m):'—'}</div></div>`;}).join('');
    let issues=[],action='',src='';
    if(typeof data.ai==='string'&&data.ai.trim()){
      data.ai.split('\n').map(x=>x.trim()).filter(Boolean).forEach(l=>{ if(/^→/.test(l)) action=l.replace(/^→\s*(이번 주 구매 액션\s*:\s*)?/,''); else { const m=l.replace(/^[•\-·*]\s*/,'').split(/\s+[—–-]\s+/); if(m.length>1) issues.push({name:m[0],text:m.slice(1).join(' — ')}); } });
      src=`${data.aiAt||''} AI 요약 기준`;
    }
    if(!issues.length){ document.querySelectorAll('#aiStatic li').forEach(li=>{ const b=li.querySelector('b'); const name=b?b.textContent.trim():''; const text=li.textContent.replace(name,'').replace(/^\s*[—–-]\s*/,'').trim(); if(name) issues.push({name,text}); }); src='AI 뉴스요약 기준'; }
    const short=t=>{const f=String(t).split(/(?<=\.)\s/)[0]; return f.length>90?f.slice(0,88)+'…':f;};
    byId('d-issues').innerHTML=issues.slice(0,6).map(i=>`<div class="d-issue"><strong>${safe(i.name)}</strong>${safe(short(i.text))}</div>`).join('')||'<div class="d-muted">요약된 이슈가 없습니다.</div>';
    byId('d-issue-src').textContent=src;
    byId('d-action').hidden=!action; byId('d-action-t').textContent=action;
    const fxhist=histFor(data,'fx'),a=fxhist.at(-1)?.value,b=fxhist.at(-2)?.value;
    if(b&&a){const mom=(a/b-1)*100;if(Math.abs(mom)>=2)points.push({name:'USD/KRW',mom,kind:mom>0?'달러 결제 원가 상승 영향 점검':'달러 결제 원가 절감 여지 점검'});}
    points.sort((a,b)=>Math.abs(b.mom)-Math.abs(a.mom));
    byId('d-points').innerHTML=(points.slice(0,5).map(p=>`<div class="d-listitem"><div><strong>${safe(p.name)}</strong><small>${safe(p.kind)}</small></div><span class="d-badge ${tone(p.mom)}">${signed(p.mom)}</span></div>`).join(''))||'<div class="d-muted">전월 대비 설정 기준(원자재 3%, 환율 2%) 이상 변동한 지표가 없습니다.</div>';
  }
  async function load(){
    byId('d-updated').textContent='최신 데이터 불러오는 중…';
    try{const res=await fetch(`./data.json?t=${Date.now()}`,{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);const obj=await res.json();if(!obj.prices||!obj.history)throw Error('필수 데이터 없음');draw(obj);}
    catch(e){try{const embedded=JSON.parse(byId('snap').textContent||'{}');if(embedded.prices&&embedded.history){draw(embedded);byId('d-updated').textContent+=' · HTML 내 저장 데이터 사용';return;}}catch(_){}byId('d-updated').textContent='불러오기 실패';byId('d-metrics').innerHTML=`<div class="d-error">데이터를 불러올 수 없습니다. data.json 위치를 확인하세요. (${safe(e.message)})</div>`;}
  }
  byId('d-period').addEventListener('click',e=>{const b=e.target.closest('button[data-months]');if(!b)return;months=Number(b.dataset.months);byId('d-period').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));if(cache)chart(cache);});
  pane.addEventListener('click',e=>{const g=e.target.closest('[data-go]'); if(g) move(g.dataset.go||'prices');});
  byId('d-reload').addEventListener('click',load);
  byId('d-print').addEventListener('click',()=>window.print());
  load();
})();


(()=>{
'use strict';
const host=document.getElementById('tiles');
if(!host||document.getElementById('specialCostIndicators'))return;
const css=document.createElement('style');
css.textContent='.special-indicators{margin:24px 0}.special-indicators h3{font-size:18px;margin:0 0 6px}.special-indicators .intro{font-size:13px;color:var(--ink-3);margin:0 0 12px}.special-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(225px,1fr));gap:12px}.special-card{border:1px solid var(--line);border-radius:12px;padding:16px;background:var(--surface,transparent)}.special-card h4{font-size:15px;margin:0 0 8px}.special-card .value{font-size:23px;font-weight:700;margin:8px 0}.special-card .small{font-size:12px;color:var(--ink-3);line-height:1.6}.special-card .source{font-size:12px;margin-top:10px}.special-card a{text-decoration:underline}.special-card .label{font-size:12px;color:var(--ink-2)}';
document.head.appendChild(css);
const block=document.createElement('div');block.id='specialCostIndicators';block.className='special-indicators';
block.innerHTML='<h3>특수 소재 · 제조 노무비 지표</h3><p class="intro">시장 공시가격 및 정부 통계 기반 참고지표 · BP 실제 구매단가/공수단가와 구분</p><div class="special-grid" id="specialCostCards"></div>';
host.after(block);
const records=[
{id:'quartz',label:'고순도 석영사',value:5690.95,unit:'USD/t',date:'2026-10-27',spec:'중국산 도가니 내층용 · Al≤12 ppm',source:'SMM',url:'https://www-old.metal.com/Photovoltaic/202307130006',detail:'태양광 도가니용 공시 지표로 반도체 가공 석영 부품 견적가격과 다름',refresh:'출처 페이지 확인 기준 · 자동 수집 아님'},
{id:'alumina',label:'고순도 알루미나',value:15.87,unit:'USD/kg',date:'2026-10-23',spec:'4N(99.99%) · D50 0.5~1µm',source:'SMM',url:'https://www-old.metal.com/price/Base-Metals/Aluminum',detail:'중국 출고 기준 · 순도·입도에 따라 가격 차이 큼',refresh:'출처 페이지 확인 기준 · 자동 수집 아님'},
{id:'labor',label:'제조업 시간당 임금 지표',value:null,unit:'KRW/h',date:'',spec:'제조업 월평균 임금 ÷ 제조업 월평균 근로시간',source:'고용노동부 사업체노동력조사',url:'https://www.index.go.kr/unity/potal/main/EachDtlPageDetail.do?idx_cd=1485',detail:'제조업의 같은 기준월 임금·근로시간 확인 후 산출. 전체 산업 평균으로 대체하지 않음',refresh:'제조업 세부 통계 미확보 · 공식 통계 연계 필요'}
];
const cards=document.getElementById('specialCostCards');
for(const d of records){
const item=document.createElement('article');item.className='special-card';
const h=document.createElement('h4');h.textContent=d.label;item.appendChild(h);
const spec=document.createElement('div');spec.className='label';spec.textContent=d.spec;item.appendChild(spec);
const val=document.createElement('div');val.className='value';val.textContent=d.value==null?'통계 연계 대기':d.value.toLocaleString('en-US',{maximumFractionDigits:2})+' '+d.unit;item.appendChild(val);
const date=document.createElement('div');date.className='small';date.textContent=d.date?'가격 기준일 '+d.date:'공식 수치 확인 전';item.appendChild(date);
const detail=document.createElement('div');detail.className='small';detail.textContent=d.detail;item.appendChild(detail);
const status=document.createElement('div');status.className='small';status.textContent=d.refresh;item.appendChild(status);
const link=document.createElement('div');link.className='source';const a=document.createElement('a');a.href=d.url;a.target='_blank';a.rel='noopener noreferrer';a.textContent=d.source+' · 원문 확인';link.appendChild(a);item.appendChild(link);cards.appendChild(item);
}
})();
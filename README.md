# PSK Material Intelligence Board

원자재 시세 확인 및 동향 정리 보드 (GitHub Pages 공개판)

- `index.html` : 보드 화면
- `data.json`  : 원자재·환율 현재가와 2024년 이후 월평균. GitHub Actions가 30분마다 Investing.com 값으로 갱신합니다.
- `sus316.json` : SUS316L·304 합금할증료(Acerinox 공식 월별 PDF, EUR/kg). GitHub Actions가 새 달 발표를 자동으로 받아옵니다.
- `lme_kna.json` : 한국비철금속협회 LME 공식가 월평균(구리·납·아연·알루미늄·니켈·주석, 2018.1~). 협회 엑셀을 받을 때 수동 갱신.
- `dashboard.js` : Dashboard 화면 코드 원본 (실제 화면에는 index.html 안에 들어가 있음)

로그인·계정 관리·요청함·업데이트 버튼은 Supabase로 동작합니다.

⚠️ `index.html` 파일 이름은 바꾸지 마세요. 이 이름이어야 사이트 첫 화면이 열립니다.

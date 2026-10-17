// 사용법 · 튜토리얼 화면 내용
(function () {
  const BRIDGE = 'npx -y github:samcho93/microbit-genius-agent';

  function partsTable() {
    const rows = KIT.PARTS.map(p => {
      const pins = p.iface === 'i2c' ? 'I2C (P19 SCL · P20 SDA)' : p.iface === 'sonar' ? 'Trig · Echo (기본 P14 · P15)' : p.iface === 'none' ? '—' : p.iface === 'analog' ? 'P0 · P1 · P2 (아날로그)' : 'P8 · P12~P16 (또는 P0~P2)';
      return `<tr><td>${KitDraw.thumb(p.id)}</td><td><b>${p.name}</b><br><span class="muted small">${p.en}</span></td><td>${p.desc}</td><td>${pins}</td><td>${p.group === 'accessory' ? '부속품 (시뮬레이션 없음)' : simHow(p.id)}</td></tr>`;
    }).join('');
    return `<table class="part-table"><thead><tr><th></th><th>구성품</th><th>동작</th><th>연결 핀</th><th>시뮬레이터 조작</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function simHow(id) {
    return {
      crash: '무대의 스위치를 누르고 있기 / 「꾹 누르기」', pot: '슬라이더 (손잡이가 돌아감)', tmp36: '슬라이더로 −10~50°C',
      led: '코드 출력에 따라 빛남 (밝기 표시)', light: '슬라이더 0~1023', soil: '슬라이더 (흙이 젖는 모습)', oled: '코드가 그린 화면 표시',
      motor: '속도에 맞춰 프로펠러 회전', servo: '각도에 맞춰 혼 회전', keypad: '무대의 A~E 버튼 또는 패널 버튼', ring: '8개 LED 색 표시',
      pir: '무대 센서 클릭 / 「움직임 감지」 버튼', mq3: '슬라이더 0~1023', sonar: '슬라이더 2~300cm',
    }[id] || '';
  }

  function guide() {
    return `
<h1>사용법</h1>
<p><b>마이크로비트 지니어스 키트 에이전트</b>는 프롬프트(예: "날씨에 관한 예제")나 구성품 선택만으로 지니어스 키트용 micro:bit 예제를 만들고,
구성품을 자동으로 배치·배선해 <b>MakeCode</b> 또는 <b>MicroPython</b> 코드를 바로 시뮬레이션하는 웹앱입니다. 설치할 프로그램이 없습니다.</p>
<div class="toc"><a href="#g-screen">화면 구성</a><a href="#g-lesson">강의 교안 PDF</a><a href="#g-agent">에이전트(LLM) 설정</a><a href="#g-make">예제 만들기</a><a href="#g-sim">시뮬레이션</a><a href="#g-lang">MakeCode · MicroPython</a><a href="#g-real">실제 micro:bit 로</a><a href="#g-parts">구성품 · 핀</a><a href="#g-trouble">문제 해결</a><a href="#g-privacy">키 저장 · 개인정보</a></div>

<h2 id="g-screen">화면 구성</h2>
<div class="layout-fig"><div>🤖 에이전트<br><span class="muted small">구성품 선택 · 프롬프트 · 기록</span></div><div>📝 코드<br><span class="muted small">MakeCode 블록/JS · MicroPython</span></div><div>🔌 시뮬레이션<br><span class="muted small">자동 배치 · 센서 조절 · 시리얼</span></div></div>
<ul>
<li><b>에이전트</b> — 구성품 카드를 여러 개 고르거나 만들고 싶은 것을 글로 적고 「예제 만들기」. 결과는 기록에 남습니다.</li>
<li><b>코드</b> — 위쪽 <code>MakeCode | MicroPython</code> 으로 언어를 고릅니다. MakeCode 는 블록 그림과 JavaScript 를, MicroPython 은 파이썬 코드를 보여 주며 직접 고칠 수 있습니다.</li>
<li><b>시뮬레이션</b> — 예제에 쓰인 구성품이 확장보드 단자에 3핀 케이블로 연결된 모습으로 자동 배치됩니다. 「▶ 실행」은 지금 고른 언어의 코드를 실행합니다.</li>
</ul>

<h2 id="g-agent">에이전트(LLM) 설정</h2>
<p>오른쪽 위 <b>⚙ 설정</b>에서 예제를 만들 LLM 을 고릅니다. 기본은 <b>Claude CLI</b> 입니다.</p>
<table><thead><tr><th>방식</th><th>준비</th><th>특징</th></tr></thead><tbody>
<tr><td><b>Claude CLI</b> (기본)</td><td>① <a href="https://claude.com/claude-code" target="_blank" rel="noopener">Claude Code</a> 설치 후 터미널에서 <code>claude</code> 로 로그인<br>② 터미널에서 브리지 실행:<pre><code>${BRIDGE}</code></pre>③ 자동으로 열리는 <b>http://127.0.0.1:8787</b> 에서 사용 (브리지가 이 앱도 함께 열어 줌)</td><td>내 Claude 구독 로그인을 그대로 사용. 브리지는 <code>127.0.0.1</code> 에서만 열리고 이 웹앱 주소에서 온 요청만 받으며, Claude 를 <b>도구 없이</b> 실행합니다 (파일·명령 접근 없음). Node.js 18 이상 필요.</td></tr>
<tr><td><b>Anthropic API 키</b></td><td><a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener">콘솔</a>에서 키 발급 → 설정에 붙여넣기</td><td>브라우저에서 Claude API 로 직접 요청 (공식 SDK). 기본 모델 Claude Opus 5.5, Sonnet 5.5 · Haiku 5.5 선택 가능.</td></tr>
<tr><td><b>OpenAI API 키</b></td><td>키 입력 → 모델 드롭다운에서 선택</td><td>Chat Completions (JSON 응답 모드)</td></tr>
<tr><td><b>Google Gemini API 키</b></td><td>키 입력 → 모델 드롭다운에서 선택</td><td>generateContent (JSON 응답 모드)</td></tr>
<tr><td><b>오프라인</b></td><td>없음</td><td>내장 레시피 18가지 + 구성품 조합 생성기. 인터넷·키 없이 수업할 때 사용.</td></tr>
</tbody></table>
<p class="note"><b>모델 고르기</b> — API 키를 넣으면 각 회사의 모델 목록 API 로 <b>그 키로 지금 쓸 수 있는 모델</b>을 불러와 드롭다운에 보여 줍니다 (★추천 표시, 하루마다 자동 갱신, 「목록 새로 고침」으로 즉시). 저장된 모델이 더 이상 제공되지 않으면 추천 모델로 자동으로 바뀝니다. 목록에 없는 모델은 「직접 입력…」으로 넣을 수 있습니다.</p>
<p class="note"><b>왜 로컬 주소에서 쓰나요?</b> 공개 사이트(https://…github.io)에서 내 컴퓨터 주소(http://127.0.0.1)로 요청하는 것을 브라우저가 막거나 권한을 묻습니다 (Chrome 「로컬 네트워크 접근」, Safari 는 항상 차단). 브리지가 연 주소에서 쓰면 같은 출처라 이런 제한이 없습니다. 공개 사이트에서도 Chrome 이 권한을 물을 때 허용하면 연결됩니다. (설정·기록은 주소마다 따로 저장됩니다.)</p>
<p class="note">브리지 포트를 바꾸려면 <code>${BRIDGE} --port 9000</code> 처럼 실행하고 설정의 브리지 주소도 바꿉니다. 직접 배포한 다른 주소에서 쓰려면 <code>--origin https://내주소</code> 를 붙입니다.</p>

<h2 id="g-make">예제 만들기</h2>
<h3>1) 프롬프트로</h3>
<p>"날씨에 관한 예제", "다가가면 열리는 쓰레기통", "키패드로 연주하는 피아노", "가스가 새면 경보" 처럼 주제를 적고 「✨ 예제 만들기」 (Ctrl+Enter).</p>
<h3>2) 구성품 선택으로</h3>
<p>구성품 카드를 여러 개 고르고 프롬프트를 비운 채 「예제 만들기」를 누르면 고른 구성품을 모두 쓰는 예제를 만듭니다. 프롬프트와 함께 고르면 그 구성품을 반드시 사용합니다.</p>
<h3>여러 개 한 번에</h3>
<p>「예제 만들기」 옆 <b>개수</b>(1~5, 기본 1)를 늘리면 같은 요청으로 서로 다른 아이디어의 예제를 차례로 만듭니다. 뒤 예제는 앞에서 만든 제목과 겹치지 않게 만들고, 첫 예제가 바로 열리며 나머지는 카드의 「▶ 이 예제 열기」로 바꿔 봅니다. 모두 기록에도 남습니다.</p>
<h3>3) 고쳐 달라고 하기</h3>
<p>「현재 예제 고치기」를 체크하고 "온도 기준을 30도로 바꿔 줘", "OLED 에 시간도 표시해 줘" 처럼 적으면 지금 예제를 바탕으로 수정합니다.</p>
<p>만들어진 예제는 <b>제목 · 설명 · 시험 방법 · 배우는 개념</b>과 함께 표시되고, 구성품이 자동 배치된 뒤 바로 실행됩니다. 코드의 핀과 배치가 다르면 ⚠ 경고가 나옵니다.</p>

<h2 id="g-sim">시뮬레이션</h2>
<ul>
<li><b>입력 센서</b>: 「센서 조절」 패널의 슬라이더(조도·온도·토양·가스·가변저항·거리)와 버튼(충돌·PIR·키패드)으로 값을 바꿉니다. 충돌 센서·키패드·PIR 은 무대 그림을 직접 눌러도 됩니다.</li>
<li><b>확대 · 이동</b>: 무대 위에서 <b>마우스 휠</b>로 확대·축소, 빈 곳을 끌어 이동, 빈 곳 더블클릭(또는 오른쪽 아래 ⤢)으로 전체 보기. 터치 화면은 ＋/－ 버튼을 씁니다.</li>
<li><b>OLED 확대 화면</b>: 무대의 OLED 와 함께 「센서 조절」 칸에도 크게 확대한 OLED 화면이 나옵니다.</li>
<li><b>무대 고정</b>: 무대(회로 그림)는 시뮬레이션 칸 위쪽에 고정되어, 아래 센서 조절·시리얼 출력을 스크롤해도 결과가 계속 보입니다. 휴대폰에서는 실행/정지 버튼도 함께 고정됩니다.</li>
<li><b>출력 장치</b>: LED 밝기, DC 모터 회전 속도, 서보 각도, 레인보우 링 색, OLED 화면이 코드대로 움직입니다.</li>
<li><b>micro:bit</b>: 무대의 A·B 버튼, 로고, 0·1·2 단자를 누를 수 있고, 「micro:bit 내장 센서」에서 온도·빛·기울기·흔들기를 조절합니다. 소리(music)는 컴퓨터 스피커로 납니다.</li>
<li><b>시리얼 출력</b>: <code>print()</code> / <code>serial.writeLine()</code> 출력과 오류 메시지가 나옵니다.</li>
</ul>

<h2 id="g-lesson">강의 교안 PDF</h2>
<p>만든 예제로 학생에게 바로 가르칠 수 있는 <b>16:9 발표용 교안</b>을 PDF 로 만듭니다.</p>
<ul>
<li><b>여러 예제</b>: 「예제 만들기」가 끝나면 나오는 「📑 강의 교안 PDF 만들기 (N개 예제)」 → 그때 만든 예제 전부를 한 파일로.</li>
<li><b>지금 예제 하나</b>: 코드 칸 위의 「📑 교안 PDF」.</li>
<li><b>담기는 내용</b> (예제마다): 제목·구성품 → 학습 목표·생각 열기 → 준비물 → <b>회로 구성</b>(실행 중인 시뮬레이터 그림 + 단자·케이블 표) → 핵심 개념 → <b>MakeCode 블록 코드</b> → <b>MicroPython 코드</b> → 예제 설명(입력·출력) → <b>프로그램 설명</b>(단계별 코드 인용) → 실습 → 확인 문제(정답)·더 해 보기·지도 팁. 맨 앞 표지와 맨 뒤 「실제 micro:bit 로 옮기기」.</li>
<li>교안 글은 설정한 LLM(Claude CLI 등)이 예제 코드에 맞춰 씁니다. 오프라인이거나 실패하면 코드에서 만든 기본 교안을 씁니다. 한 번 만든 교안 글은 기록에 저장되어 다음에는 더 빨리 만들어집니다.</li>
<li>예제 하나에 약 12~15쪽, 예제당 수십 초 걸립니다 (LLM 글쓰기 + 블록 그림 + PDF).</li>
</ul>
<h2 id="g-lang">MakeCode · MicroPython</h2>
<table><thead><tr><th></th><th>MakeCode</th><th>MicroPython</th></tr></thead><tbody>
<tr><td>보기</td><td>블록 그림(공식 렌더러) + JavaScript 편집</td><td>파이썬 편집</td></tr>
<tr><td>확장</td><td>neopixel · OLED(Tinkertanker/pxt-oled-ssd1306) · sonar 확장 사용</td><td><code>neopixel</code> 내장, OLED 는 키트 전용 <code>oled.py</code></td></tr>
<tr><td>실제 장치로</td><td>「편집기에서 열기」→ MakeCode 에서 다운로드(.hex)</td><td>「저장」→ python.microbit.org 에 main.py (+ oled.py) 넣고 플래시</td></tr>
</tbody></table>
<p>시뮬레이터는 두 언어를 각각 실제 micro:bit 처럼 실행합니다. MakeCode 는 Static TypeScript 를 브라우저에서 해석하는 방식이라 MakeCode 의 모든 기능을 지원하지는 않습니다 (지원: basic, input, pins, led, music, radio, serial, control, images, neopixel, OLED, sonar).</p>

<h2 id="g-real">실제 micro:bit 로 옮기기</h2>
<ol>
<li>지니어스 키트 확장보드에 micro:bit 를 꽂고, 시뮬레이터 그림과 같은 단자에 3핀 케이블(검정 G · 빨강 V · 노랑 S)로 연결합니다. OLED 는 I2C 단자, 초음파는 4핀(VCC·Trig·Echo·GND) 케이블.</li>
<li><b>MakeCode</b>: 「편집기에서 열기 ↗」 → MakeCode 편집기에서 블록 확인 → 「다운로드」 → .hex 파일을 MICROBIT 드라이브에 복사.</li>
<li><b>MicroPython</b>: 「저장」으로 main.py 받기 → <a href="https://python.microbit.org/v/3" target="_blank" rel="noopener">python.microbit.org</a> 에서 열기 → OLED 를 쓰면 <a href="device/oled.py" download>oled.py</a> 도 프로젝트 파일에 추가 → 「Send to micro:bit」.</li>
</ol>

<h2 id="g-parts">구성품 · 핀</h2>
<p>지니어스 키트의 센서 14종 + 확장보드 + AAA 배터리 홀더. 확장보드 3핀 단자는 <code>P0 P1 P2 P8 P12 P13 P14 P15 P16</code>, OLED 는 I2C 단자를 씁니다. (P3·P4·P6·P7·P10 은 LED 화면, P5·P11 은 버튼과 겹쳐서 피합니다.)</p>
${partsTable()}

<h2 id="g-trouble">문제 해결</h2>
<ul>
<li><b>Claude CLI 에 로그인했는데 「브리지 꺼짐」으로 나옴</b> — 정상입니다. 브라우저는 보안상 내 컴퓨터의 <code>claude</code> 를 직접 실행할 수 없어서, 터미널에서 <code>${BRIDGE}</code> 를 실행해 브리지를 켜고, 자동으로 열리는 <b>http://127.0.0.1:8787</b> 에서 쓰세요. 켜면 몇 초 안에 「연결됨」으로 바뀝니다. 터미널 창을 닫으면 다시 꺼집니다. Safari 는 https 페이지에서 로컬 주소 접근을 막으므로 Chrome·Edge·Firefox 를 쓰세요.</li>
<li><b>"브리지에 연결할 수 없습니다"</b> — 브리지를 켠 터미널 창이 열려 있는지, 설정의 주소가 <code>http://127.0.0.1:8787</code> 인지 확인하세요. 브라우저가 "로컬 네트워크 접근" 권한을 물으면 허용합니다.</li>
<li><b>"claude CLI 를 찾지 못했습니다"</b> — 터미널에서 <code>claude --version</code> 이 되는지 확인하고, 처음이면 <code>claude</code> 를 실행해 로그인합니다.</li>
<li><b>블록이 안 보임</b> — 블록 그림은 makecode.microbit.org 에서 그립니다. 인터넷 연결을 확인하거나 JavaScript 탭에서 코드를 보세요.</li>
<li><b>코드 오류</b> — 시리얼 출력과 LED 화면에 오류가 나옵니다. 「현재 예제 고치기」로 오류 문구를 그대로 붙여 넣으면 에이전트가 고쳐 줍니다.</li>
<li><b>소리가 안 남</b> — 브라우저는 클릭한 뒤에만 소리를 낼 수 있습니다. 「▶ 실행」을 한 번 눌러 주세요.</li>
</ul>

<h2 id="g-privacy">키 저장 · 개인정보</h2>
<ul>
<li>API 키와 설정은 이 브라우저의 <code>localStorage</code> 에만 저장됩니다. 서버에 보관하지 않으며, 고른 LLM 제공자에게만 직접 전송됩니다.</li>
<li>공용 컴퓨터에서는 사용 후 설정의 「저장된 키 모두 지우기」를 누르세요.</li>
<li>만든 예제 기록과 코드도 이 브라우저에만 저장됩니다.</li>
</ul>
<p class="muted small">구성품 그림은 키트 실물 사진을 참고해 새로 그린 것입니다. micro:bit 는 Micro:bit Educational Foundation 의 상표이며, 이 앱은 키트 제조사와 관련이 없는 교육용 도구입니다.</p>`;
  }

  function tutorial() {
    return `
<h1>튜토리얼</h1>
<p>처음 사용하는 분을 위한 10분 따라하기입니다. 각 단계의 <b>따라하기</b> 버튼을 누르면 작업공간에서 그 동작을 대신 해 줍니다. (1~5단계는 API 키 없이 오프라인으로 동작)</p>
<ol class="steps">
<li><h3>화면 둘러보기</h3>
<p>작업공간은 <b>에이전트 · 코드 · 시뮬레이션</b> 세 부분이 한 화면에 있습니다. 왼쪽에서 만들고, 가운데서 코드를 보고, 오른쪽에서 실행합니다.</p>
<div class="do"><button class="btn sm" data-tut="go">작업공간 열기</button></div></li>

<li><h3>구성품 골라 예제 만들기</h3>
<p><b>조도 센서</b>와 <b>LED</b> 카드를 고르고 「예제 만들기」를 누르면 <i>자동 LED 가로등</i> 예제가 만들어지고 구성품이 확장보드에 자동으로 연결됩니다.</p>
<div class="do"><button class="btn sm primary" data-tut="parts">조도 센서 + LED 로 만들기</button></div></li>

<li><h3>센서 값을 바꿔 시뮬레이션하기</h3>
<p>「센서 조절」에서 <b>조도 밝기</b> 슬라이더를 200 아래로 내려 보세요. 무대의 LED 가 켜지고 micro:bit 화면이 바뀝니다. 다시 올리면 꺼집니다.</p>
<div class="do"><button class="btn sm" data-tut="dark">밤으로 만들기 (밝기 100)</button> <button class="btn sm" data-tut="day">낮으로 만들기 (밝기 800)</button></div></li>

<li><h3>MakeCode 와 MicroPython 바꿔 보기</h3>
<p>코드 위의 <code>MakeCode | MicroPython</code> 을 눌러 같은 예제를 두 언어로 비교해 보세요. 「▶ 실행」은 지금 보고 있는 언어로 실행합니다. MakeCode 는 「블록」 탭에서 블록 모양도 볼 수 있어요.</p>
<div class="do"><button class="btn sm" data-tut="python">MicroPython 으로 실행</button> <button class="btn sm" data-tut="makecode">MakeCode 블록 보기</button></div></li>

<li><h3>프롬프트로 만들기</h3>
<p>"날씨에 관한 예제" 를 입력하면 온도 센서 · 조도 센서 · OLED 를 쓰는 <i>미니 날씨 관측소</i>가 만들어집니다. TMP36 온도와 조도를 바꿔 OLED 화면과 해/구름 아이콘을 확인하세요.</p>
<div class="do"><button class="btn sm primary" data-tut="weather">"날씨에 관한 예제" 만들기</button></div></li>

<li><h3>LLM 에이전트 연결하기</h3>
<p>⚙ 설정에서 <b>Claude CLI</b>(기본) 또는 API 키를 설정하면 내장 예제에 없는 어떤 주제든 새로 만들어 줍니다. Claude CLI 는 터미널에서 다음을 실행하면 브리지가 켜지고 <b>http://127.0.0.1:8787</b> 에서 앱이 열립니다.</p>
<pre><code>${BRIDGE}</code></pre>
<div class="do"><button class="btn sm" data-tut="settings">설정 열기</button></div></li>

<li><h3>고쳐 달라고 하기</h3>
<p>「현재 예제 고치기」를 체크하고 "OLED 에 습도 대신 토양 수분도 보여 줘" 처럼 요청하면 지금 예제를 고칩니다. 오류가 나면 오류 문구를 그대로 붙여 넣어도 됩니다.</p>
<div class="do"><button class="btn sm" data-tut="modify">수정 요청 예시 넣기</button></div></li>

<li><h3>실제 micro:bit 로 옮기기</h3>
<p>MakeCode 는 「편집기에서 열기 ↗」로 MakeCode 편집기에 불러와 .hex 를 다운로드하고, MicroPython 은 「저장」한 main.py 를 python.microbit.org 에서 플래시합니다. 배선은 시뮬레이터 그림과 똑같이(노랑=S, 빨강=V, 검정=G) 연결하세요.</p>
<div class="do"><button class="btn sm" data-tut="guide-real">자세한 방법 보기</button></div></li>
</ol>`;
  }

  window.Docs = {
    render() {
      document.getElementById('guide-body').innerHTML = guide();
      document.getElementById('tutorial-body').innerHTML = tutorial();
    },
  };
})();

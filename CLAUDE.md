# CLAUDE.md — 마이크로비트 지니어스 키트 예제 생성 에이전트

이 파일은 이 저장소에서 작업하는 Claude Code(및 다른 개발자)를 위한 안내서입니다.

## 프로젝트 한 줄 요약

**설치 없이 브라우저에서 쓰는** 정적 웹앱. 프롬프트("날씨에 관한 예제")나 구성품 선택으로
ICBanQ **마이크로비트 지니어스 키트**(에듀집 제품 698d2c90…) 구성품을 쓰는 micro:bit V2 예제를
**MakeCode(JavaScript) + MicroPython** 두 언어로 만들고, 구성품을 자동 배치·배선해 그 자리에서 시뮬레이션한다.
GitHub Pages(`https://samcho93.github.io/microbit-genius-agent/`)로 배포된다.

## 핵심 제약 (바꾸기 전에 꼭 확인)

- **빌드 단계 없음.** 순수 HTML/CSS/바닐라 JS(IIFE + `window.*` 전역). 번들러·npm 의존성 추가 금지.
  외부 라이브러리는 CDN(cdnjs, jsdelivr)에서 **정확한 버전**으로만 불러온다.
- **로컬 설치 없이 동작**해야 한다. 유일한 예외는 선택 사항인 Claude CLI 브리지(`bridge/`, 의존성 0, `npx` 로 실행).
- **API 키는 브라우저 localStorage(`mgka.settings`)에만** 저장하고, 해당 LLM 제공자에게만 직접 보낸다. 서버로 보내거나 URL 에 넣지 않는다.
- LED 5×5 화면과 OLED 글꼴은 **한글을 표시할 수 없다** → 생성 코드의 표시 문자열은 영어/숫자, 주석·설명은 한국어.
- 두 언어 코드는 **같은 구성품·같은 핀·같은 동작**이어야 한다 (`AgentPrompt.check` 가 핀 불일치를 경고).

## 디렉터리 구조

```
index.html              한 화면 작업공간(에이전트 | 코드 | 시뮬레이션) + 사용법 + 튜토리얼 + 설정 대화상자
css/app.css             모든 스타일 (밝은/어두운 테마 토큰, 반응형)
js/
  sim/                  micro:bit 시뮬레이터 코어 (samcho93/appMicroBit 에서 가져와 확장)
    core.js             MB 전역: 이벤트 버스(on/off/emit), 핀 상태, 5x5 디스플레이
    board.js            micro:bit V2 앞면 SVG (MBBoard)
    sensors.js audio.js radio.js datalog.js fs.js font.js
    runtime.js          Skulpt 로 MicroPython 실행, `_mb` 브리지 모듈 (+ pulse_in, oled 추가)
    makecode.js         MakeCode 실행기 MCRT (아래 참고)
  kit/
    catalog.js          KIT: 구성품 14+1종 정의, 핀 규칙, assignPins(), promptCatalog()
    draw.js             KitDraw: 구성품 SVG 그림(실물 사진 참고), 썸네일, 공용 <defs>
    devices.js          MB.kit(센서 값→핀, 핀→액추에이터 상태), MB.oled(128x64 프레임버퍼)
    stage.js            Stage: 무대 자동 배치(슬롯), 3핀 케이블 배선, 조절 패널
  agent/
    templates.js        KitTemplates: 오프라인 레시피 18종 + 구성품 조합 생성기(compose)
    prompt.js           AgentPrompt: 시스템 프롬프트, JSON 추출, normalize/check
    providers.js        Agent: Settings(localStorage), 제공자(claude-cli/anthropic/openai/gemini/offline), generate()
  ui/
    blocks.js           MCBlocks: makecode.microbit.org 문서 렌더러로 블록 그림, MakeCode 편집기 가져오기
    docs.js             Docs: 사용법·튜토리얼 HTML
    lesson.js           Lesson: 강의 교안 PDF (LLM/오프라인 교안 글 → 1280x720 HTML 슬라이드 → html2canvas → jsPDF)
  app.js                화면 전환(#workspace/#guide/#tutorial), 편집기(CodeMirror 5), 실행, 기록, 설정, 튜토리얼 동작
py/                     시뮬레이터용 MicroPython 모듈 (microbit, music, neopixel, machine, oled …)
device/oled.py          실제 micro:bit 용 SSD1306 드라이버 (py/oled.py 와 같은 API)
lib/                    Skulpt 1.2.0 (MIT)
bridge/claude-bridge.mjs  Claude CLI 로컬 브리지 (package.json bin)
assets/icon.svg
```

## 데이터 흐름

1. 사용자가 프롬프트/구성품 선택 → `Agent.generate({prompt, selected, lang, current})`
2. 제공자가 `AgentPrompt.systemPrompt()` + `userPrompt()` 로 LLM 호출 → JSON 텍스트
3. `AgentPrompt.extractJson` → `normalize` (구성품 필터, `KIT.assignPins` 로 핀 확정, `check` 로 경고)
4. 예제 객체 `{title, summary, components:[{type, label, pins}], makecode, micropython, howToTest, learn, warnings, source}`
5. `App.applyExample` → `Stage.setup`(MB.kit.setup + 무대 + 조절 패널) → 편집기 → 블록 렌더 → 자동 실행

예제 개수(`#gen-count`, 1~5)가 2 이상이면 `app.js generate()` 가 같은 요청을 차례로 n 번 부르며 `variant:{i,n}`·`avoid`(앞 제목)·`skip`(앞 레시피 id)을 넘긴다. 첫 예제만 바로 적용·실행하고 나머지는 카드의 「열기」로 적용. 오류가 나면 남은 개수는 건너뛴다.

오프라인 제공자는 2~3 단계 대신 `KitTemplates.generate(prompt, selected)` 를 쓴다.

## 시뮬레이터 연결 규칙

- 입력 센서는 `MB.pins[n].analogIn` 에 값을 넣는다 (`MB.kit.apply`). 디지털 읽기는 `analogIn > 511`.
  - 충돌 센서: 풀업 → 눌리면 0 / PIR: 감지 1 / TMP36: `(°C*10+500)*1023/3300` / AD 키패드: A=5, B=50, C=95, D=140, E=545, 없음 1023
- 출력은 `MB.pins[n].digitalOut / analogOut / servo / period` 를 읽는다 (`MB.kit.output`). 서보는 MakeCode 가 `p.servo` 를 직접,
  MicroPython 은 `write_analog` 듀티(20ms 주기)에서 각도를 역산.
- 초음파: MicroPython `machine.time_pulse_us(echo,1)` → `_mb.pulse_in` → `MB.kit.pulseIn` (거리×58µs). MakeCode `sonar.ping` → `MB.kit.sonarCm`.
- 네오픽셀: 양쪽 모두 `MB.emit('neopixel', {pin, pixels})` → 링 장치.
- OLED: MicroPython `import oled`(py/oled.py → `_mb.oled(op,args)`), MakeCode `OLED.*`(pxt-oled-ssd1306 API) → `MB.oled`.
  MicroPython 은 `oled.show()` 를 불러야 화면에 반영(실제 장치와 동일), MakeCode OLED 는 즉시 반영(확장과 동일).
- 새 실행 전 `MB.runtime.resetDevice()` 가 `MB.emit('reset')` 을 보내 서보·OLED 를 초기화한다.

## MakeCode 실행기 (js/sim/makecode.js)

- sucrase(타입 제거) → acorn(AST) → `asyncify`(모든 함수 async, 모든 호출에 await, 반복문 맨 앞에 `await __y()`) → astring → `new Function` + `with(env)`.
- `env` 에 basic/input/pins/led/music/radio/serial/control/images/neopixel/OLED/sonar 와 열거형을 넣는다. 지원하지 않는 API 는 여기에 추가.
- 배열 콜백(forEach/map 등)의 함수는 동기로 둔다 → 그 안에서 블로킹 API 를 부르면 기다리지 않음 (프롬프트에서 금지).
- 이벤트(버튼 A/B/AB 는 뗄 때, 제스처, 핀/로고 터치, 무선)는 `spawn` 으로 별도 실행. `basic.forever` 는 20ms 간격.

## 에이전트(LLM) 제공자

| id | 방식 | 비고 |
|---|---|---|
| `claude-cli` (기본) | `http://127.0.0.1:8787` 브리지에 POST `/generate` → NDJSON 스트림 | 브리지가 `claude -p --output-format stream-json --tools "" --system-prompt-file …` 실행 |
| `anthropic` | `@anthropic-ai/sdk@0.130.0` ESM(jsdelivr), `dangerouslyAllowBrowser` | 기본 `claude-opus-5-5`, `output_config.effort`, Opus/Sonnet 5.5 는 `fallbacks:"default"`(beta `server-side-fallback-2026-07-01`) |
| `openai` | Chat Completions `response_format: json_object` | 모델명 자유 입력 |
| `gemini` | `generateContent` + `x-goog-api-key` 헤더 | 모델명 자유 입력 |
| `offline` | `KitTemplates.generate` | 키·네트워크 없이 |

브리지는 저장소 루트의 웹앱도 정적 파일로 제공한다(`http://127.0.0.1:8787/`, 시작 시 브라우저 자동 열기, `--no-open`). 공개 https 사이트 → http 루프백 요청은 Chrome 로컬 네트워크 접근(LNA) 권한·Safari 혼합 콘텐츠 차단에 걸리므로, `providers.js` 의 `bridgeBase` 가 루프백에서 열린 페이지면 같은 출처(`/health`, `/generate`)를 쓴다. 그래서 `package.json` 에 `files` 제한을 두지 않는다(npx 로 웹앱 전체가 내려와야 함). `/bridge/`·숨김 파일은 제공하지 않는다.

브리지 보안: 127.0.0.1 바인딩, Origin 허용 목록(`https://samcho93.github.io`, `http://localhost:*`, `--origin` 추가), 도구 비활성화, 세션 저장 안 함.

## 강의 교안 (js/ui/lesson.js)

- 예제마다 `buildLesson`(현재 제공자에 `Agent.complete` 로 교안 JSON 요청, 실패·오프라인이면 `offlineLesson`) → `ex.lesson` 에 저장(기록에도).
- 회로 그림: `App.applyExample` 로 무대에 놓고 MakeCode 를 1.8초 실행한 모습을 `captureStage`(무대 SVG 복제 + `KitDraw.DEFS` + CSS 색 속성화 → PNG).
- 블록: `MCBlocks.render`(layout 1 = 세로 정렬) → PNG → 높이가 크면 `slicePng` 로 여러 쪽.
- html2canvas 1.4.1 · jsPDF 2.5.1 은 cdnjs 에서 필요할 때만 불러옴. 한글은 이미지로 그려지므로 글꼴 포함이 필요 없음.
- 끝나면 원래 예제를 다시 적용. 테스트용 hooks: `onPage(canvas,i)`, `onPdf(blob,name)`(저장 대신).

## 자주 하는 작업

- **구성품 추가**: `catalog.js` PARTS 항목 → `draw.js` 그림(anchor 포함) → `devices.js` apply/output → `stage.js` render/조절 패널 → (필요시) `makecode.js` API, `py/` 모듈 → `docs.js` simHow.
- **레시피 추가**: `templates.js` 에 `add({...})`. MakeCode·MicroPython 둘 다 작성, `pyHeader/mcHeader` 가 공용 도우미(servo(), distance(), read_key(), temp_c(), readKey(), tempC(), distance())를 넣어 준다.
- **프롬프트 수정**: `prompt.js` `systemPrompt()`. 출력 JSON 형식을 바꾸면 `normalize` 도 같이.
- **캐시 무효화**: `index.html` 의 `?v=` 값을 올린다.

## 로컬 실행 · 검증

```bash
python -m http.server 8790          # 저장소 루트에서 → http://localhost:8790
node bridge/claude-bridge.mjs       # (선택) Claude CLI 브리지
```

검증 체크리스트 (브라우저 콘솔에서 가능):
- 모든 레시피를 두 언어로 실행해 `MB.on('error')` 가 비어 있는지 (`KitTemplates.RECIPES` 순회)
- 센서 값 변경 → 출력 장치 상태(`MB.kit.output`, 링 `d.ring`, `MB.oled.shown`)
- 블록 렌더(인터넷 필요), 오프라인 생성, 설정 저장/키 삭제, 모바일 폭(≤860px) 레이아웃

## 배포

`main` 브랜치 루트를 GitHub Pages 로 배포(`.nojekyll` 포함). 푸시하면 자동 반영.
`npx -y github:samcho93/microbit-genius-agent` 는 이 저장소의 `package.json` `bin` 으로 브리지를 실행한다.

## 코드 스타일

- 2칸 들여쓰기, 세미콜론, 작은따옴표. 주석은 한국어로 짧게.
- 각 파일은 IIFE 로 감싸고 공개 API 는 `window.이름` 한 곳에.
- 생성 예제 코드(템플릿)는 4칸 들여쓰기(MakeCode/파이썬 관례).

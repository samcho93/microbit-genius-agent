# 🤖 마이크로비트 지니어스 키트 예제 생성 에이전트

> 프롬프트 한 줄이나 구성품 선택만으로 **micro:bit 지니어스 키트** 예제를 만들고,
> 구성품이 자동으로 배치·배선된 시뮬레이터에서 **MakeCode** 와 **MicroPython** 코드를 바로 실행하는 웹앱

👉 **바로 사용: https://samcho93.github.io/microbit-genius-agent/** (설치 없음)

- 대상 키트: [마이크로비트 지니어스 키트 (에듀집)](https://www.edzip.kr/product-detail/698d2c90dca5e0f3eb20eb06) — 센서 14종 + 확장보드
- 대상 보드: BBC micro:bit V2
- 에이전트: **Claude CLI(기본)** · Anthropic API · OpenAI · Google Gemini · 오프라인(내장 예제)

---

## 주요 기능

| | 기능 |
|---|---|
| 🧠 **예제 생성 에이전트** | "날씨에 관한 예제"처럼 주제를 적거나, 구성품 카드를 여러 개 골라 「예제 만들기」. 「현재 예제 고치기」로 대화하듯 수정 |
| 🧩 **구성품 그림** | 키트 실물 사진을 참고해 그린 14종 모듈(흰색 퍼즐형 기판 + 3핀 커넥터) — 선택 카드와 시뮬레이터에서 사용 |
| 🔌 **자동 배치 · 배선** | 예제에 맞는 구성품이 확장보드 주위에 자동 배치되고 G(검정)·V(빨강)·S(노랑) 케이블로 연결됨. 핀 충돌은 자동 재배정 |
| ▶ **시뮬레이션** | MakeCode·MicroPython 모두 실행. 센서 슬라이더/버튼으로 입력, LED·모터·서보·RGB 링·OLED 가 실시간 동작 |
| 🧱 **MakeCode 블록** | 공식 렌더러로 한국어 블록 그림 표시, 「MakeCode 에서 열기」로 편집기에 불러와 .hex 다운로드 |
| 🐍 **MicroPython** | python.microbit.org 와 같은 문법, OLED 는 키트 전용 `oled.py`(실제 장치용 드라이버 제공) |
| 📚 **사용법 · 튜토리얼** | 별도 메뉴. 튜토리얼은 버튼 하나로 단계를 따라 해 볼 수 있음 |
| 🔐 **키 로컬 저장** | API 키·설정은 브라우저 localStorage 에만 저장 |

한 화면 구성:

```
┌──────────────┬────────────────────────┬──────────────────────────────┐
│ 🤖 에이전트   │ 📝 코드                 │ 🔌 시뮬레이션                  │
│ 구성품 선택   │ [MakeCode | MicroPython]│  micro:bit + 확장보드          │
│ 프롬프트      │ 블록 / JavaScript / 파이썬│  + 자동 배치된 구성품 · 케이블   │
│ 대화 기록     │ 예제 설명 · 시험 방법     │  센서 조절 · 시리얼 출력         │
└──────────────┴────────────────────────┴──────────────────────────────┘
```

## 빠른 시작

1. https://samcho93.github.io/microbit-genius-agent/ 접속
2. 상단 **튜토리얼** 메뉴의 「따라하기」 버튼으로 10분 체험 (키 없이 오프라인 예제로 동작)
3. ⚙ **설정**에서 LLM 연결 → 어떤 주제든 새 예제 생성

### LLM 연결 방법

**① Claude CLI (기본, 내 Claude 로그인 사용)**

브라우저는 로컬 프로그램을 직접 실행할 수 없으므로, 작은 브리지를 켜 둡니다 (의존성 없음, Node.js 18+).

```bash
# 처음 한 번: Claude Code 설치 후 로그인
claude

# 브리지 실행 (이 저장소에서 바로, 설치 없이)
npx -y github:samcho93/microbit-genius-agent
```

브리지가 켜지면 브라우저에서 **http://127.0.0.1:8787** 이 자동으로 열립니다 — 브리지가 웹앱도 함께 제공하므로 이 주소에서 쓰면 바로 연결됩니다.

> **왜 로컬 주소?** 공개 사이트(https://…github.io)에서 `http://127.0.0.1` 로 요청하면 브라우저가 막거나(Safari, 일부 임베디드 브라우저) 「로컬 네트워크 접근」 권한을 묻습니다(Chrome). 권한을 허용하면 공개 사이트에서도 연결되지만, 로컬 주소가 가장 확실합니다. 설정·기록은 주소마다 따로 저장됩니다.

 브리지는 `127.0.0.1:8787` 에서만 열리고, 이 웹앱 주소(Origin)에서 온 요청만 처리하며,
Claude 를 **도구 없이**(`--tools ""`) 실행하므로 파일이나 명령에 접근하지 않습니다.

| 옵션 | 설명 |
|---|---|
| `--port 9000` | 포트 변경 (설정의 브리지 주소도 변경) |
| `--origin https://내주소` | 직접 배포한 다른 주소 허용 (쉼표로 여러 개) |
| `--no-open` | 브라우저를 자동으로 열지 않음 |
| `CLAUDE_BIN=/path/to/claude` | claude 실행 파일 경로 지정 |

**② API 키** — 설정에서 제공자를 고르고 키를 붙여 넣습니다.

| 제공자 | 기본 모델 | 비고 |
|---|---|---|
| Anthropic | `claude-opus-5-5` (Sonnet 5.5 · Haiku 5.5 선택) | 공식 TypeScript SDK 를 브라우저에서 직접 사용, 스트리밍 |
| OpenAI | `gpt-5` (자유 입력) | JSON 응답 모드 |
| Google Gemini | `gemini-2.5-flash` (자유 입력) | JSON 응답 모드 |

**③ 오프라인** — 키 없이 내장 레시피 18종과 구성품 조합 생성기 사용.

## 지원 구성품과 핀

| 구성품 | 인터페이스 | 기본 핀 | 시뮬레이터 조작 |
|---|---|---|---|
| 충돌 센서 | 디지털(풀업, 눌림=0) | P8 | 무대에서 누르기 / 버튼 |
| 가변 저항 | 아날로그 | P1·P2·P0 | 슬라이더 |
| TMP36 온도 센서 | 아날로그 (°C=(값×3300/1023−500)/10) | P1·P2·P0 | 슬라이더(°C) |
| LED | 디지털/PWM | P8… | 밝기 표시 |
| 조도 센서 | 아날로그 | P1·P2·P0 | 슬라이더 |
| 토양 수분 센서 | 아날로그 | P1·P2·P0 | 슬라이더 |
| OLED 128×64 | I2C | P19 SCL · P20 SDA | 화면 표시 |
| DC 모터(팬) | PWM 0~1023 | P13… | 프로펠러 회전 |
| 서보 모터 SG90 | PWM 50Hz 0~180° | P15… | 혼 회전 |
| AD 키패드 (A~E) | 아날로그 1핀 | P1·P2·P0 | A~E 버튼 |
| 레인보우 LED 링 (8) | NeoPixel | P16 | 색 표시 |
| PIR 인체 감지 | 디지털(감지=1) | P12 | 클릭/버튼 |
| MQ3 가스 센서 | 아날로그 | P1·P2·P0 | 슬라이더 |
| 초음파 HC-SR04 | Trig/Echo | P14 / P15 | 거리 슬라이더 |
| AAA 배터리 홀더 | — | — | 부속품 |

확장보드 3핀 단자: `P0 P1 P2 P8 P12 P13 P14 P15 P16` (P3·P4·P6·P7·P10 은 LED 화면, P5·P11 은 버튼과 겹쳐 사용하지 않음).

## 내장 예제 (오프라인)

미니 날씨 관측소 · 똑똑이 화분 · 자동 LED 가로등 · 온도 감지 선풍기 · 바람이 조절되는 선풍기 · 가스 누출 경보기 ·
우리 강아지 급식기 · 스마트 쓰레기통 · 핸드 드라이어 · 전자 피아노 · 주차 거리 경고기 · 침입 감지 경보기 ·
비밀번호 도어락 · 무지개 무드등 · 자동 블라인드 · 음주 측정기 · 디지털 온도계 · 초음파 줄자 · 충돌 횟수 카운터
(+ 임의 구성품 조합 생성기)

## 실제 micro:bit 로 옮기기

- **MakeCode**: 「MakeCode 에서 열기 ↗」 → 편집기에서 「다운로드」 → `.hex` 를 MICROBIT 드라이브에 복사.
  확장: neopixel(`microsoft/pxt-neopixel`), OLED(`Tinkertanker/pxt-oled-ssd1306`), sonar(`microsoft/pxt-sonar`)
- **MicroPython**: 「저장」→ `main.py` 를 [python.microbit.org](https://python.microbit.org/v/3) 에서 열기.
  OLED 를 쓰면 [`device/oled.py`](device/oled.py) 도 프로젝트에 추가.

## 아키텍처

```
브라우저 (GitHub Pages, 정적 파일)
 ├─ 에이전트 ── Claude CLI 브리지(127.0.0.1) ─ claude -p
 │            ├ Anthropic / OpenAI / Gemini API (사용자 키로 직접)
 │            └ 오프라인 레시피
 ├─ 응답 JSON → 핀 배정(assignPins) · 검증 → 예제
 ├─ 무대(Stage): 구성품 SVG 자동 배치 + 배선
 └─ 실행
     ├ MicroPython: Skulpt + micro:bit 모듈(py/) + 키트 장치 모델
     └ MakeCode: sucrase→acorn→async 변환→astring + micro:bit API 심(shim)
```

자세한 구조와 개발 규칙은 [CLAUDE.md](CLAUDE.md) 를 참고하세요.

## 로컬 개발

```bash
git clone https://github.com/samcho93/microbit-genius-agent.git
cd microbit-genius-agent
python -m http.server 8790     # http://localhost:8790
node bridge/claude-bridge.mjs  # (선택) Claude CLI 브리지
```

빌드 단계가 없습니다. 파일을 고치고 새로 고침하면 됩니다 (캐시 문제 시 `index.html` 의 `?v=` 값 증가).

## 개인정보 · 보안

- API 키와 설정, 예제 기록은 이 브라우저의 `localStorage` 에만 저장됩니다 (서버 없음).
- 키는 선택한 LLM 제공자에게만 HTTPS 로 직접 전송됩니다. 공용 PC 에서는 설정의 「저장된 키 모두 지우기」를 사용하세요.
- Claude CLI 브리지는 로컬 루프백에서만 열리고 허용된 Origin 만 받으며, Claude 를 도구 없이 실행합니다.

## 라이선스 · 출처

- 코드: MIT
- 시뮬레이터 코어: [samcho93/appMicroBit](https://github.com/samcho93/appMicroBit) 기반
- [Skulpt](https://skulpt.org) (MIT), [CodeMirror 5](https://codemirror.net/5/) (MIT), sucrase · acorn · astring (MIT), MakeCode 블록 렌더러(makecode.microbit.org)
- 구성품 그림은 키트 실물 사진을 참고해 새로 그렸습니다. micro:bit 는 Micro:bit Educational Foundation 의 상표이며,
  이 프로젝트는 키트 제조사(아이씨뱅큐)·에듀집과 관련 없는 교육용 도구입니다.

// 오프라인 예제 생성기 — LLM 없이도 동작하는 내장 레시피 + 구성품 조합 생성기
// 각 레시피는 같은 동작을 MakeCode(JavaScript) 와 MicroPython 두 가지로 만듦
(function () {
  // 핀 도우미: 배정된 구성품 목록에서 핀 이름을 꺼냄
  function pinKit(list) {
    const get = (type, role) => { const c = list.find(x => x.type === type); return c && c.pins[role || 'sig']; };
    const num = (type, role) => String(get(type, role) || 'P0').replace('P', '');
    return {
      P: (t, r) => get(t, r),
      py: (t, r) => 'pin' + num(t, r),
      d: (t, r) => 'DigitalPin.P' + num(t, r),
      a: (t, r) => 'AnalogPin.P' + num(t, r),
      has: t => list.some(x => x.type === t),
    };
  }

  // ---------- 부품별 코드 조각 ----------
  const PY_HELP = {
    servo: k => `${k.py('servo')}.set_analog_period(20)\n\n\ndef servo(angle):\n    # 0~180도 → 0.5~2.5ms 펄스\n    ${k.py('servo')}.write_analog(int(26 + angle * 102 / 180))\n`,
    sonar: k => `\n\ndef distance():\n    # 초음파: Trig 10µs 펄스 → Echo 펄스 길이 / 58 = cm\n    ${k.py('sonar', 'trig')}.write_digital(0)\n    ${k.py('sonar', 'trig')}.write_digital(1)\n    utime.sleep_us(10)\n    ${k.py('sonar', 'trig')}.write_digital(0)\n    t = machine.time_pulse_us(${k.py('sonar', 'echo')}, 1, 30000)\n    if t < 0:\n        return 999\n    return round(t / 58)\n`,
    keypad: k => `\n\ndef read_key():\n    # AD 키패드: 버튼마다 아날로그 값이 다름\n    v = ${k.py('keypad')}.read_analog()\n    if v < 10:\n        return 'A'\n    if 40 <= v <= 60:\n        return 'B'\n    if 80 <= v <= 110:\n        return 'C'\n    if 130 <= v <= 150:\n        return 'D'\n    if 530 <= v <= 560:\n        return 'E'\n    return ''\n`,
    tmp36: k => `\n\ndef temp_c():\n    # TMP36: 전압(mV) = 값 × 3300 / 1023, 온도 = (mV - 500) / 10\n    return round((${k.py('tmp36')}.read_analog() * 3300 / 1023 - 500) / 10)\n`,
  };
  const MC_HELP = {
    keypad: k => `// AD 키패드: 버튼마다 아날로그 값이 다름\nfunction readKey() {\n    let v = pins.analogReadPin(${k.a('keypad')})\n    if (v < 10) return "A"\n    if (v >= 40 && v <= 60) return "B"\n    if (v >= 80 && v <= 110) return "C"\n    if (v >= 130 && v <= 150) return "D"\n    if (v >= 530 && v <= 560) return "E"\n    return ""\n}\n`,
    tmp36: k => `// TMP36: 전압(mV) = 값 × 3300 / 1023, 온도 = (mV - 500) / 10\nfunction tempC() {\n    return Math.round((pins.analogReadPin(${k.a('tmp36')}) * 3300 / 1023 - 500) / 10)\n}\n`,
    sonar: k => `function distance() {\n    return sonar.ping(${k.d('sonar', 'trig')}, ${k.d('sonar', 'echo')}, PingUnit.Centimeters)\n}\n`,
  };

  function pyHeader(k, extra) {
    const imp = ['from microbit import *'];
    if (k.has('ring')) imp.push('import neopixel');
    if (k.has('oled')) imp.push('import oled');
    if (k.has('sonar')) imp.push('import machine', 'import utime');
    for (const e of extra || []) if (!imp.includes(e)) imp.push(e);
    let s = imp.join('\n') + '\n';
    if (k.has('ring')) s += `\nnp = neopixel.NeoPixel(${k.py('ring')}, 8)\n`;
    if (k.has('oled')) s += `oled.init()\n`;
    if (k.has('crash')) s += `${k.py('crash')}.set_pull(${k.py('crash')}.PULL_UP)  # 충돌 센서: 누르면 0\n`;
    if (k.has('servo')) s += '\n' + PY_HELP.servo(k);
    for (const t of ['sonar', 'keypad', 'tmp36']) if (k.has(t)) s += PY_HELP[t](k);
    return s;
  }
  function mcHeader(k) {
    let s = '';
    if (k.has('ring')) s += `let strip = neopixel.create(${k.d('ring')}, 8, NeoPixelMode.RGB)\n`;
    if (k.has('oled')) s += `OLED.init(128, 64)\n`;
    if (k.has('crash')) s += `pins.setPull(${k.d('crash')}, PinPullMode.PullUp)\n`;
    for (const t of ['keypad', 'tmp36', 'sonar']) if (k.has(t)) s += MC_HELP[t](k);
    return s;
  }

  // ---------- 레시피 ----------
  const R = [];
  const add = r => R.push(r);

  add({
    id: 'weather', title: '미니 날씨 관측소', parts: ['tmp36', 'light', 'oled'],
    keywords: ['날씨', '기상', '관측', '기온', '맑', '흐림', '일기'],
    summary: 'TMP36 온도 센서와 조도 센서로 기온과 햇빛을 재서 OLED 에 보여 주고, LED 화면에 맑음(해)·흐림(구름) 아이콘을 표시합니다.',
    howToTest: ['조절 패널에서 TMP36 온도와 조도 밝기를 바꿔 보세요.', '밝기가 500 보다 크면 해 모양, 작으면 구름 모양이 나타납니다.', 'OLED 에 온도와 밝기 숫자가 1초마다 바뀝니다.'],
    learn: ['아날로그 입력', '센서 값 변환(TMP36)', 'OLED 출력', '조건문'],
    build: k => ({
      makecode: `${mcHeader(k)}
basic.forever(function () {
    let t = tempC()
    let light = pins.analogReadPin(${k.a('light')})
    OLED.clear()
    OLED.writeStringNewLine("WEATHER STATION")
    OLED.writeStringNewLine("Temp : " + t + " C")
    OLED.writeStringNewLine("Light: " + light)
    if (light > 500) {
        OLED.writeStringNewLine("Sunny")
        basic.showLeds(\`
            # . # . #
            . # # # .
            # # # # #
            . # # # .
            # . # . #
            \`)
    } else {
        OLED.writeStringNewLine("Cloudy")
        basic.showLeds(\`
            . . . . .
            . # # . .
            # # # # .
            # # # # #
            . . . . .
            \`)
    }
    basic.pause(1000)
})
`,
      micropython: `${pyHeader(k)}
SUN = Image('90909:09990:99999:09990:90909')
CLOUD = Image('00000:09900:99990:99999:00000')

while True:
    t = temp_c()
    light = ${k.py('light')}.read_analog()
    oled.clear()
    oled.text('WEATHER STATION', 0, 0)
    oled.text('Temp : ' + str(t) + ' C', 0, 16)
    oled.text('Light: ' + str(light), 0, 28)
    if light > 500:
        oled.text('Sunny', 0, 44, 2)
        display.show(SUN)
    else:
        oled.text('Cloudy', 0, 44, 2)
        display.show(CLOUD)
    oled.show()
    sleep(1000)
`,
    }),
  });

  add({
    id: 'plant', title: '똑똑이 화분', parts: ['soil', 'servo', 'led'],
    keywords: ['화분', '식물', '물', '토양', '수분', '정원', '농장', '물주기'],
    summary: '토양 수분 센서로 흙이 마르면 LED 경고등을 켜고 서보 모터로 물 밸브를 열어 줍니다. LED 화면에는 식물의 기분을 표시해요.',
    howToTest: ['토양 수분 값을 300 아래로 내려 보세요 → 슬픈 얼굴, LED 켜짐, 서보 90°.', '값을 다시 올리면 웃는 얼굴과 함께 밸브가 닫힙니다.'],
    learn: ['아날로그 입력', '조건문', '서보 각도 제어', '디지털 출력'],
    build: k => ({
      makecode: `${mcHeader(k)}
basic.forever(function () {
    let soil = pins.analogReadPin(${k.a('soil')})
    serial.writeValue("soil", soil)
    if (soil < 300) {
        // 흙이 말랐어요 → 경고등 + 물 밸브 열기
        basic.showIcon(IconNames.Sad)
        pins.digitalWritePin(${k.d('led')}, 1)
        pins.servoWritePin(${k.a('servo')}, 90)
    } else {
        basic.showIcon(IconNames.Happy)
        pins.digitalWritePin(${k.d('led')}, 0)
        pins.servoWritePin(${k.a('servo')}, 0)
    }
    basic.pause(500)
})
`,
      micropython: `${pyHeader(k)}
while True:
    soil = ${k.py('soil')}.read_analog()
    print('soil:', soil)
    if soil < 300:
        # 흙이 말랐어요 → 경고등 + 물 밸브 열기
        display.show(Image.SAD)
        ${k.py('led')}.write_digital(1)
        servo(90)
    else:
        display.show(Image.HAPPY)
        ${k.py('led')}.write_digital(0)
        servo(0)
    sleep(500)
`,
    }),
  });

  add({
    id: 'streetlight', title: '자동 LED 가로등', parts: ['light', 'led'],
    keywords: ['가로등', '자동 조명', '밤', '어두', '조명', '전등'],
    summary: '조도 센서로 주변이 어두워지면 LED 가로등을 자동으로 켜고, 밝아지면 끕니다.',
    howToTest: ['조도 밝기를 200 보다 낮게 내리면 LED 가 켜집니다.', '밝기를 올리면 LED 가 꺼집니다.'],
    learn: ['아날로그 입력', '조건문', '디지털 출력'],
    build: k => ({
      makecode: `basic.forever(function () {
    let light = pins.analogReadPin(${k.a('light')})
    if (light < 200) {
        pins.digitalWritePin(${k.d('led')}, 1)
        basic.showIcon(IconNames.Asleep)
    } else {
        pins.digitalWritePin(${k.d('led')}, 0)
        basic.showIcon(IconNames.Happy)
    }
    basic.pause(200)
})
`,
      micropython: `from microbit import *

while True:
    light = ${k.py('light')}.read_analog()
    if light < 200:
        ${k.py('led')}.write_digital(1)
        display.show(Image.ASLEEP)
    else:
        ${k.py('led')}.write_digital(0)
        display.show(Image.HAPPY)
    sleep(200)
`,
    }),
  });

  add({
    id: 'tempfan', title: '온도 감지 선풍기', parts: ['tmp36', 'motor'],
    keywords: ['더위', '선풍기', '온도', '자동 팬', '냉방', '에어컨'],
    summary: '기온이 높을수록 DC 모터 팬을 빠르게 돌리는 자동 선풍기입니다. 26°C 아래에서는 멈춥니다.',
    howToTest: ['TMP36 온도를 26°C 위로 올리면 팬이 돌기 시작합니다.', '온도가 높을수록 팬이 빨라집니다.'],
    learn: ['센서 값 변환', '비례 제어', 'PWM(아날로그 출력)'],
    build: k => ({
      makecode: `${mcHeader(k)}
basic.forever(function () {
    let t = tempC()
    let speed = 0
    if (t >= 26) {
        // 26°C → 400, 36°C 이상 → 1023
        speed = Math.constrain(400 + (t - 26) * 62, 0, 1023)
    }
    pins.analogWritePin(${k.a('motor')}, speed)
    basic.showNumber(t)
})
`,
      micropython: `${pyHeader(k)}
while True:
    t = temp_c()
    speed = 0
    if t >= 26:
        # 26°C → 400, 36°C 이상 → 1023
        speed = min(1023, 400 + (t - 26) * 62)
    ${k.py('motor')}.write_analog(speed)
    display.scroll(str(t))
`,
    }),
  });

  add({
    id: 'dialfan', title: '바람이 조절되는 선풍기', parts: ['pot', 'motor'],
    keywords: ['선풍기', '바람', '세기', '속도', '조절', '팬'],
    summary: '가변 저항 손잡이를 돌려 DC 모터 팬의 속도를 조절합니다. LED 화면에 바람 세기(0~5)를 막대로 보여 줘요.',
    howToTest: ['가변 저항 손잡이 값을 바꿔 보세요. 팬 속도와 막대 그래프가 함께 바뀝니다.'],
    learn: ['아날로그 입력 → 아날로그 출력', '값의 범위 바꾸기(map)'],
    build: k => ({
      makecode: `basic.forever(function () {
    let dial = pins.analogReadPin(${k.a('pot')})
    pins.analogWritePin(${k.a('motor')}, dial)
    led.plotBarGraph(dial, 1023)
    basic.pause(100)
})
`,
      micropython: `from microbit import *

while True:
    dial = ${k.py('pot')}.read_analog()
    ${k.py('motor')}.write_analog(dial)
    level = dial * 5 // 1024
    display.show(Image('00000:00000:00000:00000:00000'))
    for y in range(level):
        for x in range(5):
            display.set_pixel(x, 4 - y, 9)
    sleep(100)
`,
    }),
  });

  add({
    id: 'gasalarm', title: '가스 누출 경보기', parts: ['mq3', 'led'],
    keywords: ['가스', '경보', '누출', '연기', '화재', '안전', '부엌'],
    summary: 'MQ3 가스 센서 값이 400 을 넘으면 LED 를 깜빡이고 경보음을 울립니다.',
    howToTest: ['MQ3 가스 농도를 400 위로 올리면 경보가 울리고 LED 가 깜빡입니다.'],
    learn: ['아날로그 입력', '임계값', '소리 출력'],
    build: k => ({
      makecode: `basic.forever(function () {
    let gas = pins.analogReadPin(${k.a('mq3')})
    if (gas > 400) {
        basic.showIcon(IconNames.No)
        pins.digitalWritePin(${k.d('led')}, 1)
        music.playTone(988, 200)
        pins.digitalWritePin(${k.d('led')}, 0)
        music.playTone(784, 200)
    } else {
        basic.showIcon(IconNames.Yes)
        pins.digitalWritePin(${k.d('led')}, 0)
        basic.pause(300)
    }
})
`,
      micropython: `from microbit import *
import music

while True:
    gas = ${k.py('mq3')}.read_analog()
    if gas > 400:
        display.show(Image.NO)
        ${k.py('led')}.write_digital(1)
        music.pitch(988, 200)
        ${k.py('led')}.write_digital(0)
        music.pitch(784, 200)
    else:
        display.show(Image.YES)
        ${k.py('led')}.write_digital(0)
        sleep(300)
`,
    }),
  });

  add({
    id: 'feeder', title: '우리 강아지 급식기', parts: ['crash', 'servo'],
    keywords: ['급식기', '강아지', '반려', '사료', '먹이', '고양이', '펫'],
    summary: '충돌 센서(버튼)를 누르거나 A 버튼을 누르면 서보 모터가 열렸다 닫히며 사료를 줍니다.',
    howToTest: ['무대의 충돌 센서를 누르거나 micro:bit A 버튼을 누르세요.', '서보가 180° 로 열렸다가 1초 뒤 닫힙니다.'],
    learn: ['디지털 입력(풀업)', '서보 모터', '함수'],
    build: k => ({
      makecode: `${mcHeader(k)}
function feed() {
    basic.showIcon(IconNames.Heart)
    pins.servoWritePin(${k.a('servo')}, 180)
    basic.pause(1000)
    pins.servoWritePin(${k.a('servo')}, 0)
    basic.clearScreen()
}
pins.servoWritePin(${k.a('servo')}, 0)
input.onButtonPressed(Button.A, function () {
    feed()
})
basic.forever(function () {
    if (pins.digitalReadPin(${k.d('crash')}) == 0) {
        feed()
    }
})
`,
      micropython: `${pyHeader(k)}


def feed():
    display.show(Image.HEART)
    servo(180)
    sleep(1000)
    servo(0)
    display.clear()


servo(0)
while True:
    if ${k.py('crash')}.read_digital() == 0 or button_a.was_pressed():
        feed()
    sleep(50)
`,
    }),
  });

  add({
    id: 'trashcan', title: '다가가면 열리는 스마트 쓰레기통', parts: ['sonar', 'servo'],
    keywords: ['쓰레기통', '자동문', '다가가면', '뚜껑', '열리는'],
    summary: '초음파 센서로 손이 15cm 안으로 다가오면 서보 모터로 뚜껑을 열고, 3초 뒤 닫습니다.',
    howToTest: ['초음파 거리 값을 15cm 아래로 내리면 뚜껑(서보)이 열립니다.', '3초 뒤 자동으로 닫힙니다.'],
    learn: ['초음파 거리 측정', '서보 모터', '조건문'],
    build: k => ({
      makecode: `${mcHeader(k)}
pins.servoWritePin(${k.a('servo')}, 0)
basic.forever(function () {
    let d = distance()
    if (d > 0 && d < 15) {
        basic.showArrow(ArrowNames.North)
        pins.servoWritePin(${k.a('servo')}, 100)
        basic.pause(3000)
        pins.servoWritePin(${k.a('servo')}, 0)
    } else {
        basic.clearScreen()
    }
    basic.pause(100)
})
`,
      micropython: `${pyHeader(k)}
servo(0)
while True:
    d = distance()
    if 0 < d < 15:
        display.show(Image.ARROW_N)
        servo(100)
        sleep(3000)
        servo(0)
    else:
        display.clear()
    sleep(100)
`,
    }),
  });

  add({
    id: 'handdryer', title: '핸드 드라이어', parts: ['pir', 'motor'],
    keywords: ['드라이어', '손', '건조', '말리'],
    summary: 'PIR 센서가 손의 움직임을 감지하면 DC 모터 팬을 3초 동안 돌려 손을 말려 줍니다.',
    howToTest: ['무대의 PIR 센서를 클릭해 움직임을 켜면 팬이 3초 동안 돕니다.'],
    learn: ['디지털 입력', '시간 제어'],
    build: k => ({
      makecode: `basic.forever(function () {
    if (pins.digitalReadPin(${k.d('pir')}) == 1) {
        basic.showIcon(IconNames.Umbrella)
        pins.analogWritePin(${k.a('motor')}, 1023)
        basic.pause(3000)
    } else {
        pins.analogWritePin(${k.a('motor')}, 0)
        basic.clearScreen()
    }
})
`,
      micropython: `from microbit import *

while True:
    if ${k.py('pir')}.read_digital() == 1:
        display.show(Image.UMBRELLA)
        ${k.py('motor')}.write_analog(1023)
        sleep(3000)
    else:
        ${k.py('motor')}.write_analog(0)
        display.clear()
    sleep(50)
`,
    }),
  });

  add({
    id: 'piano', title: '전자 피아노', parts: ['keypad', 'ring'],
    keywords: ['피아노', '악기', '연주', '음악', '건반', '노래', '기타'],
    summary: 'AD 키패드의 A~E 버튼으로 도·레·미·솔·라 음을 연주하고, 누른 음에 맞춰 레인보우 LED 링 색이 바뀝니다.',
    howToTest: ['조절 패널이나 무대의 키패드 A~E 버튼을 누르세요.', '음이 나고 LED 링 색이 바뀝니다.'],
    learn: ['아날로그 값으로 버튼 구분', '소리 출력', 'RGB LED'],
    build: k => ({
      makecode: `${mcHeader(k)}
basic.forever(function () {
    let key = readKey()
    if (key == "A") {
        strip.showColor(neopixel.colors(NeoPixelColors.Red))
        music.playTone(262, 200)
    } else if (key == "B") {
        strip.showColor(neopixel.colors(NeoPixelColors.Orange))
        music.playTone(294, 200)
    } else if (key == "C") {
        strip.showColor(neopixel.colors(NeoPixelColors.Yellow))
        music.playTone(330, 200)
    } else if (key == "D") {
        strip.showColor(neopixel.colors(NeoPixelColors.Green))
        music.playTone(392, 200)
    } else if (key == "E") {
        strip.showColor(neopixel.colors(NeoPixelColors.Blue))
        music.playTone(440, 200)
    } else {
        strip.clear()
        strip.show()
    }
})
`,
      micropython: `${pyHeader(k, ['import music'])}
NOTES = {'A': (262, (255, 0, 0)), 'B': (294, (255, 120, 0)), 'C': (330, (255, 220, 0)),
         'D': (392, (0, 255, 0)), 'E': (440, (0, 80, 255))}

while True:
    key = read_key()
    if key in NOTES:
        freq, color = NOTES[key]
        np.fill(color)
        np.show()
        music.pitch(freq, 200)
    else:
        np.clear()
    sleep(20)
`,
    }),
  });

  add({
    id: 'parking', title: '주차 거리 경고기', parts: ['sonar', 'ring'],
    keywords: ['주차', '후방', '거리', '경고', '자동차', '장애물'],
    summary: '초음파 센서로 벽까지의 거리를 재서 가까울수록 LED 링에 빨간 불을 많이 켜고 삐 소리를 빠르게 냅니다.',
    howToTest: ['초음파 거리 값을 100cm 에서 5cm 까지 줄여 보세요.', '가까워질수록 빨간 LED 가 늘어나고 소리가 빨라집니다.'],
    learn: ['초음파 거리', '값의 범위 바꾸기', 'RGB LED 막대 그래프'],
    build: k => ({
      makecode: `${mcHeader(k)}
basic.forever(function () {
    let d = distance()
    serial.writeValue("cm", d)
    // 가까울수록 켜지는 LED 개수 증가 (100cm → 0개, 10cm → 8개)
    let n = Math.constrain(Math.round((100 - d) / 11), 0, 8)
    strip.clear()
    for (let i = 0; i < n; i++) {
        strip.setPixelColor(i, i < 3 ? neopixel.colors(NeoPixelColors.Green) : i < 6 ? neopixel.colors(NeoPixelColors.Yellow) : neopixel.colors(NeoPixelColors.Red))
    }
    strip.show()
    if (n > 0) {
        music.playTone(880, 80)
        basic.pause(600 - n * 70)
    } else {
        basic.pause(200)
    }
})
`,
      micropython: `${pyHeader(k, ['import music'])}
while True:
    d = distance()
    print('cm:', d)
    # 가까울수록 켜지는 LED 개수 증가 (100cm → 0개, 10cm → 8개)
    n = max(0, min(8, round((100 - d) / 11)))
    for i in range(8):
        if i < n:
            np[i] = (0, 255, 0) if i < 3 else (255, 200, 0) if i < 6 else (255, 0, 0)
        else:
            np[i] = (0, 0, 0)
    np.show()
    if n > 0:
        music.pitch(880, 80)
        sleep(600 - n * 70)
    else:
        sleep(200)
`,
    }),
  });

  add({
    id: 'security', title: '침입 감지 경보기', parts: ['pir', 'ring'],
    keywords: ['보안', '침입', '도둑', '경보', '감시', '방범'],
    summary: 'A 버튼으로 경보를 켜고, PIR 센서가 움직임을 감지하면 LED 링이 빨강·파랑 경찰등처럼 깜빡이며 사이렌이 울립니다. B 버튼으로 끕니다.',
    howToTest: ['A 버튼으로 경보 모드를 켭니다 (화면에 체크).', 'PIR 센서를 클릭해 움직임을 만들면 사이렌이 울립니다.', 'B 버튼으로 해제합니다.'],
    learn: ['상태 변수', '버튼 이벤트', 'RGB 깜빡임'],
    build: k => ({
      makecode: `${mcHeader(k)}
let armed = false
input.onButtonPressed(Button.A, function () {
    armed = true
    basic.showIcon(IconNames.Yes)
})
input.onButtonPressed(Button.B, function () {
    armed = false
    strip.clear()
    strip.show()
    basic.showIcon(IconNames.No)
})
basic.showIcon(IconNames.No)
basic.forever(function () {
    if (armed && pins.digitalReadPin(${k.d('pir')}) == 1) {
        strip.showColor(neopixel.colors(NeoPixelColors.Red))
        music.playTone(988, 150)
        strip.showColor(neopixel.colors(NeoPixelColors.Blue))
        music.playTone(659, 150)
    }
})
`,
      micropython: `${pyHeader(k, ['import music'])}
armed = False
display.show(Image.NO)
while True:
    if button_a.was_pressed():
        armed = True
        display.show(Image.YES)
    if button_b.was_pressed():
        armed = False
        np.clear()
        display.show(Image.NO)
    if armed and ${k.py('pir')}.read_digital() == 1:
        np.fill((255, 0, 0))
        np.show()
        music.pitch(988, 150)
        np.fill((0, 0, 255))
        np.show()
        music.pitch(659, 150)
    sleep(20)
`,
    }),
  });

  add({
    id: 'doorlock', title: '비밀번호 도어락', parts: ['keypad', 'servo', 'led'],
    keywords: ['도어락', '비밀번호', '잠금', '금고', '문', '열쇠'],
    summary: 'AD 키패드로 비밀번호 A-C-E 를 차례로 누르면 서보 모터 잠금장치가 열립니다. 틀리면 LED 가 켜지고 X 가 표시돼요.',
    howToTest: ['키패드에서 A, C, E 를 차례로 눌러 보세요 → 서보 90° 열림.', '다른 순서로 3번 누르면 LED 경고와 X 표시.'],
    learn: ['문자열 이어 붙이기', '리스트/비교', '서보 제어'],
    build: k => ({
      makecode: `${mcHeader(k)}
let code = ""
pins.servoWritePin(${k.a('servo')}, 0)
basic.forever(function () {
    let key = readKey()
    if (key != "") {
        code = code + key
        basic.showString(key)
        // 버튼을 뗄 때까지 기다림
        while (readKey() != "") {
            basic.pause(20)
        }
        if (code.length >= 3) {
            if (code == "ACE") {
                basic.showIcon(IconNames.Yes)
                pins.servoWritePin(${k.a('servo')}, 90)
                basic.pause(3000)
                pins.servoWritePin(${k.a('servo')}, 0)
            } else {
                basic.showIcon(IconNames.No)
                pins.digitalWritePin(${k.d('led')}, 1)
                basic.pause(1000)
                pins.digitalWritePin(${k.d('led')}, 0)
            }
            code = ""
            basic.clearScreen()
        }
    }
})
`,
      micropython: `${pyHeader(k)}
PASSWORD = 'ACE'
code = ''
servo(0)
while True:
    key = read_key()
    if key:
        code = code + key
        display.show(key)
        # 버튼을 뗄 때까지 기다림
        while read_key():
            sleep(20)
        if len(code) >= 3:
            if code == PASSWORD:
                display.show(Image.YES)
                servo(90)
                sleep(3000)
                servo(0)
            else:
                display.show(Image.NO)
                ${k.py('led')}.write_digital(1)
                sleep(1000)
                ${k.py('led')}.write_digital(0)
            code = ''
            display.clear()
    sleep(20)
`,
    }),
  });

  add({
    id: 'moodlight', title: '무지개 무드등', parts: ['pot', 'ring'],
    keywords: ['무드등', '무지개', '색', '컬러', '조명', '분위기', '레인보우'],
    summary: '가변 저항 손잡이를 돌리면 레인보우 LED 링의 색(색상환 0~360°)이 바뀌는 무드등입니다. A 버튼은 무지개 모드!',
    howToTest: ['가변 저항 값을 바꾸면 링 색이 바뀝니다.', 'A 버튼을 누르는 동안에는 무지개 색이 돌아갑니다.'],
    learn: ['아날로그 입력', 'HSL 색', 'NeoPixel'],
    build: k => ({
      makecode: `${mcHeader(k)}
basic.forever(function () {
    if (input.buttonIsPressed(Button.A)) {
        strip.showRainbow(1, 360)
        strip.rotate(1)
        strip.show()
        basic.pause(100)
    } else {
        let hue = Math.round(pins.analogReadPin(${k.a('pot')}) * 360 / 1023)
        strip.showColor(neopixel.hsl(hue, 99, 50))
        basic.pause(50)
    }
})
`,
      micropython: `${pyHeader(k)}

def hue_to_rgb(h):
    # 색상환 각도(0~360) → (R, G, B)
    h = h % 360
    x = int(255 * (1 - abs((h / 60) % 2 - 1)))
    if h < 60:
        return (255, x, 0)
    if h < 120:
        return (x, 255, 0)
    if h < 180:
        return (0, 255, x)
    if h < 240:
        return (0, x, 255)
    if h < 300:
        return (x, 0, 255)
    return (255, 0, x)


shift = 0
while True:
    if button_a.is_pressed():
        for i in range(8):
            np[i] = hue_to_rgb(i * 45 + shift)
        shift += 15
    else:
        hue = ${k.py('pot')}.read_analog() * 360 // 1023
        np.fill(hue_to_rgb(hue))
    np.show()
    sleep(60)
`,
    }),
  });

  add({
    id: 'blind', title: '자동 블라인드', parts: ['light', 'servo'],
    keywords: ['블라인드', '커튼', '햇빛', '창문', '차양'],
    summary: '햇빛이 강하면(조도 > 700) 서보 모터로 블라인드를 내리고, 어두워지면 올립니다. 그 사이 밝기에서는 밝기에 비례해 각도를 조절해요.',
    howToTest: ['조도 밝기를 0 → 1023 으로 바꾸면 서보 각도가 0° → 180° 로 따라 움직입니다.'],
    learn: ['값의 범위 바꾸기(map)', '서보 제어'],
    build: k => ({
      makecode: `basic.forever(function () {
    let light = pins.analogReadPin(${k.a('light')})
    let angle = Math.round(pins.map(light, 0, 1023, 0, 180))
    pins.servoWritePin(${k.a('servo')}, angle)
    if (light > 700) {
        basic.showIcon(IconNames.Square)
    } else {
        basic.showIcon(IconNames.SmallSquare)
    }
    basic.pause(200)
})
`,
      micropython: `${pyHeader(k)}
while True:
    light = ${k.py('light')}.read_analog()
    angle = light * 180 // 1023
    servo(angle)
    if light > 700:
        display.show(Image.SQUARE)
    else:
        display.show(Image.SQUARE_SMALL)
    sleep(200)
`,
    }),
  });

  add({
    id: 'breath', title: '음주 측정기', parts: ['mq3', 'oled', 'ring'],
    keywords: ['음주', '알코올', '측정기', '술', '호흡'],
    summary: 'MQ3 센서로 알코올 농도를 재서 OLED 에 수치와 판정(SAFE / CAUTION / DANGER)을 보여 주고 LED 링 색으로도 알려 줍니다.',
    howToTest: ['MQ3 가스 농도를 200 이하, 200~450, 450 이상으로 바꿔 보세요.', 'OLED 판정 문구와 링 색(초록·노랑·빨강)이 바뀝니다.'],
    learn: ['다중 조건(else if)', 'OLED 출력', 'RGB LED'],
    build: k => ({
      makecode: `${mcHeader(k)}
basic.forever(function () {
    let gas = pins.analogReadPin(${k.a('mq3')})
    OLED.clear()
    OLED.writeStringNewLine("ALCOHOL TESTER")
    OLED.writeStringNewLine("Value: " + gas)
    if (gas < 200) {
        OLED.writeStringNewLine("SAFE")
        strip.showColor(neopixel.colors(NeoPixelColors.Green))
    } else if (gas < 450) {
        OLED.writeStringNewLine("CAUTION")
        strip.showColor(neopixel.colors(NeoPixelColors.Yellow))
    } else {
        OLED.writeStringNewLine("DANGER!")
        strip.showColor(neopixel.colors(NeoPixelColors.Red))
    }
    basic.pause(500)
})
`,
      micropython: `${pyHeader(k)}
while True:
    gas = ${k.py('mq3')}.read_analog()
    oled.clear()
    oled.text('ALCOHOL TESTER', 0, 0)
    oled.text('Value: ' + str(gas), 0, 16)
    if gas < 200:
        oled.text('SAFE', 0, 36, 2)
        np.fill((0, 255, 0))
    elif gas < 450:
        oled.text('CAUTION', 0, 36, 2)
        np.fill((255, 200, 0))
    else:
        oled.text('DANGER!', 0, 36, 2)
        np.fill((255, 0, 0))
    np.show()
    oled.show()
    sleep(500)
`,
    }),
  });

  add({
    id: 'thermo', title: '디지털 온도계', parts: ['tmp36', 'oled', 'ring'],
    keywords: ['온도계', '체온', '온도', '기온', '측정'],
    summary: 'TMP36 으로 잰 온도를 OLED 에 큰 글씨로 보여 주고, 레인보우 링을 온도 막대(0~40°C)로 사용합니다.',
    howToTest: ['TMP36 온도를 -10 ~ 50°C 로 바꿔 보세요. OLED 숫자와 링 막대가 함께 바뀝니다.'],
    learn: ['센서 값 변환', '막대 그래프', 'OLED 큰 글씨'],
    build: k => ({
      makecode: `${mcHeader(k)}
basic.forever(function () {
    let t = tempC()
    OLED.clear()
    OLED.writeStringNewLine("THERMOMETER")
    OLED.writeStringNewLine("")
    OLED.writeStringNewLine("  " + t + " C")
    strip.showBarGraph(Math.constrain(t, 0, 40), 40)
    basic.pause(1000)
})
`,
      micropython: `${pyHeader(k)}
while True:
    t = temp_c()
    oled.clear()
    oled.text('THERMOMETER', 0, 0)
    oled.text(str(t) + ' C', 10, 24, 3)
    oled.show()
    n = max(0, min(8, round(t * 8 / 40)))
    for i in range(8):
        np[i] = (min(255, i * 36), max(0, 255 - i * 36), 0) if i < n else (0, 0, 0)
    np.show()
    sleep(1000)
`,
    }),
  });

  add({
    id: 'ruler', title: '초음파 줄자', parts: ['sonar', 'oled'],
    keywords: ['줄자', '자', '키 재기', '길이', '거리 측정', '측정'],
    summary: '초음파 센서로 물체까지의 거리를 재서 OLED 에 cm 단위로 크게 보여 주는 전자 줄자입니다. A 버튼으로 값을 고정해요.',
    howToTest: ['초음파 거리 값을 바꾸면 OLED 숫자가 바뀝니다.', 'A 버튼으로 측정값 고정/해제.'],
    learn: ['초음파 원리(왕복 시간)', '상태 변수', 'OLED'],
    build: k => ({
      makecode: `${mcHeader(k)}
let hold = false
input.onButtonPressed(Button.A, function () {
    hold = !(hold)
})
basic.forever(function () {
    if (!(hold)) {
        let d = distance()
        OLED.clear()
        OLED.writeStringNewLine("ULTRASONIC RULER")
        OLED.writeStringNewLine("")
        OLED.writeStringNewLine("Distance: " + d + " cm")
    }
    basic.pause(300)
})
`,
      micropython: `${pyHeader(k)}
hold = False
while True:
    if button_a.was_pressed():
        hold = not hold
    if not hold:
        d = distance()
        oled.clear()
        oled.text('ULTRASONIC RULER', 0, 0)
        oled.text(str(d) + ' cm', 4, 26, 3)
        oled.show()
    sleep(300)
`,
    }),
  });

  add({
    id: 'counter', title: '충돌 횟수 카운터', parts: ['crash', 'oled'],
    keywords: ['카운터', '횟수', '세기', '점수', '게임', '충돌'],
    summary: '충돌 센서가 눌릴 때마다 숫자를 1씩 세어 OLED 와 LED 화면에 보여 줍니다. B 버튼으로 0 으로 초기화.',
    howToTest: ['무대의 충돌 센서를 클릭할 때마다 숫자가 1 올라갑니다.', 'B 버튼으로 초기화.'],
    learn: ['변수와 누적', '디지털 입력(풀업)', '눌림 감지(엣지)'],
    build: k => ({
      makecode: `${mcHeader(k)}
let count = 0
let before = 1
function showCount() {
    OLED.clear()
    OLED.writeStringNewLine("CRASH COUNTER")
    OLED.writeStringNewLine("Count: " + count)
    basic.showNumber(count)
}
input.onButtonPressed(Button.B, function () {
    count = 0
    showCount()
})
showCount()
basic.forever(function () {
    let now = pins.digitalReadPin(${k.d('crash')})
    // 떼어 있다가(1) 눌린 순간(0)만 셈
    if (before == 1 && now == 0) {
        count += 1
        music.playTone(523, 50)
        showCount()
    }
    before = now
    basic.pause(10)
})
`,
      micropython: `${pyHeader(k, ['import music'])}
count = 0
before = 1


def show_count():
    oled.clear()
    oled.text('CRASH COUNTER', 0, 0)
    oled.text(str(count), 30, 24, 4)
    oled.show()
    display.show(str(count % 10))


show_count()
while True:
    if button_b.was_pressed():
        count = 0
        show_count()
    now = ${k.py('crash')}.read_digital()
    # 떼어 있다가(1) 눌린 순간(0)만 셈
    if before == 1 and now == 0:
        count += 1
        music.pitch(523, 50)
        show_count()
    before = now
    sleep(10)
`,
    }),
  });

  // ---------- 구성품 조합 생성기 (레시피가 맞지 않을 때) ----------
  function compose(types, prompt) {
    const list = KIT.assignPins(types.map(t => ({ type: t })));
    const k = pinKit(list);
    const inputs = list.filter(c => KIT.byId[c.type].group === 'input');
    const outs = list.filter(c => ['output', 'display'].includes(KIT.byId[c.type].group));
    const IN = {
      pot: { v: 'dial', mc: `pins.analogReadPin(${k.a('pot')})`, py: `${k.py('pot')}.read_analog()`, lvl: 'dial / 1023', lab: 'Dial' },
      light: { v: 'light', mc: `pins.analogReadPin(${k.a('light')})`, py: `${k.py('light')}.read_analog()`, lvl: 'light / 1023', lab: 'Light' },
      tmp36: { v: 'temp', mc: 'tempC()', py: 'temp_c()', lvl: '(temp + 10) / 50', lab: 'Temp' },
      soil: { v: 'soil', mc: `pins.analogReadPin(${k.a('soil')})`, py: `${k.py('soil')}.read_analog()`, lvl: 'soil / 1023', lab: 'Soil' },
      mq3: { v: 'gas', mc: `pins.analogReadPin(${k.a('mq3')})`, py: `${k.py('mq3')}.read_analog()`, lvl: 'gas / 1023', lab: 'Gas' },
      sonar: { v: 'dist', mc: 'distance()', py: 'distance()', lvl: '(100 - Math.min(dist, 100)) / 100', pylvl: '(100 - min(dist, 100)) / 100', lab: 'Dist' },
      crash: { v: 'hit', mc: `pins.digitalReadPin(${k.d('crash')}) == 0 ? 1 : 0`, py: `1 if ${k.py('crash')}.read_digital() == 0 else 0`, lvl: 'hit', lab: 'Crash' },
      pir: { v: 'motion', mc: `pins.digitalReadPin(${k.d('pir')})`, py: `${k.py('pir')}.read_digital()`, lvl: 'motion', lab: 'Motion' },
      keypad: { v: 'key', mc: 'readKey()', py: 'read_key()', lvl: '"ABCDE".indexOf(key) + 1 > 0 ? ("ABCDE".indexOf(key) + 1) / 5 : 0', pylvl: '("ABCDE".find(key) + 1) / 5 if key else 0', lab: 'Key' },
    };
    const ins = inputs.map(c => IN[c.type]).filter(Boolean);
    const main = ins[0];
    const usesButtons = !main;
    let mc = mcHeader(k);
    let py = pyHeader(k, outs.some(o => o.type === 'servo') ? [] : []);
    mc += usesButtons ? 'let level = 0\ninput.onButtonPressed(Button.A, function () {\n    level = Math.max(0, level - 0.25)\n})\ninput.onButtonPressed(Button.B, function () {\n    level = Math.min(1, level + 0.25)\n})\n' : '';
    py += usesButtons ? '\nlevel = 0\n' : '';
    mc += 'basic.forever(function () {\n';
    py += '\nwhile True:\n';
    for (const i of ins) { mc += `    let ${i.v} = ${i.mc}\n`; py += `    ${i.v} = ${i.py}\n`; }
    if (usesButtons) {
      py += '    if button_a.was_pressed():\n        level = max(0, level - 0.25)\n    if button_b.was_pressed():\n        level = min(1, level + 0.25)\n';
    } else {
      mc += `    // 첫 번째 센서 값을 0~1 단계(level)로 바꿔 출력 장치에 사용\n    let level = Math.constrain(${main.lvl}, 0, 1)\n`;
      py += `    # 첫 번째 센서 값을 0~1 단계(level)로 바꿔 출력 장치에 사용\n    level = max(0, min(1, ${main.pylvl || main.lvl}))\n`;
    }
    for (const o of outs) {
      if (o.type === 'led') { mc += `    pins.analogWritePin(${k.a('led')}, Math.round(level * 1023))\n`; py += `    ${k.py('led')}.write_analog(int(level * 1023))\n`; }
      if (o.type === 'motor') { mc += `    pins.analogWritePin(${k.a('motor')}, Math.round(level * 1023))\n`; py += `    ${k.py('motor')}.write_analog(int(level * 1023))\n`; }
      if (o.type === 'servo') { mc += `    pins.servoWritePin(${k.a('servo')}, Math.round(level * 180))\n`; py += '    servo(int(level * 180))\n'; }
      if (o.type === 'ring') { mc += '    strip.showBarGraph(Math.round(level * 100), 100)\n'; py += '    n = round(level * 8)\n    for i in range(8):\n        np[i] = (255 - i * 30, i * 30, 80) if i < n else (0, 0, 0)\n    np.show()\n'; }
    }
    if (k.has('oled')) {
      mc += '    OLED.clear()\n    OLED.writeStringNewLine("GENIUS KIT")\n';
      py += "    oled.clear()\n    oled.text('GENIUS KIT', 0, 0)\n";
      ins.forEach((i, n) => { mc += `    OLED.writeStringNewLine("${i.lab}: " + ${i.v})\n`; py += `    oled.text('${i.lab}: ' + str(${i.v}), 0, ${14 + n * 10})\n`; });
      if (usesButtons) { mc += '    OLED.writeStringNewLine("Level: " + Math.round(level * 100) + "%")\n'; py += "    oled.text('Level: ' + str(int(level * 100)) + '%', 0, 14)\n"; }
      py += '    oled.show()\n';
    }
    if (ins.length) {
      mc += `    serial.writeLine(${ins.map(i => `"${i.lab}=" + ${i.v}`).join(' + " " + ')})\n`;
      py += `    print(${ins.map(i => `'${i.lab}=' + str(${i.v})`).join(", ' ', ")})\n`;
    }
    mc += '    led.plotBarGraph(Math.round(level * 100), 100)\n    basic.pause(200)\n})\n';
    py += "    lit = int(level * 5)\n    display.show(Image(':'.join(['99999' if 4 - y < lit else '00000' for y in range(5)])))\n    sleep(200)\n";
    const names = list.map(c => KIT.byId[c.type].name).join(', ');
    return {
      title: '구성품 조합: ' + list.map(c => KIT.byId[c.type].name.replace(/ (센서|모터|디스플레이)$/, '')).slice(0, 3).join('·') + (list.length > 3 ? ' 외' : ''),
      summary: `${names} 을(를) 함께 사용합니다. ${main ? `${KIT.byId[inputs[0].type].name} 값을 0~1 단계로 바꿔` : 'A/B 버튼으로 단계를 조절해'} 출력 장치(LED·모터·서보·LED 링)를 제어하고 센서 값을 ${k.has('oled') ? 'OLED 와 ' : ''}시리얼 창에 보여 줍니다.`,
      components: list,
      makecode: mc, micropython: py,
      howToTest: [main ? `조절 패널에서 ${KIT.byId[inputs[0].type].name} 값을 바꿔 보세요.` : 'A/B 버튼으로 단계를 내리고 올려 보세요.', '출력 장치와 LED 막대 그래프가 함께 바뀝니다.'],
      learn: ['센서 입력', '값의 범위 바꾸기', '출력 제어'],
      source: 'offline',
    };
  }

  function fromRecipe(r) {
    const list = KIT.assignPins(r.parts.map(t => ({ type: t })));
    const code = r.build(pinKit(list));
    return {
      title: r.title, summary: r.summary, components: list,
      makecode: code.makecode, micropython: code.micropython,
      howToTest: r.howToTest, learn: r.learn, source: 'offline', recipe: r.id,
    };
  }

  // 레시피 점수: 프롬프트 낱말 + 선택한 구성품과 겹치는 정도
  function rank(prompt, selected) {
    const p = (prompt || '').trim().toLowerCase();
    return R.map(r => {
      let s = 0;
      for (const kw of r.keywords) if (p.includes(kw)) s += 3;
      if (p && p.includes(r.title.replace(/\s/g, '').slice(0, 4))) s += 2;
      if (selected.length) {
        const inSel = r.parts.filter(t => selected.includes(t)).length;
        const extra = r.parts.length - inSel;
        s += inSel * 2 - extra * 1.5;
        if (inSel === r.parts.length && inSel === selected.length) s += 4;
      }
      for (const t of r.parts) for (const kw of KIT.byId[t].keywords) if (p.includes(kw)) s += 0.5;
      return { r, s };
    }).sort((a, b) => b.s - a.s);
  }

  // 프롬프트 + 선택한 구성품으로 가장 알맞은 예제 고르기 (skip: 이미 고른 레시피 id)
  function generate(prompt, selected, skip) {
    prompt = (prompt || '').trim();
    selected = selected || [];
    skip = skip || [];
    const p = prompt.toLowerCase();
    const ranked = rank(prompt, selected).filter(x => !skip.includes(x.r.id));
    // 두 번째부터는 조금이라도 관련 있는 레시피를 조합 생성기보다 먼저 고름
    const threshold = skip.length ? 0.5 : selected.length ? 4 : 2.5;
    if (ranked.length && ranked[0].s >= threshold) return fromRecipe(ranked[0].r);
    // 레시피가 맞지 않으면 선택(또는 프롬프트에서 찾은) 구성품으로 조합
    let types = selected.slice();
    if (!types.length) {
      for (const part of KIT.PARTS) if (part.group !== 'accessory' && part.keywords.some(kw => p.includes(kw))) types.push(part.id);
    }
    if (types.length && !skip.includes('compose')) return compose(types, prompt);
    // 조합도 이미 썼으면 점수 순서대로 다음 레시피
    return ranked.length ? fromRecipe(ranked[0].r) : fromRecipe(R[0]);
  }

  // 서로 다른 예제 n 개
  function generateMany(prompt, selected, n) {
    const out = [], used = [];
    for (let i = 0; i < n && used.length < R.length + 1; i++) {
      const ex = generate(prompt, selected, used);
      used.push(ex.recipe || 'compose');
      out.push(ex);
    }
    return out;
  }

  window.KitTemplates = { RECIPES: R, generate, generateMany, fromRecipe, compose, rank };
})();

# 지니어스 키트 OLED(SSD1306 128x64) 드라이버 — 실제 micro:bit V2 용
# 사용법: 이 파일을 python.microbit.org 편집기의 "파일"에 추가하고 main.py 에서 import oled
# 연결: 확장보드 I2C 단자 (SCL=P19, SDA=P20, VCC=3V, GND)
# 글꼴은 micro:bit 내장 5x5 글꼴(Image(문자))을 그대로 사용합니다.
from microbit import i2c, Image

WIDTH = 128
HEIGHT = 64
ADDR = 0x3C
_buf = bytearray(1025)
_buf[0] = 0x40
_row = [0]


def _cmd(*cs):
    for c in cs:
        i2c.write(ADDR, bytes([0x00, c]))


def init():
    _cmd(0xAE, 0xA4, 0xD5, 0x80, 0xA8, 0x3F, 0xD3, 0x00, 0x40, 0x8D, 0x14,
         0x20, 0x00, 0xA1, 0xC8, 0xDA, 0x12, 0x81, 0xCF, 0xD9, 0xF1, 0xDB, 0x40, 0xA6, 0xAF)
    clear()
    show()


def clear():
    for i in range(1, 1025):
        _buf[i] = 0
    _row[0] = 0


def show():
    _cmd(0x21, 0, 127, 0x22, 0, 7)
    i2c.write(ADDR, _buf)


def pixel(x, y, c=1):
    if 0 <= x < WIDTH and 0 <= y < HEIGHT:
        i = 1 + x + (y >> 3) * WIDTH
        if c:
            _buf[i] |= 1 << (y & 7)
        else:
            _buf[i] &= ~(1 << (y & 7)) & 0xFF


def text(s, x=0, y=0, scale=1, c=1):
    for ch in str(s):
        try:
            im = Image(ch)
        except Exception:
            im = Image(' ')
        for cx in range(5):
            for cy in range(5):
                if im.get_pixel(cx, cy):
                    for dx in range(scale):
                        for dy in range(scale):
                            pixel(x + cx * scale + dx, y + (cy + 1) * scale + dy, c)
        x += 6 * scale


def line(x0, y0, x1, y1, c=1):
    dx = abs(x1 - x0)
    dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    while True:
        pixel(x0, y0, c)
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy


def rect(x, y, w, h, c=1, fill=False):
    if fill:
        for j in range(h):
            for i in range(w):
                pixel(x + i, y + j, c)
    else:
        line(x, y, x + w - 1, y, c)
        line(x, y + h - 1, x + w - 1, y + h - 1, c)
        line(x, y, x, y + h - 1, c)
        line(x + w - 1, y, x + w - 1, y + h - 1, c)


def print_line(s):
    # 한 줄씩 아래로 출력 (8줄이 차면 처음부터)
    if _row[0] >= 8:
        clear()
    text(s, 0, _row[0] * 8)
    _row[0] += 1
    show()

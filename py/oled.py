# 지니어스 키트 OLED(SSD1306 128x64, I2C P19/P20) — 시뮬레이터용
# 실제 micro:bit 에서는 device/oled.py 를 함께 넣으면 같은 코드가 동작합니다.
import _mb

WIDTH = 128
HEIGHT = 64


def init():
    _mb.oled('init', [])


def clear():
    _mb.oled('clear', [])


def show():
    _mb.oled('show', [])


def pixel(x, y, c=1):
    _mb.oled('pixel', [int(x), int(y), c])


def text(s, x=0, y=0, scale=1, c=1):
    _mb.oled('text', [str(s), int(x), int(y), int(scale), c])


def line(x0, y0, x1, y1, c=1):
    _mb.oled('line', [int(x0), int(y0), int(x1), int(y1), c])


def rect(x, y, w, h, c=1, fill=False):
    _mb.oled('rect', [int(x), int(y), int(w), int(h), c, bool(fill)])


def print_line(s):
    _mb.oled('print', [str(s)])

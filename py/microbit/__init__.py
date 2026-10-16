import _mb

def sleep(ms):
    _mb.sleep(ms)

def running_time():
    return _mb.running_time()

def temperature():
    return _mb.temperature()

def reset():
    _mb.reset()

def panic(n=0):
    _mb.panic(n)

def set_volume(v):
    _mb.set_volume(v)

def scale(value, from_, to):
    a, b = from_
    c, d = to
    r = c + (value - a) * (d - c) / (b - a)
    if isinstance(c, int) and isinstance(d, int):
        return int(round(r))
    return r


class Image:
    def __init__(self, *args):
        if len(args) == 0:
            self._w, self._h = 5, 5
            self._p = [0] * 25
        elif len(args) == 1:
            s = args[0]
            if not isinstance(s, str):
                raise TypeError("Image(s) takes a string")
            if len(s) == 1:
                self._w, self._h = 5, 5
                self._p = list(_mb.char_image(s))
                return
            rows = [r for r in s.replace('\n', ':').split(':') if r != '']
            self._h = len(rows)
            self._w = max([len(r) for r in rows]) if rows else 0
            self._p = []
            for r in rows:
                for x in range(self._w):
                    self._p.append(int(r[x]) if x < len(r) else 0)
        elif len(args) == 2:
            self._w, self._h = args[0], args[1]
            self._p = [0] * (self._w * self._h)
        else:
            self._w, self._h = args[0], args[1]
            buf = list(args[2])
            if len(buf) != self._w * self._h:
                raise ValueError("image data is incorrect size")
            self._p = [min(9, max(0, int(v))) for v in buf]

    def width(self):
        return self._w

    def height(self):
        return self._h

    def get_pixel(self, x, y):
        if x < 0 or y < 0 or x >= self._w or y >= self._h:
            raise ValueError("index out of bounds")
        return self._p[y * self._w + x]

    def set_pixel(self, x, y, value):
        if x < 0 or y < 0 or x >= self._w or y >= self._h:
            raise ValueError("index out of bounds")
        if value < 0 or value > 9:
            raise ValueError("brightness out of bounds")
        if getattr(self, '_ro', False):
            raise TypeError("image cannot be modified (try copying first)")
        self._p[y * self._w + x] = int(value)

    def fill(self, value):
        if getattr(self, '_ro', False):
            raise TypeError("image cannot be modified (try copying first)")
        self._p = [int(value)] * (self._w * self._h)

    def copy(self):
        return Image(self._w, self._h, self._p)

    def invert(self):
        return Image(self._w, self._h, [9 - v for v in self._p])

    def crop(self, x, y, w, h):
        out = Image(w, h)
        for j in range(h):
            for i in range(w):
                sx, sy = x + i, y + j
                if 0 <= sx < self._w and 0 <= sy < self._h:
                    out._p[j * w + i] = self._p[sy * self._w + sx]
        return out

    def shift_left(self, n):
        return self.crop(n, 0, self._w, self._h)

    def shift_right(self, n):
        return self.crop(-n, 0, self._w, self._h)

    def shift_up(self, n):
        return self.crop(0, n, self._w, self._h)

    def shift_down(self, n):
        return self.crop(0, -n, self._w, self._h)

    def blit(self, src, x, y, w, h, xdest=0, ydest=0):
        for j in range(h):
            for i in range(w):
                sx, sy, dx, dy = x + i, y + j, xdest + i, ydest + j
                if 0 <= dx < self._w and 0 <= dy < self._h:
                    v = 0
                    if 0 <= sx < src._w and 0 <= sy < src._h:
                        v = src._p[sy * src._w + sx]
                    self._p[dy * self._w + dx] = v

    def __add__(self, other):
        if self._w != other._w or self._h != other._h:
            raise ValueError("images must be the same size")
        return Image(self._w, self._h, [min(9, a + b) for a, b in zip(self._p, other._p)])

    def __mul__(self, k):
        return Image(self._w, self._h, [min(9, max(0, int(v * k))) for v in self._p])

    def __eq__(self, other):
        return isinstance(other, Image) and self._w == other._w and self._h == other._h and self._p == other._p

    def _rows(self):
        out = []
        for y in range(self._h):
            out.append(''.join([str(v) for v in self._p[y * self._w:(y + 1) * self._w]]))
        return out

    def __repr__(self):
        return "Image('" + ':'.join(self._rows()) + ":')"

    def __str__(self):
        return "Image(\n" + '\n'.join(["    '" + r + ":'" for r in self._rows()]) + "\n)"

    def _leds(self):
        out = [0] * 25
        for y in range(min(5, self._h)):
            for x in range(min(5, self._w)):
                out[y * 5 + x] = self._p[y * self._w + x]
        return out


def _img(s):
    i = Image(s)
    i._ro = True
    return i

Image.HEART = _img('09090:99999:99999:09990:00900')
Image.HEART_SMALL = _img('00000:09090:09990:00900:00000')
Image.HAPPY = _img('00000:09090:00000:90009:09990')
Image.SMILE = _img('00000:00000:00000:90009:09990')
Image.SAD = _img('00000:09090:00000:09990:90009')
Image.CONFUSED = _img('00000:09090:00000:09090:90909')
Image.ANGRY = _img('90009:09090:00000:99999:90909')
Image.ASLEEP = _img('00000:99099:00000:09990:00000')
Image.SURPRISED = _img('09090:00000:00900:09090:00900')
Image.SILLY = _img('90009:00000:99999:00909:00999')
Image.FABULOUS = _img('99999:99099:00000:09090:09990')
Image.MEH = _img('09090:00000:00090:00900:09000')
Image.YES = _img('00000:00009:00090:90900:09000')
Image.NO = _img('90009:09090:00900:09090:90009')
Image.CLOCK12 = _img('00900:00900:00900:00000:00000')
Image.CLOCK1 = _img('00090:00090:00900:00000:00000')
Image.CLOCK2 = _img('00000:00099:00900:00000:00000')
Image.CLOCK3 = _img('00000:00000:00999:00000:00000')
Image.CLOCK4 = _img('00000:00000:00900:00099:00000')
Image.CLOCK5 = _img('00000:00000:00900:00090:00090')
Image.CLOCK6 = _img('00000:00000:00900:00900:00900')
Image.CLOCK7 = _img('00000:00000:00900:09000:09000')
Image.CLOCK8 = _img('00000:00000:00900:99000:00000')
Image.CLOCK9 = _img('00000:00000:99900:00000:00000')
Image.CLOCK10 = _img('00000:99000:00900:00000:00000')
Image.CLOCK11 = _img('09000:09000:00900:00000:00000')
Image.ARROW_N = _img('00900:09990:90909:00900:00900')
Image.ARROW_NE = _img('00999:00099:00909:09000:90000')
Image.ARROW_E = _img('00900:00090:99999:00090:00900')
Image.ARROW_SE = _img('90000:09000:00909:00099:00999')
Image.ARROW_S = _img('00900:00900:90909:09990:00900')
Image.ARROW_SW = _img('00009:00090:90900:99000:99900')
Image.ARROW_W = _img('00900:09000:99999:09000:00900')
Image.ARROW_NW = _img('99900:99000:90900:00090:00009')
Image.TRIANGLE = _img('00000:00900:09090:99999:00000')
Image.TRIANGLE_LEFT = _img('90000:99000:90900:90090:99999')
Image.CHESSBOARD = _img('09090:90909:09090:90909:09090')
Image.DIAMOND = _img('00900:09090:90009:09090:00900')
Image.DIAMOND_SMALL = _img('00000:00900:09090:00900:00000')
Image.SQUARE = _img('99999:90009:90009:90009:99999')
Image.SQUARE_SMALL = _img('00000:09990:09090:09990:00000')
Image.RABBIT = _img('90900:90900:99990:99090:99990')
Image.COW = _img('90009:90009:99999:09990:00900')
Image.MUSIC_CROTCHET = _img('00900:00900:00900:99900:99900')
Image.MUSIC_QUAVER = _img('00900:00990:00909:99900:99900')
Image.MUSIC_QUAVERS = _img('09999:09009:09009:99099:99099')
Image.PITCHFORK = _img('90909:90909:99999:00900:00900')
Image.XMAS = _img('00900:09990:00900:09990:99999')
Image.PACMAN = _img('09999:99090:99900:99990:09999')
Image.TARGET = _img('00900:09990:99099:09990:00900')
Image.TSHIRT = _img('99099:99999:09990:09990:09990')
Image.ROLLERSKATE = _img('00099:00099:99999:99999:09090')
Image.DUCK = _img('09900:99900:09999:09990:00000')
Image.HOUSE = _img('00900:09990:99999:09990:09090')
Image.TORTOISE = _img('00000:09990:99999:09090:00000')
Image.BUTTERFLY = _img('99099:99999:00900:99999:99099')
Image.STICKFIGURE = _img('00900:99999:00900:09090:90009')
Image.GHOST = _img('99999:90909:99999:99999:90909')
Image.SWORD = _img('00900:00900:00900:09990:00900')
Image.GIRAFFE = _img('99000:09000:09000:09990:09090')
Image.SKULL = _img('09990:90909:99999:09990:09990')
Image.UMBRELLA = _img('09990:99999:00900:90900:09900')
Image.SNAKE = _img('99000:99099:09090:09990:00000')
Image.SCISSORS = _img('99009:99090:00900:99090:99009')
Image.ALL_CLOCKS = [Image.CLOCK12, Image.CLOCK1, Image.CLOCK2, Image.CLOCK3, Image.CLOCK4, Image.CLOCK5,
                    Image.CLOCK6, Image.CLOCK7, Image.CLOCK8, Image.CLOCK9, Image.CLOCK10, Image.CLOCK11]
Image.ALL_ARROWS = [Image.ARROW_N, Image.ARROW_NE, Image.ARROW_E, Image.ARROW_SE,
                    Image.ARROW_S, Image.ARROW_SW, Image.ARROW_W, Image.ARROW_NW]


def _frame(x):
    if isinstance(x, Image):
        return x._leds()
    s = str(x)
    return s[0] if s else ' '


class _Display:
    def show(self, image, delay=400, wait=True, loop=False, clear=False, monospace=False):
        if isinstance(image, Image):
            _mb.display_set(image._leds())
            return
        if isinstance(image, (int, float)):
            image = str(image)
        if isinstance(image, str):
            if len(image) == 1:
                _mb.display_set(_mb.char_image(image))
                return
            if len(image) == 0:
                return
        frames = [_frame(x) for x in image]
        _mb.display_frames(frames, delay, wait, loop, clear)

    def scroll(self, text, delay=150, wait=True, loop=False, monospace=False):
        _mb.display_scroll(str(text), delay, wait, loop, monospace)

    def clear(self):
        _mb.display_clear()

    def get_pixel(self, x, y):
        if not (0 <= x < 5 and 0 <= y < 5):
            raise ValueError("index out of bounds")
        return _mb.display_get(x, y)

    def set_pixel(self, x, y, value):
        if not (0 <= x < 5 and 0 <= y < 5):
            raise ValueError("index out of bounds")
        if not (0 <= value <= 9):
            raise ValueError("brightness out of bounds")
        _mb.display_set_pixel(x, y, value)

    def on(self):
        _mb.display_on(True)

    def off(self):
        _mb.display_on(False)

    def is_on(self):
        return _mb.display_is_on()

    def read_light_level(self):
        return _mb.light_level()

display = _Display()


class Button:
    def __init__(self, name):
        self._n = name

    def is_pressed(self):
        return _mb.btn_is(self._n)

    def was_pressed(self):
        return _mb.btn_was(self._n)

    def get_presses(self):
        return _mb.btn_presses(self._n)

button_a = Button('a')
button_b = Button('b')


class MicroBitPin:
    NO_PULL = 0
    PULL_UP = 1
    PULL_DOWN = 2
    RESISTIVE = 0
    CAPACITIVE = 1

    def __init__(self, n):
        self._n = n
        self._pull = 2

    def read_digital(self):
        return _mb.pin_rd(self._n)

    def write_digital(self, value):
        _mb.pin_wd(self._n, 1 if value else 0)

    def read_analog(self):
        return _mb.pin_ra(self._n)

    def write_analog(self, value):
        _mb.pin_wa(self._n, value)

    def set_analog_period(self, period):
        _mb.pin_period(self._n, period)

    def set_analog_period_microseconds(self, period):
        _mb.pin_period(self._n, period / 1000)

    def get_analog_period_microseconds(self):
        return 20000

    def is_touched(self):
        return _mb.pin_touch(self._n)

    def set_touch_mode(self, mode):
        pass

    def set_pull(self, value):
        self._pull = value
        _mb.pin_pull(self._n, 'up' if value == 1 else 'down')

    def get_pull(self):
        return self._pull

    def get_mode(self):
        return 'touch'


class _LogoPin:
    def is_touched(self):
        return _mb.pin_touch('logo')

    def set_touch_mode(self, mode):
        pass


class _SpeakerPin(MicroBitPin):
    pass

pin0 = MicroBitPin(0)
pin1 = MicroBitPin(1)
pin2 = MicroBitPin(2)
pin3 = MicroBitPin(3)
pin4 = MicroBitPin(4)
pin5 = MicroBitPin(5)
pin6 = MicroBitPin(6)
pin7 = MicroBitPin(7)
pin8 = MicroBitPin(8)
pin9 = MicroBitPin(9)
pin10 = MicroBitPin(10)
pin11 = MicroBitPin(11)
pin12 = MicroBitPin(12)
pin13 = MicroBitPin(13)
pin14 = MicroBitPin(14)
pin15 = MicroBitPin(15)
pin16 = MicroBitPin(16)
pin19 = MicroBitPin(19)
pin20 = MicroBitPin(20)
pin_logo = _LogoPin()
pin_speaker = _SpeakerPin(0)


class _Accelerometer:
    def get_x(self):
        return _mb.acc()[0]

    def get_y(self):
        return _mb.acc()[1]

    def get_z(self):
        return _mb.acc()[2]

    def get_values(self):
        return tuple(_mb.acc())

    def get_strength(self):
        x, y, z = _mb.acc()
        return int((x * x + y * y + z * z) ** 0.5)

    def current_gesture(self):
        return _mb.gesture()

    def is_gesture(self, name):
        return _mb.gesture() == name

    def was_gesture(self, name):
        return _mb.was_gesture(name)

    def get_gestures(self):
        return tuple(_mb.gestures())

    def set_range(self, value):
        pass

accelerometer = _Accelerometer()


class _Compass:
    def calibrate(self):
        _mb.calibrate()

    def is_calibrated(self):
        return _mb.is_cal()

    def clear_calibration(self):
        _mb.clear_cal()

    def heading(self):
        if not _mb.is_cal():
            _mb.calibrate()
        return _mb.heading()

    def get_x(self):
        return _mb.mag()[0]

    def get_y(self):
        return _mb.mag()[1]

    def get_z(self):
        return _mb.mag()[2]

    def get_field_strength(self):
        x, y, z = _mb.mag()
        return int((x * x + y * y + z * z) ** 0.5)

compass = _Compass()


class SoundEvent:
    def __init__(self, name):
        self.name = name

    def __eq__(self, other):
        return isinstance(other, SoundEvent) and other.name == self.name

    def __hash__(self):
        return hash(self.name)

    def __repr__(self):
        return 'SoundEvent(' + repr(self.name) + ')'

SoundEvent.LOUD = SoundEvent('loud')
SoundEvent.QUIET = SoundEvent('quiet')


class _Microphone:
    def _ev(self, name):
        return SoundEvent.LOUD if name == 'loud' else SoundEvent.QUIET

    def current_event(self):
        n = _mb.mic_current()
        return None if n is None else self._ev(n)

    def was_event(self, event):
        return _mb.mic_was(event.name)

    def is_event(self, event):
        return _mb.mic_is(event.name)

    def get_events(self):
        return tuple([self._ev(n) for n in _mb.mic_events()])

    def set_threshold(self, event, value):
        _mb.mic_threshold(event.name, value)

    def sound_level(self):
        return _mb.mic_level()

microphone = _Microphone()


class _Speaker:
    def on(self):
        _mb.speaker(True)

    def off(self):
        _mb.speaker(False)

    def is_on(self):
        return _mb.speaker_is_on()

speaker = _Speaker()


class _UART:
    ODD = 1
    EVEN = 0

    def init(self, baudrate=9600, bits=8, parity=None, stop=1, tx=None, rx=None):
        pass

    def any(self):
        return _mb.uart_any()

    def read(self, n=-1):
        s = _mb.uart_read()
        return None if s is None else bytes(s, 'utf-8')

    def readline(self):
        return self.read()

    def write(self, buf):
        if isinstance(buf, bytes):
            buf = ''.join([chr(b) for b in buf])
        _mb.uart_write(str(buf))

uart = _UART()


import audio
from audio import Sound, SoundEffect

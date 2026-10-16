import _mb


class NeoPixel:
    def __init__(self, pin, n, bpp=3):
        self._pin = getattr(pin, '_n', 0)
        self.n = n
        self.bpp = bpp
        self._px = [(0, 0, 0)] * n

    def __len__(self):
        return self.n

    def __getitem__(self, i):
        return self._px[i]

    def __setitem__(self, i, value):
        v = tuple(value)
        if len(v) < 3:
            raise ValueError('expected RGB tuple')
        self._px[i] = tuple([max(0, min(255, int(c))) for c in v[:3]])

    def clear(self):
        self._px = [(0, 0, 0)] * self.n
        self.show()

    def fill(self, colour):
        c = tuple([max(0, min(255, int(v))) for v in tuple(colour)[:3]])
        self._px = [c] * self.n

    def show(self):
        _mb.neopixel(self._pin, [list(p) for p in self._px])

    def write(self):
        self.show()

import _mb


class Sound:
    def __init__(self, name):
        self.name = name

    def __repr__(self):
        return 'Sound(' + repr(self.name) + ')'

for _n in ['GIGGLE', 'HAPPY', 'HELLO', 'MYSTERIOUS', 'SAD', 'SLIDE', 'SOARING', 'SPRING', 'TWINKLE', 'YAWN']:
    setattr(Sound, _n, Sound(_n.lower()))


class SoundEffect:
    WAVEFORM_SINE = 0
    WAVEFORM_SAWTOOTH = 1
    WAVEFORM_TRIANGLE = 2
    WAVEFORM_SQUARE = 3
    WAVEFORM_NOISE = 4
    SHAPE_LINEAR = 1
    SHAPE_CURVE = 2
    SHAPE_LOG = 18
    FX_NONE = 0
    FX_TREMOLO = 2
    FX_VIBRATO = 1
    FX_WARBLE = 3

    def __init__(self, freq_start=500, freq_end=2500, duration=500, vol_start=255, vol_end=0,
                 waveform=3, fx=0, shape=18):
        self.freq_start = freq_start
        self.freq_end = freq_end
        self.duration = duration
        self.vol_start = vol_start
        self.vol_end = vol_end
        self.waveform = waveform
        self.fx = fx
        self.shape = shape

    def copy(self):
        return SoundEffect(self.freq_start, self.freq_end, self.duration, self.vol_start,
                           self.vol_end, self.waveform, self.fx, self.shape)

    def _d(self):
        return {'freq_start': self.freq_start, 'freq_end': self.freq_end, 'duration': self.duration,
                'vol_start': self.vol_start, 'vol_end': self.vol_end, 'waveform': self.waveform,
                'fx': self.fx, 'shape': self.shape}

    def __repr__(self):
        return ('SoundEffect(freq_start=' + str(self.freq_start) + ', freq_end=' + str(self.freq_end) +
                ', duration=' + str(self.duration) + ', vol_start=' + str(self.vol_start) +
                ', vol_end=' + str(self.vol_end) + ', waveform=' + str(self.waveform) +
                ', fx=' + str(self.fx) + ', shape=' + str(self.shape) + ')')


def play(source, wait=True, pin=None, return_pin=None):
    if isinstance(source, Sound):
        _mb.audio_sound(source.name, wait)
    elif isinstance(source, SoundEffect):
        _mb.audio_effect([source._d()], wait)
    else:
        effects = list(source)
        if effects and isinstance(effects[0], SoundEffect):
            _mb.audio_effect([e._d() for e in effects], wait)


def is_playing():
    return _mb.is_playing()


def stop():
    _mb.audio_stop()

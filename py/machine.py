import _mb


def reset():
    _mb.reset()


def freq():
    return 64000000


def unique_id():
    return bytes([0x9a, 0x5b, 0x7e, 0x1c, 0, 0, 0, 1])


def disable_irq():
    return 0


def enable_irq(state=0):
    pass


def time_pulse_us(pin, pulse_level, timeout_us=1000000):
    return _mb.pulse_in(getattr(pin, '_n', 0), pulse_level, timeout_us)

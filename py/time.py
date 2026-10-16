import _mb


def sleep(seconds):
    _mb.sleep(seconds * 1000)


def sleep_ms(ms):
    _mb.sleep(ms)


def sleep_us(us):
    _mb.sleep(us / 1000)


def ticks_ms():
    return _mb.running_time()


def ticks_us():
    return _mb.ticks_us()


def ticks_add(ticks, delta):
    return ticks + delta


def ticks_diff(ticks1, ticks2):
    return ticks1 - ticks2


def time():
    return _mb.running_time() // 1000


def time_ns():
    return _mb.ticks_us() * 1000

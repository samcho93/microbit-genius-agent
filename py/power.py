import _mb


def off():
    _mb.display_clear()


def deep_sleep(ms=None, wake_on=None, run_every=True):
    if ms is not None:
        _mb.sleep(ms)

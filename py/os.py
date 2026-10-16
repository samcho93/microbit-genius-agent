import _mb


def listdir():
    return _mb.fs_list()


def remove(filename):
    if not _mb.fs_remove(filename):
        raise OSError(2)


def size(filename):
    n = _mb.fs_size(filename)
    if n < 0:
        raise OSError(2)
    return n


def uname():
    return ('microbit', 'microbit', '2.1.2', 'micro:bit v2.1.2+0697c6d on 2023-10-30; MicroPython v1.18', 'micro:bit with nRF52833')

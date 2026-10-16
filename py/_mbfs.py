import _mb


class FileIO:
    def __init__(self, name, mode='r'):
        self.name = str(name)
        self.mode = mode
        self.closed = False
        self._bin = 'b' in mode
        if 'r' in mode:
            t = _mb.fs_read(self.name)
            if t is None:
                raise OSError(2)
            self._buf = t
            self._pos = 0
            self._w = False
        elif 'w' in mode:
            _mb.fs_write(self.name, '')
            self._w = True
        elif 'a' in mode:
            if _mb.fs_read(self.name) is None:
                _mb.fs_write(self.name, '')
            self._w = True
        else:
            raise ValueError('invalid mode')

    def _out(self, s):
        if self._bin:
            return bytes([ord(c) & 255 for c in s])
        return s

    def write(self, s):
        if self.closed:
            raise ValueError('I/O operation on closed file')
        if not self._w:
            raise OSError(9)
        if isinstance(s, bytes):
            s = ''.join([chr(b) for b in s])
        s = str(s)
        _mb.fs_append(self.name, s)
        return len(s)

    def read(self, n=-1):
        if self._w:
            raise OSError(9)
        if n is None or n < 0:
            r = self._buf[self._pos:]
        else:
            r = self._buf[self._pos:self._pos + n]
        self._pos += len(r)
        return self._out(r)

    def readline(self):
        if self._w:
            raise OSError(9)
        i = self._buf.find('\n', self._pos)
        end = len(self._buf) if i < 0 else i + 1
        r = self._buf[self._pos:end]
        self._pos = end
        return self._out(r)

    def readlines(self):
        out = []
        while True:
            line = self.readline()
            if not line:
                break
            out.append(line)
        return out

    def __iter__(self):
        return iter(self.readlines())

    def flush(self):
        pass

    def close(self):
        self.closed = True

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self.close()


def open(name, mode='r'):
    return FileIO(name, mode)

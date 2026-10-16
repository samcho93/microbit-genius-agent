import _mb

RATE_1MBIT = 1
RATE_2MBIT = 2
RATE_250KBIT = 0


def on():
    _mb.radio_on(True)


def off():
    _mb.radio_on(False)


def config(**kwargs):
    for k in kwargs:
        if k not in ('length', 'queue', 'channel', 'power', 'address', 'group', 'data_rate'):
            raise TypeError("unexpected keyword argument '" + k + "'")
    if 'channel' in kwargs and not (0 <= kwargs['channel'] <= 83):
        raise ValueError('value out of range for argument channel')
    if 'group' in kwargs and not (0 <= kwargs['group'] <= 255):
        raise ValueError('value out of range for argument group')
    if 'length' in kwargs and not (1 <= kwargs['length'] <= 251):
        raise ValueError('value out of range for argument length')
    _mb.radio_config(kwargs)


def reset():
    _mb.radio_reset()


def send(message):
    _mb.radio_send('str', str(message))


def send_bytes(message):
    _mb.radio_send('bytes', list(message))


def receive():
    m = _mb.radio_recv()
    if m is None:
        return None
    if m[0] == 'str':
        return m[1]
    return ''.join([chr(b) for b in m[1]])


def receive_bytes():
    m = _mb.radio_recv()
    if m is None:
        return None
    if m[0] == 'str':
        return bytes(m[1], 'utf-8')
    return bytes(m[1])


def receive_bytes_into(buffer):
    b = receive_bytes()
    if b is None:
        return None
    n = min(len(b), len(buffer))
    for i in range(n):
        buffer[i] = b[i]
    return n


def receive_full():
    m = _mb.radio_recv()
    if m is None:
        return None
    data = bytes(m[1], 'utf-8') if m[0] == 'str' else bytes(m[1])
    return (data, m[2], m[3] * 1000)

import _mb

MILLISECONDS = 1
SECONDS = 10
MINUTES = 600
HOURS = 36000
DAYS = 864000

_UNSET = 'unset'


def set_labels(*labels, **kwargs):
    names = [str(l) for l in labels]
    if 'timestamp' in kwargs:
        _mb.log_labels(names, kwargs['timestamp'])
    else:
        _mb.log_labels_keep(names)


def add(data_dictionary=None, **kwargs):
    pairs = []
    if data_dictionary is not None:
        for k in data_dictionary:
            pairs.append([str(k), data_dictionary[k]])
    for k in kwargs:
        pairs.append([str(k), kwargs[k]])
    _mb.log_add(pairs)


def delete(full=False):
    _mb.log_delete(full)


def set_mirroring(serial):
    _mb.log_mirror(bool(serial))

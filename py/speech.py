import _mb


def say(words, pitch=64, speed=72, mouth=128, throat=128, pin=None):
    _mb.say(str(words), True, speed, pitch)


def pronounce(phonemes, pitch=64, speed=72, mouth=128, throat=128, pin=None):
    _mb.say(str(phonemes), True, speed, pitch)


def sing(phonemes, pitch=64, speed=72, mouth=128, throat=128, pin=None):
    _mb.say(str(phonemes), True, speed, pitch)


def translate(words):
    return str(words)

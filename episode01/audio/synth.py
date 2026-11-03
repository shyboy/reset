#!/usr/bin/env python3
"""风坡镇 第1集《一杯热水》—— 程序化声音合成

读取 build/cues.json（由画面时间轴导出，与画面同一个数据源），合成：
  * 环境声床：海浪、坡上的风、鸟、室内底噪
  * 拟音：每条提示一个合成器（纸团“咔啦”、铜铃“叮”、盖戳“咚”、展开“嚓”……）
  * 配乐：片名一句动机；镜 38–41 再起一次
没有人声台词，只有呼吸、轻哼这类非语言声音。

用法：python3 audio/synth.py build/cues.json build/ep01_audio.wav
只依赖 numpy。所有随机数都有固定种子，结果可复现。
"""
import json
import sys
import wave

import numpy as np

SR = 48000


# ---------------- 基础工具 ----------------
def rng(seed):
    return np.random.default_rng(seed)


def n_(sec):
    return max(1, int(round(sec * SR)))


def tt(sec):
    return np.arange(n_(sec)) / SR


def band(x, lo, hi, soft=0.25):
    """FFT 频域带通（柔和边缘）。"""
    if len(x) < 8:
        return x
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    m = np.ones_like(f)
    if lo > 0:
        m *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (2 / soft))
    if hi < SR / 2:
        m *= 1 / (1 + (f / hi) ** (2 / soft))
    return np.fft.irfft(X * m, len(x))


def norm(x, peak=1.0):
    m = np.max(np.abs(x)) if len(x) else 0
    return x / m * peak if m > 0 else x


def env_exp(sec, decay, attack=0.002):
    t = tt(sec)
    e = np.exp(-t / decay)
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    return e * a


def env_ar(sec, a, r):
    t = tt(sec)
    e = np.ones_like(t)
    e *= np.clip(t / max(a, 1e-4), 0, 1)
    e *= np.clip((sec - t) / max(r, 1e-4), 0, 1)
    return e


def sine(f, sec, phase=0):
    t = tt(sec)
    if callable(f):
        ph = 2 * np.pi * np.cumsum(f(t)) / SR
        return np.sin(ph + phase)
    return np.sin(2 * np.pi * f * t + phase)


def place(dst, src, at):
    i = int(round(at * SR))
    if i >= len(dst):
        return
    j = min(len(dst), i + len(src))
    if i < 0:
        src = src[-i:]
        i = 0
    dst[i:j] += src[: j - i]


def scatter(sec, rate, make, seed, jitter=0.6):
    """在 sec 秒内按平均 rate 次/秒散布短音。"""
    r = rng(seed)
    out = np.zeros(n_(sec) + n_(1.0))
    t = r.uniform(0, 1 / rate)
    k = 0
    while t < sec:
        place(out, make(r, k), t)
        t += (1 / rate) * (1 + r.uniform(-jitter, jitter))
        k += 1
    return out[: n_(sec)]


# ---------------- 拟音合成器 ----------------
def addp(*xs):
    """把长度不同的片段对齐后相加"""
    n = max(len(x) for x in xs)
    out = np.zeros(n)
    for x in xs:
        out[: len(x)] += x
    return out


def click(r, f_lo=800, f_hi=5000, dec=0.012, amp=1.0):
    x = r.standard_normal(n_(dec * 6)) * env_exp(dec * 6, dec)
    return band(x, f_lo, f_hi) * amp


def crackle(sec, density, seed, f_lo=1200, f_hi=7000, dec=0.006):
    return scatter(sec, density, lambda r, k: click(r, f_lo, f_hi, dec, r.uniform(0.3, 1.0)), seed, 0.95)


def bell_tone(f0=2150, dec=0.9, amp=1.0, seed=0):
    sec = dec * 5
    partials = [(1, 1), (2.76, 0.5), (5.40, 0.25), (8.93, 0.12)]
    x = sum(a * sine(f0 * p, sec) * env_exp(sec, dec / (1 + p * 0.4)) for p, a in partials)
    x += click(rng(seed), 3000, 9000, 0.004, 0.3)[: n_(sec)].tolist() and 0
    return x * amp


SYN = {}


def syn(name):
    def deco(fn):
        SYN[name] = fn
        return fn
    return deco


@syn('bell')
def _bell(dur, r, o):
    return bell_tone(2150, 0.9)


@syn('bellmute')
def _bellmute(dur, r, o):
    return bell_tone(2150, 0.04) * 0.7


@syn('bellmess')
def _bellmess(dur, r, o):
    return scatter(dur or 1.0, 7, lambda rr, k: bell_tone(2150 * rr.uniform(0.98, 1.03), rr.uniform(0.08, 0.25)) * rr.uniform(0.25, 0.6), r.integers(1e9))


@syn('dong')
def _dong(dur, r, o):
    # 盖戳“咚”：低频冲击 + 木质敲击 + 一点房间感
    sec = 1.6
    f = lambda t: 120 * np.exp(-t * 7) + 62
    body = sine(f, sec) * env_exp(sec, 0.28)
    knock = band(r.standard_normal(n_(sec)), 500, 2400) * env_exp(sec, 0.035)
    sub = sine(48, sec) * env_exp(sec, 0.4) * 0.5
    return body * 1.0 + knock * 0.6 + sub


@syn('cha')
def _cha(dur, r, o):
    # 展开一角“嚓”：干脆的纸张展开声
    sec = 0.6
    x = band(r.standard_normal(n_(sec)), 1800, 9000) * env_exp(sec, 0.09, 0.004)
    x += crackle(sec, 140, r.integers(1e9), 2500, 9000)[: n_(sec)] * env_exp(sec, 0.15) * 0.8
    return x


@syn('crumple')
def _crumple(dur, r, o):
    sec = 1.0
    e = np.clip(np.sin(np.pi * tt(sec) / sec) * 1.6, 0, 1)
    return crackle(sec, 260, r.integers(1e9), 900, 6500, 0.008) * e + band(r.standard_normal(n_(sec)), 600, 3000) * e * 0.15


@syn('paper')
def _paper(dur, r, o):
    sec = 0.4
    return band(r.standard_normal(n_(sec)), 1500, 6000) * env_ar(sec, 0.04, 0.3) * 0.5 + crackle(sec, 40, r.integers(1e9)) * 0.4


@syn('paperbrush')
def _paperbrush(dur, r, o):
    sec = dur or 0.35
    return band(r.standard_normal(n_(sec)), 2000, 7000) * env_ar(sec, 0.08, 0.2) * 0.35


@syn('paperdrop')
def _paperdrop(dur, r, o):
    x = crackle(0.25, 120, r.integers(1e9)) * env_exp(0.25, 0.08)
    thump = band(r.standard_normal(n_(0.2)), 120, 700) * env_exp(0.2, 0.04)
    out = np.zeros(n_(0.5))
    place(out, x, 0)
    place(out, thump * 0.8, 0.02)
    return out


@syn('paperland')
def _paperland(dur, r, o):
    return band(r.standard_normal(n_(0.2)), 400, 3000) * env_exp(0.2, 0.03) * 0.6


@syn('paperroll')
def _paperroll(dur, r, o):
    sec = dur or 2
    return scatter(sec, 9, lambda rr, k: crackle(0.08, 200, rr.integers(1e9), 1200, 6000) * rr.uniform(0.3, 0.8), r.integers(1e9)) * env_ar(sec, 0.2, 0.4)


@syn('rustle')
def _rustle(dur, r, o):
    sec = 0.7
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 9 * tt(sec)) ** 2
    return band(r.standard_normal(n_(sec)), 2000, 7000) * env_ar(sec, 0.05, 0.4) * am * 0.6 + crackle(sec, 50, r.integers(1e9)) * 0.4


@syn('rustlesoft')
def _rustlesoft(dur, r, o):
    return _rustle(dur, r, o) * 0.5


@syn('plastic')
def _plastic(dur, r, o):
    sec = dur or 1.5
    return (crackle(sec, 90, r.integers(1e9), 3000, 11000, 0.004) + band(r.standard_normal(n_(sec)), 3000, 9000) * 0.12) * env_ar(sec, 0.1, 0.3)


@syn('tie')
def _tie(dur, r, o):
    return _plastic(dur or 1.4, r, o) * 1.2


@syn('wrapper')
def _wrapper(dur, r, o):
    sec = dur or 1.0
    return crackle(sec, 160, r.integers(1e9), 3500, 12000, 0.003) * env_ar(sec, 0.05, 0.2) * 0.9


@syn('candyrattle')
def _candy(dur, r, o):
    sec = dur or 1.0
    return scatter(sec, 14, lambda rr, k: addp(click(rr, 900, 4500, 0.006, rr.uniform(0.4, 1)), sine(rr.uniform(1800, 2600), 0.03) * env_exp(0.03, 0.006) * 0.4), r.integers(1e9))


@syn('drips')
def _drips(dur, r, o):
    sec = dur or 10
    def drip(rr, k):
        f0 = rr.uniform(1300, 2600)
        s = 0.12
        return sine(lambda t: f0 * (1 + 0.6 * np.exp(-t * 60)), s) * env_exp(s, 0.03) * rr.uniform(0.15, 0.5)
    return scatter(sec, 2.2, drip, r.integers(1e9), 0.9)


def wind_noise(sec, r, lo=150, hi=1200, rate=0.35, depth=0.6):
    x = band(r.standard_normal(n_(sec)), lo, hi)
    t = tt(sec)
    am = 1 - depth + depth * (0.5 + 0.5 * np.sin(2 * np.pi * rate * t + r.uniform(0, 6)) * np.sin(2 * np.pi * rate * 0.37 * t + 1))
    return norm(x) * am


@syn('coldwind')
def _coldwind(dur, r, o):
    sec = dur or 10
    return wind_noise(sec, r, 120, 800, 0.2) * env_ar(sec, 1.5, 2.0) * 0.35


@syn('wind')
def _wind(dur, r, o):
    sec = dur or 4
    x = wind_noise(sec, r, 180, 2200, 0.9, 0.7)
    whistle = sine(lambda t: 820 + 160 * np.sin(2 * np.pi * 0.7 * t), sec) * 0.06
    return (x + whistle) * env_ar(sec, 0.8, 1.2) * 0.9


@syn('windsoft')
def _windsoft(dur, r, o):
    sec = dur or 1
    return wind_noise(sec, r, 200, 1500, 1.2) * env_ar(sec, 0.3, 0.5) * 0.45


@syn('windfade')
def _windfade(dur, r, o):
    sec = dur or 1.2
    return wind_noise(sec, r, 180, 1500, 0.8) * np.linspace(0.6, 0, n_(sec))


@syn('wheels')
def _wheels(dur, r, o):
    sec = dur or 1.5
    rumble = band(r.standard_normal(n_(sec)), 60, 500) * 0.6
    clicks = scatter(sec, 9, lambda rr, k: click(rr, 300, 2000, 0.008, 0.5), r.integers(1e9), 0.15)
    return (norm(rumble) * 0.5 + clicks) * env_ar(sec, 0.15, 0.25)


@syn('wheelstop')
def _wheelstop(dur, r, o):
    return click(r, 300, 2500, 0.02, 1.0)


def steps(sec, rate, r, lo=200, hi=1600, dec=0.05, amp=0.7):
    return scatter(sec, rate, lambda rr, k: band(rr.standard_normal(n_(dec * 5)), lo, hi) * env_exp(dec * 5, dec) * rr.uniform(0.6, 1) * amp, r.integers(1e9), 0.12)


@syn('footsteps')
def _footsteps(dur, r, o):
    return steps(dur or 1.5, 2.3, r)


@syn('footsoft')
def _footsoft(dur, r, o):
    return steps(dur or 3, 1.3, r, 150, 900, 0.06, 0.45)


@syn('step')
def _step(dur, r, o):
    return band(r.standard_normal(n_(0.2)), 300, 2500) * env_exp(0.2, 0.025) * 0.5


@syn('scamper')
def _scamper(dur, r, o):
    return steps(dur or 1.5, 11, r, 600, 4000, 0.012, 0.45)


@syn('climb')
def _climb(dur, r, o):
    return steps(dur or 2, 8, r, 800, 5000, 0.01, 0.5) + crackle(dur or 2, 20, r.integers(1e9)) * 0.2


@syn('horn')
def _horn(dur, r, o):
    sec = 1.6
    t = tt(sec)
    tone = (np.sign(np.sin(2 * np.pi * 392 * t)) + np.sign(np.sin(2 * np.pi * 494 * t))) * 0.5
    tone = band(tone, 200, 1500) * env_ar(sec, 0.03, 0.9) * (t < 0.55)
    return band(tone + 0 * t, 200, 1100) * 0.5


@syn('inhale')
def _inhale(dur, r, o):
    sec = 0.6
    x = band(r.standard_normal(n_(sec)), 500, 3000)
    return x * env_ar(sec, 0.45, 0.1) * 0.25


@syn('sniff')
def _sniff(dur, r, o):
    out = np.zeros(n_(0.6))
    for at in (0, 0.22):
        place(out, band(r.standard_normal(n_(0.15)), 1500, 6000) * env_ar(0.15, 0.06, 0.06) * 0.35, at)
    return out


@syn('sigh')
def _sigh(dur, r, o):
    sec = 1.1
    x = band(r.standard_normal(n_(sec)), 250, 1800) * env_ar(sec, 0.1, 0.8)
    hum = sine(lambda t: 190 - 40 * t, sec) * env_ar(sec, 0.2, 0.7) * 0.06
    return x * 0.3 + hum


@syn('sip')
def _sip(dur, r, o):
    sec = 0.35
    am = 0.6 + 0.4 * np.sin(2 * np.pi * 22 * tt(sec))
    return band(r.standard_normal(n_(sec)), 700, 3500) * env_ar(sec, 0.04, 0.15) * am * 0.4


def voice(f, sec, formants=(700, 1200), amp=0.25, vib=5):
    """小生物的轻哼：带颤音的谐波 + 简单共振峰"""
    t = tt(sec)
    ff = f(t) if callable(f) else np.full_like(t, f)
    ff = ff * (1 + 0.012 * np.sin(2 * np.pi * vib * t))
    ph = 2 * np.pi * np.cumsum(ff) / SR
    x = sum(np.sin(k * ph) / k for k in range(1, 9))
    x = band(x, formants[0] * 0.5, formants[1] * 2.5)
    return norm(x) * amp


@syn('hmm')
def _hmm(dur, r, o):
    sec = 0.4
    return voice(lambda t: 420 + 220 * (t / sec) ** 2, sec) * env_ar(sec, 0.04, 0.12)


@syn('happy')
def _happy(dur, r, o):
    sec = 0.35
    return voice(lambda t: 520 + 120 * np.sin(np.pi * t / sec), sec, amp=0.2) * env_ar(sec, 0.04, 0.15)


@syn('pant')
def _pant(dur, r, o):
    sec = dur or 1.5
    return scatter(sec, 5, lambda rr, k: band(rr.standard_normal(n_(0.12)), 900, 4000) * env_ar(0.12, 0.02, 0.08) * 0.25, r.integers(1e9), 0.1)


def pluck(f, sec=1.2, amp=0.3, bright=4):
    t = tt(sec)
    x = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (2.5 + k * bright)) / k for k in range(1, 6))
    return x * amp * np.clip(t / 0.003, 0, 1)


def celesta(f, sec=1.6, amp=0.25):
    t = tt(sec)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 2.2) + 0.3 * np.sin(2 * np.pi * f * 4.0 * t) * np.exp(-t * 6)
    return x * amp * np.clip(t / 0.002, 0, 1)


@syn('notice')
def _notice(dur, r, o):
    out = np.zeros(n_(0.8))
    place(out, celesta(1568, 0.6, 0.18), 0)
    place(out, celesta(2093, 0.6, 0.18), 0.07)
    return out


@syn('realize')
def _realize(dur, r, o):
    out = np.zeros(n_(1.6))
    for i, f in enumerate([1175, 1480, 1760, 2349]):
        place(out, celesta(f, 1.2, 0.16), i * 0.07)
    return out


@syn('shimmer')
def _shimmer(dur, r, o):
    return scatter(1.2, 6, lambda rr, k: celesta(rr.choice([2637, 3136, 3520, 4186]), 0.6, 0.06), r.integers(1e9))


@syn('tick')
def _tick(dur, r, o):
    return click(r, 2000, 8000, 0.004, 0.3)


@syn('squeeze')
def _squeeze(dur, r, o):
    sec = 0.6
    return sine(lambda t: 520 + 380 * t / sec + 60 * np.sin(2 * np.pi * 14 * t), sec) * env_ar(sec, 0.05, 0.2) * 0.12


@syn('tug')
def _tug(dur, r, o):
    sec = dur or 1.2
    out = scatter(sec, 3.2, lambda rr, k: sine(lambda t: rr.uniform(500, 700) + 400 * t, 0.18) * env_ar(0.18, 0.02, 0.1) * 0.12, r.integers(1e9), 0.2)
    return out + voice(lambda t: 380 + 30 * np.sin(2 * np.pi * 3 * t), sec, amp=0.08) * env_ar(sec, 0.1, 0.2)


@syn('pop')
def _pop(dur, r, o):
    sec = 0.35
    x = sine(lambda t: 420 * np.exp(-t * 18) + 110, sec) * env_exp(sec, 0.06)
    return x * 0.7 + band(r.standard_normal(n_(sec)), 200, 2000) * env_exp(sec, 0.02) * 0.4


@syn('poof')
def _poof(dur, r, o):
    sec = 0.4
    return band(r.standard_normal(n_(sec)), 150, 1500) * env_exp(sec, 0.08, 0.01) * 0.6 + crackle(sec, 60, r.integers(1e9)) * 0.2


@syn('thud')
def _thud(dur, r, o):
    sec = 0.6
    return sine(lambda t: 90 * np.exp(-t * 8) + 50, sec) * env_exp(sec, 0.12) * 0.9 + band(r.standard_normal(n_(sec)), 100, 900) * env_exp(sec, 0.03) * 0.5


@syn('thudsoft')
def _thudsoft(dur, r, o):
    return _thud(dur, r, o) * 0.5


@syn('bump')
def _bump(dur, r, o):
    return addp(band(r.standard_normal(n_(0.25)), 150, 1200) * env_exp(0.25, 0.03) * 0.7, crackle(0.2, 80, r.integers(1e9)) * 0.3)


@syn('bounce')
def _bounce(dur, r, o):
    return band(r.standard_normal(n_(0.15)), 300, 2500) * env_exp(0.15, 0.02) * 0.5


@syn('whoosh')
def _whoosh(dur, r, o):
    sec = 0.45
    x = r.standard_normal(n_(sec))
    lo = band(x, 400, 1500)
    hi = band(x, 1500, 5000)
    k = np.linspace(0, 1, n_(sec))
    return (lo * (1 - k) + hi * k) * env_ar(sec, 0.15, 0.2) * 0.5


@syn('throw')
def _throw(dur, r, o):
    return _whoosh(dur, r, o) * 0.8


@syn('jump')
def _jump(dur, r, o):
    sec = 0.3
    return sine(lambda t: 300 + 900 * t / sec, sec) * env_ar(sec, 0.01, 0.15) * 0.12


@syn('lid')
def _lid(dur, r, o):
    sec = 0.8
    x = sum(a * sine(f, sec) * env_exp(sec, d) for f, a, d in [(610, 1, 0.25), (1370, 0.6, 0.15), (2210, 0.4, 0.09), (3480, 0.25, 0.05)])
    return x * 0.35 + click(r, 1000, 6000, 0.01, 0.5)[: n_(sec)].sum() * 0


@syn('clatter')
def _clatter(dur, r, o):
    out = np.zeros(n_(1.0))
    for i, at in enumerate([0, 0.12, 0.2, 0.33]):
        place(out, band(r.standard_normal(n_(0.15)), 400, 3000) * env_exp(0.15, 0.025) * (0.9 - i * 0.15), at)
    return out


@syn('broomlean')
def _broomlean(dur, r, o):
    return band(r.standard_normal(n_(0.15)), 500, 3000) * env_exp(0.15, 0.02) * 0.5


@syn('clink')
def _clink(dur, r, o):
    sec = 0.5
    return sum(a * sine(f, sec) * env_exp(sec, d) for f, a, d in [(2650, 1, 0.12), (5300, 0.4, 0.06), (7400, 0.2, 0.03)]) * 0.25


@syn('kettle')
def _kettle(dur, r, o):
    out = _clink(dur, r, o) * 0.7
    out = np.concatenate([out, np.zeros(n_(0.6))])
    place(out, scatter(0.5, 18, lambda rr, k: click(rr, 1500, 6000, 0.004, 0.25), r.integers(1e9)), 0.1)
    return out


@syn('cart')
def _cart(dur, r, o):
    sec = dur or 3
    rumble = norm(band(r.standard_normal(n_(sec)), 60, 600)) * 0.35
    creak = scatter(sec, 1.4, lambda rr, k: sine(lambda t: rr.uniform(700, 900) + 200 * np.sin(2 * np.pi * 9 * t), 0.18) * env_ar(0.18, 0.03, 0.1) * 0.05, r.integers(1e9), 0.1)
    ticks = scatter(sec, 5, lambda rr, k: click(rr, 300, 1800, 0.01, 0.3), r.integers(1e9), 0.1)
    return (rumble + creak + ticks) * env_ar(sec, 0.3, 0.5)


@syn('sweep')
def _sweep(dur, r, o):
    sec = dur or 3
    def swish(rr, k):
        s = 0.42
        return band(rr.standard_normal(n_(s)), 1200, 7000) * env_ar(s, 0.12, 0.25) * rr.uniform(0.5, 0.8)
    return scatter(sec, 1.5, swish, r.integers(1e9), 0.08)


@syn('tremble')
def _tremble(dur, r, o):
    sec = dur or 3
    return crackle(sec, 70, r.integers(1e9), 2500, 9000, 0.003) * 0.25 * env_ar(sec, 0.3, 0.6)


@syn('capspin')
def _capspin(dur, r, o):
    sec = 1.2
    am = 0.5 + 0.5 * np.sin(2 * np.pi * 2.2 * tt(sec))
    return band(r.standard_normal(n_(sec)), 800, 4000) * am * env_ar(sec, 0.1, 0.3) * 0.25


@syn('pat')
def _pat(dur, r, o):
    return band(r.standard_normal(n_(0.12)), 200, 1500) * env_exp(0.12, 0.02) * 0.45 + crackle(0.12, 60, r.integers(1e9))[: n_(0.12)] * 0.15


@syn('roomtone')
def _roomtone(dur, r, o):
    sec = dur or 5
    return norm(band(r.standard_normal(n_(sec)), 50, 400)) * 0.06 * env_ar(sec, 0.6, 0.6)


@syn('rope')
def _rope(dur, r, o):
    sec = dur or 1
    am = 0.5 + 0.5 * np.abs(np.sin(2 * np.pi * 1.3 * tt(sec)))
    return band(r.standard_normal(n_(sec)), 400, 2500) * am * env_ar(sec, 0.1, 0.2) * 0.14


@syn('door')
def _door(dur, r, o):
    sec = 1.5
    t = tt(sec)
    creak = sine(lambda t: 160 + 90 * np.sin(2 * np.pi * 0.8 * t) + 30 * np.sin(2 * np.pi * 37 * t), sec)
    creak = band(creak * (0.6 + 0.4 * np.sin(2 * np.pi * 23 * t)), 150, 2500) * env_ar(sec, 0.2, 0.5) * 0.18
    out = creak
    place(out, click(r, 600, 4000, 0.015, 0.8), 0.0)
    return out


@syn('doorcreak')
def _doorcreak(dur, r, o):
    return _door(dur, r, o) * 0.5


@syn('birds')
def _birds(dur, r, o):
    sec = dur or 5
    def chirp(rr, k):
        out = np.zeros(n_(0.5))
        f0 = rr.uniform(2600, 4200)
        for j in range(rr.integers(1, 4)):
            s = rr.uniform(0.05, 0.1)
            c = sine(lambda t: f0 * (1 + 0.25 * np.sin(np.pi * t / s)) + rr.uniform(-80, 80), s) * env_ar(s, 0.01, 0.03)
            place(out, c * 0.12, j * 0.11)
        return out
    return scatter(sec, 1.1, chirp, r.integers(1e9))


@syn('seagull')
def _seagull(dur, r, o):
    out = np.zeros(n_(1.6))
    for at in (0, 0.45, 0.8):
        s = 0.32
        call = voice(lambda t: 1250 - 500 * (t / s) ** 0.7, s, formants=(900, 2200), amp=0.12, vib=11) * env_ar(s, 0.03, 0.15)
        place(out, call, at)
    return band(out, 500, 6000)


# ---------------- 配乐 ----------------
NOTE = {n: 440 * 2 ** ((i - 9) / 12) for i, n in enumerate(['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'])}


def hz(name):
    """'E5' -> Hz"""
    return NOTE[name[:-1]] * 2 ** (int(name[-1]) - 4)


def pad(freqs, sec, amp=0.06):
    t = tt(sec)
    x = np.zeros_like(t)
    for f in freqs:
        for d in (-0.6, 0.6):
            x += np.sin(2 * np.pi * (f + d) * t) + 0.25 * np.sin(2 * np.pi * 2 * (f + d) * t)
    return band(x, 80, 2500) * amp / len(freqs) * env_ar(sec, sec * 0.35, sec * 0.4)


def melody(notes, beat, inst=pluck, amp=0.22):
    total = sum(d for _, d in notes) * beat + 2.0
    out = np.zeros(n_(total))
    t = 0
    for n, d in notes:
        if n:
            place(out, inst(hz(n), min(2.0, d * beat + 0.8), amp), t)
        t += d * beat
    return out


@syn('motif')
def _motif(dur, r, o):
    # 片名：一句动机（五声音阶，八音盒质感），一句就收
    beat = 0.32
    m = melody([('E5', 1), ('G5', 1), ('A5', 1), ('G5', 1), ('E5', 2), ('D5', 1), ('E5', 3)], beat, celesta, 0.2)
    p = pad([hz('C3'), hz('G3'), hz('E4')], len(m) / SR, 0.05)
    return m + p[: len(m)]


@syn('music')
def _music(dur, r, o):
    # 镜 38–41：同一个动机展开成温暖的小段落，镜 41“嚓”之前让出一拍安静
    sec = dur or 19.6
    out = np.zeros(n_(sec + 3))
    bar = 2.2
    chords = [('C3', 'G3', 'E4'), ('A2', 'E3', 'C4'), ('F2', 'C3', 'A3'), ('G2', 'D3', 'B3'),
              ('C3', 'G3', 'E4'), ('A2', 'E3', 'C4'), ('F2', 'C3', 'A3'), ('C3', 'G3', 'E4')]
    for i, ch in enumerate(chords):
        place(out, pad([hz(n) for n in ch], bar * 1.4, 0.07), i * bar)
        place(out, pluck(hz(ch[0]), 2.0, 0.12, 6), i * bar)
    beat = 0.55
    mel = [('E5', 1), ('G5', 1), ('A5', 2), ('G5', 1), ('E5', 1), ('D5', 2),
           ('C5', 1), ('D5', 1), ('E5', 2), ('G5', 1), ('E5', 1), ('D5', 2),
           ('E5', 1), ('G5', 1), ('A5', 2), ('C6', 1), ('A5', 1), ('G5', 2),
           (None, 2), ('E5', 1), ('D5', 1), ('C5', 4)]
    place(out, melody(mel, beat, pluck, 0.16), bar * 0.5)
    place(out, melody([(n, d) for n, d in mel[12:]], beat, celesta, 0.06), bar * 0.5 + 12 * beat * 1.0 + 0.02)
    k = np.ones(len(out))
    k *= np.clip(tt(len(out) / SR) / 1.5, 0, 1)
    fade0 = n_(sec - 2.5)
    k[fade0:] *= np.linspace(1, 0, len(k) - fade0)
    return out * k


# ---------------- 声床 ----------------
def bed_waves(total, r):
    x = norm(band(r.standard_normal(n_(total)), 80, 1600))
    t = tt(total)
    swell = 0.55 + 0.45 * np.sin(2 * np.pi * t / 7.3) ** 2 * (0.7 + 0.3 * np.sin(2 * np.pi * t / 19))
    return x * swell


def mix(cues_path, out_path):
    data = json.load(open(cues_path))
    total = data['duration'] + 0.5
    L = np.zeros(n_(total))
    R = np.zeros(n_(total))
    master = rng(20261103)

    # 声床：海浪全片（序幕与室内弱一些），白天的鸟
    waves = bed_waves(total, rng(1))
    lvl = np.full(n_(total), 0.05)
    t = tt(total)
    lvl[(t < 15)] = 0.075
    lvl[(t >= 132) & (t < 140)] = 0.02    # 镜29 室内
    lvl[(t >= 161) & (t < 175)] = 0.03    # 镜34–35 近景
    lvl = np.convolve(lvl, np.ones(n_(0.5)) / n_(0.5), mode='same')
    bed = waves * lvl
    birds = np.zeros(n_(total))
    place(birds, SYN['birds'](total - 28, rng(2), {}) * 0.35, 28)
    birds[t[: len(birds)] > 175] *= 2.2   # 第二天清晨更热闹
    birds[(t >= 132) & (t < 140)] *= 0.2
    bed += birds

    print('  声床完成', flush=True)
    # “咚”和“嚓”周围留出安静：声床在前后 1.5 秒压低
    duck = np.ones(n_(total))
    for c in data['cues']:
        if c['name'] in ('dong', 'cha'):
            i0, i1 = n_(c['t'] - 1.4), n_(c['t'] + 1.6)
            w = np.hanning(i1 - i0)
            duck[i0:i1] = np.minimum(duck[i0:i1], 1 - 0.75 * w)
    bed *= duck
    L += bed
    R += bed * 0.97

    for idx, c in enumerate(data['cues']):
        fn = SYN.get(c['name'])
        if not fn:
            print('  ! 未知音效', c['name'])
            continue
        x = fn(c.get('dur'), rng(1000 + idx), c)
        x = np.asarray(x, dtype=np.float64) * c.get('gain', 1.0)
        pan = c.get('pan', master.uniform(-0.25, 0.25))
        if c['name'] in ('music', 'motif', 'dong', 'cha', 'bell'):
            pan = 0
        gl, gr = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
        place(L, x * gl * 1.2, c['t'])
        place(R, x * gr * 1.2, c['t'])

    print('  拟音完成', flush=True)
    # 简单混响：指数衰减噪声脉冲响应（FFT 卷积），给拟音一点空间
    ir = rng(7).standard_normal(n_(0.9)) * np.exp(-tt(0.9) / 0.25)
    ir = band(ir, 200, 6000)
    ir /= np.sqrt(np.sum(ir ** 2))
    def reverb(x):
        n = len(x) + len(ir)
        N = 1 << (n - 1).bit_length()
        y = np.fft.irfft(np.fft.rfft(x, N) * np.fft.rfft(ir, N), N)[: len(x)]
        return y
    L = L + reverb(L) * 0.12
    R = R + reverb(R) * 0.12

    # 母带：软削波 + 归一化到 -1 dBFS
    st = np.stack([L, R], 1)
    st = np.tanh(st * 1.4) / np.tanh(1.4)
    st = st / np.max(np.abs(st)) * 10 ** (-1 / 20)
    st = st[: n_(data['duration'])]
    pcm = (st * 32767).astype(np.int16)
    with wave.open(out_path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'  写入 {out_path}：{len(pcm) / SR:.2f}s，{len(data["cues"])} 条提示')


if __name__ == '__main__':
    mix(sys.argv[1], sys.argv[2])

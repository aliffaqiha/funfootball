"""Generate short, synthesized UI sound effects without external audio assets.

Run with: python scripts/generate-sound-effects.py
"""

from __future__ import annotations

import math
import struct
import wave
from pathlib import Path


SAMPLE_RATE = 22_050
OUTPUT_DIR = Path(__file__).resolve().parents[1] / "public" / "sounds"


def render(name: str, voices: list[tuple[float, float, float, float, float]]) -> None:
    duration = max(start + length for start, length, *_ in voices)
    sample_count = math.ceil(duration * SAMPLE_RATE)
    samples: list[float] = []

    for index in range(sample_count):
        time = index / SAMPLE_RATE
        value = 0.0
        for start, length, start_hz, end_hz, volume in voices:
            local_time = time - start
            if not 0 <= local_time < length:
                continue

            progress = local_time / length
            phase = 2 * math.pi * (start_hz * local_time + (end_hz - start_hz) * local_time**2 / (2 * length))
            attack = min(1.0, local_time / 0.008)
            release = min(1.0, (length - local_time) / min(0.045, length / 3))
            value += math.sin(phase) * attack * release * volume

        samples.append(value)

    peak = max((abs(sample) for sample in samples), default=1.0) or 1.0
    scale = min(1.0, 0.78 / peak)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{name}.wav"
    with wave.open(str(output_path), "wb") as audio_file:
        audio_file.setnchannels(1)
        audio_file.setsampwidth(2)
        audio_file.setframerate(SAMPLE_RATE)
        audio_file.writeframes(
            b"".join(
                struct.pack("<h", round(max(-1.0, min(1.0, sample * scale)) * 32767))
                for sample in samples
            )
        )


SOUNDS = {
    "spin": [(0.0, 0.34, 260, 920, 0.65)],
    "correct": [
        (0.0, 0.22, 587, 587, 0.55),
        (0.11, 0.22, 784, 784, 0.5),
        (0.22, 0.24, 988, 988, 0.45),
    ],
    "wrong": [
        (0.0, 0.23, 260, 230, 0.6),
        (0.17, 0.3, 185, 150, 0.55),
    ],
    "tick": [(0.0, 0.055, 1_100, 1_100, 0.45)],
    "celebrate": [
        (0.0, 0.28, 523, 523, 0.35),
        (0.0, 0.28, 659, 659, 0.35),
        (0.0, 0.28, 784, 784, 0.35),
        (0.27, 0.2, 659, 659, 0.45),
        (0.43, 0.2, 784, 784, 0.45),
        (0.59, 0.23, 1_046, 1_046, 0.5),
    ],
}


if __name__ == "__main__":
    for sound_name, sound_voices in SOUNDS.items():
        render(sound_name, sound_voices)

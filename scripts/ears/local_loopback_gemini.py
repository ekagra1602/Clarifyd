"""Approach C: Local audio loopback → Gemini → Convex

This is a *polite* ingestion option: you transcribe what the student hears on
THEIR laptop (system audio / loopback) and push text to Convex.

It does *not* join Zoom as a bot participant.

Usage:
  python scripts/ears/local_loopback_gemini.py \
    --session-id <SESSION_ID> \
    --convex-url https://<deployment>.convex.site/transcription \
    --secret <TRANSCRIPTION_SECRET>

Requirements (install once):
  pip install sounddevice numpy google-genai requests

Notes on system audio (Windows):
  - Easiest: set --device to "Stereo Mix" (if available)
  - More robust: use virtual cable drivers (VB-Audio) and pick that device

This script records short chunks and calls Gemini for a transcript.
Gemini isn't a dedicated streaming STT; chunking keeps it simple.
"""

from __future__ import annotations

import argparse
import base64
import io
import os
import sys
import time
import wave
from typing import Optional

import numpy as np
import requests

try:
    from google import genai
    from google.genai import types
except Exception:
    genai = None
    types = None


def list_devices() -> None:
    import sounddevice as sd

    print("Audio devices:\n")
    for i, d in enumerate(sd.query_devices()):
        print(f"[{i}] {d['name']} (in={d['max_input_channels']}, out={d['max_output_channels']})")


def encode_wav_bytes(audio: np.ndarray, sample_rate: int) -> bytes:
    """Encode float32 [-1,1] mono audio to 16-bit PCM WAV bytes."""
    audio = np.clip(audio, -1.0, 1.0)
    pcm = (audio * 32767.0).astype(np.int16)

    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        wf.writeframes(pcm.tobytes())
    return buf.getvalue()


def gemini_transcribe(audio_wav_bytes: bytes, model: str) -> str:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Missing GEMINI_API_KEY env var")

    if genai is None or types is None:
        raise RuntimeError(
            "Missing google-genai. Run: pip install google-genai\n"
            "(Alternative: implement REST calls manually.)"
        )

    client = genai.Client(api_key=api_key)

    prompt = (
        "Generate a transcript of the speech. "
        "Return only the transcript text (no timestamps, no speaker labels)."
    )

    part = types.Part.from_bytes(data=audio_wav_bytes, mime_type="audio/wav")

    resp = client.models.generate_content(
        model=model,
        contents=[prompt, part],
    )

    text = (resp.text or "").strip()
    return text


def push_line(convex_url: str, session_id: str, secret: str, text: str) -> None:
    payload = {
        "sessionId": session_id,
        "text": text,
        "secret": secret,
        "source": "local_loopback",
        "createdAt": int(time.time() * 1000),
    }
    r = requests.post(convex_url, json=payload, timeout=30)
    if r.status_code >= 300:
        raise RuntimeError(f"Convex push failed: {r.status_code} {r.text}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--session-id", required=True)
    parser.add_argument("--convex-url", required=True, help=".../transcription")
    parser.add_argument("--secret", required=True)
    parser.add_argument("--chunk-seconds", type=float, default=8.0)
    parser.add_argument("--sample-rate", type=int, default=16000)
    parser.add_argument("--device", type=str, default=None, help="Device name or index")
    parser.add_argument("--model", type=str, default=os.environ.get("GEMINI_MODEL", "gemini-3-flash-preview"))
    parser.add_argument("--list-devices", action="store_true")

    args = parser.parse_args()

    if args.list_devices:
        list_devices()
        return

    try:
        import sounddevice as sd
    except Exception as e:
        raise RuntimeError("Missing sounddevice. Run: pip install sounddevice") from e

    device: Optional[object] = None
    if args.device is not None:
        # Allow either index or name
        try:
            device = int(args.device)
        except ValueError:
            device = args.device

    print("Recording chunks… (Ctrl+C to stop)")
    print(f"session_id={args.session_id}")
    print(f"sample_rate={args.sample_rate} chunk_seconds={args.chunk_seconds}")
    if device is not None:
        print(f"device={device}")

    while True:
        try:
            frames = int(args.sample_rate * args.chunk_seconds)
            audio = sd.rec(
                frames,
                samplerate=args.sample_rate,
                channels=1,
                dtype="float32",
                blocking=True,
                device=device,
            )
            audio = audio.reshape(-1)

            wav_bytes = encode_wav_bytes(audio, args.sample_rate)

            transcript = gemini_transcribe(wav_bytes, args.model)
            transcript = " ".join(transcript.split())

            if transcript:
                print("→", transcript)
                push_line(args.convex_url, args.session_id, args.secret, transcript)
        except KeyboardInterrupt:
            print("\nStopped.")
            return
        except Exception as e:
            # Don't crash the loop on transient errors.
            print("error:", e, file=sys.stderr)
            time.sleep(1.0)


if __name__ == "__main__":
    main()

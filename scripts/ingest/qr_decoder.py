"""Optional QR decoding helpers for v3 visual source regions."""

from __future__ import annotations

from pathlib import Path
from typing import Any


def _opencv_qr_targets(crop_path: Path) -> list[dict[str, Any]]:
    try:
        import cv2  # type: ignore[import-not-found]
    except Exception:
        return []

    image = cv2.imread(str(crop_path))
    if image is None:
        return []
    detector = cv2.QRCodeDetector()
    targets: list[dict[str, Any]] = []
    try:
        ok, decoded_info, _points, _straight = detector.detectAndDecodeMulti(image)
    except Exception:
        ok = False
        decoded_info = []
    if ok:
        for value in decoded_info:
            if value:
                targets.append({"target_url": value, "decoder": "opencv_qrcode"})
    if targets:
        return targets

    try:
        value, _points, _straight = detector.detectAndDecode(image)
    except Exception:
        value = ""
    return [{"target_url": value, "decoder": "opencv_qrcode"}] if value else []


def _pyzbar_qr_targets(crop_path: Path) -> list[dict[str, Any]]:
    try:
        from PIL import Image
        from pyzbar.pyzbar import decode  # type: ignore[import-not-found]
    except Exception:
        return []

    try:
        with Image.open(crop_path) as image:
            decoded = decode(image)
    except Exception:
        return []

    targets: list[dict[str, Any]] = []
    for item in decoded:
        try:
            value = item.data.decode("utf-8")
        except Exception:
            value = ""
        if value:
            targets.append({"target_url": value, "decoder": "pyzbar"})
    return targets


def decode_qr_targets(crop_path: Path) -> list[dict[str, Any]]:
    """Return decoded QR targets for a crop, or [] when no decoder/target is available."""
    crop_path = Path(crop_path)
    return _opencv_qr_targets(crop_path) or _pyzbar_qr_targets(crop_path)

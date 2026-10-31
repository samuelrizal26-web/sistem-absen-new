"""
device_logic.py
===============
Logika murni (tanpa I/O, tanpa database) untuk manajemen perangkat:
  - daftar role yang sah
  - role mana yang boleh menerima notifikasi push
  - penyaringan perangkat aktif (tampilkan hanya yang aktif)

Dipakai oleh backend/server.py dan backend/test_device_logic.py.
Hanya library standar Python, tidak menambah dependency.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

# Role yang boleh disimpan di database.
ALLOWED_ROLES = ('NONE', 'STORE_TABLET', 'OWNER')

# Hanya HP pemilik yang menerima notifikasi push. Tablet toko tidak.
NOTIFIABLE_ROLES = ('OWNER',)

# Perangkat dianggap aktif jika terakhir aktif dalam N hari terakhir.
ACTIVE_DAYS_DEFAULT = 14


def is_valid_role(role: Any) -> bool:
    return isinstance(role, str) and role in ALLOWED_ROLES


def can_receive_notification(role: Any) -> bool:
    return isinstance(role, str) and role in NOTIFIABLE_ROLES


def _parse_ts(value: Any) -> Optional[datetime]:
    if not isinstance(value, str) or not value:
        return None
    try:
        dt = datetime.fromisoformat(value)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt


def filter_active_devices(
    devices: List[Dict[str, Any]],
    active_days: int = ACTIVE_DAYS_DEFAULT,
    now: Optional[datetime] = None,
) -> List[Dict[str, Any]]:
    """Kembalikan perangkat yang aktif, terbaru di atas.

    - active_days <= 0 -> semua perangkat (tanpa penyaringan).
    - Waktu aktif diambil dari last_active, jika kosong memakai created_at.
    - Perangkat tanpa waktu yang bisa dibaca dianggap tidak aktif.
    """
    now = now or datetime.now(timezone.utc)

    def stamp(d: Dict[str, Any]) -> Optional[datetime]:
        return _parse_ts(d.get('last_active')) or _parse_ts(d.get('created_at'))

    floor = datetime.min.replace(tzinfo=timezone.utc)

    if active_days <= 0:
        return sorted(devices, key=lambda d: stamp(d) or floor, reverse=True)

    cutoff = now - timedelta(days=active_days)
    kept = [d for d in devices if (stamp(d) is not None and stamp(d) >= cutoff)]
    return sorted(kept, key=lambda d: stamp(d) or floor, reverse=True)

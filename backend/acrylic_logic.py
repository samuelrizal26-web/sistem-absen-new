"""
acrylic_logic.py
================
Logika perhitungan harga akrilik:
- Perhitungan luas riil (panjang x lebar x qty)
- Penentuan tarif (Normal vs Eceran Kecil) berdasarkan batas luas dan minimal qty partai
- Pembulatan harga ke atas (misal kelipatan Rp 500 atau Rp 1.000)
"""

import math
from typing import Any, Dict


def calculate_acrylic_price(
    length_cm: float,
    width_cm: float,
    qty: int,
    price_normal_sqcm: float,
    price_small_sqcm: float,
    min_area_sqcm: float = 400.0,
    min_qty_bulk: int = 5,
    round_to: int = 500,
) -> Dict[str, Any]:
    """
    Menghitung rincian harga akrilik.
    
    Aturan:
    - area_per_pcs = length_cm * width_cm
    - Jika area_per_pcs >= min_area_sqcm -> Tarif Normal
    - Jika area_per_pcs < min_area_sqcm DAN qty >= min_qty_bulk -> Tarif Normal (partai)
    - Jika area_per_pcs < min_area_sqcm DAN qty < min_qty_bulk -> Tarif Eceran Kecil (tarif tinggi)
    """
    qty = max(1, int(qty))
    length_cm = max(0.0, float(length_cm))
    width_cm = max(0.0, float(width_cm))
    
    area_per_pcs = round(length_cm * width_cm, 2)
    total_area = round(area_per_pcs * qty, 2)
    
    is_bulk = qty >= min_qty_bulk
    is_small_area = area_per_pcs < min_area_sqcm
    
    # Penentuan skenario tarif
    if is_small_area and not is_bulk:
        tier_used = "small"
        price_rate = float(price_small_sqcm)
        tier_label = "Tarif Eceran Kecil"
    else:
        tier_used = "normal"
        price_rate = float(price_normal_sqcm)
        tier_label = "Tarif Normal" if not is_small_area else "Tarif Normal (Partai)"

    raw_subtotal_per_pcs = area_per_pcs * price_rate
    raw_total = raw_subtotal_per_pcs * qty
    
    # Pembulatan ke atas (ceiling) sesuai round_to (misal kelipatan 500)
    if round_to > 0 and raw_total > 0:
        total_price = math.ceil(raw_total / round_to) * round_to
        price_per_pcs = round(total_price / qty)
    else:
        total_price = round(raw_total)
        price_per_pcs = round(raw_subtotal_per_pcs)
        
    return {
        "length_cm": length_cm,
        "width_cm": width_cm,
        "qty": qty,
        "area_per_pcs": area_per_pcs,
        "total_area": total_area,
        "tier_used": tier_used,
        "tier_label": tier_label,
        "price_rate": price_rate,
        "raw_total": raw_total,
        "total_price": total_price,
        "price_per_pcs": price_per_pcs,
    }

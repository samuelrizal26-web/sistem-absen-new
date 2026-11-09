import unittest
from acrylic_logic import calculate_acrylic_price

class TestAcrylicLogic(unittest.TestCase):
    def setUp(self):
        self.price_normal = 35.0   # Rp 35 per cm²
        self.price_small = 50.0    # Rp 50 per cm²
        self.min_area = 400.0      # 400 cm² (setara 20x20 cm)
        self.min_bulk = 5          # >= 5 pcs dpt harga normal

    def test_normal_large_size_uses_normal_rate(self):
        # 30x40 cm = 1200 cm² (>= 400), qty 1
        res = calculate_acrylic_price(30, 40, 1, self.price_normal, self.price_small, self.min_area, self.min_bulk)
        self.assertEqual(res['tier_used'], 'normal')
        self.assertEqual(res['price_rate'], 35.0)
        # 1200 * 35 = 42000
        self.assertEqual(res['total_price'], 42000)

    def test_small_size_retail_uses_small_rate(self):
        # 10x10 cm = 100 cm² (< 400), qty 1 (< 5) -> tarif kecil (Rp 50)
        res = calculate_acrylic_price(10, 10, 1, self.price_normal, self.price_small, self.min_area, self.min_bulk)
        self.assertEqual(res['tier_used'], 'small')
        self.assertEqual(res['price_rate'], 50.0)
        # 100 * 50 = 5000
        self.assertEqual(res['total_price'], 5000)

    def test_small_size_bulk_switches_to_normal_rate(self):
        # 10x10 cm = 100 cm² (< 400), tapi qty 10 (>= 5) -> tarif normal (Rp 35)
        res = calculate_acrylic_price(10, 10, 10, self.price_normal, self.price_small, self.min_area, self.min_bulk)
        self.assertEqual(res['tier_used'], 'normal')
        self.assertEqual(res['price_rate'], 35.0)
        # 100 * 35 * 10 = 35000
        self.assertEqual(res['total_price'], 35000)

    def test_exact_boundary_area(self):
        # 20x20 cm = 400 cm² (== min_area) -> tarif normal
        res = calculate_acrylic_price(20, 20, 1, self.price_normal, self.price_small, self.min_area, self.min_bulk)
        self.assertEqual(res['tier_used'], 'normal')

    def test_rounding_to_500(self):
        # 33x33 = 1089 cm², rate 35 -> raw 38115 -> dibulatkan kelipatan 500 -> 38500
        res = calculate_acrylic_price(33, 33, 1, 35.0, 50.0, 400, 5, round_to=500)
        self.assertEqual(res['total_price'], 38500)

if __name__ == '__main__':
    unittest.main()

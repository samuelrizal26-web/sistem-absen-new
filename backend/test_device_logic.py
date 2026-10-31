"""Test murni untuk device_logic.py (tanpa database, tanpa dependency tambahan)."""
import unittest
from datetime import datetime, timedelta, timezone

import device_logic as dl

NOW = datetime(2026, 10, 31, 3, 0, 0, tzinfo=timezone.utc)


def ts(days_ago):
    return (NOW - timedelta(days=days_ago)).isoformat()


class TestRoles(unittest.TestCase):
    def test_valid_roles(self):
        for r in ('NONE', 'STORE_TABLET', 'OWNER'):
            self.assertTrue(dl.is_valid_role(r))

    def test_invalid_roles(self):
        for r in ('owner', 'ADMIN', '', None, 5, 'OWNER '):
            self.assertFalse(dl.is_valid_role(r))

    def test_only_owner_gets_notifications(self):
        self.assertTrue(dl.can_receive_notification('OWNER'))
        self.assertFalse(dl.can_receive_notification('STORE_TABLET'))
        self.assertFalse(dl.can_receive_notification('NONE'))
        self.assertFalse(dl.can_receive_notification(None))


class TestActiveFilter(unittest.TestCase):
    def devices(self):
        return [
            {'device_id': 'owner', 'role': 'OWNER', 'last_active': ts(0.1)},
            {'device_id': 'tablet-old', 'role': 'STORE_TABLET', 'last_active': ts(46)},
            {'device_id': 'new-phone', 'role': 'NONE', 'last_active': ts(2)},
            {'device_id': 'no-last-active', 'role': 'NONE', 'created_at': ts(3)},
            {'device_id': 'no-time', 'role': 'NONE'},
            {'device_id': 'garbage', 'role': 'NONE', 'last_active': 'bukan-tanggal'},
        ]

    def ids(self, rows):
        return [d['device_id'] for d in rows]

    def test_only_active_are_shown_newest_first(self):
        out = dl.filter_active_devices(self.devices(), 14, now=NOW)
        self.assertEqual(self.ids(out), ['owner', 'new-phone', 'no-last-active'])

    def test_inactive_hidden(self):
        out = dl.filter_active_devices(self.devices(), 14, now=NOW)
        self.assertNotIn('tablet-old', self.ids(out))

    def test_unreadable_time_is_not_active(self):
        out = dl.filter_active_devices(self.devices(), 14, now=NOW)
        self.assertNotIn('no-time', self.ids(out))
        self.assertNotIn('garbage', self.ids(out))

    def test_zero_days_returns_everything(self):
        out = dl.filter_active_devices(self.devices(), 0, now=NOW)
        self.assertEqual(len(out), 6)

    def test_naive_timestamp_treated_as_utc(self):
        d = [{'device_id': 'x', 'last_active': (NOW - timedelta(days=1)).replace(tzinfo=None).isoformat()}]
        self.assertEqual(len(dl.filter_active_devices(d, 14, now=NOW)), 1)

    def test_boundary_exactly_at_cutoff_is_kept(self):
        d = [{'device_id': 'edge', 'last_active': ts(14)}]
        self.assertEqual(len(dl.filter_active_devices(d, 14, now=NOW)), 1)

    def test_just_past_cutoff_is_hidden(self):
        d = [{'device_id': 'edge', 'last_active': ts(14.01)}]
        self.assertEqual(len(dl.filter_active_devices(d, 14, now=NOW)), 0)

    def test_empty_list(self):
        self.assertEqual(dl.filter_active_devices([], 14, now=NOW), [])


if __name__ == '__main__':
    unittest.main(verbosity=2)

import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

import 'package:sistem_absen_flutter_v2/models/employee.dart';
import 'package:sistem_absen_flutter_v2/screens/crew/kasbon_form_screen.dart';
import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

// ===============================
// STABLE MODULE – CREW HOME
// LANDSCAPE FIX:
// - Portrait: vertical scrollable
// - Landscape: 2-panel (LEFT: info, RIGHT: history)
// Both panels independently scrollable
// NO overflow allowed
// ===============================

class CrewHomeScreen extends StatefulWidget {
  final Employee employee;

  const CrewHomeScreen({super.key, required this.employee});

  @override
  State<CrewHomeScreen> createState() => _CrewHomeScreenState();
}

class _CrewHomeScreenState extends State<CrewHomeScreen> {
  static const _baseUrl = 'https://sistem-absen-production.up.railway.app/api';
  bool? _isClockedIn;
  bool _clockInAllowed = true;
  bool _isProcessingClockAction = false;
  String _clockMessage = '';
  DateTime _currentTime = DateTime.now();
  Timer? _timer;
  bool _isHistoryLoading = true;
  List<Map<String, dynamic>> _advances = [];
  final _currencyFormatter =
      NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
  String _activePeriodLabel = '';
  double _activeKasbonTotal = 0.0;
  bool _isPeriodsLoading = true;
  List<Map<String, dynamic>> _periods = [];
  Map<String, dynamic>? _activePeriod;
  Map<String, dynamic>? _selectedPeriod;

  @override
  void initState() {
    super.initState();
    _checkClockInStatus();
    _loadPayrollPeriods();
    _loadKasbonHistory();
    _updateCurrentTime();
    _timer = Timer.periodic(const Duration(minutes: 1), (_) => _updateCurrentTime());
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _updateCurrentTime() {
    final now = DateTime.now();
    setState(() {
      _currentTime = now;
      _evaluateClockAvailability(now);
    });
  }

  void _evaluateClockAvailability(DateTime now) {
    final totalMinutes = now.hour * 60 + now.minute;
    const clockInStart = 8 * 60;
    const clockInEnd = 11 * 60;
    const workStart = 9 * 60;

    if (totalMinutes < clockInStart) {
      _clockInAllowed = false;
      _clockMessage = 'Clock-in belum dibuka. Buka jam 08:00 (sekarang ${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')})';
    } else if (totalMinutes > clockInEnd) {
      _clockInAllowed = false;
      _clockMessage = 'Clock-in sudah ditutup (batas 11:00). Anda tidak bisa masuk hari ini.';
    } else if (totalMinutes > workStart) {
      _clockInAllowed = true;
      final lateMinutes = totalMinutes - workStart;
      _clockMessage = '⚠️ Anda terlambat $lateMinutes menit. Gaji dihitung dari jam ${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';
    } else {
      _clockInAllowed = true;
      _clockMessage = '✅ Silakan clock-in. Anda tepat waktu!';
    }
  }

  Future<void> _checkClockInStatus() async {
    try {
      final response = await http.get(Uri.parse('$_baseUrl/attendance/${widget.employee.employeeId}'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body) as List<dynamic>;
        final today = DateFormat('yyyy-MM-dd').format(DateTime.now());
        final active = data.any((entry) => entry['date'] == today && entry['clock_out'] == null);
        if (!mounted) return;
        setState(() => _isClockedIn = active);
        return;
      }
      if (response.statusCode == 404) {
        if (!mounted) return;
        setState(() => _isClockedIn = false);
        return;
      }
      final error = json.decode(response.body);
      throw Exception(error['detail'] ?? 'Gagal memeriksa status absensi');
    } catch (e) {
      if (!mounted) return;
      setState(() => _isClockedIn = false);
    }
  }

  Future<void> _loadKasbonHistory() async {
    setState(() => _isHistoryLoading = true);
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/advances/employee/${widget.employee.employeeId}'),
      );
      if (response.statusCode == 200) {
        final data = json.decode(response.body) as List<dynamic>;
        if (!mounted) return;
        setState(() {
          _advances = data.cast<Map<String, dynamic>>();
        });
        _calculatePeriodData();
        return;
      }
      if (response.statusCode == 404) {
        if (!mounted) return;
        setState(() {
          _advances = [];
        });
        _calculatePeriodData();
        return;
      }
      final error = json.decode(response.body);
      throw Exception(error['detail'] ?? 'Gagal memuat riwayat kasbon');
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) {
        setState(() => _isHistoryLoading = false);
      }
    }
  }

  Future<void> _loadPayrollPeriods() async {
    setState(() => _isPeriodsLoading = true);
    try {
      final periods = await ApiService.fetchPayrollPeriods();
      periods.sort((a, b) {
        final aDate = DateTime.tryParse(a['start_date']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
        final bDate = DateTime.tryParse(b['start_date']?.toString() ?? '') ?? DateTime.fromMillisecondsSinceEpoch(0);
        return bDate.compareTo(aDate);
      });
      Map<String, dynamic>? active;
      if (periods.isNotEmpty) {
        active = periods.firstWhere(
          (period) => (period['status']?.toString().toLowerCase() ?? '') == 'open',
          orElse: () => periods.first,
        );
      }
      if (!mounted) return;
      setState(() {
        _periods = periods;
        _activePeriod = active;
        _selectedPeriod ??= active ?? (periods.isNotEmpty ? periods.first : null);
      });
      _calculatePeriodData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memuat periode kasbon: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isPeriodsLoading = false);
    }
  }

  List<Map<String, dynamic>> get _filteredAdvances =>
      _advances.where(_isAdvanceInSelected).toList();

  bool _isAdvanceInSelected(Map<String, dynamic> advance) {
    final period = _selectedPeriod ?? _activePeriod;
    if (period != null) {
      final periodId = period['id']?.toString();
      if (periodId != null && periodId.isNotEmpty) {
        return advance['payroll_period_id'] == periodId;
      }
      final start = _parseDate(period['start_date']);
      final end = _parseDate(period['end_date']);
      final entryDate = _parseDate(advance['date']?.toString());
      if (start != null && end != null && entryDate != null) {
        return !entryDate.isBefore(start) && !entryDate.isAfter(end);
      }
    }
    final entryDate = _parseDate(advance['date']?.toString());
    if (entryDate == null) return false;
    final now = DateTime.now();
    return entryDate.year == now.year && entryDate.month == now.month;
  }

  DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    final raw = value.toString();
    final cleaned = raw.contains('T') ? raw.split('T').first : raw;
    return DateTime.tryParse(cleaned);
  }

  String _formatPeriodLabel(Map<String, dynamic>? period) {
    if (period == null) {
      return DateFormat('MMMM yyyy', 'id_ID').format(DateTime.now());
    }
    final start = _parseDate(period['start_date']);
    if (start != null) {
      return DateFormat('MMMM yyyy', 'id_ID').format(start);
    }
    return period['start_date']?.toString() ?? 'Periode';
  }

  Future<void> _showPeriodSelector() async {
    if (_periods.isEmpty) return;
    final selected = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      builder: (context) {
        return SafeArea(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const SizedBox(height: 12),
              const Text('Pilih Periode Kasbon', style: TextStyle(fontWeight: FontWeight.bold)),
              const SizedBox(height: 12),
              Flexible(
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _periods.length,
                  separatorBuilder: (_, __) => const Divider(height: 0),
                  itemBuilder: (context, index) {
                    final period = _periods[index];
                    final label = _formatPeriodLabel(period);
                    final isSelected = _selectedPeriod != null && _selectedPeriod!['id'] == period['id'];
                    return ListTile(
                      title: Text(label),
                      subtitle: Text((period['status']?.toString() ?? '').toUpperCase()),
                      trailing: isSelected ? const Icon(Icons.check, color: Colors.green) : null,
                      onTap: () => Navigator.of(context).pop(period),
                    );
                  },
                ),
              ),
            ],
          ),
        );
      },
    );
    if (selected != null) {
      setState(() => _selectedPeriod = selected);
      _calculatePeriodData();
    }
  }

  Future<void> _handleClockAction(bool isClockIn) async {
    if (isClockIn && !_clockInAllowed) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_clockMessage), backgroundColor: Colors.red),
      );
      return;
    }
    setState(() => _isProcessingClockAction = true);
    final action = isClockIn ? 'clock-in' : 'clock-out';
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/attendance/$action'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'employee_id': widget.employee.employeeId}),
      );
      if (response.statusCode == 200) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Berhasil ${isClockIn ? 'clock in' : 'clock out'}'),
            backgroundColor: Colors.green,
          ),
        );
        await _checkClockInStatus();
      } else {
        final error = json.decode(response.body);
        throw Exception(error['detail'] ?? 'Gagal melakukan aksi');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) {
        setState(() => _isProcessingClockAction = false);
      }
    }
  }

  Future<void> _openKasbonForm() async {
    final result = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => KasbonFormScreen(employee: widget.employee)),
    );
    if (result == true) {
      _checkClockInStatus();
      _loadKasbonHistory();
    }
  }

  void _calculatePeriodData() {
    final label = _formatPeriodLabel(_selectedPeriod ?? _activePeriod);
    final total = _filteredAdvances.fold<double>(0, (sum, entry) {
      return sum + ((entry['amount'] as num?)?.toDouble() ?? 0);
    });
    if (!mounted) return;
    setState(() {
      _activePeriodLabel = label;
      _activeKasbonTotal = total;
    });
  }

  Widget _buildHistoryCard() {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Riwayat Kasbon', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Text(
              'Menampilkan kasbon: ${_formatPeriodLabel(_selectedPeriod ?? _activePeriod)}',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
            const SizedBox(height: 12),
            Expanded(child: _buildHistoryBody()),
          ],
        ),
      ),
    );
  }

  Widget _buildHistoryBody() {
    if (_isHistoryLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    final filtered = _filteredAdvances;
    if (filtered.isEmpty) {
      return const Center(child: Text('Belum ada kasbon'));
    }
    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      itemCount: filtered.length,
      separatorBuilder: (_, __) => const Divider(height: 0),
      itemBuilder: (context, index) {
        final entry = filtered[index];
        final rawDate = entry['date']?.toString() ?? '';
        DateTime? date;
        try {
          date = DateTime.parse(rawDate);
        } catch (_) {
          date = DateTime.tryParse(rawDate.split('T').first);
        }
        date ??= DateTime.now();
        final amount = (entry['amount'] as num?)?.toDouble() ?? 0;
        final method = (entry['payment_method'] ?? entry['method'] ?? 'cash').toString().toUpperCase();
        final status = (entry['status'] ?? 'pending').toString();
        final note = entry['note']?.toString() ?? '-';
        return ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(DateFormat('dd MMM yyyy').format(date)),
          subtitle: Text('$method • $note'),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _currencyFormatter.format(amount),
                style: const TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              Text(status, style: const TextStyle(fontSize: 12, color: Colors.grey)),
            ],
          ),
        );
      },
    );
  }

  Widget _buildTotalKasbonCard() {
    final label = _activePeriodLabel.isNotEmpty ? _activePeriodLabel : _formatPeriodLabel(_selectedPeriod ?? _activePeriod);
    final isArchive = _selectedPeriod != null &&
        _activePeriod != null &&
        (_selectedPeriod?['id']?.toString() ?? '') != (_activePeriod?['id']?.toString() ?? '');
    final displayLabel = isArchive ? '$label (arsip)' : label;
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Total Kasbon Periode Aktif', style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(
              _currencyFormatter.format(_activeKasbonTotal),
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 6),
            InkWell(
              onTap: _periods.isNotEmpty ? _showPeriodSelector : null,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Periode: $displayLabel', style: const TextStyle(color: Colors.grey)),
                  const Icon(Icons.arrow_drop_down, size: 20, color: Colors.grey),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    
    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A4D68),
        title: const Text('Crew Home'),
        centerTitle: true,
        automaticallyImplyLeading: false,
      ),
      body: SafeArea(
        child: isLandscape ? _buildLandscapeLayout() : _buildPortraitLayout(),
      ),
    );
  }

  Widget _buildPortraitLayout() {
    final timeLabel = DateFormat('dd MMM yyyy · HH:mm').format(_currentTime);
    final statusColor = (_isClockedIn ?? false) ? Colors.green : Colors.red;
    final statusText = (_isClockedIn ?? false) ? 'Clock In Active' : 'Clock In Inactive';
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: ListTile(
              contentPadding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
              leading: const CircleAvatar(
                backgroundColor: Color(0xFFEAFBFF),
                child: Icon(Icons.person, color: Color(0xFF0A4D68)),
              ),
              title: Text(widget.employee.name, style: const TextStyle(fontWeight: FontWeight.bold)),
              subtitle: Text(widget.employee.position ?? 'Crew'),
              trailing: Chip(
                backgroundColor: statusColor.withOpacity(0.15),
                label: Text(
                  statusText,
                  style: TextStyle(color: statusColor, fontWeight: FontWeight.w600, fontSize: 12),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Status Clock In', style: TextStyle(fontWeight: FontWeight.bold)),
                      Text(timeLabel, style: const TextStyle(color: Colors.grey, fontSize: 11)),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    _clockMessage,
                    style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          _buildTotalKasbonCard(),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _openKasbonForm,
            icon: const Icon(Icons.attach_money),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0A4D68),
              padding: const EdgeInsets.symmetric(vertical: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            label: const Text('Ajukan Kasbon', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
          const SizedBox(height: 16),
          Expanded(child: _buildHistoryCard()),
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: (_isClockedIn == null || _isProcessingClockAction)
                  ? null
                  : () => _handleClockAction(!(_isClockedIn ?? false)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF1B5E20),
                padding: const EdgeInsets.symmetric(vertical: 18),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
              ),
              child: _isProcessingClockAction
                  ? const SizedBox(
                      height: 24,
                      width: 24,
                      child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                    )
                  : Text(
                      (_isClockedIn ?? false) ? 'Clock Out' : 'Clock In',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLandscapeLayout() {
    return Row(
      children: [
        Expanded(
          flex: 5,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildProfileCard(),
                const SizedBox(height: 12),
                _buildClockStatusCard(),
                const SizedBox(height: 12),
                _buildTotalKasbonCard(),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: _openKasbonForm,
                  icon: const Icon(Icons.attach_money),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0A4D68),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  label: const Text('Ajukan Kasbon', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: (_isClockedIn == null || _isProcessingClockAction)
                        ? null
                        : () => _handleClockAction(!(_isClockedIn ?? false)),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1B5E20),
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: _isProcessingClockAction
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                          )
                        : Text(
                            (_isClockedIn ?? false) ? 'Clock Out' : 'Clock In',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const VerticalDivider(width: 1, thickness: 1),
        Expanded(
          flex: 5,
          child: _buildHistoryCard(),
        ),
      ],
    );
  }

  Widget _buildProfileCard() {
    final statusColor = (_isClockedIn ?? false) ? Colors.green : Colors.red;
    final statusText = (_isClockedIn ?? false) ? 'Clock In Active' : 'Clock In Inactive';
    
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
        leading: const CircleAvatar(
          backgroundColor: Color(0xFFEAFBFF),
          child: Icon(Icons.person, color: Color(0xFF0A4D68), size: 22),
        ),
        title: Text(
          widget.employee.name,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          widget.employee.position ?? 'Crew',
          style: const TextStyle(fontSize: 12),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Chip(
          backgroundColor: statusColor.withOpacity(0.15),
          label: Text(
            statusText,
            style: TextStyle(color: statusColor, fontWeight: FontWeight.w600, fontSize: 11),
          ),
        ),
      ),
    );
  }

  Widget _buildClockStatusCard() {
    final timeLabel = DateFormat('dd MMM yyyy · HH:mm').format(_currentTime);
    
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Status Clock In', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                Text(timeLabel, style: const TextStyle(color: Colors.grey, fontSize: 10)),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              _clockMessage,
              style: const TextStyle(color: Colors.black87, fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }
}

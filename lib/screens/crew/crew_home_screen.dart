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
// CREW HOME UI – SAFE PALETTE (no dark bg, AA contrast)
const _colorCardBgStart = Color(0xFFF8FCFF);
const _colorCardBgEnd = Color(0xFFEEF7FB);
const _colorKasbonCardStart = Color(0xFFE8F4FF);
const _colorKasbonCardEnd = Color(0xFFD9ECFF);
const _colorKasbonText = Color(0xFF0B3C5D);
const _colorClockCardStart = Color(0xFFFFF6E5);
const _colorClockCardEnd = Color(0xFFFFE8C2);
const _colorClockCardText = Color(0xFF6A4B00);
const _colorBtnKasbonStart = Color(0xFF4CC9B0);
const _colorBtnKasbonEnd = Color(0xFF2FB7A1);
const _colorBtnClockStart = Color(0xFF7ED957);
const _colorBtnClockEnd = Color(0xFF4CAF50);
const _colorBtnDisabled = Color(0xFFE0E0E0);
const _colorBtnDisabledText = Color(0xFF9E9E9E);
const _colorScaffoldBg = Color(0xFFF8FCFF);
const _colorAppBarBg = Color(0xFFE8F4FF);
const _colorAppBarTitle = Color(0xFF0B3C5D);
const _colorChipActive = Color(0xFF4CAF50);
const _colorChipInactive = Color(0xFF6A4B00);
const _colorAvatarBg = Color(0xFFE8F4FF);
const _colorAvatarIcon = Color(0xFF0B3C5D);
const _colorSecondaryText = Color(0xFF5A5A5A);

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
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_colorCardBgStart, _colorCardBgEnd],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text('Riwayat Kasbon', style: TextStyle(fontWeight: FontWeight.w600, color: _colorKasbonText)),
            const SizedBox(height: 6),
            Text(
              'Menampilkan kasbon: ${_formatPeriodLabel(_selectedPeriod ?? _activePeriod)}',
              style: const TextStyle(fontSize: 12, color: _colorSecondaryText),
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
      return const Center(child: Text('Belum ada kasbon', style: TextStyle(color: _colorSecondaryText)));
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
          title: Text(
            DateFormat('dd MMM yyyy').format(date),
            style: const TextStyle(fontWeight: FontWeight.w500, color: _colorKasbonText),
          ),
          subtitle: Text('$method • $note', style: const TextStyle(color: _colorSecondaryText)),
          trailing: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                _currencyFormatter.format(amount),
                style: const TextStyle(fontWeight: FontWeight.bold, color: _colorKasbonText),
              ),
              const SizedBox(height: 4),
              Text(status, style: const TextStyle(fontSize: 12, color: _colorSecondaryText)),
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
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_colorKasbonCardStart, _colorKasbonCardEnd],
        ),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text('Total Kasbon Periode Aktif', style: TextStyle(fontWeight: FontWeight.w600, color: _colorKasbonText)),
            const SizedBox(height: 8),
            Text(
              _currencyFormatter.format(_activeKasbonTotal),
              style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: _colorKasbonText),
            ),
            const SizedBox(height: 6),
            InkWell(
              onTap: _periods.isNotEmpty ? _showPeriodSelector : null,
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Periode: $displayLabel', style: const TextStyle(color: _colorSecondaryText)),
                  const Icon(Icons.arrow_drop_down, size: 20, color: _colorSecondaryText),
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
      backgroundColor: _colorScaffoldBg,
      appBar: AppBar(
        backgroundColor: _colorAppBarBg,
        foregroundColor: _colorAppBarTitle,
        title: const Text('Crew Home', style: TextStyle(color: _colorAppBarTitle, fontWeight: FontWeight.w600)),
        centerTitle: true,
        automaticallyImplyLeading: false,
        elevation: 0,
      ),
      body: SafeArea(
        child: isLandscape ? _buildLandscapeLayout() : _buildPortraitLayout(),
      ),
    );
  }

  Widget _buildPortraitLayout() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _buildProfileCard(),
          const SizedBox(height: 16),
          _buildClockStatusCard(),
          const SizedBox(height: 16),
          _buildTotalKasbonCard(),
          const SizedBox(height: 16),
          _buildAjukanKasbonButton(paddingVertical: 16, radius: 16),
          const SizedBox(height: 16),
          Expanded(child: _buildHistoryCard()),
          const SizedBox(height: 16),
          _buildClockInOutButton(paddingVertical: 18, radius: 20, fontSize: 16, indicatorSize: 24),
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
                _buildAjukanKasbonButton(paddingVertical: 14, radius: 12),
                const SizedBox(height: 16),
                _buildClockInOutButton(paddingVertical: 16, radius: 16, fontSize: 15, indicatorSize: 20),
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
    final statusColor = (_isClockedIn ?? false) ? _colorChipActive : _colorChipInactive;
    final statusText = (_isClockedIn ?? false) ? 'Clock In Active' : 'Clock In Inactive';

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_colorCardBgStart, _colorCardBgEnd],
        ),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(vertical: 10, horizontal: 14),
        leading: const CircleAvatar(
          backgroundColor: _colorAvatarBg,
          child: Icon(Icons.person, color: _colorAvatarIcon, size: 22),
        ),
        title: Text(
          widget.employee.name,
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15, color: _colorKasbonText),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        subtitle: Text(
          widget.employee.position ?? 'Crew',
          style: const TextStyle(fontSize: 12, color: _colorSecondaryText),
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
        ),
        trailing: Chip(
          backgroundColor: statusColor.withOpacity(0.2),
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

    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_colorClockCardStart, _colorClockCardEnd],
        ),
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Status Clock In', style: TextStyle(fontWeight: FontWeight.w600, fontSize: 14, color: _colorClockCardText)),
                Text(timeLabel, style: const TextStyle(color: _colorSecondaryText, fontSize: 10)),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              _clockMessage,
              style: const TextStyle(color: _colorClockCardText, fontWeight: FontWeight.w600, fontSize: 13),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAjukanKasbonButton({required double paddingVertical, required double radius}) {
    return Container(
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [_colorBtnKasbonStart, _colorBtnKasbonEnd],
        ),
        borderRadius: BorderRadius.circular(radius),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.08),
            blurRadius: 6,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ElevatedButton.icon(
        onPressed: _openKasbonForm,
        icon: const Icon(Icons.attach_money, color: Colors.white, size: 20),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.transparent,
          foregroundColor: Colors.white,
          shadowColor: Colors.transparent,
          padding: EdgeInsets.symmetric(vertical: paddingVertical),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radius)),
        ),
        label: const Text('Ajukan Kasbon', style: TextStyle(fontWeight: FontWeight.w600, color: Colors.white)),
      ),
    );
  }

  Widget _buildClockInOutButton({
    required double paddingVertical,
    required double radius,
    double fontSize = 16,
    double indicatorSize = 24,
  }) {
    final canTap = _isClockedIn != null && !_isProcessingClockAction;
    final showActiveStyle = _isClockedIn != null;
    final label = (_isClockedIn ?? false) ? 'Clock Out' : 'Clock In';
    final child = _isProcessingClockAction
        ? SizedBox(
            height: indicatorSize,
            width: indicatorSize,
            child: CircularProgressIndicator(
              color: showActiveStyle ? Colors.white : _colorBtnDisabledText,
              strokeWidth: 2,
            ),
          )
        : Text(
            label,
            style: TextStyle(
              fontWeight: FontWeight.w600,
              fontSize: fontSize,
              color: showActiveStyle ? Colors.white : _colorBtnDisabledText,
            ),
          );

    if (showActiveStyle) {
      return Container(
        width: double.infinity,
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [_colorBtnClockStart, _colorBtnClockEnd],
          ),
          borderRadius: BorderRadius.circular(radius),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 6,
              offset: const Offset(0, 2),
            ),
          ],
        ),
        child: ElevatedButton(
          onPressed: canTap ? () => _handleClockAction(!(_isClockedIn ?? false)) : null,
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.transparent,
            foregroundColor: Colors.white,
            shadowColor: Colors.transparent,
            padding: EdgeInsets.symmetric(vertical: paddingVertical),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radius)),
          ),
          child: child,
        ),
      );
    }
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton(
        onPressed: null,
        style: ElevatedButton.styleFrom(
          backgroundColor: _colorBtnDisabled,
          foregroundColor: _colorBtnDisabledText,
          disabledBackgroundColor: _colorBtnDisabled,
          disabledForegroundColor: _colorBtnDisabledText,
          padding: EdgeInsets.symmetric(vertical: paddingVertical),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(radius)),
          elevation: 0,
        ),
        child: child,
      ),
    );
  }
}

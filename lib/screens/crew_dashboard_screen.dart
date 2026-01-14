import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';

import 'package:sistem_absen_flutter_v2/models/employee.dart';
import 'package:sistem_absen_flutter_v2/screens/crew_selection_screen.dart';
import 'package:sistem_absen_flutter_v2/screens/kasbon_form_screen.dart';
import 'package:sistem_absen_flutter_v2/widgets/history_tab_view.dart';

class CrewDashboardScreen extends StatefulWidget {
  final Employee employee;

  const CrewDashboardScreen({super.key, required this.employee});

  @override
  State<CrewDashboardScreen> createState() => _CrewDashboardScreenState();
}

class _CrewDashboardScreenState extends State<CrewDashboardScreen> with TickerProviderStateMixin {
  static const String _baseUrl = 'https://sistem-absen-production.up.railway.app/api';
  bool? _isClockedIn;
  bool _isProcessingClockAction = false;
  late TabController _tabController;
  Timer? _clockTimer;
  DateTime _currentTime = DateTime.now();
  bool _clockInAllowed = true;
  String _clockInMessage = '';
  DateTime _activePeriod = DateTime(DateTime.now().year, DateTime.now().month);
  bool _isSelectingPeriod = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _checkClockInStatus();
    _updateCurrentTime();
    _clockTimer = Timer.periodic(const Duration(minutes: 1), (_) => _updateCurrentTime());
  }

  @override
  void dispose() {
    _tabController.dispose();
    _clockTimer?.cancel();
    super.dispose();
  }

  void _updateCurrentTime() {
    setState(() {
      _currentTime = DateTime.now();
    });
    _evaluateClockAvailability();
  }

  void _evaluateClockAvailability() {
    final hour = _currentTime.hour;
    final minute = _currentTime.minute;
    final totalMinutes = hour * 60 + minute;
    const clockInStart = 8 * 60;
    const clockInEnd = 11 * 60;
    const workStart = 9 * 60;
    final hourStr = hour.toString().padLeft(2, '0');
    final minuteStr = minute.toString().padLeft(2, '0');

    if (totalMinutes < clockInStart) {
      _clockInAllowed = false;
      _clockInMessage = 'Clock-in belum dibuka. Buka jam 08:00 (sekarang $hourStr:$minuteStr)';
    } else if (totalMinutes > clockInEnd) {
      _clockInAllowed = false;
      _clockInMessage = 'Clock-in sudah ditutup (batas 11:00). Anda tidak bisa masuk hari ini.';
    } else if (totalMinutes > workStart) {
      final lateMinutes = totalMinutes - workStart;
      _clockInAllowed = true;
      _clockInMessage = '⚠️ Anda terlambat $lateMinutes menit. Gaji dihitung dari jam $hourStr:$minuteStr';
    } else {
      _clockInAllowed = true;
      _clockInMessage = '✅ Silakan clock-in. Anda tepat waktu!';
    }
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _checkClockInStatus() async {
    try {
      final response = await http.get(
        Uri.parse('$_baseUrl/attendance/${widget.employee.employeeId}'),
      );
      if (response.statusCode == 200) {
        final List<dynamic> data = jsonDecode(response.body);
        final today = DateTime.now().toIso8601String().split('T').first;
        final isActive = data.any(
          (entry) => entry['date'] == today && entry['clock_out'] == null,
        );
        if (!mounted) return;
        setState(() {
          _isClockedIn = isActive;
        });
      } else {
        throw Exception(jsonDecode(response.body)['detail'] ?? 'Gagal memeriksa status absensi');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isClockedIn = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _handleClockAction(bool isClockIn) async {
    if (isClockIn && !_clockInAllowed) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_clockInMessage), backgroundColor: Colors.red),
      );
      return;
    }
    setState(() => _isProcessingClockAction = true);
    final action = isClockIn ? 'clock-in' : 'clock-out';
    try {
      final response = await http.post(
        Uri.parse('$_baseUrl/attendance/$action'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'employee_id': widget.employee.employeeId}),
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
        final error = jsonDecode(response.body);
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

  void _onLogout() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (context) => const CrewSelectionScreen()),
      (Route<dynamic> route) => false,
    );
  }

  void _navigateToKasbonForm() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => KasbonFormScreen(employee: widget.employee)),
    ).then((_) => _checkClockInStatus()); // Refresh on return
  }

  bool get _isReadOnlyPeriod =>
      _activePeriod.year != DateTime.now().year || _activePeriod.month != DateTime.now().month;

  Future<void> _selectPeriod() async {
    setState(() => _isSelectingPeriod = true);
    final now = DateTime.now();
    int selectedMonth = _activePeriod.month;
    int selectedYear = _activePeriod.year;
    final picked = await showDialog<DateTime>(
      context: context,
      builder: (context) {
        return StatefulBuilder(builder: (context, setState) {
          return AlertDialog(
            title: const Text('Pilih Periode'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<int>(
                  value: selectedMonth,
                  decoration: const InputDecoration(labelText: 'Bulan'),
                  items: List.generate(
                    12,
                    (index) => DropdownMenuItem(
                      value: index + 1,
                      child: Text(DateFormat('MMMM', 'id_ID').format(DateTime(0, index + 1))),
                    ),
                  ),
                  onChanged: (value) {
                    if (value != null) setState(() => selectedMonth = value);
                  },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<int>(
                  value: selectedYear,
                  decoration: const InputDecoration(labelText: 'Tahun'),
                  items: List.generate(5, (index) => now.year - index)
                      .map((year) => DropdownMenuItem(value: year, child: Text(year.toString())))
                      .toList(),
                  onChanged: (value) {
                    if (value != null) setState(() => selectedYear = value);
                  },
                ),
              ],
            ),
            actions: [
              TextButton(onPressed: () => Navigator.of(context).pop(null), child: const Text('Batal')),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(DateTime(selectedYear, selectedMonth)),
                child: const Text('Pilih'),
              ),
            ],
          );
        });
      },
    );
    if (!mounted) return;
    setState(() {
      _isSelectingPeriod = false;
      if (picked != null) {
        _activePeriod = DateTime(picked.year, picked.month);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A4D68),
        elevation: 0,
        centerTitle: true,
        title: Image.asset('assets/app_icon.png', height: 40),
        automaticallyImplyLeading: false,
      ),
      body: _isClockedIn == null
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: _buildProfileCard(),
                ),
                _buildPeriodIndicator(),
                _buildTabBar(),
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: [
                      _buildDashboardTab(),
                      HistoryTabView(
                        employeeId: widget.employee.employeeId,
                        activePeriod: _activePeriod,
                        isReadOnly: _isReadOnlyPeriod,
                      ),
                    ],
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildProfileCard() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Row(children: [
          const CircleAvatar(radius: 30, backgroundColor: Color(0xFFEAFBFF), child: Icon(Icons.person_outline, size: 30, color: Color(0xFF0A4D68))),
          const SizedBox(width: 16),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(widget.employee.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 4),
              Text(widget.employee.position ?? 'Posisi tidak diatur', style: const TextStyle(color: Colors.grey)),
            ]),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(color: _isClockedIn! ? Colors.green[100] : Colors.red[100], borderRadius: BorderRadius.circular(20)),
            child: Row(children: [
              Icon(_isClockedIn! ? Icons.check_circle_outline : Icons.watch_later_outlined, color: _isClockedIn! ? Colors.green[700] : Colors.red[700], size: 16),
              const SizedBox(width: 4),
              Text(_isClockedIn! ? 'Clock In Active' : 'Clock In Inactive', style: TextStyle(color: _isClockedIn! ? Colors.green[700] : Colors.red[700], fontWeight: FontWeight.bold, fontSize: 12)),
            ]),
          )
        ]),
      ),
    );
  }

  Widget _buildTabBar() {
    return TabBar(
      controller: _tabController,
      labelColor: Theme.of(context).primaryColor,
      unselectedLabelColor: Colors.grey,
      indicatorColor: Theme.of(context).primaryColor,
      tabs: const [Tab(icon: Icon(Icons.dashboard_outlined), text: 'Dashboard'), Tab(icon: Icon(Icons.history), text: 'Riwayat')],
    );
  }

  Widget _buildDashboardTab() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(children: [
        if (!(_isClockedIn ?? false)) _buildClockInMessage(),
        _buildActionButtons(),
        const Spacer(),
        if (_isProcessingClockAction)
          const CircularProgressIndicator()
        else
          _buildClockButton(),
        const SizedBox(height: 20),
      ]),
    );
  }

  Widget _buildClockInMessage() {
    Color bgColor;
    Color textColor;
    if (!_clockInAllowed) {
      bgColor = const Color(0xFFFFEBEE);
      textColor = const Color(0xFFC62828);
    } else if (_clockInMessage.contains('⚠️')) {
      bgColor = const Color(0xFFFFFDE7);
      textColor = const Color(0xFFF57F17);
    } else {
      bgColor = const Color(0xFFE8F5E9);
      textColor = const Color(0xFF2E7D32);
    }
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: textColor.withOpacity(0.3)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            _clockInMessage,
            style: TextStyle(
              color: textColor,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Jam: ${_currentTime.hour.toString().padLeft(2, '0')}:${_currentTime.minute.toString().padLeft(2, '0')}',
            style: TextStyle(color: textColor),
          ),
        ],
      ),
    );
  }

  Widget _buildPeriodIndicator() {
    final isReadOnly = _isReadOnlyPeriod;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 8),
      child: Row(
        children: [
          Text(
            'Periode aktif: ${DateFormat('MMMM yyyy', 'id_ID').format(_activePeriod)}',
            style: TextStyle(color: Colors.black54),
          ),
          const SizedBox(width: 12),
          if (isReadOnly)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Colors.orange.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: const Text(
                'Mode Baca',
                style: TextStyle(color: Colors.orange, fontWeight: FontWeight.bold),
              ),
            ),
          const Spacer(),
          TextButton(
            onPressed: _isSelectingPeriod ? null : _selectPeriod,
            child: const Text('Ubah Periode'),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons() {
    return Row(children: [
      Expanded(
        child: ElevatedButton.icon(
          onPressed: _navigateToKasbonForm,
          icon: const Icon(Icons.attach_money, color: Colors.black87),
          label: const Text('Kasbon', style: TextStyle(color: Colors.black87, fontWeight: FontWeight.bold)),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFFFD180),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ),
      const SizedBox(width: 16),
      Expanded(
        child: ElevatedButton.icon(
          onPressed: _onLogout,
          icon: const Icon(Icons.exit_to_app, color: Colors.white),
          label: const Text('Keluar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF673AB7),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
      ),
    ]);
  }

  Widget _buildClockButton() {
    if (_isClockedIn!) {
      return ElevatedButton.icon(
        onPressed: () => _handleClockAction(false),
        icon: const Icon(Icons.logout, color: Colors.white),
        label: const Text('CLOCK OUT', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.redAccent,
          minimumSize: const Size(double.infinity, 60),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      );
    } else {
      return ElevatedButton.icon(
        onPressed: () => _handleClockAction(true),
        icon: const Icon(Icons.login, color: Colors.white),
        label: const Text('CLOCK IN', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 18)),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.green,
          minimumSize: const Size(double.infinity, 60),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      );
    }
  }
}





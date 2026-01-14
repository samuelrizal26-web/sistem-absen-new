import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

class EmployeeDashboardScreen extends StatefulWidget {
  final String employeeId;
  const EmployeeDashboardScreen({super.key, required this.employeeId});

  @override
  State<EmployeeDashboardScreen> createState() => _EmployeeDashboardScreenState();
}

class _EmployeeDashboardScreenState extends State<EmployeeDashboardScreen> with SingleTickerProviderStateMixin {
  bool _isLoading = true;
  String? _error;
  Map<String, dynamic>? _employee;
  List<dynamic> _attendance = [];
  List<dynamic> _advances = [];
  Map<String, dynamic> _summary = {};
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _loadDetail();
  }

  Future<void> _loadDetail() async {
    setState(() => _isLoading = true);
    try {
      final detail = await ApiService.fetchEmployeeDetail(widget.employeeId);
      if (!mounted) return;
      setState(() {
        _employee = detail['employee'] as Map<String, dynamic>;
        _attendance = detail['attendance'] as List<dynamic>;
        _advances = detail['advances'] as List<dynamic>;
        _summary = detail['summary'] as Map<String, dynamic>;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  bool get _isClockedInToday {
    final today = DateTime.now().toIso8601String().split('T').first;
    return _attendance.any((item) => item['date'] == today && item['clock_out'] == null);
  }

  String _formatCurrency(num value) {
    return value.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (match) => '${match.group(1)}.');
  }

  Future<void> _exportPdf() async {
    final url = ApiService.employeePdfUrl(widget.employeeId);
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal membuka PDF'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null || _employee == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Detail Crew')),
        body: Center(child: Text(_error ?? 'Gagal memuat data')),
      );
    }
    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeaderCard(),
            _buildSummaryRow(),
            TabBar(
              controller: _tabController,
              labelColor: const Color(0xFF0A4D68),
              unselectedLabelColor: Colors.grey,
              indicatorColor: const Color(0xFF0A4D68),
              tabs: const [
                Tab(text: 'Riwayat Absensi'),
                Tab(text: 'Kasbon'),
                Tab(text: 'Data Pribadi'),
              ],
            ),
            Expanded(
              child: TabBarView(
                controller: _tabController,
                children: [
                  _buildAttendanceTab(),
                  _buildAdvanceTab(),
                  _buildProfileTab(),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderCard() {
    final employee = _employee!;
    return Container(
      margin: const EdgeInsets.all(16),
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 24, offset: Offset(0, 12))],
      ),
      child: Column(
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: 36,
                backgroundColor: const Color(0xFFE3F2FD),
                child: const Icon(Icons.person, color: Color(0xFF0A4D68), size: 36),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(employee['name'], style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 4),
                    Text(employee['position'] ?? '-', style: const TextStyle(color: Colors.black54)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          _isClockedInToday ? Icons.check_circle : Icons.access_time_filled,
                          color: _isClockedInToday ? Colors.green : Colors.redAccent,
                          size: 18,
                        ),
                        const SizedBox(width: 6),
                        Text(
                          _isClockedInToday ? 'Clock In Active' : 'Clock In Inactive',
                          style: TextStyle(
                            color: _isClockedInToday ? Colors.green : Colors.redAccent,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              ElevatedButton.icon(
                onPressed: _exportPdf,
                icon: const Icon(Icons.picture_as_pdf, size: 18),
                label: const Text('Export PDF'),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0A4D68), foregroundColor: Colors.white),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow() {
    final totalGaji = (_summary['total_earned_salary'] as num?) ?? 0;
    final totalKasbon = (_summary['total_advances'] as num?) ?? 0;
    final gajiBersih = (_summary['net_salary'] as num?) ?? 0;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Row(
        children: [
          Expanded(child: _SummaryCard(title: 'Total Gaji', value: 'Rp ${_formatCurrency(totalGaji)}', color: const Color(0xFF4CAF50))),
          const SizedBox(width: 12),
          Expanded(child: _SummaryCard(title: 'Total Kasbon', value: 'Rp ${_formatCurrency(totalKasbon)}', color: const Color(0xFFFF7043))),
          const SizedBox(width: 12),
          Expanded(child: _SummaryCard(title: 'Gaji Bersih', value: 'Rp ${_formatCurrency(gajiBersih)}', color: const Color(0xFF1E88E5))),
        ],
      ),
    );
  }

  Widget _buildAttendanceTab() {
    if (_attendance.isEmpty) {
      return const Center(child: Text('Belum ada riwayat absensi.'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _attendance.length,
      itemBuilder: (context, index) {
        final item = _attendance[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: const Icon(Icons.calendar_today),
            title: Text(item['date'] ?? '-'),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Masuk  : ${item['clock_in'] ?? '-'}'),
                Text('Keluar : ${item['clock_out'] ?? '-'}'),
                Text('Durasi : ${(item['total_hours'] ?? 0).toString()} jam'),
              ],
            ),
            trailing: Text('Rp ${_formatCurrency((item['earned_salary'] as num?) ?? 0)}'),
          ),
        );
      },
    );
  }

  Widget _buildAdvanceTab() {
    if (_advances.isEmpty) {
      return const Center(child: Text('Belum ada catatan kasbon.'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _advances.length,
      itemBuilder: (context, index) {
        final item = _advances[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: const Icon(Icons.payments_outlined),
            title: Text('Rp ${_formatCurrency((item['amount'] as num?) ?? 0)}'),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(item['request_date']?.split('T').first ?? '-'),
                Text(item['reason'] ?? '-', style: const TextStyle(color: Colors.black54)),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildProfileTab() {
    final entries = {
      'Nama Lengkap': _employee?['name'],
      'Posisi': _employee?['position'],
      'Tempat Lahir': _employee?['birthplace'],
      'Tanggal Lahir': _employee?['birthdate'],
      'Nomor Whatsapp': _employee?['whatsapp'],
      'Status Crew': _employee?['status_crew'],
      'Gaji Bulanan': _employee?['monthly_salary'] != null ? 'Rp ${_formatCurrency((_employee!['monthly_salary'] as num))}' : null,
      'Jam Kerja/Hari': _employee?['work_hours_per_day']?.toString(),
    };
    return ListView(
      padding: const EdgeInsets.all(16),
      children: entries.entries
          .map(
            (entry) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(entry.key, style: const TextStyle(color: Colors.black45)),
                const SizedBox(height: 4),
                Text(entry.value ?? '-', style: const TextStyle(fontWeight: FontWeight.w600)),
                const Divider(),
              ],
            ),
          )
          .toList(),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String title;
  final String value;
  final Color color;

  const _SummaryCard({required this.title, required this.value, required this.color});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 16, offset: Offset(0, 8))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: const TextStyle(color: Colors.black54)),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(color: color, fontSize: 18, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}





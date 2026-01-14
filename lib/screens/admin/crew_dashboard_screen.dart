import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:sistem_absen_flutter_v2/core/utils/crew_salary_slip_pdf.dart';
import 'package:sistem_absen_flutter_v2/core/utils/pdf_export_wrapper.dart';
import 'package:sistem_absen_flutter_v2/models/employee.dart';
import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

class AdminCrewDashboardScreen extends StatefulWidget {
  final Employee employee;

  const AdminCrewDashboardScreen({super.key, required this.employee});

  @override
  State<AdminCrewDashboardScreen> createState() => _AdminCrewDashboardScreenState();
}

class _CrewDashboardData {
  final Map<String, dynamic> summary;
  final List<dynamic> advances;
  final Map<String, dynamic> dailySummary;

  _CrewDashboardData({
    required this.summary,
    required this.advances,
    required this.dailySummary,
  });
}

class _AdminCrewDashboardScreenState extends State<AdminCrewDashboardScreen> {
  late final Future<_CrewDashboardData> _dashboardFuture;
  DateTime _selectedSlipPeriod = DateTime.now();
  bool _isExportingSlip = false;

  @override
  void initState() {
    super.initState();
    _dashboardFuture = _loadDashboard();
  }

  Future<_CrewDashboardData> _loadDashboard() async {
    final detail = await ApiService.fetchEmployeeDetail(widget.employee.employeeId);
    final dailySummary = await ApiService.fetchDailySalarySummary(widget.employee.employeeId);
    return _CrewDashboardData(
      summary: detail['summary'] as Map<String, dynamic>,
      advances: detail['advances'] as List<dynamic>,
      dailySummary: dailySummary,
    );
  }

  String _formatCurrency(num value) {
    final formatter = NumberFormat.currency(locale: 'id', symbol: 'Rp ', decimalDigits: 0);
    return formatter.format(value);
  }

  Future<DateTime?> _showSlipPeriodDialog() async {
    final now = DateTime.now();
    final monthNames = List<String>.generate(
      12,
      (index) => DateFormat('MMMM', 'id_ID').format(DateTime(0, index + 1)),
    );
    final years = List<int>.generate(5, (index) => now.year - index);
    int selectedMonth = _selectedSlipPeriod.month;
    int selectedYear = _selectedSlipPeriod.year;

    return showDialog<DateTime>(
      context: context,
      builder: (context) {
        return StatefulBuilder(builder: (context, setState) {
          return AlertDialog(
            title: const Text('Pilih Periode Slip Gaji'),
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
                      child: Text(monthNames[index]),
                    ),
                  ),
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() => selectedMonth = value);
                  },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<int>(
                  value: selectedYear,
                  decoration: const InputDecoration(labelText: 'Tahun'),
                  items: years
                      .map((year) => DropdownMenuItem(value: year, child: Text(year.toString())))
                      .toList(),
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() => selectedYear = value);
                  },
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(null),
                child: const Text('Batal'),
              ),
              ElevatedButton(
                onPressed: () => Navigator.of(context).pop(DateTime(selectedYear, selectedMonth)),
                child: const Text('Export'),
              ),
            ],
          );
        });
      },
    );
  }

  List<Map<String, dynamic>> _filterDailyRecordsByPeriod(
    List<Map<String, dynamic>> records,
    DateTime period,
  ) {
    return records.where((entry) {
      final date = _parseDate(entry['date']);
      if (date == null) return false;
      return date.year == period.year && date.month == period.month;
    }).toList();
  }

  DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    final text = value.toString();
    final clean = text.contains('T') ? text.split('T').first : text.split(' ').first;
    return DateTime.tryParse(clean);
  }

  double _sumKasbonForPeriod(List<dynamic> advances, DateTime period) {
    return advances.fold<double>(0, (sum, item) {
      final advance = item as Map<String, dynamic>;
      final date = _parseDate(advance['date']);
      if (date == null || date.year != period.year || date.month != period.month) {
        return sum;
      }
      final amount = advance['amount'];
      return sum + _toDouble(amount);
    });
  }

  double _toDouble(dynamic value) {
    if (value == null) return 0;
    if (value is num) return value.toDouble();
    if (value is String) {
      return double.tryParse(value.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;
    }
    return 0;
  }

  Future<void> _exportSalarySlip() async {
    final selectedPeriod = await _showSlipPeriodDialog();
    if (selectedPeriod == null) return;
    setState(() {
      _selectedSlipPeriod = selectedPeriod;
      _isExportingSlip = true;
      _dashboardFuture = _loadDashboard();
    });
    try {
      final payload = await _dashboardFuture;
      final dailyRecords =
          (payload.dailySummary['daily'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
      final periodEntries = _filterDailyRecordsByPeriod(dailyRecords, selectedPeriod);
      final totalWorkMinutes = periodEntries.fold<double>(
        0,
        (sum, entry) => sum + (_toDouble(entry['total_work_minutes'])),
      );
      final totalSalary =
          periodEntries.fold<double>(0, (sum, entry) => sum + (_toDouble(entry['total_salary'])));
      final totalKasbon = _sumKasbonForPeriod(payload.advances, selectedPeriod);
      final netSalary = totalSalary - totalKasbon;
      final periodLabel = DateFormat('MMMM yyyy', 'id_ID').format(selectedPeriod);
      final bytes = await generateCrewSalarySlipPdf(
        employeeName: widget.employee.name,
        position: widget.employee.position ?? '-',
        periodLabel: periodLabel,
        totalHours: totalWorkMinutes / 60,
        totalDays: periodEntries.length,
        totalSalary: totalSalary,
        totalKasbon: totalKasbon,
        netSalary: netSalary,
        dailyDetails: periodEntries,
      );
      await PdfExportWrapper.sharePdf(
        bytes: bytes,
        filename: 'Slip_Gaji_${widget.employee.name}_${periodLabel.replaceAll(' ', '_')}.pdf',
        context: context,
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal export slip gaji: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) {
        setState(() => _isExportingSlip = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Crew Dashboard'),
        backgroundColor: const Color(0xFF0A4D68),
        actions: [
          IconButton(
            tooltip: 'Export Slip Gaji',
            onPressed: _isExportingSlip ? null : _exportSalarySlip,
            icon: _isExportingSlip
                ? const SizedBox(
                    width: 24,
                    height: 24,
                    child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                  )
                : const Icon(Icons.picture_as_pdf),
          ),
        ],
      ),
      backgroundColor: const Color(0xFFEAFBFF),
      body: FutureBuilder<_CrewDashboardData>(
        future: _dashboardFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Gagal memuat data: ${snapshot.error}'));
          }
          final payload = snapshot.requireData;
          final summary = payload.summary;
          final dailySummary = payload.dailySummary;
          final advances = payload.advances;

          final totalSalary = (dailySummary['total_salary'] as num?)?.toDouble() ?? 0;
          final totalKasbon = (summary['total_advances'] as num?)?.toDouble() ?? 0;
          final totalNet = (summary['net_salary'] as num?)?.toDouble() ?? 0;
          final dailyRecords = (dailySummary['daily'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();

          return SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildHeader(),
                const SizedBox(height: 16),
                _buildSummaryCards(totalSalary, totalKasbon, totalNet),
                const SizedBox(height: 16),
                Expanded(child: _buildTabs(dailyRecords, advances)),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeader() {
    final employee = widget.employee;
    final isActive = (employee.status ?? '').toLowerCase() == 'active';
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          boxShadow: const [BoxShadow(color: Color(0x12000000), blurRadius: 12, offset: Offset(0, 6))],
        ),
        child: Row(
          children: [
            CircleAvatar(
              radius: 30,
              backgroundColor: const Color(0xFFE3F2FD),
              child: const Icon(Icons.person, color: Color(0xFF0A4D68), size: 30),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(employee.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 4),
                  Text(employee.position ?? '-', style: const TextStyle(color: Colors.black54)),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(isActive ? Icons.check_circle : Icons.cancel, color: isActive ? Colors.green : Colors.redAccent, size: 16),
                      const SizedBox(width: 6),
                      Text(isActive ? 'Active' : 'Inactive', style: TextStyle(color: isActive ? Colors.green : Colors.redAccent)),
                    ],
                  ),
                ],
              ),
            ),
            Chip(
              label: Text(employee.statusCrew ?? '-', style: const TextStyle(color: Colors.white)),
              backgroundColor: const Color(0xFF0A4D68),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCards(double salary, double kasbon, double net) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          Expanded(child: _StatsCard(label: 'Gaji', value: _formatCurrency(salary), color: const Color(0xFF4CAF50))),
          const SizedBox(width: 12),
          Expanded(child: _StatsCard(label: 'Kasbon', value: _formatCurrency(kasbon), color: const Color(0xFFFF7043))),
          const SizedBox(width: 12),
          Expanded(child: _StatsCard(label: 'Gaji Bersih', value: _formatCurrency(net), color: const Color(0xFF1E88E5))),
        ],
      ),
    );
  }

  Widget _buildTabs(List<Map<String, dynamic>> history, List<dynamic> advances) {
    return DefaultTabController(
      length: 3,
      child: Column(
        children: [
          TabBar(
            labelColor: const Color(0xFF0A4D68),
            unselectedLabelColor: Colors.grey,
            tabs: const [
              Tab(text: 'Riwayat Absensi'),
              Tab(text: 'Riwayat Kasbon'),
              Tab(text: 'Data Pribadi'),
            ],
          ),
          const Divider(height: 0),
          Expanded(
            child: TabBarView(
              children: [
                _buildAttendanceTab(history),
                _buildKasbonTab(advances),
                _buildProfileTab(),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAttendanceTab(List<Map<String, dynamic>> history) {
    if (history.isEmpty) {
      return const Center(child: Text('Belum ada rekam absensi.'));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: history.length,
      separatorBuilder: (_, __) => const Divider(),
      itemBuilder: (context, index) {
        final entry = history[index];
        final normal = (entry['work_minutes_normal'] as num?)?.toDouble() ?? 0;
        final overtime = (entry['work_minutes_overtime'] as num?)?.toDouble() ?? 0;
        final status = (normal + overtime) > 0 ? 'Selesai' : 'Tidak lengkap';
        return ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(entry['date'] ?? '-'),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Normal: ${normal.toStringAsFixed(0)} menit'),
              Text('Lembur: ${overtime.toStringAsFixed(0)} menit'),
              Text('Status: $status'),
            ],
          ),
          trailing: Text(status, style: TextStyle(color: status == 'Selesai' ? Colors.green : Colors.orange)),
        );
      },
    );
  }

  Widget _buildKasbonTab(List<dynamic> advances) {
    if (advances.isEmpty) {
      return const Center(child: Text('Belum ada kasbon.'));
    }
    return ListView.separated(
      padding: const EdgeInsets.all(16),
      itemCount: advances.length,
      separatorBuilder: (_, __) => const Divider(),
      itemBuilder: (context, index) {
        final advance = advances[index] as Map<String, dynamic>;
        final amount = (advance['amount'] as num?)?.toDouble() ?? 0;
        final remaining = (advance['remaining_balance'] as num?)?.toDouble() ??
            (advance['remaining_amount'] as num?)?.toDouble() ??
            0;
        return ListTile(
          contentPadding: EdgeInsets.zero,
          title: Text(_formatCurrency(amount)),
          subtitle: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Tanggal: ${advance['date'] ?? '-'}'),
              Text('Sisa: ${_formatCurrency(remaining)}'),
            ],
          ),
        );
      },
    );
  }

  Widget _buildProfileTab() {
    final employee = widget.employee;
    final fields = {
      'Nama': employee.name,
      'Posisi': employee.position,
      'Status Crew': employee.statusCrew,
      'Status Akun': employee.status,
      'WhatsApp': employee.whatsapp ?? '-',
      'Gaji Bulanan': employee.monthlySalary != null ? _formatCurrency(employee.monthlySalary!) : '-',
      'Jam Kerja/Hari': employee.workHoursPerDay?.toString() ?? '-',
      'Tarif per Jam': employee.hourlyRate != null ? _formatCurrency(employee.hourlyRate!) : '-',
    };
    return ListView(
      padding: const EdgeInsets.all(16),
      children: fields.entries
          .map(
            (entry) => Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(entry.key, style: const TextStyle(color: Colors.black45)),
                const SizedBox(height: 4),
                Text(entry.value?.toString() ?? '-', style: const TextStyle(fontWeight: FontWeight.w600)),
                const SizedBox(height: 12),
              ],
            ),
          )
          .toList(),
    );
  }
}

class _StatsCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _StatsCard({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 12, offset: Offset(0, 6))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }
}



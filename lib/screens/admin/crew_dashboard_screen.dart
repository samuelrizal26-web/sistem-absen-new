import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:sistem_absen_flutter_v2/models/employee.dart';
import 'package:sistem_absen_flutter_v2/screens/admin/export_payroll_slip_screen.dart';
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
  late String _currentStatus;
  bool _isUpdatingStatus = false;

  @override
  void initState() {
    debugPrint('ADMIN CREW DASHBOARD INIT');
    super.initState();
    _dashboardFuture = _loadDashboard();
    _currentStatus = (widget.employee.status ?? 'inactive').toLowerCase();
  }

  void _onExportPressed() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => ExportPayrollSlipScreen(
          employees: [
            {
              'id': widget.employee.employeeId,
              'name': widget.employee.name,
            },
          ],
        ),
      ),
    );
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

  String _formatCurrencyMaybe(num? value) {
    if (value == null) return '-';
    return _formatCurrency(value);
  }



  @override
  Widget build(BuildContext context) {
    debugPrint('ADMIN CREW DASHBOARD BUILD');
    return Scaffold(
      appBar: AppBar(
        title: const Text('Crew Dashboard'),
        backgroundColor: const Color(0xFF0A4D68),
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
          if (snapshot.hasData) {
            debugPrint('DASHBOARD DATA RAW: ${snapshot.data}');
          }
          final payload = snapshot.requireData;
          final summary = payload.summary;
          final dailySummary = payload.dailySummary;
          final advances = payload.advances;

          final totalSalary = dailySummary['total_salary'] as num?;
          final totalNet = summary['net_salary'] as num?;
          final dailyRecords = (dailySummary['daily'] as List<dynamic>? ?? []).cast<Map<String, dynamic>>();
          final outstandingKasbon = _calculateOutstandingKasbon(advances);

          return SafeArea(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildHeader(),
                const SizedBox(height: 16),
                _buildSummaryCards(totalSalary, outstandingKasbon, totalNet),
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
    final isActive = _currentStatus == 'active';
    final isWorkFinished = !isActive;
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
                  Text(
                    employee.name,
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    employee.position ?? '-',
                    style: const TextStyle(color: Colors.black54),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    employee.statusCrew ?? '-',
                    style: const TextStyle(fontSize: 12, color: Colors.black54),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Row(
                  children: [
                    Icon(isActive ? Icons.check_circle : Icons.cancel,
                        color: isActive ? Colors.green : Colors.redAccent, size: 16),
                    const SizedBox(width: 6),
                    Text(
                      isActive ? 'Active' : 'Inactive',
                      style: TextStyle(color: isActive ? Colors.green : Colors.redAccent),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  isWorkFinished ? 'Kerja selesai • export tersedia' : 'Kerja berjalan • export setelah selesai',
                  style: const TextStyle(fontSize: 12, color: Colors.black45),
                ),
                const SizedBox(height: 8),
                ElevatedButton(
                  onPressed: _isUpdatingStatus ? null : _toggleWorkState,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isActive ? Colors.red : Colors.green,
                    minimumSize: const Size(140, 40),
                  ),
                  child: Text(
                    isActive ? 'OFF – Selesaikan Kerja' : 'ON – Mulai Kerja',
                    style: const TextStyle(color: Colors.white),
                  ),
                ),
                const SizedBox(height: 8),
                ElevatedButton.icon(
                  onPressed: isWorkFinished ? _onExportPressed : null,
                  icon: const Icon(Icons.picture_as_pdf, size: 18),
                  label: const Text('Export PDF'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0A4D68),
                    minimumSize: const Size(140, 40),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryCards(num? salary, num? kasbon, num? net) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Row(
        children: [
          Expanded(
            child: _StatsCard(
              label: 'Gaji',
              value: _formatCurrencyMaybe(salary),
              color: const Color(0xFF4CAF50),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _StatsCard(
              label: 'Kasbon',
              value: _formatCurrencyMaybe(kasbon),
              color: const Color(0xFFFF7043),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _StatsCard(
              label: 'Gaji Bersih',
              value: _formatCurrencyMaybe(net),
              color: const Color(0xFF1E88E5),
            ),
          ),
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

  double _calculateOutstandingKasbon(List<dynamic> advances) {
    return advances.fold<double>(0.0, (sum, advance) {
      if (advance is! Map<String, dynamic>) return sum;
      final remaining = (advance['remaining_balance'] as num?)?.toDouble() ??
          (advance['remaining_amount'] as num?)?.toDouble() ??
          (advance['amount'] as num?)?.toDouble() ??
          0;
      return sum + remaining;
    });
  }

  Future<void> _toggleWorkState() async {
    final target = _currentStatus == 'active' ? 'inactive' : 'active';
    setState(() => _isUpdatingStatus = true);
    try {
      final payload = _buildStatusPayload(target);
      await ApiService.updateEmployee(widget.employee.employeeId, payload);
      setState(() => _currentStatus = target);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            target == 'active' ? 'Crew kembali bekerja' : 'Kerja diselesaikan, export tersedia',
          ),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengubah status: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) {
        setState(() => _isUpdatingStatus = false);
      }
    }
  }

  Map<String, dynamic> _buildStatusPayload(String targetStatus) {
    final employee = widget.employee;
    return {
      'name': employee.name,
      'whatsapp': employee.whatsapp ?? '',
      'pin': employee.pin ?? '',
      'birthplace': employee.birthplace ?? '',
      'birthdate': employee.birthdate ?? '',
      'position': employee.position ?? '',
      'status_crew': employee.statusCrew ?? '',
      'monthly_salary': employee.monthlySalary ?? 0,
      'work_hours_per_day': employee.workHoursPerDay ?? 0,
      'status': targetStatus,
    };
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



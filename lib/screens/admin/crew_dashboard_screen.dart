// ============================================
// ADMIN CREW DASHBOARD - STABLE MODULE
// FINAL UI:
// - Portrait: vertical scrollable layout
// - Landscape: 2-panel (LEFT: info 40%, RIGHT: tabs 60%)
// - NO overflow, independent scroll
// - NO logic/API changes
// ============================================
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:sistem_absen_flutter_v2/core/utils/pdf_export_wrapper.dart';
import 'package:sistem_absen_flutter_v2/features/salary/utils/salary_slip_pdf.dart';
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
  final Employee employeeDetail;

  _CrewDashboardData({
    required this.summary,
    required this.advances,
    required this.dailySummary,
    required this.employeeDetail,
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

  Future<_CrewDashboardData> _loadDashboard() async {
    final detail = await ApiService.fetchEmployeeDetail(widget.employee.employeeId);
    final dailySummary = await ApiService.fetchDailySalarySummary(widget.employee.employeeId);
    final employeeDetail = Employee.fromJson((detail['employee'] as Map<String, dynamic>?) ?? {});
    return _CrewDashboardData(
      summary: detail['summary'] as Map<String, dynamic>,
      advances: detail['advances'] as List<dynamic>,
      dailySummary: dailySummary,
      employeeDetail: employeeDetail,
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
          final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;

          return SafeArea(
            child: isLandscape
                ? _buildLandscapeLayout(payload, totalSalary, outstandingKasbon, totalNet, dailyRecords, advances)
                : _buildPortraitLayout(payload, totalSalary, outstandingKasbon, totalNet, dailyRecords, advances),
          );
        },
      ),
    );
  }

  Widget _buildPortraitLayout(
    _CrewDashboardData payload,
    num? totalSalary,
    num? outstandingKasbon,
    num? totalNet,
    List<Map<String, dynamic>> dailyRecords,
    List<dynamic> advances,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        SingleChildScrollView(
          padding: const EdgeInsets.only(top: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildHeader(payload, false),
              const SizedBox(height: 16),
              _buildSummaryCards(totalSalary, outstandingKasbon, totalNet, false),
              const SizedBox(height: 16),
            ],
          ),
        ),
        Expanded(child: _buildTabs(dailyRecords, advances)),
      ],
    );
  }

  Widget _buildLandscapeLayout(
    _CrewDashboardData payload,
    num? totalSalary,
    num? outstandingKasbon,
    num? totalNet,
    List<Map<String, dynamic>> dailyRecords,
    List<dynamic> advances,
  ) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 4,
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _buildHeader(payload, true),
                const SizedBox(height: 12),
                _buildSummaryCards(totalSalary, outstandingKasbon, totalNet, true),
              ],
            ),
          ),
        ),
        const VerticalDivider(width: 1, thickness: 1),
        Expanded(
          flex: 6,
          child: _buildTabs(dailyRecords, advances),
        ),
      ],
    );
  }

  Widget _buildHeader(_CrewDashboardData payload, bool isLandscape) {
    final employee = widget.employee;
    final isActive = _currentStatus == 'active';
    final isWorkFinished = !isActive;
    
    return Container(
      padding: EdgeInsets.all(isLandscape ? 12 : 16),
      margin: EdgeInsets.symmetric(horizontal: isLandscape ? 0 : 24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: const [BoxShadow(color: Color(0x12000000), blurRadius: 10, offset: Offset(0, 4))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              CircleAvatar(
                radius: isLandscape ? 22 : 30,
                backgroundColor: const Color(0xFFE3F2FD),
                child: Icon(Icons.person, color: const Color(0xFF0A4D68), size: isLandscape ? 22 : 30),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      employee.name,
                      style: TextStyle(fontSize: isLandscape ? 15 : 20, fontWeight: FontWeight.bold),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Text(
                      employee.position ?? '-',
                      style: const TextStyle(color: Colors.black54, fontSize: 12),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(isActive ? Icons.check_circle : Icons.cancel,
                      color: isActive ? Colors.green : Colors.redAccent, size: 14),
                  const SizedBox(width: 4),
                  Text(
                    isActive ? 'Active' : 'Inactive',
                    style: TextStyle(
                      color: isActive ? Colors.green : Colors.redAccent,
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: ElevatedButton(
                  onPressed: _isUpdatingStatus ? null : _toggleWorkState,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: isActive ? Colors.red : Colors.green,
                    minimumSize: const Size(0, 40),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                  ),
                  child: Text(
                    isActive ? 'OFF – Selesai' : 'ON – Mulai',
                    style: const TextStyle(color: Colors.white, fontSize: 12),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: isWorkFinished ? () => _handleExportPressed(payload) : null,
                  icon: const Icon(Icons.picture_as_pdf, size: 14),
                  label: const Text('Export', style: TextStyle(fontSize: 12)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0A4D68),
                    minimumSize: const Size(0, 40),
                    padding: const EdgeInsets.symmetric(horizontal: 12),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryCards(num? salary, num? kasbon, num? net, bool isLandscape) {
    return Padding(
      padding: EdgeInsets.symmetric(horizontal: isLandscape ? 0 : 24),
      child: Column(
        children: [
          _StatsCard(
            label: 'Gaji',
            value: _formatCurrencyMaybe(salary),
            color: const Color(0xFF4CAF50),
            isLandscape: isLandscape,
          ),
          const SizedBox(height: 10),
          _StatsCard(
            label: 'Kasbon',
            value: _formatCurrencyMaybe(kasbon),
            color: const Color(0xFFFF7043),
            isLandscape: isLandscape,
          ),
          const SizedBox(height: 10),
          _StatsCard(
            label: 'Gaji Bersih',
            value: _formatCurrencyMaybe(net),
            color: const Color(0xFF1E88E5),
            isLandscape: isLandscape,
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

  void _handleExportPressed(_CrewDashboardData payload) {
    if (_currentStatus == 'active') return;
    _exportSlipPdf(payload);
  }

  Future<void> _exportSlipPdf(_CrewDashboardData payload) async {
    final employeeDetail = payload.employeeDetail;
    // IMPORTANT: PDF export must use the freshest employee detail returned from the dashboard API,
    // not widget.employee which may contain stale allowance rates.
    final summary = payload.summary;
    final dailySummary = payload.dailySummary;
    final dailyRecords = (dailySummary['daily'] as List<dynamic>?)
            ?.whereType<Map<String, dynamic>>()
            .toList() ??
        [];

    final clockInCount = dailyRecords.where(_didWorkDay).length;
    final kasbonCut = _calculateApprovedKasbon(payload.advances).toInt();
    final netSalary = (summary['net_salary'] as num?)?.toInt() ?? 0;
    final latePenalty = (summary['late_penalty'] as num?)?.toInt() ?? 0;
    final absencePenalty = (summary['absence_penalty'] as num?)?.toInt() ?? 0;
    final overtime = (summary['overtime'] as num?)?.toInt() ?? 0;
    final periodLabel = _resolvePeriodLabel(dailySummary);
    final periodDate = _resolvePeriodDate(dailySummary);
    final rekapNumber = _buildSimpleRekapCode(employeeDetail.name, periodDate);
    final mealAllowancePerDay = (employeeDetail.allowanceMeal ?? 0).toInt();
    final transportAllowancePerDay = (employeeDetail.allowanceTransport ?? 0).toInt();
    debugPrint('PDF EXPORT allowanceMeal: ${employeeDetail.allowanceMeal}');
    debugPrint('PDF EXPORT allowanceTransport: ${employeeDetail.allowanceTransport}');

    try {
      final bytes = await generateSalarySlipPdf(
        rekapNumber: rekapNumber,
        period: periodLabel,
        employeeName: employeeDetail.name,
        monthlySalary: (employeeDetail.monthlySalary ?? 0).toInt(),
        workHoursPerDay: employeeDetail.workHoursPerDay ?? 0,
        overtime: overtime,
        latePenalty: latePenalty,
        absencePenalty: absencePenalty,
        kasbonCut: kasbonCut,
        netSalary: netSalary,
        mealAllowancePerDay: mealAllowancePerDay,
        transportAllowancePerDay: transportAllowancePerDay,
        clockInCount: clockInCount,
      );

      final sanitizedName = employeeDetail.name.replaceAll(RegExp(r'[^a-zA-Z0-9_-]+'), '_');
      final sanitizedPeriod =
          periodLabel.replaceAll(RegExp(r'[^a-zA-Z0-9_-]+'), '_');
      final filename = 'Slip_Gaji_${sanitizedName}_$sanitizedPeriod.pdf';

      await PdfExportWrapper.sharePdf(
        bytes: bytes,
        filename: filename,
        context: context,
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal export slip gaji: $e'), backgroundColor: Colors.red),
      );
    }
  }

  bool _didWorkDay(Map<String, dynamic> entry) {
    final minutes = (entry['worked_minutes'] as num?) ??
        (entry['work_minutes'] as num?) ??
        (entry['work_minutes_normal'] as num?) ??
        (entry['duration_minutes'] as num?) ??
        (entry['total_minutes'] as num?) ??
        0;
    return (minutes.toDouble()) > 0;
  }

  double _calculateApprovedKasbon(List<dynamic> advances) {
    const skippedStatuses = {'pending', 'rejected', 'cancelled', 'draft'};
    return advances.fold<double>(0.0, (sum, advance) {
      if (advance is! Map<String, dynamic>) return sum;
      final status = (advance['status'] as String?)?.toLowerCase();
      if (status != null && skippedStatuses.contains(status)) return sum;
      final amount = (advance['amount'] as num?)?.toDouble() ?? 0;
      return sum + amount;
    });
  }

  String _resolvePeriodLabel(Map<String, dynamic> dailySummary) {
    final periodLabel = (dailySummary['period_label'] as String?) ??
        (dailySummary['label'] as String?) ??
        (dailySummary['period'] is Map<String, dynamic>
            ? (dailySummary['period']['label'] as String?)
            : null);
    if (periodLabel != null && periodLabel.isNotEmpty) {
      return periodLabel;
    }
    final start = (dailySummary['start'] ?? dailySummary['start_date']) as String?;
    if (start != null) {
      final parsed = DateTime.tryParse(start);
      if (parsed != null) {
        return DateFormat('MMMM yyyy', 'id_ID').format(parsed);
      }
    }
    final month = (dailySummary['month'] as int?) ?? (dailySummary['period_month'] as int?);
    final year = (dailySummary['year'] as int?) ?? (dailySummary['period_year'] as int?);
    if (month != null && year != null) {
      return DateFormat('MMMM yyyy', 'id_ID').format(DateTime(year, month));
    }
    return DateFormat('MMMM yyyy', 'id_ID').format(DateTime.now());
  }

  DateTime _resolvePeriodDate(Map<String, dynamic> dailySummary) {
    final start = (dailySummary['start'] ?? dailySummary['start_date']) as String?;
    if (start != null) {
      final parsed = DateTime.tryParse(start);
      if (parsed != null) return parsed;
    }
    final month = (dailySummary['month'] as int?) ??
        (dailySummary['period_month'] as int?) ??
        (dailySummary['period'] is Map<String, dynamic>
            ? (dailySummary['period']['month'] as int?)
            : null);
    final year = (dailySummary['year'] as int?) ??
        (dailySummary['period_year'] as int?) ??
        (dailySummary['period'] is Map<String, dynamic>
            ? (dailySummary['period']['year'] as int?)
            : null);
    if (month != null && year != null) {
      return DateTime(year, month);
    }
    return DateTime.now();
  }

  String _buildSimpleRekapCode(String name, DateTime monthYear) {
    final initials = _crewInitials(name);
    final month = monthYear.month.toString().padLeft(2, '0');
    final year = monthYear.year.toString();
    return 'RG-$initials-$month$year';
  }

  String _crewInitials(String name) {
    final parts = name
        .split(RegExp(r'\s+'))
        .map((part) => part.trim())
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.isEmpty) return 'XX';
    if (parts.length == 1) {
      final part = parts.first;
      return part.length >= 2
          ? part.substring(0, 2).toUpperCase()
          : part.padRight(2, 'X').toUpperCase();
    }
    final first = parts.first[0];
    final second = parts[1][0];
    return '$first$second'.toUpperCase();
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
  final bool isLandscape;

  const _StatsCard({
    required this.label,
    required this.value,
    required this.color,
    this.isLandscape = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.all(isLandscape ? 12 : 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 12, offset: Offset(0, 6))],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: TextStyle(
              color: color,
              fontWeight: FontWeight.bold,
              fontSize: isLandscape ? 12 : 14,
            ),
          ),
          SizedBox(height: isLandscape ? 6 : 8),
          Text(
            value,
            style: TextStyle(
              fontSize: isLandscape ? 14 : 16,
              fontWeight: FontWeight.bold,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}



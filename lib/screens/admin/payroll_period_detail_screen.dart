import 'package:flutter/material.dart';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

class PayrollPeriodDetailScreen extends StatefulWidget {
  final String periodId;

  const PayrollPeriodDetailScreen({
    super.key,
    required this.periodId,
  });

  @override
  State<PayrollPeriodDetailScreen> createState() => _PayrollPeriodDetailScreenState();
}

class _PayrollPeriodDetailScreenState extends State<PayrollPeriodDetailScreen> {
  late final Future<Map<String, dynamic>> _detailFuture;

  @override
  void initState() {
    super.initState();
    _detailFuture = ApiService.fetchPayrollPeriodDetail(widget.periodId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Detail Periode Payroll'),
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _detailFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'Gagal memuat detail periode payroll.\n${snapshot.error}',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }

          final period = snapshot.data ?? {};
          final start = period['start_date']?.toString() ?? '-';
          final end = period['end_date']?.toString() ?? '-';
          final status = (period['status']?.toString().toUpperCase()) ?? 'UNKNOWN';
          final employees = (period['employees'] as List<dynamic>?)
              ?.whereType<Map<String, dynamic>>()
              .toList();

          return Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Periode', style: Theme.of(context).textTheme.labelLarge),
                const SizedBox(height: 8),
                Text('$start – $end', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                Row(
                  children: [
                    Container(
                      decoration: BoxDecoration(
                        color: status == 'LOCKED'
                            ? Colors.grey.shade300
                            : Colors.green.shade100,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 12),
                      child: Text(
                        status,
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: status == 'LOCKED'
                              ? Colors.grey.shade700
                              : Colors.green.shade900,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),
                Text('Karyawan dalam periode', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 12),
                Expanded(
                  child: employees == null
                      ? const Center(
                          child: Text('Daftar karyawan tidak tersedia untuk periode ini.'),
                        )
                      : employees.isEmpty
                          ? const Center(
                              child: Text('Tidak ada karyawan terdaftar pada periode ini.'),
                            )
                          : ListView.separated(
                              itemCount: employees.length,
                              separatorBuilder: (_, __) => const Divider(),
                              itemBuilder: (context, index) {
                                final employee = employees[index];
                                final name = employee['name']?.toString() ?? '-';
                                final position = employee['position']?.toString() ?? '-';
                                return ListTile(
                                  title: Text(name),
                                  subtitle: Text(position),
                                  trailing: const Icon(Icons.visibility_off),
                                );
                              },
                            ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}


import 'package:flutter/material.dart';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

class PayrollPeriodListScreen extends StatefulWidget {
  const PayrollPeriodListScreen({super.key});

  @override
  State<PayrollPeriodListScreen> createState() => _PayrollPeriodListScreenState();
}

class _PayrollPeriodListScreenState extends State<PayrollPeriodListScreen> {
  late final Future<List<Map<String, dynamic>>> _periodsFuture;

  @override
  void initState() {
    super.initState();
    _periodsFuture = ApiService.fetchPayrollPeriods();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Daftar Periode Payroll'),
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _periodsFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 24),
                child: Text(
                  'Gagal memuat periode payroll.\n${snapshot.error}',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }

          final periods = snapshot.data ?? <Map<String, dynamic>>[];
          if (periods.isEmpty) {
            return const Center(
              child: Text('Belum ada periode payroll yang tersedia.'),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: periods.length,
            separatorBuilder: (_, __) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final period = periods[index];
              final start = period['start_date']?.toString() ?? '-';
              final end = period['end_date']?.toString() ?? '-';
              final status = (period['status']?.toString().toUpperCase()) ?? 'UNKNOWN';

              return Card(
                elevation: 2,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        '$start – $end',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
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
                                color: status == 'LOCKED' ? Colors.grey.shade700 : Colors.green.shade900,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
    );
  }
}


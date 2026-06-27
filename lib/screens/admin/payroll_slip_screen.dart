import 'package:flutter/material.dart';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

class PayrollSlipScreen extends StatefulWidget {
  final String periodId;
  final String employeeId;

  const PayrollSlipScreen({
    super.key,
    required this.periodId,
    required this.employeeId,
  });

  @override
  State<PayrollSlipScreen> createState() => _PayrollSlipScreenState();
}

class _PayrollSlipScreenState extends State<PayrollSlipScreen> {
  late final Future<Map<String, dynamic>> _slipFuture;

  @override
  void initState() {
    super.initState();
    _slipFuture = ApiService.fetchPayrollSlip(
      periodId: widget.periodId,
      employeeId: widget.employeeId,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Slip Payroll'),
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _slipFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator());
          }

          if (snapshot.hasError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Gagal memuat slip payroll.\n${snapshot.error}',
                  textAlign: TextAlign.center,
                ),
              ),
            );
          }

          final slip = snapshot.data;
          if (slip == null || slip.isEmpty) {
            return const Center(
              child: Text('Slip tidak ditemukan untuk periode ini.'),
            );
          }

          final employee = slip['employee'] as Map<String, dynamic>?;
          final period = slip['period'] as Map<String, dynamic>?;
          final periodStart = period?['start_date']?.toString();
          final periodEnd = period?['end_date']?.toString();
          final periodStatus = period?['status']?.toString().toUpperCase();

          return ListView(
            padding: const EdgeInsets.all(20),
            children: [
              Text(
                'Slip Payroll',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 12),
              if (employee != null)
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Karyawan: ${employee['name'] ?? ''}'),
                    Text('ID: ${employee['id'] ?? ''}'),
                  ],
                ),
              const SizedBox(height: 12),
              if (periodStart != null && periodEnd != null)
                Text('Periode: $periodStart – $periodEnd'),
              if (periodStatus != null) ...[
                const SizedBox(height: 4),
                Text('Status: $periodStatus'),
              ],
              const SizedBox(height: 16),
              const Text('Detail Angka'),
              const Divider(),
              const SizedBox(height: 8),
              _SlipRow(label: 'minutes_worked', value: '${slip['minutes_worked']}'),
              _SlipRow(label: 'salary_gross', value: '${slip['salary_gross']}'),
              _SlipRow(label: 'total_kasbon_periode', value: '${slip['total_kasbon_periode']}'),
              _SlipRow(label: 'total_deduction', value: '${slip['total_deduction']}'),
              _SlipRow(label: 'net_salary', value: '${slip['net_salary']}'),
            ],
          );
        },
      ),
    );
  }
}

class _SlipRow extends StatelessWidget {
  final String label;
  final String value;

  const _SlipRow({
    required this.label,
    required this.value,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(value),
        ],
      ),
    );
  }
}


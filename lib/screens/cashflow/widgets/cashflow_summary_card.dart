import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class CashflowSummaryCard extends StatelessWidget {
  final Map<String, dynamic>? summary;

  const CashflowSummaryCard({super.key, this.summary});

  @override
  Widget build(BuildContext context) {
    final formatter = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    final income = (summary?['total_income'] as num?)?.toDouble() ?? 0;
    final expense = (summary?['total_expense'] as num?)?.toDouble() ?? 0;
    final balance = (summary?['balance'] as num?)?.toDouble() ?? (income - expense);

    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _SummaryMetric(label: 'Pemasukan', value: formatter.format(income), color: Colors.green),
            _SummaryMetric(label: 'Pengeluaran', value: formatter.format(expense), color: Colors.red),
            _SummaryMetric(label: 'Saldo Kas', value: formatter.format(balance), color: Colors.blue),
          ],
        ),
      ),
    );
  }
}

class _SummaryMetric extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _SummaryMetric({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
      ],
    );
  }
}

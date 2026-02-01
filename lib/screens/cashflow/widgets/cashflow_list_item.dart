import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class CashflowListItem extends StatelessWidget {
  final Map<String, dynamic> transaction;

  const CashflowListItem({super.key, required this.transaction});

  @override
  Widget build(BuildContext context) {
    final formatter = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
    final dateRaw = transaction['date'] ?? transaction['created_at'];
    final date =
        dateRaw is String ? DateTime.tryParse(dateRaw.split('T').first) : null;
    final timeLabel = date != null ? DateFormat('dd MMM yyyy · HH:mm').format(date) : '-';
    final type = (transaction['category'] ?? transaction['type'] ?? '').toString().toLowerCase();
    final isIncome = type == 'income' || type == 'pemasukan';
    final amount = (transaction['amount'] as num?)?.toDouble() ?? 0;
    final method = (transaction['payment_method'] ?? 'cash').toString().toUpperCase();
    final description =
        transaction['description']?.toString() ?? (isIncome ? 'Pemasukan' : 'Pengeluaran');
    final notes = transaction['notes']?.toString();

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 4),
      leading: CircleAvatar(
        backgroundColor: isIncome ? Colors.green.shade50 : Colors.red.shade50,
        child: Icon(
          isIncome ? Icons.arrow_upward : Icons.arrow_downward,
          color: isIncome ? Colors.green : Colors.red,
        ),
      ),
      title: Text(description, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$timeLabel • $method'),
          if (notes != null && notes.isNotEmpty)
            Text(notes, style: const TextStyle(fontSize: 12, color: Colors.black54)),
        ],
      ),
      trailing: Text(
        '${isIncome ? '+' : '-'}${formatter.format(amount.abs())}',
        style: TextStyle(
          fontWeight: FontWeight.bold,
          color: isIncome ? Colors.green.shade700 : Colors.red.shade700,
        ),
      ),
    );
  }
}

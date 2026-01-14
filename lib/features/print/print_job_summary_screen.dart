import 'package:flutter/material.dart';

import '../../core/utils/number_formatter.dart';

class PrintJobSummaryScreen extends StatelessWidget {
  final Map<String, dynamic> summaryData;

  const PrintJobSummaryScreen({
    super.key,
    required this.summaryData,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ringkasan Print Job'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: ListView(
          children: [
            _buildCard(
              title: 'Informasi Job',
              children: [
                _item('Kode Job', summaryData['job_code']),
                _item('Customer', summaryData['customer_name']),
                _item('Tanggal', summaryData['date']),
              ],
            ),

            const SizedBox(height: 12),

            _buildCard(
              title: 'Detail Cetak',
              children: [
                _item('Material', summaryData['material_name']),
                _item('Ukuran', summaryData['size']),
                _item('Jumlah', summaryData['qty']?.toString()),
                _item(
                  'Harga Satuan',
                  _formatCurrency(summaryData['price']),
                ),
              ],
            ),

            const SizedBox(height: 12),

            _buildCard(
              title: 'Total',
              children: [
                _item(
                  'Total Harga',
                  _formatCurrency(summaryData['total']),
                  isBold: true,
                ),
              ],
            ),

            const SizedBox(height: 24),

            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  Navigator.popUntil(
                    context,
                    (route) => route.isFirst,
                  );
                },
                child: const Text('Selesai'),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildCard({
    required String title,
    required List<Widget> children,
  }) {
    return Card(
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(
                fontSize: 15,
                fontWeight: FontWeight.bold,
              ),
            ),
            const Divider(),
            ...children,
          ],
        ),
      ),
    );
  }

  Widget _item(
    String label,
    String? value, {
    bool isBold = false,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(
            value ?? '-',
            style: TextStyle(
              fontWeight: isBold ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ],
      ),
    );
  }

  String _formatCurrency(num? value) {
    final amount = value ?? 0;
    return 'Rp ${ThousandsSeparatorInputFormatter.formatNumber(amount.toDouble())}';
  }
}

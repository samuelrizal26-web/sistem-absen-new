import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:sistem_absen_flutter_v2/models/cashflow_summary.dart';

Future<Uint8List> generateCashflowReportPdf({
  required String periodLabel,
  required CashflowSummary summary,
  required List<Map<String, dynamic>> transactions,
}) async {
  final doc = pw.Document();
  final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  List<List<String>> buildRows() {
    String formatAmount(dynamic value) {
      final amount = _parseAmount(value);
      return amount != null ? '${amount >= 0 ? '' : '-'}${currency.format(amount.abs())}' : '-';
    }

    String formatDate(dynamic dateValue) {
      if (dateValue == null) return '';
      final text = dateValue.toString();
      final clean = text.contains('T') ? text.split('T').first : text;
      final parsed = DateTime.tryParse(clean);
      if (parsed == null) return clean;
      return DateFormat('yyyy-MM-dd').format(parsed);
    }

    String normalizeType(dynamic raw) {
      final value = raw?.toString().toLowerCase().trim() ?? '';
      if (value == 'pemasukan') return 'Pemasukan';
      if (value == 'pengeluaran') return 'Pengeluaran';
      if (value.isEmpty) return '-';
      return value[0].toUpperCase() + value.substring(1);
    }

    final rows = <List<String>>[];
    for (final transaction in transactions) {
      rows.add([
        formatDate(transaction['date'] ?? transaction['created_at']),
        transaction['description']?.toString() ?? '-',
        normalizeType(transaction['type'] ?? transaction['category']),
        transaction['payment_method']?.toString().toUpperCase() ?? '-',
        formatAmount(transaction['amount']),
      ]);
    }
    if (rows.isEmpty) {
      rows.add(['-', 'Belum ada transaksi', '-', '-', '-']);
    }
    return rows;
  }

  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(24),
      build: (context) {
        final rows = buildRows();
        return [
          pw.Text('Laporan Cashflow', style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 6),
          pw.Text('Periode: $periodLabel', style: pw.TextStyle(fontSize: 12, color: PdfColors.grey700)),
          pw.SizedBox(height: 16),
          pw.Container(
            padding: const pw.EdgeInsets.all(12),
            decoration: pw.BoxDecoration(
              border: pw.Border.all(color: PdfColors.grey400),
              borderRadius: pw.BorderRadius.circular(10),
            ),
            child: pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Total Pemasukan', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    pw.Text(currency.format(summary.totalIncome)),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Total Pengeluaran', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    pw.Text(currency.format(summary.totalExpense)),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Margin Cash', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    pw.Text(currency.format(summary.marginCash)),
                  ],
                ),
                pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Text('Margin Transfer', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                    pw.Text(currency.format(summary.marginTransfer)),
                  ],
                ),
              ],
            ),
          ),
          pw.SizedBox(height: 16),
          pw.Text('Rincian Transaksi', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 8),
          pw.Table.fromTextArray(
            headers: ['Tanggal', 'Deskripsi', 'Jenis', 'Metode', 'Jumlah'],
            data: rows,
            border: pw.TableBorder.all(color: PdfColors.grey300),
            headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
            headerDecoration: pw.BoxDecoration(color: PdfColors.grey200),
            cellAlignment: pw.Alignment.centerLeft,
            cellPadding: pw.EdgeInsets.symmetric(vertical: 6, horizontal: 4),
          ),
        ];
      },
    ),
  );

  return doc.save();
}

double? _parseAmount(dynamic value) {
  if (value == null) return null;
  if (value is num) return value.toDouble();
  if (value is String) {
    return double.tryParse(value.replaceAll('.', '')) ?? double.tryParse(value);
  }
  return null;
}


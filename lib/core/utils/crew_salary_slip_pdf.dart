import 'dart:typed_data';

import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

Future<Uint8List> generateCrewSalarySlipPdf({
  required String employeeName,
  required String position,
  required String periodLabel,
  required double totalHours,
  required int totalDays,
  required double totalSalary,
  required double totalKasbon,
  required double netSalary,
  required List<Map<String, dynamic>> dailyDetails,
}) async {
  final doc = pw.Document();
  final currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  String formatHours(double hours) {
    return hours.toStringAsFixed(2);
  }

  String formatMinutes(double minutes) {
    return (minutes / 60).toStringAsFixed(2);
  }

  List<List<String>> buildRows() {
    if (dailyDetails.isEmpty) {
      return [
        ['-', 'Tidak ada catatan harian', '-', '-', '-'],
      ];
    }
    return dailyDetails.map((entry) {
      final date = entry['date']?.toString() ?? '-';
      final normalMinutes = (entry['work_minutes_normal'] as num?)?.toDouble() ?? 0;
      final overtimeMinutes = (entry['work_minutes_overtime'] as num?)?.toDouble() ?? 0;
      final totalSalaryEntry = (entry['total_salary'] as num?)?.toDouble() ?? 0;
      return [
        date,
        formatMinutes(normalMinutes),
        formatMinutes(overtimeMinutes),
        currency.format(totalSalaryEntry),
        '${formatHours((normalMinutes + overtimeMinutes) / 60)} jam',
      ];
    }).toList();
  }

  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(24),
      build: (context) {
        final rows = buildRows();
        return [
          pw.Text('Slip Gaji Crew', style: pw.TextStyle(fontSize: 20, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 6),
          pw.Text('Periode: $periodLabel', style: pw.TextStyle(color: PdfColors.grey700)),
          pw.SizedBox(height: 12),
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('Nama', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text(employeeName),
                ],
              ),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('Posisi', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text(position),
                ],
              ),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('Hari Kerja', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text('$totalDays hari'),
                ],
              ),
            ],
          ),
          pw.SizedBox(height: 12),
          pw.Row(
            mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
            children: [
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('Total Jam Kerja', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text('${totalHours.toStringAsFixed(1)} jam'),
                ],
              ),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('Total Gaji', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text(currency.format(totalSalary)),
                ],
              ),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('Total Kasbon', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text(currency.format(totalKasbon)),
                ],
              ),
              pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Text('Gaji Bersih', style: pw.TextStyle(fontWeight: pw.FontWeight.bold)),
                  pw.Text(currency.format(netSalary)),
                ],
              ),
            ],
          ),
          pw.SizedBox(height: 18),
          pw.Text('Rinci Harian', style: pw.TextStyle(fontSize: 14, fontWeight: pw.FontWeight.bold)),
          pw.SizedBox(height: 6),
          pw.Table.fromTextArray(
            headers: ['Tanggal', 'Normal (jam)', 'Lembur (jam)', 'Total Gaji', 'Total'],
            data: rows,
            border: pw.TableBorder.all(color: PdfColors.grey400),
            headerStyle: pw.TextStyle(fontWeight: pw.FontWeight.bold),
            headerDecoration: pw.BoxDecoration(color: PdfColors.grey200),
            cellAlignment: pw.Alignment.centerLeft,
            cellPadding: const pw.EdgeInsets.symmetric(vertical: 6, horizontal: 4),
          ),
        ];
      },
    ),
  );

  return doc.save();
}


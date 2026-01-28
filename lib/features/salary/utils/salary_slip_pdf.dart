import 'dart:typed_data';

import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart' as pdf_core;
import 'package:pdf/widgets.dart' as pw;

Future<Uint8List> generateSalarySlipPdf({
  required String rekapNumber,
  required String period,
  required String employeeName,
  required int monthlySalary,
  required double workHoursPerDay,
  required int overtime,
  required int latePenalty,
  required int absencePenalty,
  required int kasbonCut,
  required int netSalary,
  required int mealAllowancePerDay,
  required int transportAllowancePerDay,
  required int clockInCount,
}) async {
  final doc = pw.Document();
  final kopBytes = await rootBundle.load('assets/KOP.png');
  final kopImage = pw.MemoryImage(kopBytes.buffer.asUint8List());
  final fontRegular = pw.Font.ttf(await rootBundle.load('assets/Roboto-Regular.ttf'));
  final fontBold = pw.Font.ttf(await rootBundle.load('assets/Roboto-Bold.ttf'));
  final fontLight = pw.Font.ttf(await rootBundle.load('assets/Roboto-Light.ttf'));

  final pw.TextStyle headingStyle = pw.TextStyle(font: fontBold, fontSize: 12);
  final pw.TextStyle normalStyle = pw.TextStyle(font: fontRegular, fontSize: 11);
  final pw.TextStyle warnStyle = pw.TextStyle(font: fontBold, fontSize: 11, color: pdf_core.PdfColors.red);
  final pw.TextStyle italicStyle = pw.TextStyle(font: fontLight, fontSize: 10, fontStyle: pw.FontStyle.italic);

  final totalMealAllowance = mealAllowancePerDay * clockInCount;
  final totalTransportAllowance = transportAllowancePerDay * clockInCount;
  final totalAllowances = totalMealAllowance + totalTransportAllowance;
  final computedNetSalary =
      monthlySalary + overtime - latePenalty - absencePenalty - kasbonCut;
  final totalNetIncome = computedNetSalary + totalAllowances;

  doc.addPage(
    pw.Page(
      pageTheme: pw.PageTheme(
        pageFormat: pdf_core.PdfPageFormat.a4,
        margin: const pw.EdgeInsets.fromLTRB(36, 96, 36, 40),
        buildBackground: (context) => pw.FullPage(
          ignoreMargins: true,
          child: pw.Image(kopImage, fit: pw.BoxFit.cover),
        ),
      ),
      build: (context) {
        const sectionSpacing = 12.0;
        return pw.Column(
          crossAxisAlignment: pw.CrossAxisAlignment.start,
          children: [
            pw.SizedBox(height: 30),
            pw.Row(
              mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
              children: [
                pw.Text('No. Rekap : $rekapNumber', style: headingStyle),
                pw.Text('Periode : $period', style: headingStyle),
              ],
            ),
            pw.Divider(),
            pw.Padding(
              padding: const pw.EdgeInsets.only(top: 12),
              child: pw.Column(
                crossAxisAlignment: pw.CrossAxisAlignment.start,
                children: [
                  pw.Center(
                    child: pw.Text(
                      'PERINGATAN: INFORMASI INI HANYA UNTUK YANG BERSANGKUTAN',
                      style: warnStyle,
                    ),
                  ),
                  pw.SizedBox(height: sectionSpacing),
                  pw.Text('INFORMASI UTAMA', style: headingStyle),
                  pw.SizedBox(height: 6),
                  pw.Table(
                    columnWidths: const {
                      0: pw.FlexColumnWidth(2),
                      1: pw.FlexColumnWidth(4),
                    },
                    children: [
                      _buildInfoRow('Nama', employeeName, normalStyle),
                      _buildInfoRow('Gaji Pokok', _formatCurrency(monthlySalary), normalStyle),
                      _buildInfoRow('Jam kerja / Hari', '${workHoursPerDay.toStringAsFixed(1)} jam', normalStyle),
                    ],
                  ),
                  pw.SizedBox(height: sectionSpacing),
                  pw.Text('GAJI BULANAN', style: headingStyle),
                  pw.SizedBox(height: 6),
                  pw.Table(
                    columnWidths: const {
                      0: pw.FlexColumnWidth(3),
                      1: pw.FlexColumnWidth(3),
                    },
                    children: [
                      _buildInfoRow('Gaji Pokok', _formatCurrency(monthlySalary), normalStyle),
                      _buildInfoRow('Lembur', _formatCurrency(overtime), normalStyle),
                      _buildInfoRow('Potongan telat', _formatCurrency(latePenalty), normalStyle),
                      _buildInfoRow('Potongan tidak hadir', _formatCurrency(absencePenalty), normalStyle),
                      _buildInfoRow('Potongan Kasbon', _formatCurrency(kasbonCut), normalStyle),
                    ],
                  ),
                  pw.SizedBox(height: 6),
                  pw.Text('Gaji bersih yang di terima', style: normalStyle),
                  pw.Text(
                    _formatCurrency(computedNetSalary),
                    style: pw.TextStyle(font: fontBold, fontSize: 14),
                  ),
                  pw.SizedBox(height: 4),
                  pw.Text('*Dihitung otomatis oleh sistem berdasarkan aturan jam masuk', style: normalStyle),
                  pw.SizedBox(height: sectionSpacing),
                  pw.Text('TUNJANGAN HARIAN', style: headingStyle),
                  pw.SizedBox(height: 6),
                  pw.Table(
                    columnWidths: const {
                      0: pw.FlexColumnWidth(4),
                      1: pw.FlexColumnWidth(2),
                    },
                    children: [
                      _buildInfoRow(
                        'Tunjangan Makan :',
                        '$clockInCount x ${_formatCurrency(mealAllowancePerDay)} = ${_formatCurrency(totalMealAllowance)}',
                        normalStyle,
                      ),
                      _buildInfoRow(
                        'Tunjangan Transport :',
                        '$clockInCount x ${_formatCurrency(transportAllowancePerDay)} = ${_formatCurrency(totalTransportAllowance)}',
                        normalStyle,
                      ),
                    ],
                  ),
                  pw.SizedBox(height: 6),
                  pw.Text('*uang harian sudah diberikan setiap hari selama kamu aktif clockin', style: normalStyle),
                  pw.Text('(kebutuhan makan secara real kadang melebihi ketentuan)', style: italicStyle),
                  pw.SizedBox(height: sectionSpacing),
                  pw.Text('TOTAL NILAI PENDAPATAN', style: headingStyle),
                  pw.SizedBox(height: 6),
                  pw.Table(
                    columnWidths: const {
                      0: pw.FlexColumnWidth(3),
                      1: pw.FlexColumnWidth(3),
                    },
                    children: [
                      _buildInfoRow('Gaji bersih yang di terima', _formatCurrency(computedNetSalary), normalStyle),
                      _buildInfoRow('Tunjangan Makan', _formatCurrency(totalMealAllowance), normalStyle),
                      _buildInfoRow('Tunjangan Transport', _formatCurrency(totalTransportAllowance), normalStyle),
                      _buildInfoRow('TOTAL nilai pendapatan', _formatCurrency(totalNetIncome), normalStyle),
                    ],
                  ),
                  pw.SizedBox(height: sectionSpacing + 4),
                  pw.Center(
                    child: pw.Text(
                      '"Kerjo bareng ing LABALABA.ADV iki ora mung kanggo kantor, tapi kanggo awakmu juga, Rezeki sing kamu tompo saben dino lan saben akhir bulan sejatine yaiku balikane jerih payahmu."',
                      textAlign: pw.TextAlign.center,
                      style: italicStyle,
                    ),
                  ),
                  pw.SizedBox(height: 4),
                  pw.Center(
                    child: pw.Text('Maturnuwun wis dadi bagian penting nang keluarga cilik iki', style: normalStyle),
                  ),
                  pw.SizedBox(height: 16),
                  pw.Center(
                    child: pw.Text('LABALABA.ADV', style: pw.TextStyle(font: fontBold)),
                  ),
                ],
              ),
            ),
          ],
        );
      },
    ),
  );
  return doc.save();
}

pw.TableRow _buildInfoRow(String label, String value, pw.TextStyle style) {
  return pw.TableRow(
    children: [
      pw.Padding(
        padding: const pw.EdgeInsets.symmetric(vertical: 4),
        child: pw.Align(
          alignment: pw.Alignment.centerLeft,
          child: pw.Text(label, style: style),
        ),
      ),
      pw.Padding(
        padding: const pw.EdgeInsets.symmetric(vertical: 2),
        child: pw.Align(
          alignment: pw.Alignment.centerRight,
          child: pw.Text(value, style: style),
        ),
      ),
    ],
  );
}

String _formatCurrency(int value) {
  final formatter =
      NumberFormat.currency(locale: 'id', symbol: 'Rp ', decimalDigits: 0);
  return formatter.format(value);
}


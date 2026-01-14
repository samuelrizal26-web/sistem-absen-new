import 'dart:typed_data';

import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;

Future<Uint8List> generateSalarySlipPdf({
  required String rekapNumber,
  required String period,
  required String employeeName,
  required int salaryNormal,
  required int salaryOvertime,
  required int totalSalary,
  required int latePenalty,
  required int absencePenalty,
  required int kasbonCut,
  required int mealAllowance,
  required int transportAllowance,
}) async {
  final doc = pw.Document();
  final kopImageData = await rootBundle.load('assets/KOP.png');
  final fontRegular = pw.Font.ttf(await rootBundle.load('assets/Roboto-Regular.ttf'));
  final fontBold = pw.Font.ttf(await rootBundle.load('assets/Roboto-Bold.ttf'));
  final fontLight = pw.Font.ttf(await rootBundle.load('assets/Roboto-Light.ttf'));
  final bgImage = pw.MemoryImage(kopImageData.buffer.asUint8List());

  final pw.TextStyle headingStyle = pw.TextStyle(font: fontBold, fontSize: 12);
  final pw.TextStyle normalStyle = pw.TextStyle(font: fontRegular, fontSize: 11);
  final pw.TextStyle warnStyle = pw.TextStyle(
    font: fontBold,
    fontSize: 11,
    color: PdfColors.red,
  );
  final pw.TextStyle italicStyle = pw.TextStyle(font: fontLight, fontSize: 10, fontStyle: pw.FontStyle.italic);

  doc.addPage(
    pw.Page(
      pageTheme: pw.PageTheme(
        pageFormat: PdfPageFormat.a4,
        margin: pw.EdgeInsets.zero,
      ),
      build: (context) {
        return pw.FullPage(
          ignoreMargins: true,
          child: pw.Stack(
            children: [
              pw.Positioned.fill(child: pw.Image(bgImage, fit: pw.BoxFit.cover)),
              pw.Padding(
                padding: const pw.EdgeInsets.fromLTRB(36, 64, 36, 40),
                child: pw.Column(
                  crossAxisAlignment: pw.CrossAxisAlignment.start,
                  children: [
                    pw.Row(
                      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
                      children: [
                        pw.Text('No. Rekap : $rekapNumber', style: headingStyle),
                        pw.Text('Periode : $period', style: headingStyle),
                      ],
                    ),
                    pw.SizedBox(height: 12),
                    pw.Text('Document ini bersifat pribadi', style: normalStyle),
                    pw.Text('hanya dikirim kepada yang bersangkutan', style: normalStyle),
                    pw.SizedBox(height: 12),
                    pw.Text('INFORMASI UTAMA', style: headingStyle),
                    pw.SizedBox(height: 6),
                    pw.Text('Nama\t\t: $employeeName', style: normalStyle),
                    pw.Text('Gaji Kerja Normal\t\t: ${_formatCurrency(salaryNormal)}', style: normalStyle),
                    pw.Text('Jam kerja/ Hari\t\t: -', style: normalStyle),
                    pw.SizedBox(height: 12),
                    pw.Text('GAJI BULANAN', style: headingStyle),
                    pw.SizedBox(height: 6),
                    pw.Text('Gaji Kerja Normal\t\t: ${_formatCurrency(salaryNormal)}', style: normalStyle),
                    pw.Text('Lembur\t\t: ${_formatCurrency(salaryOvertime)}', style: normalStyle),
                    pw.Text('Potongan telat\t\t: ${_formatCurrency(latePenalty)}', style: normalStyle),
                    pw.Text('Potongan tidak hadir\t\t: ${_formatCurrency(absencePenalty)}', style: normalStyle),
                    pw.Text('Potongan Kasbon\t\t: ${_formatCurrency(kasbonCut)}', style: normalStyle),
                    pw.SizedBox(height: 6),
                    pw.Text('Gaji bersih yang di terima', style: normalStyle),
                    pw.Text(
                      _formatCurrency(totalSalary),
                      style: pw.TextStyle(font: fontBold, fontSize: 14),
                    ),
                    pw.SizedBox(height: 4),
                    pw.Text('*Dihitung otomatis oleh sistem berdasarkan aturan jam masuk', style: normalStyle),
                    pw.SizedBox(height: 8),
                    pw.Text('TUNJANGAN HARIAN', style: headingStyle),
                    pw.SizedBox(height: 6),
                    pw.Text('Uang Makan\t\t: ${_formatCurrency(mealAllowance)}', style: normalStyle),
                    pw.Text('Uang Transport\t\t: ${_formatCurrency(transportAllowance)}', style: normalStyle),
                    pw.SizedBox(height: 4),
                    pw.Text('*uang harian sudah diberikan setiap hari selama kamu aktif clockin', style: normalStyle),
                    pw.Text('(kebutuhan makan secara real kadang melebihi ketentuan)', style: italicStyle),
                    pw.SizedBox(height: 12),
                    pw.Text('TOTAL NILAI PENDAPATAN', style: headingStyle),
                    pw.SizedBox(height: 6),
                    pw.Text(
                      'Total Pendapatan\t\t: ${_formatCurrency(totalSalary)}',
                      style: normalStyle,
                    ),
                    pw.Text('Tunjangan Makan\t\t: ${_formatCurrency(mealAllowance)}', style: normalStyle),
                    pw.Text('Tunjangan Transport\t\t: ${_formatCurrency(transportAllowance)}', style: normalStyle),
                    pw.Text(
                      'TOTAL nilai pendapatan\t\t: ${_formatCurrency(totalSalary + mealAllowance + transportAllowance)}',
                      style: normalStyle,
                    ),
                    pw.SizedBox(height: 16),
                    pw.Text('PERINGATAN: INFORMASI INI HANYA UNTUK YANG BERSANGKUTAN', style: warnStyle),
                    pw.SizedBox(height: 16),
                    pw.Center(
                      child: pw.Text(
                        '"Kerjo bareng ing LABALABA.ADV iki ora mung kanggo kantor, tapi kanggo awakmu juga..."',
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
          ),
        );
      },
    ),
  );
  return doc.save();
}

String _formatCurrency(int value) {
  final formatter = NumberFormat.currency(locale: 'id', symbol: 'Rp ', decimalDigits: 0);
  return formatter.format(value);
}


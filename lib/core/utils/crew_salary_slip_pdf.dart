import 'dart:typed_data';

import 'package:flutter/services.dart';
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
  final kopData = await rootBundle.load('assets/KOP.png');
  final kopImage = pw.MemoryImage(kopData.buffer.asUint8List());
  final regularFont = pw.Font.ttf(await rootBundle.load('assets/Roboto-Regular.ttf'));
  final boldFont = pw.Font.ttf(await rootBundle.load('assets/Roboto-Bold.ttf'));

  doc.addPage(
    pw.MultiPage(
      pageFormat: PdfPageFormat.a4,
      margin: const pw.EdgeInsets.all(24),
      build: (context) {
        return [
        pw.Stack(
          children: [
            pw.Image(kopImage, fit: pw.BoxFit.cover, width: double.infinity),
            pw.Positioned(
              left: 16,
              top: 8,
              child: pw.Text('Slip Gaji', style: pw.TextStyle(font: boldFont, fontSize: 24, color: PdfColors.white)),
            ),
          ],
        ),
        pw.SizedBox(height: 12),
        pw.Text('No. Rekap :', style: pw.TextStyle(font: boldFont)),
        pw.Text(
          'Periode : $periodLabel',
          style: pw.TextStyle(font: regularFont, color: PdfColors.grey700),
        ),
        pw.SizedBox(height: 12),
        pw.Text('Document ini bersifat pribadi', style: pw.TextStyle(font: regularFont)),
        pw.Text('hanya dikirim kepada yang bersangkutan', style: pw.TextStyle(font: regularFont)),
        pw.SizedBox(height: 8),
        pw.Text('INFORMASI UTAMA', style: pw.TextStyle(font: boldFont)),
        _infoRow('Nama', employeeName, boldFont, regularFont),
        _infoRow('Gaji Pokok', currency.format(totalSalary), boldFont, regularFont),
        _infoRow('Jam kerja/ Hari', '${totalHours.toStringAsFixed(1)} jam', boldFont, regularFont),
        pw.SizedBox(height: 12),
        pw.Text('GAJI BULANAN', style: pw.TextStyle(font: boldFont)),
        _infoRow('Gaji Pokok', currency.format(totalSalary), boldFont, regularFont),
        _infoRow('Overtime', '-', boldFont, regularFont),
        _infoRow('Potongan telat', '-', boldFont, regularFont),
        _infoRow('Potongan tidak hadir', '-', boldFont, regularFont),
        _infoRow('Potongan Kasbon', currency.format(totalKasbon), boldFont, regularFont),
        pw.SizedBox(height: 12),
        pw.Text('Gaji bersih yang di terima', style: pw.TextStyle(font: regularFont)),
        pw.Text('Rp. ${currency.format(netSalary)}', style: pw.TextStyle(font: boldFont, fontSize: 18)),
        pw.SizedBox(height: 6),
        pw.Text('*Dihitung otomatis oleh sistem berdasarkan aturan jam masuk', style: pw.TextStyle(font: regularFont, fontSize: 10)),
        pw.SizedBox(height: 12),
        pw.Text('TUNJANGAN HARIAN', style: pw.TextStyle(font: boldFont)),
        _infoRow('Uang Makan', '-', boldFont, regularFont),
        _infoRow('Uang Transport', '-', boldFont, regularFont),
        pw.SizedBox(height: 6),
        pw.Text('*uang harian sudah diberikan setiap hari selama kamu aktif clockin', style: pw.TextStyle(font: regularFont, fontSize: 10)),
        pw.Text('(kebutuhan makan secara real kadang melebihi ketentuan)', style: pw.TextStyle(font: regularFont, fontSize: 10)),
        pw.SizedBox(height: 12),
        pw.Text('TOTAL NILAI PENDAPATAN', style: pw.TextStyle(font: boldFont)),
        _infoRow('Gaji bersih yang di terima', currency.format(netSalary), boldFont, regularFont),
        _infoRow('Tunjangan Makan', '-', boldFont, regularFont),
        _infoRow('Tunjangan Transport', '-', boldFont, regularFont),
        _infoRow('TOTAL nilai pendapatan', currency.format(netSalary), boldFont, regularFont),
        pw.SizedBox(height: 24),
        pw.Text(
          '"Kerjo bareng ing LABALABA.ADV iki ora mung kanggo kantor, tapi kanggo awakmu juga, Rezeki sing kamu tompo saben dino lan saben akhir bulan sejatine yaiku balikane jerih payahmu."',
          style: pw.TextStyle(font: regularFont, fontSize: 10),
        ),
        pw.SizedBox(height: 12),
        pw.Text('Maturnuwun wis dadi bagian penting nang keluarga cilik iki', style: pw.TextStyle(font: regularFont, fontSize: 10)),
        pw.SizedBox(height: 4),
        pw.Text('LABALABA.ADV', style: pw.TextStyle(font: boldFont)),
        ];
      },
    ),
  );

  return doc.save();
}

pw.Widget _infoRow(String label, String value, pw.Font boldFont, pw.Font regularFont) {
  return pw.Padding(
    padding: const pw.EdgeInsets.symmetric(vertical: 4),
    child: pw.Row(
      mainAxisAlignment: pw.MainAxisAlignment.spaceBetween,
      children: [
        pw.Text(label, style: pw.TextStyle(font: boldFont)),
        pw.Text(value, style: pw.TextStyle(font: regularFont)),
      ],
    ),
  );
}


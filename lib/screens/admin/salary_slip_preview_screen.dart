import 'package:flutter/material.dart';
import 'dart:io';
import 'package:intl/intl.dart';
import 'package:path/path.dart' as p;

import 'package:sistem_absen_flutter_v2/features/salary/utils/salary_slip_pdf.dart';

class SalarySlipPreviewScreen extends StatefulWidget {
  const SalarySlipPreviewScreen({super.key});

  @override
  State<SalarySlipPreviewScreen> createState() => _SalarySlipPreviewScreenState();
}

class _SalarySlipPreviewScreenState extends State<SalarySlipPreviewScreen> {
  final _nameController = TextEditingController();
  final _periodController = TextEditingController();
  final _rekapController = TextEditingController();
  final _salaryController = TextEditingController();
  final _deductionController = TextEditingController();
  final _overtimeController = TextEditingController(text: '0');
  final _lateController = TextEditingController(text: '0');
  final _absenceController = TextEditingController(text: '0');
  final _mealController = TextEditingController(text: '0');
  final _transportController = TextEditingController(text: '0');

  double _parseCurrency(String value) {
    final cleaned = value.replaceAll(RegExp(r'[^\d]'), '');
    return double.tryParse(cleaned) ?? 0;
  }

  String _formatCurrency(double value) {
    final formatter = NumberFormat.currency(locale: 'id', symbol: 'Rp ', decimalDigits: 0);
    return formatter.format(value);
  }

  double get _takeHome {
    final salary = _parseCurrency(_salaryController.text);
    final deduction = _parseCurrency(_deductionController.text);
    final overtime = _parseCurrency(_overtimeController.text);
    final latePenalty = _parseCurrency(_lateController.text);
    final absencePenalty = _parseCurrency(_absenceController.text);
    final meal = _parseCurrency(_mealController.text);
    final transport = _parseCurrency(_transportController.text);
    return (salary + overtime - latePenalty - absencePenalty - deduction + meal + transport).clamp(0, double.infinity);
  }

  Future<void> _exportPdf() async {
    final name = _nameController.text.trim();
    final period = _periodController.text.trim();
    final rekap = _rekapController.text.trim();
    final salary = _parseCurrency(_salaryController.text);
    final kasbon = _parseCurrency(_deductionController.text);
    final overtime = _parseCurrency(_overtimeController.text);
    final latePenalty = _parseCurrency(_lateController.text);
    final absencePenalty = _parseCurrency(_absenceController.text);
    final meal = _parseCurrency(_mealController.text);
    final transport = _parseCurrency(_transportController.text);
    final takeHome = _takeHome;
    if (name.isEmpty || period.isEmpty || rekap.isEmpty || salary <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Lengkapi nama, periode, rekap, dan gaji terlebih dahulu')),
      );
      return;
    }
    final bytes = await generateSalarySlipPdf(
      rekapNumber: rekap,
      period: period,
      employeeName: name,
      salaryNormal: salary.toInt(),
      salaryOvertime: overtime.toInt(),
      totalSalary: takeHome.toInt(),
      latePenalty: latePenalty.toInt(),
      absencePenalty: absencePenalty.toInt(),
      kasbonCut: kasbon.toInt(),
      mealAllowance: meal.toInt(),
      transportAllowance: transport.toInt(),
    );
    final downloads = Directory('/storage/emulated/0/Download');
    final sanitizedName = name.replaceAll(RegExp(r'[^a-zA-Z0-9_-]+'), '_');
    final sanitizedPeriod = period.replaceAll(RegExp(r'[^a-zA-Z0-9_-]+'), '_');
    final filePath = p.join(downloads.path, 'Slip_Gaji_${sanitizedName}_$sanitizedPeriod.pdf');
    final file = File(filePath);
    await file.writeAsBytes(bytes, flush: true);
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Slip gaji tersimpan: $filePath'), backgroundColor: Colors.green),
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _periodController.dispose();
    _rekapController.dispose();
    _salaryController.dispose();
    _deductionController.dispose();
    _overtimeController.dispose();
    _lateController.dispose();
    _absenceController.dispose();
    _mealController.dispose();
    _transportController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      appBar: AppBar(
        title: const Text('Preview Salary Slip'),
        backgroundColor: const Color(0xFF0A4D68),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Card(
          elevation: 4,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Input data untuk melihat take home pay', style: TextStyle(color: Colors.black54)),
                const SizedBox(height: 12),
                TextField(
                  controller: _nameController,
                  decoration: const InputDecoration(
                    labelText: 'Nama Pegawai',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _periodController,
                  decoration: const InputDecoration(
                    labelText: 'Periode',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _rekapController,
                  decoration: const InputDecoration(
                    labelText: 'No. Rekap',
                    border: OutlineInputBorder(),
                  ),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _salaryController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Salary Amount (Rp)',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _deductionController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Total Kasbon Deduction (Rp)',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _overtimeController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Overtime (Rp)',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _lateController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Potongan Telat (Rp)',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _absenceController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Potongan Tidak Hadir (Rp)',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _mealController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Tunjangan Makan (Rp)',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _transportController,
                  keyboardType: TextInputType.number,
                  decoration: const InputDecoration(
                    labelText: 'Tunjangan Transport (Rp)',
                    border: OutlineInputBorder(),
                  ),
                  onChanged: (_) => setState(() {}),
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(12),
                    color: Colors.grey.shade100,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Take Home Pay', style: TextStyle(color: Colors.black54)),
                      const SizedBox(height: 8),
                      Text(
                        _formatCurrency(_takeHome),
                        style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),
                ElevatedButton.icon(
                  onPressed: _exportPdf,
                  icon: const Icon(Icons.picture_as_pdf),
                  label: const Text('Export PDF'),
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF0A4D68)),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}


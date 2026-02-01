import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;

import 'package:sistem_absen_flutter_v2/models/employee.dart';
import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';
import 'package:sistem_absen_flutter_v2/services/cash_drawer_service.dart';

class KasbonFormScreen extends StatefulWidget {
  final Employee employee;

  const KasbonFormScreen({super.key, required this.employee});

  @override
  State<KasbonFormScreen> createState() => _KasbonFormScreenState();
}

class _KasbonFormScreenState extends State<KasbonFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nominalController = TextEditingController();
  final _notesController = TextEditingController();
  String? _selectedMethod;
  bool _isSubmitting = false;

  @override
  void dispose() {
    _nominalController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _submitKasbon() async {
    if (_isSubmitting) return;
    if (!_formKey.currentState!.validate()) return;
    final raw = _nominalController.text.replaceAll(RegExp(r'[^\d]'), '');
    final amount = double.tryParse(raw) ?? 0;
    if (amount <= 0) return;
    final method = _selectedMethod;
    if (method == null) return;

    final noteValue = _notesController.text.trim();
    setState(() => _isSubmitting = true);
    try {
      final response = await http.post(
        Uri.parse('https://sistem-absen-production.up.railway.app/api/advances'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({
          'employee_id': widget.employee.employeeId,
          'crew_id': widget.employee.employeeId,
          'amount': amount,
          'payment_method': method,
          'notes': noteValue.isNotEmpty ? noteValue : 'Kasbon crew: ${widget.employee.name}',
        }),
      );
      if (response.statusCode != 200) {
        final error = json.decode(response.body);
        throw Exception(error['detail'] ?? 'Gagal mengajukan kasbon');
      }

      if (method == 'cash') {
        await ApiService.createCashflow({
          'type': 'pengeluaran',
          'method': 'cash',
          'amount': amount,
          'date': DateTime.now().toIso8601String().split('T').first,
          'category': 'kasbon',
          'description': 'Kasbon crew: ${widget.employee.name}',
          'notes': noteValue.isNotEmpty ? noteValue : 'Kasbon crew: ${widget.employee.name}',
        });
        final opened = await CashDrawerService.open();
        if (!opened && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Laci kas gagal terbuka'), backgroundColor: Colors.orange),
          );
        }
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kasbon berhasil diajukan'), backgroundColor: Colors.green),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A4D68),
        title: const Text('Form Kasbon'),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text('Masukkan Nominal', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _nominalController,
                        keyboardType: TextInputType.number,
                        inputFormatters: [
                          FilteringTextInputFormatter.digitsOnly,
                        ],
                        decoration: const InputDecoration(
                          hintText: 'Contoh: 50000',
                          prefixText: 'Rp ',
                          border: OutlineInputBorder(),
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Nominal tidak boleh kosong';
                          }
                          final numeric = double.tryParse(value.replaceAll(RegExp(r'[^\d]'), ''));
                          if (numeric == null || numeric <= 0) {
                            return 'Nominal harus lebih dari 0';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      const Text('Catatan (optional)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _notesController,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          hintText: 'Misalnya: Keperluan makan siang',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      DropdownButtonFormField<String>(
                        value: _selectedMethod,
                        decoration: const InputDecoration(
                          labelText: 'Metode Pembayaran',
                          border: OutlineInputBorder(),
                        ),
                        hint: const Text('Pilih metode pembayaran'),
                        items: const [
                          DropdownMenuItem(value: 'cash', child: Text('Cash')),
                          DropdownMenuItem(value: 'transfer', child: Text('Transfer')),
                        ],
                        onChanged: (value) => setState(() => _selectedMethod = value),
                        validator: (value) => value == null ? 'Pilih metode pembayaran' : null,
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),
              _isSubmitting
                  ? const Center(child: CircularProgressIndicator())
                  : ElevatedButton(
                      onPressed: _submitKasbon,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF0A4D68),
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      ),
                      child: const Text('Ajukan Kasbon', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}

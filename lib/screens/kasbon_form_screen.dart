import 'package:flutter/material.dart';
import 'package:sistem_absen_flutter_v2/models/employee.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class KasbonFormScreen extends StatefulWidget {
  final Employee employee;

  const KasbonFormScreen({super.key, required this.employee});

  @override
  State<KasbonFormScreen> createState() => _KasbonFormScreenState();
}

class _KasbonFormScreenState extends State<KasbonFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final TextEditingController _nominalController = TextEditingController();
  final TextEditingController _catatanController = TextEditingController();
  bool _isSubmitting = false;

  Future<void> _submitKasbon() async {
    if (!_formKey.currentState!.validate()) {
      return;
    }

    setState(() { _isSubmitting = true; });

    try {
      final url = Uri.parse('https://sistem-absen-production.up.railway.app/api/advances');
      final requestBody = json.encode({
        'employee_id': widget.employee.employeeId,
        'amount': int.parse(_nominalController.text),
        'reason': _catatanController.text,
      });

      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: requestBody,
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pengajuan kasbon berhasil!'), backgroundColor: Colors.green),
        );
        Navigator.of(context).pop();
      } else {
        final errorBody = json.decode(response.body);
        throw Exception(errorBody['detail'] ?? 'Gagal mengajukan kasbon');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) {
        setState(() { _isSubmitting = false; });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A4D68),
        title: const Text('Form Kasbon', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Card(
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Masukkan Nominal',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _nominalController,
                        keyboardType: TextInputType.number,
                        decoration: const InputDecoration(
                          hintText: 'Contoh: 50000',
                          border: OutlineInputBorder(),
                          prefixText: 'Rp ',
                        ),
                        validator: (value) {
                          if (value == null || value.isEmpty) {
                            return 'Nominal tidak boleh kosong';
                          }
                          if (int.tryParse(value) == null) {
                            return 'Nominal harus berupa angka';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 24),
                      const Text(
                        'Catatan (Opsional)',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _catatanController,
                        maxLines: 3,
                        decoration: const InputDecoration(
                          hintText: 'Keperluan mendadak...',
                          border: OutlineInputBorder(),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 32),
              _isSubmitting
                  ? const Center(child: CircularProgressIndicator())
                  : ElevatedButton.icon(
                      onPressed: _submitKasbon,
                      icon: const Icon(Icons.send, color: Colors.white),
                      label: const Text('AJUKAN KASBON', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Theme.of(context).primaryColor,
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
            ],
          ),
        ),
      ),
    );
  }
}





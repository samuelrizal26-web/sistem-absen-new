import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

class CashflowFormModal extends StatefulWidget {
  const CashflowFormModal({super.key});

  @override
  State<CashflowFormModal> createState() => _CashflowFormModalState();
}

class _CashflowFormModalState extends State<CashflowFormModal> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _notesController = TextEditingController();
  final _dateFormatter = DateFormat('yyyy-MM-dd');
  DateTime _selectedDate = DateTime.now();
  String _selectedType = 'Pemasukan';
  String _selectedMethod = 'cash';
  bool _isSubmitting = false;
  late final TextEditingController _dateController;

  @override
  void initState() {
    super.initState();
    _dateController = TextEditingController(text: _selectedDate.toIso8601String().split('T').first);
  }

  @override
  void dispose() {
    _amountController.dispose();
    _notesController.dispose();
    _dateController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() {
        _selectedDate = picked;
        _dateController.text = _selectedDate.toIso8601String().split('T').first;
      });
    }
  }

  Future<void> _submit() async {
    if (_isSubmitting) return;
    if (!_formKey.currentState!.validate()) return;

    final rawAmount = _amountController.text.replaceAll(RegExp(r'[^\d]'), '');
    final amount = double.tryParse(rawAmount) ?? 0;
    if (amount <= 0) return;

    setState(() => _isSubmitting = true);

    final payload = {
      'date': _dateFormatter.format(_selectedDate),
      'category': _selectedType == 'Pemasukan' ? 'income' : 'expense',
      'amount': amount,
      'description': _notesController.text.trim().isNotEmpty
          ? _notesController.text.trim()
          : _selectedType,
      'payment_method':
          _selectedType == 'Pemasukan' ? _selectedMethod : 'cash',
    };
    if (_notesController.text.trim().isNotEmpty) {
      payload['notes'] = _notesController.text.trim();
    }

    try {
      await ApiService.createCashflow(payload);
      if (!mounted) return;
      Navigator.pop(
        context,
        {
          'type': _selectedType,
          'method': _selectedType == 'Pemasukan' ? _selectedMethod : 'cash',
        },
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal menyimpan cashflow: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: SingleChildScrollView(
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text('Catat Cashflow',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                const SizedBox(height: 12),
                TextFormField(
                  readOnly: true,
                  onTap: _pickDate,
                  decoration: InputDecoration(
                    labelText: 'Tanggal',
                    border: const OutlineInputBorder(),
                    suffixIcon: const Icon(Icons.calendar_today),
                  ),
                  controller: _dateController,
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<String>(
                  value: _selectedType,
                  decoration: const InputDecoration(
                    labelText: 'Tipe',
                    border: OutlineInputBorder(),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'Pemasukan', child: Text('Pemasukan')),
                    DropdownMenuItem(value: 'Pengeluaran', child: Text('Pengeluaran')),
                  ],
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() {
                      _selectedType = value;
                      if (value == 'Pengeluaran') {
                        _selectedMethod = 'cash';
                      }
                    });
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _amountController,
                  keyboardType: TextInputType.number,
                  inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                  decoration: const InputDecoration(
                    labelText: 'Jumlah (Rp)',
                    border: OutlineInputBorder(),
                  ),
                  validator: (value) {
                    final cleaned = (value ?? '').replaceAll(RegExp(r'[^\d]'), '');
                    final numeric = double.tryParse(cleaned) ?? 0;
                    if (numeric <= 0) {
                      return 'Jumlah wajib lebih dari 0';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 12),
                if (_selectedType == 'Pemasukan') ...[
                  DropdownButtonFormField<String>(
                    value: _selectedMethod,
                    decoration: const InputDecoration(
                      labelText: 'Metode',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'cash', child: Text('Cash')),
                      DropdownMenuItem(value: 'transfer', child: Text('Transfer')),
                    ],
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() => _selectedMethod = value);
                    },
                  ),
                  const SizedBox(height: 12),
                ],
                TextFormField(
                  controller: _notesController,
                  decoration: const InputDecoration(
                    labelText: 'Catatan (opsional)',
                    border: OutlineInputBorder(),
                  ),
                  maxLines: 3,
                ),
                const SizedBox(height: 16),
                ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: Text(_isSubmitting ? 'Menyimpan...' : 'Simpan Cashflow'),
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

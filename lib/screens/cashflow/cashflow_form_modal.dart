import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';
import 'package:sistem_absen_flutter_v2/services/cash_drawer_service.dart';

class CashflowFormModal extends StatefulWidget {
  const CashflowFormModal({super.key});

  @override
  State<CashflowFormModal> createState() => _CashflowFormModalState();
}

class _CashflowFormModalState extends State<CashflowFormModal> {
  final _formKey = GlobalKey<FormState>();
  final _dateController = TextEditingController();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  String _type = 'income';
  String _method = 'cash';
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _dateController.text = DateFormat('dd MMM yyyy', 'id_ID').format(_selectedDate);
  }

  @override
  void dispose() {
    _dateController.dispose();
    _amountController.dispose();
    _noteController.dispose();
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
        _dateController.text = DateFormat('dd MMM yyyy', 'id_ID').format(picked);
      });
    }
  }

  Future<void> _save() async {
    if (_isSubmitting) return;
    if (!_formKey.currentState!.validate()) return;
    final raw = _amountController.text.replaceAll(RegExp(r'[^\d]'), '');
    final amount = double.tryParse(raw) ?? 0;
    if (amount <= 0) return;

    setState(() => _isSubmitting = true);
    try {
      final noteValue = _noteController.text.trim();
      final payload = <String, dynamic>{
        'date': DateFormat('yyyy-MM-dd').format(_selectedDate),
        'category': _type,
        'amount': amount,
        'description': noteValue.isNotEmpty
            ? noteValue
            : (_type == 'income' ? 'Pemasukan' : 'Pengeluaran'),
        'payment_method': _type == 'income' ? _method : 'cash',
        if (noteValue.isNotEmpty) 'notes': noteValue,
      };
      await ApiService.createCashflow(payload);

      final shouldOpenDrawer = _type == 'expense' || (_type == 'income' && _method == 'cash');
      if (shouldOpenDrawer) {
        await CashDrawerService.open();
      }

      if (!mounted) return;
      Navigator.pop(context, {
        'type': _type,
        'method': _type == 'income' ? _method : 'cash',
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal menyimpan cashflow: $e'), backgroundColor: Colors.red),
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
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text('Catat Cashflow', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              TextFormField(
                readOnly: true,
                controller: _dateController,
                onTap: _pickDate,
                decoration: InputDecoration(
                  labelText: 'Tanggal',
                  hintText: 'Pilih tanggal transaksi',
                  border: const OutlineInputBorder(),
                  suffixIcon: const Icon(Icons.calendar_today),
                ),
                validator: (value) => (value?.isNotEmpty ?? false) ? null : 'Tanggal wajib diisi',
              ),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _type,
                decoration: const InputDecoration(
                  labelText: 'Tipe',
                  border: OutlineInputBorder(),
                ),
                items: const [
                  DropdownMenuItem(value: 'income', child: Text('Pemasukan')),
                  DropdownMenuItem(value: 'expense', child: Text('Pengeluaran')),
                ],
                onChanged: (value) {
                  if (value == null) return;
                  setState(() {
                    _type = value;
                    if (_type == 'expense') {
                      _method = 'cash';
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
              TextFormField(
                controller: _noteController,
                decoration: const InputDecoration(
                  labelText: 'Catatan',
                  hintText: 'Keterangan transaksi (opsional)',
                  border: OutlineInputBorder(),
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 12),
              if (_type == 'income')
                DropdownButtonFormField<String>(
                  value: _method,
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
                    setState(() => _method = value);
                  },
                ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: _isSubmitting ? null : _save,
                child: Text(_isSubmitting ? 'Menyimpan...' : 'Simpan Cashflow'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

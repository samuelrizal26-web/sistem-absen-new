import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';
import 'package:sistem_absen_flutter_v2/services/cash_drawer_service.dart';

class CashflowFormModal extends StatefulWidget {
  const CashflowFormModal({super.key});

  @override
  State<CashflowFormModal> createState() => _CashflowFormModalState();
}

class _CashflowFormModalState extends State<CashflowFormModal> {
  final _amountController = TextEditingController();
  final _notesController = TextEditingController();
  String _type = 'income';
  String _method = 'cash';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _amountController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    if (_isSubmitting) return;
    final raw = _amountController.text.replaceAll(RegExp(r'[^\d]'), '');
    final amount = double.tryParse(raw) ?? 0;
    if (amount <= 0) return;

    setState(() => _isSubmitting = true);
    try {
      await ApiService.createCashflow({
        'date': DateTime.now().toIso8601String().split('T').first,
        'category': _type,
        'amount': amount,
        'description': _notesController.text.trim().isNotEmpty
            ? _notesController.text.trim()
            : (_type == 'income' ? 'Pemasukan' : 'Pengeluaran'),
        'payment_method': _type == 'income' ? _method : 'cash',
        if (_notesController.text.trim().isNotEmpty)
          'notes': _notesController.text.trim(),
      });

      final shouldOpenDrawer = _type == 'income' && _method == 'cash' || _type == 'expense';
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
        left: 16,
        right: 16,
        top: 24,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
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
          TextField(
            controller: _amountController,
            keyboardType: TextInputType.number,
            inputFormatters: [FilteringTextInputFormatter.digitsOnly],
            decoration: const InputDecoration(
              labelText: 'Jumlah (Rp)',
              border: OutlineInputBorder(),
            ),
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
          const SizedBox(height: 16),
        ],
      ),
    );
  }
}

import 'package:flutter/material.dart';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';
import 'package:sistem_absen_flutter_v2/services/cash_drawer_service.dart';
import 'package:sistem_absen_flutter_v2/screens/cashflow/cashflow_form_modal.dart';
import 'package:sistem_absen_flutter_v2/screens/cashflow/widgets/cashflow_summary_card.dart';
import 'package:sistem_absen_flutter_v2/screens/cashflow/widgets/cashflow_list_item.dart';

class CashflowHomeScreen extends StatefulWidget {
  const CashflowHomeScreen({super.key});

  @override
  State<CashflowHomeScreen> createState() => _CashflowHomeScreenState();
}

class _CashflowHomeScreenState extends State<CashflowHomeScreen> {
  bool _loading = true;
  Map<String, dynamic> _summary = {};
  List<Map<String, dynamic>> _transactions = [];

  @override
  void initState() {
    super.initState();
    _reloadData();
  }

  Future<void> _reloadData() async {
    setState(() => _loading = true);
    try {
      final summary = await ApiService.fetchCashflowSummary();
      final transactions = await ApiService.fetchCashflow();
      if (!mounted) return;
      transactions.sort((a, b) {
        final aDate = DateTime.tryParse(
                (a['date'] ?? a['created_at'] ?? '').toString()?.split('T').first ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0);
        final bDate = DateTime.tryParse(
                (b['date'] ?? b['created_at'] ?? '').toString()?.split('T').first ?? '') ??
            DateTime.fromMillisecondsSinceEpoch(0);
        return bDate.compareTo(aDate);
      });
      setState(() {
        _summary = summary;
        _transactions = transactions;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal memuat cashflow: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _openDrawerIfNeeded(String type, String method) async {
    final shouldOpen = type == 'expense' || (type == 'income' && method == 'cash');
    if (!shouldOpen) return;
    await CashDrawerService.open();
  }

  Future<void> _openForm() async {
    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const CashflowFormModal(),
    );
    if (result == null) return;
    final type = result['type'] ?? 'income';
    final method = result['method'] ?? 'cash';
    await _reloadData();
    if (!mounted) return;
    await _openDrawerIfNeeded(type, method);
  }

  bool _isIncome(Map<String, dynamic> entry) {
    final type = (entry['category'] ?? entry['type'] ?? '').toString().toLowerCase();
    return type == 'income' || type == 'pemasukan';
  }

  List<Map<String, dynamic>> get _incomes =>
      _transactions.where((tx) => _isIncome(tx)).toList();
  List<Map<String, dynamic>> get _expenses =>
      _transactions.where((tx) => !_isIncome(tx)).toList();

  Widget _buildSection(String title, List<Map<String, dynamic>> entries) {
    if (entries.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        child: Text('Belum ada $title'.replaceFirst(title[0], title[0].toLowerCase())),
      );
    }
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 16, top: 16, bottom: 8),
          child: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
        ),
        ...entries.map((tx) => CashflowListItem(transaction: tx)),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cashflow'),
        backgroundColor: const Color(0xFF0A4D68),
      ),
      body: RefreshIndicator(
        onRefresh: _reloadData,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            CashflowSummaryCard(summary: _summary),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _openForm,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0A4D68),
                textStyle: const TextStyle(fontWeight: FontWeight.bold),
              ),
              child: const Text('Tambah Cashflow'),
            ),
            if (_loading) ...[
              const SizedBox(height: 32),
              const Center(child: CircularProgressIndicator()),
            ] else ...[
              _buildSection('Pemasukan', _incomes),
              _buildSection('Pengeluaran', _expenses),
            ],
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }
}

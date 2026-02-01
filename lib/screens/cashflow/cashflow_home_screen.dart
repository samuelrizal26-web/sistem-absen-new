import 'package:flutter/material.dart';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';
import 'package:sistem_absen_flutter_v2/services/cash_drawer_service.dart';
import 'package:sistem_absen_flutter_v2/screens/cashflow/cashflow_form_modal.dart';
import 'package:sistem_absen_flutter_v2/screens/cashflow/widgets/cashflow_summary_card.dart';
import 'package:sistem_absen_flutter_v2/screens/cashflow/widgets/cashflow_list_item.dart';

// STABLE MODULE – DO NOT MODIFY
// Cashflow & PrintJobs are frozen
// STABLE MODULE – do not refactor without explicit approval
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

  DateTime _resolveDate(Map<String, dynamic> entry) {
    final raw = (entry['date'] ?? entry['created_at'] ?? '').toString();
    final cleaned = raw.contains('T') ? raw.split('T').first : raw;
    return DateTime.tryParse(cleaned) ?? DateTime.fromMillisecondsSinceEpoch(0);
  }

  Future<void> _reloadData() async {
    setState(() => _loading = true);
    try {
      final summary = await ApiService.fetchCashflowSummary();
      final transactions = await ApiService.fetchCashflow();
      transactions.sort(
        (a, b) => _resolveDate(b).compareTo(_resolveDate(a)),
      );
      if (!mounted) return;
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
    final result = await showDialog<Map<String, String>>(
      context: context,
      builder: (_) => Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 16),
        child: const CashflowFormModal(),
      ),
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

  Widget _buildTabView(List<Map<String, dynamic>> entries, String emptyMessage) {
    final list = _loading
        ? ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: const [
              SizedBox(height: 200),
              Center(child: CircularProgressIndicator()),
            ],
          )
        : entries.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: [
                  const SizedBox(height: 80),
                  Center(child: Text('Belum ada $emptyMessage')),
                ],
              )
            : ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(vertical: 8),
                itemCount: entries.length,
                separatorBuilder: (_, __) => const Divider(height: 0),
                itemBuilder: (_, index) => CashflowListItem(transaction: entries[index]),
              );

    return RefreshIndicator(
      onRefresh: _reloadData,
      child: list,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cashflow'),
        backgroundColor: const Color(0xFF0A4D68),
      ),
      body: DefaultTabController(
        length: 2,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
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
              const SizedBox(height: 12),
              const TabBar(
                labelColor: Colors.black87,
                indicatorColor: Color(0xFF0A4D68),
                tabs: [
                  Tab(text: 'Pemasukan'),
                  Tab(text: 'Pengeluaran'),
                ],
              ),
              const SizedBox(height: 8),
              Expanded(
                child: TabBarView(
                  children: [
                    _buildTabView(_incomes, 'pemasukan'),
                    _buildTabView(_expenses, 'pengeluaran'),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

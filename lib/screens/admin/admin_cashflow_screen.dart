import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

class AdminCashflowScreen extends StatefulWidget {
  const AdminCashflowScreen({super.key});

  @override
  State<AdminCashflowScreen> createState() => _AdminCashflowScreenState();
}

class _AdminCashflowScreenState extends State<AdminCashflowScreen> {
  late Future<List<Map<String, dynamic>>> _cashflowFuture;
  DateTime? _fromDate;
  DateTime? _toDate;

  @override
  void initState() {
    super.initState();
    final now = DateTime.now();
    _toDate = now;
    _fromDate = now.subtract(const Duration(days: 30));
    _cashflowFuture = _loadCashflow();
  }

  Future<List<Map<String, dynamic>>> _loadCashflow() async {
    return ApiService.fetchCashflow();
  }

  Future<void> _refreshCashflow() async {
    final next = _loadCashflow();
    setState(() => _cashflowFuture = next);
    await next;
  }

  void _updateFilterDate({required bool isStart}) async {
    final initial = isStart ? _fromDate ?? DateTime.now().subtract(const Duration(days: 30)) : _toDate ?? DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: initial,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (picked == null) return;
    setState(() {
      if (isStart) {
        _fromDate = picked;
        if (_toDate != null && _toDate!.isBefore(picked)) {
          _toDate = picked;
        }
      } else {
        _toDate = picked;
        if (_fromDate != null && _fromDate!.isAfter(picked)) {
          _fromDate = picked;
        }
      }
    });
  }

  String _formatCurrency(num value) {
    final formatter = NumberFormat.currency(locale: 'id', symbol: 'Rp ', decimalDigits: 0);
    return formatter.format(value);
  }

  DateTime? _parseDate(Map<String, dynamic> row) {
    final raw = row['date'] ?? row['created_at'];
    if (raw == null) return null;
    return DateTime.tryParse(raw.toString());
  }

  List<Map<String, dynamic>> _applyFilters(List<Map<String, dynamic>> data) {
    return data.where((item) {
      final date = _parseDate(item);
      if (date == null) return true;
      if (_fromDate != null && date.isBefore(_fromDate!)) return false;
      if (_toDate != null && date.isAfter(_toDate!)) return false;
      return true;
    }).toList()
      ..sort((a, b) {
        final aDate = _parseDate(a);
        final bDate = _parseDate(b);
        if (aDate == null && bDate == null) return 0;
        if (aDate == null) return 1;
        if (bDate == null) return -1;
        return bDate.compareTo(aDate);
      });
  }

  int _totalAmount(List<Map<String, dynamic>> data, String type) {
    return data
        .where((item) => (item['type'] ?? 'in').toString().toLowerCase() == type)
        .fold<int>(0, (prev, item) => prev + ((item['amount'] as num?)?.toInt() ?? 0));
  }

  String _formatFilterLabel() {
    final from = _fromDate != null ? DateFormat('dd MMM yyyy').format(_fromDate!) : 'Mulai';
    final to = _toDate != null ? DateFormat('dd MMM yyyy').format(_toDate!) : 'Sampai';
    return '$from • $to';
  }

  Color _amountColor(String type) => type == 'in' ? Colors.green.shade600 : Colors.red.shade600;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      appBar: AppBar(
        title: const Text('Admin Cashflow'),
        backgroundColor: const Color(0xFF0A4D68),
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _cashflowFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Gagal memuat data: ${snapshot.error}'));
          }
          final data = snapshot.data ?? [];
          final filtered = _applyFilters(data);
          final totalIn = _totalAmount(filtered, 'in');
          final totalOut = _totalAmount(filtered, 'out');
          final balance = totalIn - totalOut;
          return RefreshIndicator(
            onRefresh: _refreshCashflow,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildFilterSection(),
                    const SizedBox(height: 12),
                    _buildSummaryRow(totalIn, totalOut, balance),
                    const SizedBox(height: 16),
                    Text('Total transaksi: ${filtered.length}', style: const TextStyle(color: Colors.black54)),
                    const SizedBox(height: 12),
                    if (filtered.isEmpty)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.only(top: 48),
                          child: Text('Tidak ada transaksi pada rentang ini', style: TextStyle(color: Colors.grey.shade600)),
                        ),
                      )
                    else
                      ListView.separated(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: filtered.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 8),
                        itemBuilder: (context, index) {
                          final item = filtered[index];
                          final amount = (item['amount'] as num?)?.toDouble() ?? 0;
                          final type = item['type']?.toString().toLowerCase() == 'out' ? 'out' : 'in';
                          final date = _parseDate(item);
                          final description = item['description']?.toString() ?? '-';
                          final source = item['source']?.toString() ?? '-';
                          return Card(
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                            child: ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                              leading: CircleAvatar(
                                backgroundColor: _amountColor(type).withOpacity(0.2),
                                child: Icon(
                                  type == 'in' ? Icons.arrow_circle_up : Icons.arrow_circle_down,
                                  color: _amountColor(type),
                                ),
                              ),
                              title: Text(
                                description,
                                style: const TextStyle(fontWeight: FontWeight.w600),
                              ),
                              subtitle: Padding(
                                padding: const EdgeInsets.only(top: 4),
                                child: Text(
                                  '${date != null ? DateFormat('dd MMM yyyy').format(date) : '-'} · $source',
                                  style: const TextStyle(color: Colors.black54),
                                ),
                              ),
                              trailing: Text(
                                '${type == 'in' ? '+' : '-'}${_formatCurrency(amount.abs())}',
                                style: TextStyle(
                                  color: _amountColor(type),
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                          );
                        },
                      ),
                  ],
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildFilterSection() {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(color: Color(0x14000000), blurRadius: 16, offset: Offset(0, 8)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text('Filter Periode', style: TextStyle(fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _updateFilterDate(isStart: true),
                  icon: const Icon(Icons.date_range),
                  label: Text(_fromDate != null ? DateFormat('dd MMM yyyy').format(_fromDate!) : 'Mulai'),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _updateFilterDate(isStart: false),
                  icon: const Icon(Icons.date_range),
                  label: Text(_toDate != null ? DateFormat('dd MMM yyyy').format(_toDate!) : 'Sampai'),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          Text(
            _formatFilterLabel(),
            style: const TextStyle(color: Colors.black54),
          ),
        ],
      ),
    );
  }

  Widget _buildSummaryRow(int totalIn, int totalOut, int balance) {
    return Row(
      children: [
        Expanded(child: _SummaryTile(label: 'Total IN', value: _formatCurrency(totalIn), color: Colors.green.shade700)),
        const SizedBox(width: 8),
        Expanded(child: _SummaryTile(label: 'Total OUT', value: _formatCurrency(totalOut), color: Colors.red.shade700)),
        const SizedBox(width: 8),
        Expanded(child: _SummaryTile(label: 'Balance', value: _formatCurrency(balance), color: Colors.blue.shade700)),
      ],
    );
  }
}

class _SummaryTile extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _SummaryTile({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        color: Colors.white,
        boxShadow: const [
          BoxShadow(color: Color(0x14000000), blurRadius: 12, offset: Offset(0, 6)),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: const TextStyle(fontSize: 12, color: Colors.black54)),
          const SizedBox(height: 4),
          Text(value, style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: color)),
        ],
      ),
    );
  }
}



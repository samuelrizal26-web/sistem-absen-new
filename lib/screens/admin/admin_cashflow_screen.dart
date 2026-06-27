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
    final initial = isStart
        ? _fromDate ?? DateTime.now().subtract(const Duration(days: 30))
        : _toDate ?? DateTime.now();
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
    final formatter = NumberFormat.currency(
      locale: 'id',
      symbol: 'Rp ',
      decimalDigits: 0,
    );
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
    }).toList()..sort((a, b) {
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
        .where(
          (item) => (item['type'] ?? 'in').toString().toLowerCase() == type,
        )
        .fold<int>(
          0,
          (prev, item) => prev + ((item['amount'] as num?)?.toInt() ?? 0),
        );
  }

  String _formatFilterLabel() {
    final from = _fromDate != null
        ? DateFormat('dd MMM yyyy').format(_fromDate!)
        : 'Mulai';
    final to = _toDate != null
        ? DateFormat('dd MMM yyyy').format(_toDate!)
        : 'Sampai';
    return '$from • $to';
  }

  Color _amountColor(String type) =>
      type == 'in' ? Colors.green.shade600 : Colors.red.shade600;

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
          final metrics = _computeCashflowMetrics(filtered);
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
                    const SizedBox(height: 12),
                    _buildPlaceholderTopCards(metrics),
                    const SizedBox(height: 12),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        ElevatedButton.icon(
                          onPressed: _showCashflowChoiceDialog,
                          icon: const Icon(Icons.add),
                          label: const Text('Tambah Cashflow'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF0A4D68),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Total transaksi: ${filtered.length}',
                      style: const TextStyle(color: Colors.black54),
                    ),
                    const SizedBox(height: 12),
                    if (filtered.isEmpty)
                      Center(
                        child: Padding(
                          padding: const EdgeInsets.only(top: 48),
                          child: Text(
                            'Tidak ada transaksi pada rentang ini',
                            style: TextStyle(color: Colors.grey.shade600),
                          ),
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
                          final amount =
                              (item['amount'] as num?)?.toDouble() ?? 0;
                          final type =
                              item['type']?.toString().toLowerCase() == 'out'
                              ? 'out'
                              : 'in';
                          final date = _parseDate(item);
                          final description =
                              item['description']?.toString() ?? '-';
                          final source = item['source']?.toString() ?? '-';
                          return Card(
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: ListTile(
                              contentPadding: const EdgeInsets.symmetric(
                                horizontal: 16,
                                vertical: 12,
                              ),
                              leading: CircleAvatar(
                                backgroundColor: _amountColor(
                                  type,
                                ).withOpacity(0.2),
                                child: Icon(
                                  type == 'in'
                                      ? Icons.arrow_circle_up
                                      : Icons.arrow_circle_down,
                                  color: _amountColor(type),
                                ),
                              ),
                              title: Text(
                                description,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
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
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 16,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Filter Periode',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _updateFilterDate(isStart: true),
                  icon: const Icon(Icons.date_range),
                  label: Text(
                    _fromDate != null
                        ? DateFormat('dd MMM yyyy').format(_fromDate!)
                        : 'Mulai',
                  ),
                ),
              ),
              const SizedBox(width: 8),
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () => _updateFilterDate(isStart: false),
                  icon: const Icon(Icons.date_range),
                  label: Text(
                    _toDate != null
                        ? DateFormat('dd MMM yyyy').format(_toDate!)
                        : 'Sampai',
                  ),
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
        Expanded(
          child: _SummaryTile(
            label: 'Total IN',
            value: _formatCurrency(totalIn),
            color: Colors.green.shade700,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _SummaryTile(
            label: 'Total OUT',
            value: _formatCurrency(totalOut),
            color: Colors.red.shade700,
          ),
        ),
        const SizedBox(width: 8),
        Expanded(
          child: _SummaryTile(
            label: 'Balance',
            value: _formatCurrency(balance),
            color: Colors.blue.shade700,
          ),
        ),
      ],
    );
  }

  Widget _buildPlaceholderTopCards(_CashflowMetrics metrics) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _buildSimpleCard('Pemasukan Cash', _formatCurrency(metrics.cashMargin)),
        const SizedBox(height: 8),
        _buildSimpleCard(
          'Pemasukan Transfer',
          _formatCurrency(metrics.transferMargin),
        ),
        const SizedBox(height: 8),
        _buildIndicatorPlaceholderCard(metrics.indicatorTotals),
        const SizedBox(height: 8),
        _buildCashTransferPlaceholderCard(
          metrics.cashIncome,
          metrics.cashExpense,
          metrics.transferIncome,
        ),
        const SizedBox(height: 8),
        _buildRingkasanPlaceholderCard(
          metrics.totalGajiCrew,
          metrics.totalPemasukan,
          metrics.totalPengeluaran,
        ),
      ],
    );
  }

  Widget _buildSimpleCard(String title, String value) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 16,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildIndicatorPlaceholderCard(Map<String, double> totals) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 16,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Indikator',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          _buildIndicatorRow(
            'Print Jobs',
            _formatCurrency(totals['Print Jobs'] ?? 0),
          ),
          _buildIndicatorRow(
            'Project Custom',
            _formatCurrency(totals['Project Custom'] ?? 0),
          ),
          _buildIndicatorRow(
            'Cashflow Home',
            _formatCurrency(totals['Cashflow Home'] ?? 0),
          ),
        ],
      ),
    );
  }

  Widget _buildCashTransferPlaceholderCard(
    double cashIncome,
    double cashExpense,
    double transferIncome,
  ) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 16,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Cash & Transfer',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          _buildIndicatorRow('Cash Masuk', _formatCurrency(cashIncome)),
          _buildIndicatorRow('Cash Keluar', _formatCurrency(cashExpense)),
          _buildIndicatorRow('Transfer', _formatCurrency(transferIncome)),
        ],
      ),
    );
  }

  Widget _buildRingkasanPlaceholderCard(
    double totalGaji,
    double totalPemasukan,
    double totalPengeluaran,
  ) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 16,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Ringkasan Keuangan',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 12),
          _buildIndicatorRow('Total Gaji Crew', _formatCurrency(totalGaji)),
          _buildIndicatorRow(
            'Total Pemasukan',
            _formatCurrency(totalPemasukan),
          ),
          _buildIndicatorRow(
            'Total Pengeluaran',
            _formatCurrency(totalPengeluaran),
          ),
        ],
      ),
    );
  }

  _CashflowMetrics _computeCashflowMetrics(List<Map<String, dynamic>> entries) {
    final cashMargin = _sumMarginByPaymentMethod(entries, 'cash');
    final transferMargin = _sumMarginByPaymentMethod(entries, 'transfer');
    final indicatorTotals = _calculateIndicatorTotals(entries);
    final cashIncome = _sumIncomeByMethod(entries, 'cash');
    final transferIncome = _sumIncomeByMethod(entries, 'transfer');
    final cashExpense = _sumExpensesBySource(entries, 'Cashflow Home');
    final totalPemasukan = _sumIncomeExcludingAdmin(entries);
    final totalPengeluaran = _sumExpensesBySource(entries, 'Cashflow Home');
    return _CashflowMetrics(
      cashMargin: cashMargin,
      transferMargin: transferMargin,
      indicatorTotals: indicatorTotals,
      cashIncome: cashIncome,
      transferIncome: transferIncome,
      cashExpense: cashExpense,
      totalGajiCrew: 0,
      totalPemasukan: totalPemasukan,
      totalPengeluaran: totalPengeluaran,
    );
  }

  double _sumMarginByPaymentMethod(
    List<Map<String, dynamic>> entries,
    String method,
  ) {
    return entries.fold<double>(0, (prev, entry) {
      if (!_isIncomeEntry(entry) ||
          !_isWorkEntry(entry) ||
          _isAdminCashflowEntry(entry)) {
        return prev;
      }
      final paymentMethod = (entry['payment_method'] ?? '')
          .toString()
          .toLowerCase();
      if (paymentMethod != method.toLowerCase()) return prev;
      final amount = (entry['amount'] as num?)?.toDouble() ?? 0;
      return prev + amount;
    });
  }

  double _sumIncomeByMethod(List<Map<String, dynamic>> entries, String method) {
    return entries.fold<double>(0, (prev, entry) {
      if (!_isIncomeEntry(entry)) return prev;
      final paymentMethod = (entry['payment_method'] ?? '')
          .toString()
          .toLowerCase();
      if (paymentMethod != method.toLowerCase()) return prev;
      final amount = (entry['amount'] as num?)?.toDouble() ?? 0;
      return prev + amount;
    });
  }

  double _sumIncomeExcludingAdmin(List<Map<String, dynamic>> entries) {
    return entries.fold<double>(0, (prev, entry) {
      if (!_isIncomeEntry(entry) || _isAdminCashflowEntry(entry)) return prev;
      final amount = (entry['amount'] as num?)?.toDouble() ?? 0;
      return prev + amount;
    });
  }

  double _sumExpensesBySource(
    List<Map<String, dynamic>> entries,
    String sourceKey, {
    bool onlyExpense = true,
  }) {
    return entries.fold<double>(0, (prev, entry) {
      if (onlyExpense && !_isExpenseEntry(entry)) return prev;
      final category = _sourceCategory(entry);
      if (category != sourceKey) return prev;
      final amount = (entry['amount'] as num?)?.toDouble() ?? 0;
      return prev + amount;
    });
  }

  Map<String, double> _calculateIndicatorTotals(
    List<Map<String, dynamic>> entries,
  ) {
    final totals = <String, double>{
      'Print Jobs': 0,
      'Project Custom': 0,
      'Cashflow Home': 0,
    };
    for (final entry in entries) {
      if (!_isIncomeEntry(entry)) continue;
      final category = _sourceCategory(entry);
      if (!totals.containsKey(category)) continue;
      final amount = (entry['amount'] as num?)?.toDouble() ?? 0;
      totals[category] = (totals[category] ?? 0) + amount;
    }
    return totals;
  }

  String _sourceCategory(Map<String, dynamic> entry) {
    final source = (entry['source'] ?? '').toString().toLowerCase();
    final description = (entry['description'] ?? '').toString().toLowerCase();
    if (source.contains('print') || description.contains('print'))
      return 'Print Jobs';
    if (source.contains('project') || description.contains('project'))
      return 'Project Custom';
    if (source.contains('cashflow home') ||
        description.contains('cashflow home'))
      return 'Cashflow Home';
    if (source.contains('cashflow admin') ||
        description.contains('cashflow admin'))
      return 'Cashflow Admin';
    return 'Lainnya';
  }

  bool _isIncomeEntry(Map<String, dynamic> entry) {
    final type =
        (entry['category'] ?? entry['type'])?.toString().toLowerCase() ?? '';
    return type == 'income' || type == 'in' || type == 'pemasukan';
  }

  bool _isExpenseEntry(Map<String, dynamic> entry) {
    final type =
        (entry['category'] ?? entry['type'])?.toString().toLowerCase() ?? '';
    return type == 'expense' || type == 'out' || type == 'pengeluaran';
  }

  bool _isWorkEntry(Map<String, dynamic> entry) {
    final category = _sourceCategory(entry);
    return category == 'Print Jobs' || category == 'Project Custom';
  }

  bool _isAdminCashflowEntry(Map<String, dynamic> entry) {
    return _sourceCategory(entry) == 'Cashflow Admin';
  }

  Widget _buildIndicatorRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  void _showCashflowChoiceDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Tambah Cashflow'),
        content: const Text('Pilih jenis transaksi yang ingin ditambahkan.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _showCashflowForm(true);
            },
            child: const Text('Pemasukan'),
          ),
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              _showCashflowForm(false);
            },
            child: const Text('Pengeluaran'),
          ),
        ],
      ),
    );
  }

  Future<void> _showCashflowForm(bool isIncome) async {
    final amountController = TextEditingController();
    final noteController = TextEditingController();
    bool isSubmitting = false;
    await showDialog(
      context: context,
      builder: (context) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return AlertDialog(
              title: Text(isIncome ? 'Tambah Pemasukan' : 'Tambah Pengeluaran'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: amountController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(
                        labelText: 'Nilai (Rp)',
                        border: OutlineInputBorder(),
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: noteController,
                      decoration: const InputDecoration(
                        labelText: 'Catatan',
                        border: OutlineInputBorder(),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(context).pop(),
                  child: const Text('Batal'),
                ),
                ElevatedButton(
                  onPressed: isSubmitting
                      ? null
                      : () async {
                          final rawValue = amountController.text.replaceAll(
                            RegExp(r'[^0-9.]'),
                            '',
                          );
                          final amount = double.tryParse(rawValue) ?? 0;
                          if (amount <= 0) {
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(
                                content: Text('Nilai harus lebih besar dari 0'),
                                backgroundColor: Colors.orange,
                              ),
                            );
                            return;
                          }
                          setModalState(() => isSubmitting = true);
                          try {
                            await _saveCashflow(
                              amount,
                              noteController.text.trim(),
                              isIncome,
                            );
                            if (!mounted) return;
                            Navigator.of(context).pop();
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text(
                                  isIncome
                                      ? 'Pemasukan tersimpan'
                                      : 'Pengeluaran tersimpan',
                                ),
                                backgroundColor: Colors.green,
                              ),
                            );
                          } catch (e) {
                            if (!mounted) return;
                            ScaffoldMessenger.of(context).showSnackBar(
                              SnackBar(
                                content: Text('Gagal menyimpan: $e'),
                                backgroundColor: Colors.red,
                              ),
                            );
                          } finally {
                            if (mounted)
                              setModalState(() => isSubmitting = false);
                          }
                        },
                  child: Text(isSubmitting ? 'Menyimpan...' : 'Simpan'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _saveCashflow(double amount, String note, bool isIncome) async {
    final body = {
      'category': isIncome ? 'income' : 'expense',
      'amount': amount,
      'description': note.isEmpty
          ? (isIncome ? 'Pemasukan manual' : 'Pengeluaran manual')
          : note,
      'date': DateTime.now().toIso8601String(),
      'payment_method': 'cash',
      if (note.isNotEmpty) 'notes': note,
    };
    await ApiService.createCashflow(body);
    await _refreshCashflow();
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
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 12,
            offset: Offset(0, 6),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 12, color: Colors.black54),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _CashflowMetrics {
  final double cashMargin;
  final double transferMargin;
  final Map<String, double> indicatorTotals;
  final double cashIncome;
  final double cashExpense;
  final double transferIncome;
  final double totalGajiCrew;
  final double totalPemasukan;
  final double totalPengeluaran;

  _CashflowMetrics({
    required this.cashMargin,
    required this.transferMargin,
    required this.indicatorTotals,
    required this.cashIncome,
    required this.cashExpense,
    required this.transferIncome,
    required this.totalGajiCrew,
    required this.totalPemasukan,
    required this.totalPengeluaran,
  });
}
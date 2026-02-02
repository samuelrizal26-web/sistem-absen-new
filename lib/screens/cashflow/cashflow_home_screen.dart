// ============================================
// STABLE MODULE – CASHFLOW HOME
// LANDSCAPE LAYOUT FIX:
// - Portrait: vertical single column
// - Landscape: LEFT (controls) + RIGHT (list)
// - NO LOGIC/API/STATE CHANGES
// ============================================
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';
import 'package:sistem_absen_flutter_v2/services/cash_drawer_service.dart';
import 'package:sistem_absen_flutter_v2/screens/cashflow/cashflow_form_modal.dart';
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
  DateTime _selectedPeriod = DateTime(DateTime.now().year, DateTime.now().month);
  String _searchTerm = '';
  static final _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  List<DateTime> get _recentPeriods {
    final base = DateTime(_selectedPeriod.year, _selectedPeriod.month);
    return List.generate(3, (index) => DateTime(base.year, base.month - index));
  }

  @override
  void initState() {
    super.initState();
    _reloadData();
  }

  DateTime _parseDate(Map<String, dynamic> entry) {
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

  List<Map<String, dynamic>> get _periodTransactions {
    final start = DateTime(_selectedPeriod.year, _selectedPeriod.month, 1);
    final end = DateTime(_selectedPeriod.year, _selectedPeriod.month + 1, 0);
    return _transactions.where((tx) {
      final date = _parseDate(tx);
      final matchesPeriod = !date.isBefore(start) && !date.isAfter(end);
      if (!matchesPeriod) return false;
      if (_searchTerm.isEmpty) return true;
      final query = _searchTerm.toLowerCase();
      return (tx['description'] ?? tx['notes'] ?? tx['category'] ?? '')
              .toString()
              .toLowerCase()
              .contains(query) ||
          (tx['payment_method'] ?? '').toString().toLowerCase().contains(query);
    }).toList();
  }

  List<Map<String, dynamic>> get _incomes =>
      _periodTransactions.where((tx) => _isIncome(tx)).toList();
  List<Map<String, dynamic>> get _expenses =>
      _periodTransactions.where((tx) => !_isIncome(tx)).toList();

  double _sumEntries(List<Map<String, dynamic>> entries) {
    return entries.fold<double>(0.0, (sum, entry) {
      final amount = (entry['amount'] as num?)?.toDouble() ?? 0.0;
      return sum + amount;
    });
  }

  DateTime _resolveDate(Map<String, dynamic> entry) {
    final raw = (entry['date'] ?? entry['created_at'] ?? '').toString();
    final cleaned = raw.contains('T') ? raw.split('T').first : raw;
    return DateTime.tryParse(cleaned) ?? DateTime.fromMillisecondsSinceEpoch(0);
  }

  String _formatMoney(double value) => _currency.format(value);

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

  void _showPeriodPicker() async {
    final selected = await showDialog<DateTime>(
      context: context,
      builder: (context) => Dialog(
        insetPadding: const EdgeInsets.symmetric(horizontal: 24, vertical: 28),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: _MonthPickerDialog(
          initialDate: _selectedPeriod,
          minDate: DateTime(_selectedPeriod.year, _selectedPeriod.month - 2),
          maxDate: DateTime(_selectedPeriod.year, _selectedPeriod.month + 1),
        ),
      ),
    );
    if (selected != null &&
        (selected.year != _selectedPeriod.year || selected.month != _selectedPeriod.month)) {
      setState(() => _selectedPeriod = selected);
    }
  }

  Widget _buildStatCards() {
    final income = _sumEntries(_incomes);
    final expense = _sumEntries(_expenses);
    final balance = income - expense;
    return Row(
      children: [
        Expanded(
          child: _StatCard(
            label: 'Pemasukan',
            value: _formatMoney(income),
            color: const Color(0xFFE8F5E9),
            icon: Icons.arrow_upward,
            iconColor: Colors.green,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            label: 'Pengeluaran',
            value: _formatMoney(expense),
            color: const Color(0xFFFFEBEE),
            icon: Icons.arrow_downward,
            iconColor: Colors.red,
          ),
        ),
        const SizedBox(width: 10),
        Expanded(
          child: _StatCard(
            label: 'Saldo Kas',
            value: _formatMoney(balance),
            color: const Color(0xFFE3F2FD),
            icon: Icons.account_balance_wallet,
            iconColor: Colors.blue,
          ),
        ),
      ],
    );
  }

  Widget _buildPeriodSelector() {
    final label = DateFormat('MMMM yyyy', 'id_ID').format(_selectedPeriod);
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          'Periode: $label',
          style: const TextStyle(fontWeight: FontWeight.w600),
        ),
        TextButton.icon(
          onPressed: _showPeriodPicker,
          icon: const Icon(Icons.calendar_month),
          label: const Text('Ubah Periode'),
        ),
      ],
    );
  }

  Widget _buildSearchField() {
    return TextField(
      decoration: InputDecoration(
        prefixIcon: const Icon(Icons.search),
        hintText: 'Cari catatan atau metode',
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      onChanged: (value) => setState(() => _searchTerm = value),
    );
  }

  Widget _buildAddButton() {
    return ElevatedButton(
      onPressed: _openForm,
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF2EC4B6),
        foregroundColor: Colors.white,
        elevation: 0,
        padding: const EdgeInsets.symmetric(vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 16),
      ),
      child: const Text('Tambah Cashflow'),
    );
  }

  Widget _buildPortraitLayout() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const SizedBox(height: 12),
        _buildStatCards(),
        const SizedBox(height: 12),
        _buildPeriodSelector(),
        const SizedBox(height: 12),
        _buildSearchField(),
        const SizedBox(height: 12),
        _buildAddButton(),
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
    );
  }

  Widget _buildLandscapeLayout() {
    return Row(
      children: [
        SizedBox(
          width: 360,
          child: SingleChildScrollView(
            padding: const EdgeInsets.only(right: 8),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const SizedBox(height: 12),
                _buildStatCards(),
                const SizedBox(height: 12),
                _buildPeriodSelector(),
                const SizedBox(height: 12),
                _buildSearchField(),
                const SizedBox(height: 12),
                _buildAddButton(),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ),
        const VerticalDivider(width: 1, thickness: 1),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const TabBar(
                labelColor: Colors.black87,
                indicatorColor: Color(0xFF0A4D68),
                tabs: [
                  Tab(text: 'Pemasukan'),
                  Tab(text: 'Pengeluaran'),
                ],
              ),
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
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cashflow'),
        backgroundColor: const Color(0xFF0A4D68),
      ),
      body: DefaultTabController(
        length: 2,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: isLandscape ? _buildLandscapeLayout() : _buildPortraitLayout(),
        ),
      ),
    );
  }
}

// =========================
// UI WIDGETS (TOP LEVEL)
// =========================
class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final Color color;
  final IconData icon;
  final Color iconColor;

  const _StatCard({
    Key? key,
    required this.label,
    required this.value,
    required this.color,
    required this.icon,
    required this.iconColor,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(14),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.05),
            blurRadius: 8,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: iconColor, size: 18),
          const SizedBox(height: 4),
          Text(
            label,
            style: const TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w500,
              color: Colors.black54,
              height: 1.1,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
          const SizedBox(height: 2),
          Text(
            value,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              height: 1.1,
            ),
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
          ),
        ],
      ),
    );
  }
}

class _MonthPickerDialog extends StatefulWidget {
  final DateTime initialDate;
  final DateTime minDate;
  final DateTime maxDate;

  const _MonthPickerDialog({
    Key? key,
    required this.initialDate,
    required this.minDate,
    required this.maxDate,
  }) : super(key: key);

  @override
  State<_MonthPickerDialog> createState() => _MonthPickerDialogState();
}

class _MonthPickerDialogState extends State<_MonthPickerDialog> {
  late DateTime _focusMonth;

  @override
  void initState() {
    super.initState();
    _focusMonth = widget.initialDate;
  }

  List<DateTime> get _visibleMonths {
    final start = DateTime(_focusMonth.year, _focusMonth.month - 2);
    return List.generate(6, (index) => DateTime(start.year, start.month + index));
  }

  bool get _canGoBack {
    final earliest = DateTime(_focusMonth.year, _focusMonth.month - 3);
    return !earliest.isBefore(widget.minDate);
  }

  bool get _canGoForward {
    final latest = DateTime(_focusMonth.year, _focusMonth.month + 3);
    return !latest.isAfter(widget.maxDate);
  }

  void _shiftMonth(int delta) {
    setState(() {
      _focusMonth = DateTime(_focusMonth.year, _focusMonth.month + delta);
    });
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 360,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                IconButton(
                  icon: const Icon(Icons.chevron_left),
                  onPressed: _canGoBack ? () => _shiftMonth(-1) : null,
                ),
                Text(
                  DateFormat('MMMM yyyy', 'id_ID').format(_focusMonth),
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                IconButton(
                  icon: const Icon(Icons.chevron_right),
                  onPressed: _canGoForward ? () => _shiftMonth(1) : null,
                ),
              ],
            ),
          ),
          const Divider(height: 1),
          Expanded(
            child: ListView.separated(
              itemBuilder: (context, index) {
                final period = _visibleMonths[index];
                final label = DateFormat('MMMM yyyy', 'id_ID').format(period);
                final isSelected = period.year == widget.initialDate.year &&
                    period.month == widget.initialDate.month;
                return ListTile(
                  title: Text(label),
                  trailing: isSelected ? const Icon(Icons.check, color: Colors.green) : null,
                  onTap: () => Navigator.of(context).pop(period),
                );
              },
              separatorBuilder: (_, __) => const Divider(height: 0),
              itemCount: _visibleMonths.length,
            ),
          ),
        ],
      ),
    );
  }
}

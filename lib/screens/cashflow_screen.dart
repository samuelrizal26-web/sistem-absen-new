import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';
import 'package:sistem_absen_flutter_v2/services/printer/bluetooth_printer_service.dart';
import 'package:sistem_absen_flutter_v2/core/utils/number_formatter.dart';
import 'package:sistem_absen_flutter_v2/core/utils/pdf_export_wrapper.dart';
import 'package:sistem_absen_flutter_v2/core/utils/cashflow_report_pdf.dart';
import 'package:sistem_absen_flutter_v2/models/cashflow_summary.dart';

class CashflowScreen extends StatefulWidget {
  const CashflowScreen({super.key});

  @override
  State<CashflowScreen> createState() => _CashflowScreenState();
}

class _CashflowScreenState extends State<CashflowScreen> with TickerProviderStateMixin {
  final _formKey = GlobalKey<FormState>();
  final _dateController = TextEditingController();
  final _amountController = TextEditingController();
  final _customerMoneyController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _notesController = TextEditingController();

  DateTime _selectedDate = DateTime.now();
  late TabController _tabController;
  bool _isSubmitting = false;
  bool _isLoading = true;
  Map<String, dynamic>? _editingTransaction;

  List<Map<String, dynamic>> _transactions = [];

  String _selectedType = 'income';
  String _selectedPaymentMethod = 'cash'; // 'cash' or 'transfer'
  DateTime _activePeriod = DateTime.now();

  bool get _isReadOnlyPeriod =>
      _activePeriod.year != DateTime.now().year || _activePeriod.month != DateTime.now().month;

  String _normalizeType(dynamic raw) {
    final value = raw?.toString().toLowerCase().trim() ?? '';
    if (value == 'pemasukan') return 'income';
    if (value == 'pengeluaran') return 'expense';
    return value;
  }

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this); // Semua, Cash, Transfer
    _dateController.text = _selectedDate.toIso8601String().split('T').first;
    _loadData();

    _amountController.addListener(() => setState(() {}));
    _customerMoneyController.addListener(() => setState(() {}));
    _tabController.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _tabController.dispose();
    _dateController.dispose();
    _amountController.dispose();
    _customerMoneyController.dispose();
    _descriptionController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadData() async {
    setState(() => _isLoading = true);
    try {
      final fetched = await ApiService.fetchCashflow();
      final filtered = <Map<String, dynamic>>[];
      for (final transaction in fetched) {
        final date = _parseDate(transaction['date'] ?? transaction['created_at']);
        if (date == null) continue;
        if (!_isInActivePeriod(date)) continue;
        filtered.add(transaction);
      }
      filtered.sort((a, b) {
        final dateA = _parseDate(a['date'] ?? a['created_at']);
        final dateB = _parseDate(b['date'] ?? b['created_at']);
        if (dateA == null || dateB == null) return 0;
        return dateB.compareTo(dateA);
      });
      _transactions
        ..clear()
        ..addAll(filtered);
      
      if (!mounted) return;
      setState(() => _isLoading = false);
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memuat data: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<DateTime?> _showExportPeriodDialog() async {
    final now = DateTime.now();
    final monthNames = List<String>.generate(
      12,
      (index) => DateFormat('MMMM', 'id_ID').format(DateTime(0, index + 1)),
    );
    final minYear = _activePeriod.year < now.year - 3 ? _activePeriod.year : now.year - 3;
    final years = List<int>.generate(now.year - minYear + 1, (index) => now.year - index);
    int selectedMonth = _activePeriod.month;
    int selectedYear = _activePeriod.year;

    return showDialog<DateTime>(
      context: context,
      builder: (context) {
        return StatefulBuilder(builder: (context, setState) {
          return AlertDialog(
            title: const Text('Pilih Periode Export'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                DropdownButtonFormField<int>(
                  value: selectedMonth,
                  decoration: const InputDecoration(labelText: 'Bulan'),
                  items: List.generate(
                    12,
                    (index) => DropdownMenuItem(
                      value: index + 1,
                      child: Text(monthNames[index]),
                    ),
                  ),
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() {
                      selectedMonth = value;
                    });
                  },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<int>(
                  value: selectedYear,
                  decoration: const InputDecoration(labelText: 'Tahun'),
                  items: years
                      .map((year) => DropdownMenuItem(value: year, child: Text(year.toString())))
                      .toList(),
                  onChanged: (value) {
                    if (value == null) return;
                    setState(() {
                      selectedYear = value;
                    });
                  },
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(null),
                child: const Text('Batal'),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop(DateTime(selectedYear, selectedMonth));
                },
                child: const Text('Export'),
              ),
            ],
          );
        });
      },
    );
  }

  Future<void> _handleExportPdf() async {
    final selectedPeriod = await _showExportPeriodDialog();
    if (selectedPeriod == null) return;
    setState(() {
      _activePeriod = selectedPeriod;
    });
    await _loadData();
    if (!mounted) return;
    final summary = _computeCashflowSummary(_transactions);
    final periodLabel = DateFormat('MMMM yyyy', 'id_ID').format(_activePeriod);
    try {
      final bytes = await generateCashflowReportPdf(
        summary: summary,
        transactions: _transactions,
        periodLabel: periodLabel,
      );
      await PdfExportWrapper.sharePdf(
        bytes: bytes,
        filename: 'cashflow-${periodLabel.replaceAll(' ', '_').toLowerCase()}.pdf',
        context: context,
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal membuat PDF: $e'), backgroundColor: Colors.red),
      );
    }
  }

  DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    final text = value.toString();
    if (text.isEmpty) return null;
    final clean = text.contains('T') ? text.split('T').first : text.split(' ').first;
    return DateTime.tryParse(clean);
  }

  void _editTransaction(Map<String, dynamic> transaction) {
    if (_isReadOnlyPeriod) return;
    setState(() {
      _editingTransaction = transaction;
      final backendType = _normalizeType(transaction['type'] ?? transaction['category']);
      _selectedType = backendType;
      if (backendType == 'income') {
        _tabController.animateTo(0);
      } else {
        _tabController.animateTo(1);
      }
      final amount = (transaction['amount'] as num?)?.toDouble() ?? 0.0;
      _amountController.text = amount > 0 ? ThousandsSeparatorInputFormatter.formatNumber(amount) : '';
      _descriptionController.text = transaction['description']?.toString() ?? '';
      _notesController.text = transaction['notes']?.toString() ?? '';
      // Load payment method (default 'cash' jika tidak ada)
      final paymentMethod = transaction['payment_method']?.toString().toLowerCase() ?? 'cash';
      _selectedPaymentMethod = (paymentMethod == 'transfer') ? 'transfer' : 'cash';
      final dateStr = transaction['date']?.toString() ?? transaction['created_at']?.toString() ?? '';
      if (dateStr.isNotEmpty) {
        final parsed = DateTime.tryParse(dateStr);
        if (parsed != null) {
          _selectedDate = parsed;
          _dateController.text = _selectedDate.toIso8601String().split('T').first;
        }
      }
    });
  }

  void _cancelEdit() {
    _resetForm();
  }

  void _resetForm() {
    setState(() {
      _editingTransaction = null;
      _amountController.clear();
      _customerMoneyController.clear();
      _descriptionController.clear();
      _notesController.clear();
      _selectedDate = DateTime.now();
      _dateController.text = _selectedDate.toIso8601String().split('T').first;
      _selectedType = 'income';
      _selectedPaymentMethod = 'cash';
    });
  }

  Future<void> _pickDate() async {
    final result = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (result != null) {
      setState(() {
        _selectedDate = result;
        _dateController.text = _selectedDate.toIso8601String().split('T').first;
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSubmitting = true);

    try {
      final amountValue = ThousandsSeparatorInputFormatter.parseToDouble(_amountController.text) ?? 0;
      if (amountValue <= 0) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Jumlah harus lebih dari 0'), backgroundColor: Colors.orange),
        );
        return;
      }
      final descriptionText = _descriptionController.text.trim();
      if (descriptionText.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Deskripsi wajib diisi'), backgroundColor: Colors.orange),
        );
        return;
      }

      final typeValue = _selectedType;
      final isIncome = typeValue == 'income';
      final paymentMethod = isIncome ? _selectedPaymentMethod : null;

      final body = <String, dynamic>{
        'type': typeValue,
        'amount': amountValue,
        'description': descriptionText,
      };
      if (_notesController.text.trim().isNotEmpty) {
        body['notes'] = _notesController.text.trim();
      }
      if (paymentMethod != null) {
        body['payment_method'] = paymentMethod;
      }

      final existingId = _resolveTransactionId(_editingTransaction);
      if (existingId != null) {
        await ApiService.updateCashflow(existingId, body);
      } else {
        await ApiService.createCashflow(body);

        final shouldOpenDrawer = typeValue == 'expense' || (isIncome && paymentMethod == 'cash');
        if (shouldOpenDrawer) {
          try {
            await BluetoothPrinterService.instance.openCashdrawer();
            if (mounted) {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Laci kasir berhasil dibuka'),
                  backgroundColor: Colors.blue,
                  duration: Duration(seconds: 2),
                ),
              );
            }
          } catch (e) {
            if (!mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Data tersimpan, tapi laci gagal dibuka: $e'),
                backgroundColor: Colors.orange,
                duration: const Duration(seconds: 2),
              ),
            );
          }
        }
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(existingId != null ? 'Cashflow berhasil diupdate!' : 'Cashflow berhasil ditambahkan!'),
          backgroundColor: Colors.green,
        ),
      );

      _resetForm();
      await _loadData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal menyimpan: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  String? _resolveTransactionId(Map<String, dynamic>? transaction) {
    if (transaction == null) return null;
    for (final key in ['cashflow_id', 'id', '_id']) {
      final value = transaction[key];
      if (value != null && value.toString().isNotEmpty) {
        return value.toString();
      }
    }
    return null;
  }

  Future<void> _deleteTransaction(Map<String, dynamic> transaction) async {
    if (_isReadOnlyPeriod) return;
    final id = _resolveTransactionId(transaction);
    if (id == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Tidak dapat menghapus: ID tidak ditemukan'), backgroundColor: Colors.red),
      );
      return;
    }

    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('Hapus transaksi?'),
        content: const Text('Transaksi akan dihapus permanen dan tidak dapat dikembalikan.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
            ),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );

    if (shouldDelete != true) return;

    setState(() => _isSubmitting = true);
    try {
      await ApiService.deleteCashflow(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Transaksi berhasil dihapus'), backgroundColor: Colors.green),
      );
      if (_editingTransaction != null && _resolveTransactionId(_editingTransaction) == id) {
        _resetForm();
      }
      await _loadData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal menghapus: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  String _formatNumber(num value) {
    return value.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (match) => '${match.group(1)}.',
    );
  }

  String _formatMonth(String monthKey) {
    try {
      final parts = monthKey.split('-');
      if (parts.length == 2) {
        final year = int.tryParse(parts[0]);
        final month = int.tryParse(parts[1]);
        if (year != null && month != null) {
          const monthNames = [
            'Januari',
            'Februari',
            'Maret',
            'April',
            'Mei',
            'Juni',
            'Juli',
            'Agustus',
            'September',
            'Oktober',
            'November',
            'Desember'
          ];
          return '${monthNames[month - 1]} $year';
        }
      }
    } catch (_) {}
    return monthKey;
  }


  @override
  Widget build(BuildContext context) {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    final summary = _computeCashflowSummary(_transactions);
    
    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A4D68),
        title: const Text('Cashflow', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            tooltip: 'Export PDF',
            onPressed: _handleExportPdf,
            icon: const Icon(Icons.picture_as_pdf),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: LayoutBuilder(
                builder: (context, constraints) {
                  if (isLandscape) {
                    return SingleChildScrollView(
                      padding: const EdgeInsets.all(12),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            flex: 2,
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _buildSummaryIndicators(summary),
                                const SizedBox(height: 12),
                                _buildAddButton(),
                              ],
                            ),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            flex: 3,
                            child: _buildTransactionTabs(),
                          ),
                        ],
                      ),
                    );
                  }
                  
                  return SingleChildScrollView(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        _buildSummaryIndicators(summary),
                        const SizedBox(height: 24),
                        _buildAddButton(),
                        const SizedBox(height: 24),
                        _buildTransactionTabs(),
                      ],
                    ),
                  );
                },
              ),
            ),
    );
  }

  Widget _buildAddButton() {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    
    final buttonEnabled = !_isReadOnlyPeriod;
    return ElevatedButton.icon(
      onPressed: buttonEnabled ? () => _showCashflowFormDialog() : null,
      icon: Icon(Icons.add, color: Colors.white, size: isLandscape ? 20 : 24),
      label: Text(
        'Tambah Cashflow',
        style: TextStyle(
          fontSize: isLandscape ? 14 : 16,
          fontWeight: FontWeight.bold,
          color: Colors.white,
        ),
      ),
      style: ElevatedButton.styleFrom(
        backgroundColor: const Color(0xFF00ACC1),
        padding: EdgeInsets.symmetric(
          vertical: isLandscape ? 12 : 16,
          horizontal: isLandscape ? 12 : 16,
        ),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        elevation: 2,
      ),
    );
  }

  void _showCashflowFormDialog() {
    // Reset form jika tidak sedang edit
    if (_isReadOnlyPeriod) return;
    if (_editingTransaction == null) {
      _resetForm();
    }
    
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => _CashflowFormDialog(
        formKey: _formKey,
        dateController: _dateController,
        amountController: _amountController,
        customerMoneyController: _customerMoneyController,
        descriptionController: _descriptionController,
        notesController: _notesController,
        selectedDate: _selectedDate,
        selectedType: _selectedType,
        editingTransaction: _editingTransaction,
        isSubmitting: _isSubmitting,
        onDateChanged: (date) {
          setState(() {
            _selectedDate = date;
            _dateController.text = date.toIso8601String().split('T').first;
          });
        },
        onTypeChanged: (type) {
          setState(() {
            _selectedType = type;
          });
        },
        onPaymentMethodChanged: (method) {
          setState(() {
            _selectedPaymentMethod = method;
          });
        },
        selectedPaymentMethod: _selectedPaymentMethod,
        onPickDate: _pickDate,
        onSubmit: _submit,
        onCancel: _cancelEdit,
      ),
    );
  }

  CashflowSummary _computeCashflowSummary(List<Map<String, dynamic>> transactions) {
    double totalIncome = 0;
    double totalExpense = 0;
    double cashIncome = 0;
    double cashExpense = 0;
    double transferIncome = 0;
    double transferExpense = 0;

    for (final transaction in transactions) {
      final recordType = _normalizeType(transaction['type'] ?? transaction['category']);
      final amount = _parseAmount(transaction['amount']) ?? 0;
      final paymentMethod = (transaction['payment_method'] ?? '').toString().toLowerCase();

      if (recordType == 'income') {
        totalIncome += amount;
        if (paymentMethod == 'cash') {
          cashIncome += amount;
        } else if (paymentMethod == 'transfer') {
          transferIncome += amount;
        }
      } else if (recordType == 'expense') {
        totalExpense += amount;
        if (paymentMethod == 'cash') {
          cashExpense += amount;
        } else if (paymentMethod == 'transfer') {
          transferExpense += amount;
        }
      }
    }

    final marginCash = cashIncome - cashExpense;
    final marginTransfer = transferIncome - transferExpense;
    return CashflowSummary(
      totalIncome: totalIncome,
      totalExpense: totalExpense,
      cashIncome: cashIncome,
      cashExpense: cashExpense,
      transferIncome: transferIncome,
      transferExpense: transferExpense,
      marginCash: marginCash,
      marginTransfer: marginTransfer,
    );
  }

  double? _parseAmount(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    if (value is String) {
      return double.tryParse(value.replaceAll('.', ''));
    }
    return null;
  }

  Map<String, List<Map<String, dynamic>>> get _groupedByMonth {
    final Map<String, List<Map<String, dynamic>>> grouped = {};
    for (final transaction in _transactions) {
      final date = _parseDate(transaction['date'] ?? transaction['created_at']);
      final key = _formatMonthKey(date);
      grouped.putIfAbsent(key, () => []).add(transaction);
    }
    return grouped;
  }

  String _formatMonthKey(DateTime? date) {
    if (date == null) return 'unknown';
    return '${date.year}-${date.month.toString().padLeft(2, '0')}';
  }

  Map<String, List<Map<String, dynamic>>> _getGroupedByFilter(String type) {
    final Map<String, List<Map<String, dynamic>>> result = {};
    final normalizedType = _normalizeType(type);
    for (final entry in _groupedByMonth.entries) {
      final filtered = entry.value.where((tx) {
        final recordType = _normalizeType(tx['type'] ?? tx['category']);
        return recordType == normalizedType;
      }).toList();
      if (filtered.isNotEmpty) {
        result[entry.key] = filtered;
      }
    }
    return result;
  }

  bool _isInActivePeriod(DateTime date) {
    return date.year == _activePeriod.year && date.month == _activePeriod.month;
  }

  Widget _buildSummaryIndicators(CashflowSummary summary) {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    final cardPadding = EdgeInsets.all(isLandscape ? 12 : 16);
    Widget buildCard({
      required String label,
      required String value,
      required IconData icon,
      required Color startColor,
      required Color endColor,
      Color? iconBg,
    }) {
      return Expanded(
        child: Card(
          elevation: 3,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                colors: [startColor, endColor],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            padding: cardPadding,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: iconBg ?? Colors.white24,
                      child: Icon(icon, color: Colors.white, size: isLandscape ? 18 : 20),
                    ),
                    SizedBox(width: isLandscape ? 6 : 8),
                    Text(
                      label,
                      style: TextStyle(
                        color: Colors.white70,
                        fontSize: isLandscape ? 10 : 12,
                      ),
                    ),
                  ],
                ),
                SizedBox(height: isLandscape ? 6 : 8),
                Text(
                  value,
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: isLandscape ? 16 : 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
        ),
      );
    }

    final formattedIncome = 'Rp ${_formatNumber(summary.totalIncome)}';
    final formattedExpense = 'Rp ${_formatNumber(summary.totalExpense)}';
    final formattedMarginCash = 'Rp ${_formatNumber(summary.marginCash)}';
    final formattedMarginTransfer = 'Rp ${_formatNumber(summary.marginTransfer)}';

    return Column(
      children: [
        Row(
          children: [
            buildCard(
              label: 'Total Pemasukan',
              value: formattedIncome,
              icon: Icons.trending_up,
              startColor: const Color(0xFF43A047),
              endColor: const Color(0xFF2E7D32),
            ),
            SizedBox(width: isLandscape ? 10 : 12),
            buildCard(
              label: 'Total Pengeluaran',
              value: formattedExpense,
              icon: Icons.trending_down,
              startColor: const Color(0xFFE53935),
              endColor: const Color(0xFFC62828),
            ),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            buildCard(
              label: 'Margin Bersih CASH',
              value: formattedMarginCash,
              icon: Icons.account_balance_wallet,
              startColor: const Color(0xFF1E88E5),
              endColor: const Color(0xFF1565C0),
            ),
            SizedBox(width: isLandscape ? 10 : 12),
            buildCard(
              label: 'Margin Bersih TRANSFER',
              value: formattedMarginTransfer,
              icon: Icons.swap_horiz,
              startColor: const Color(0xFF6A1B9A),
              endColor: const Color(0xFF4A148C),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildTransactionTabs() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Card untuk Semua, Cash, Transfer
        Card(
          elevation: 4,
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Tab Header
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: const BorderRadius.only(
                    topLeft: Radius.circular(16),
                    topRight: Radius.circular(16),
                  ),
                ),
                child: Row(
                  children: [
                    Expanded(
                      child: InkWell(
                        onTap: () {
                          setState(() {
                            _tabController.animateTo(0);
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          decoration: BoxDecoration(
                            color: _tabController.index == 0 
                                ? const Color(0xFF0A4D68) 
                                : Colors.transparent,
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(16),
                            ),
                          ),
                          child: Text(
                            'CASH',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: _tabController.index == 0 
                                  ? Colors.white 
                                  : const Color(0xFF0A4D68),
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: InkWell(
                        onTap: () {
                          setState(() {
                            _tabController.animateTo(1);
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          decoration: BoxDecoration(
                            color: _tabController.index == 1 
                                ? const Color(0xFF0A4D68) 
                                : Colors.transparent,
                          ),
                          child: Text(
                            'TRANSFER',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: _tabController.index == 1 
                                  ? Colors.white 
                                  : const Color(0xFF0A4D68),
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                      ),
                    ),
                    Expanded(
                      child: InkWell(
                        onTap: () {
                          setState(() {
                            _tabController.animateTo(2);
                          });
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(vertical: 16),
                          decoration: BoxDecoration(
                            color: _tabController.index == 2 
                                ? const Color(0xFF0A4D68) 
                                : Colors.transparent,
                            borderRadius: const BorderRadius.only(
                              topRight: Radius.circular(16),
                            ),
                          ),
                          child: Text(
                            'PENGELUARAN',
                            textAlign: TextAlign.center,
                            style: TextStyle(
                              color: _tabController.index == 2 
                                  ? Colors.white 
                                  : const Color(0xFF0A4D68),
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                              letterSpacing: 1,
                            ),
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              // Content Area
              Container(
                constraints: BoxConstraints(
                  minHeight: MediaQuery.of(context).orientation == Orientation.landscape
                      ? MediaQuery.of(context).size.height * 0.5
                      : MediaQuery.of(context).size.height * 0.4,
                  maxHeight: MediaQuery.of(context).orientation == Orientation.landscape
                      ? MediaQuery.of(context).size.height * 0.8
                      : MediaQuery.of(context).size.height * 0.6,
                ),
                child: TabBarView(
                  controller: _tabController,
                  children: [
                    _buildTableContent(filterType: 'cash'), // Hanya Cash (income cash)
                    _buildTableContent(filterType: 'transfer'), // Hanya Transfer (income transfer)
                    _buildTableContent(filterType: 'expense'), // Hanya Pengeluaran
                  ],
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTableContent({String? filterType}) {
    if (_transactions.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.receipt_long,
                size: 64,
                color: Colors.grey.shade400,
              ),
              const SizedBox(height: 16),
              Text(
                'Belum ada transaksi',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    // Filter berdasarkan payment_method atau type
    Map<String, List<Map<String, dynamic>>> filteredGrouped;
    if (filterType == 'cash' || filterType == 'transfer') {
      // Filter berdasarkan payment_method untuk income
      final allGrouped = _groupedByMonth;
      filteredGrouped = {};
      for (final entry in allGrouped.entries) {
        final filtered = entry.value.where((transaction) {
          final recordType = _normalizeType(transaction['type'] ?? transaction['category']);
          // Hanya tampilkan income dengan payment_method yang sesuai
          if (recordType == 'income') {
            // Ambil payment_method, pastikan tidak null dan lowercase
            final rawPaymentMethod = transaction['payment_method'];
            final paymentMethod = (rawPaymentMethod?.toString().toLowerCase().trim() ?? 'cash');
            
            // Debug: print untuk troubleshooting
            print('🔍 [FILTER] description: ${transaction['description']}');
            print('🔍 [FILTER] raw payment_method: $rawPaymentMethod (type: ${rawPaymentMethod.runtimeType})');
            print('🔍 [FILTER] processed payment_method: $paymentMethod');
            print('🔍 [FILTER] filterType: $filterType');
            print('🔍 [FILTER] match: ${paymentMethod == filterType}');
            print('🔍 [FILTER] ---');
            
            return paymentMethod == filterType;
          }
          // Jangan tampilkan expense di tab Cash atau Transfer
          return false;
        }).toList();
        if (filtered.isNotEmpty) {
          filteredGrouped[entry.key] = filtered;
        }
      }
    } else if (filterType == 'expense') {
      // Hanya tampilkan expense
      filteredGrouped = _getGroupedByFilter('expense');
    } else {
      // filterType == null berarti tampilkan semua
      filteredGrouped = _groupedByMonth;
    }

    if (filteredGrouped.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                filterType == 'cash' 
                    ? Icons.money 
                    : filterType == 'transfer' 
                        ? Icons.account_balance_wallet 
                        : Icons.receipt_long,
                size: 64,
                color: Colors.grey.shade400,
              ),
              const SizedBox(height: 16),
              Text(
                filterType == 'cash'
                    ? 'Belum ada transaksi Cash'
                    : filterType == 'transfer'
                        ? 'Belum ada transaksi Transfer'
                        : filterType == 'expense'
                            ? 'Belum ada transaksi pengeluaran'
                            : 'Belum ada transaksi',
                style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }

    return ListView.builder(
      shrinkWrap: true,
      padding: const EdgeInsets.all(16),
      itemCount: filteredGrouped.length,
      itemBuilder: (context, index) {
        final entry = filteredGrouped.entries.elementAt(index);
        final monthKey = entry.key;
        final transactions = entry.value;
        
        return _buildMonthTable(monthKey, transactions, filterType);
      },
    );
  }

  Widget _buildMonthTable(String monthKey, List<Map<String, dynamic>> transactions, String? filterType) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          // Month Header
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade50,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(12),
                topRight: Radius.circular(12),
              ),
            ),
            child: Text(
              _formatMonth(monthKey),
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: Color(0xFF0A4D68),
              ),
            ),
          ),
          // Table Content
          ...transactions.asMap().entries.map((entry) {
            final index = entry.key;
            final transaction = entry.value;
            final isLast = index == transactions.length - 1;
            
            return _buildTableRow(transaction, isLast);
          }),
        ],
      ),
    );
  }

  Widget _buildTableRow(Map<String, dynamic> transaction, bool isLast) {
    final rawType = transaction['type'] ?? transaction['category'];
    final recordType = _normalizeType(rawType);
    final isIncome = recordType == 'income';

    dynamic amountValue = transaction['amount'];
    double amount = 0.0;
    if (amountValue != null) {
      if (amountValue is num) {
        amount = amountValue.toDouble();
      } else if (amountValue is String) {
        amount = double.tryParse(amountValue) ?? 0.0;
      }
    }

    final dateStr = transaction['date']?.toString() ?? transaction['created_at']?.toString() ?? '';
    final displayDate = dateStr.isNotEmpty
        ? (dateStr.contains('T') ? dateStr.split('T')[0] : dateStr.split(' ')[0])
        : '-';

    final showActions = !_isReadOnlyPeriod;
    return Container(
      decoration: BoxDecoration(
        border: Border(
          bottom: isLast 
              ? BorderSide.none 
              : BorderSide(color: Colors.grey.shade200, width: 1),
        ),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        leading: Container(
          width: 40,
          height: 40,
          decoration: BoxDecoration(
            color: isIncome ? Colors.green.shade50 : Colors.red.shade50,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(
            isIncome ? Icons.arrow_upward : Icons.arrow_downward,
            color: isIncome ? Colors.green.shade700 : Colors.red.shade700,
            size: 20,
          ),
        ),
        title: Text(
          transaction['description']?.toString() ?? '-',
          style: const TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            color: Colors.black87,
          ),
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Row(
            children: [
              Icon(Icons.calendar_today, size: 12, color: Colors.grey.shade600),
              const SizedBox(width: 4),
              Text(
                displayDate,
                style: TextStyle(
                  color: Colors.grey.shade600,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ),
        trailing: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              '${isIncome ? '+' : '-'}Rp ${_formatNumber(amount)}',
              style: TextStyle(
                color: isIncome ? Colors.green.shade700 : Colors.red.shade700,
                fontWeight: FontWeight.bold,
                fontSize: 14,
              ),
            ),
            if (showActions) ...[
              const SizedBox(width: 8),
              PopupMenuButton<String>(
                icon: const Icon(Icons.more_vert, size: 18),
                onSelected: (value) {
                  if (value == 'edit') {
                    _editTransaction(transaction);
                    _showCashflowFormDialog();
                  } else if (value == 'delete') {
                    _deleteTransaction(transaction);
                  }
                },
                itemBuilder: (context) => [
                  const PopupMenuItem(
                    value: 'edit',
                    child: Row(
                      children: [
                        Icon(Icons.edit, size: 18, color: Colors.blue),
                        SizedBox(width: 8),
                        Text('Edit'),
                      ],
                    ),
                  ),
                  const PopupMenuItem(
                    value: 'delete',
                    child: Row(
                      children: [
                        Icon(Icons.delete_outline, size: 18, color: Colors.red),
                        SizedBox(width: 8),
                        Text('Hapus'),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

}

// Dialog untuk form cashflow
class _CashflowFormDialog extends StatefulWidget {
  final GlobalKey<FormState> formKey;
  final TextEditingController dateController;
  final TextEditingController amountController;
  final TextEditingController customerMoneyController;
  final TextEditingController descriptionController;
  final TextEditingController notesController;
  final DateTime selectedDate;
  final String selectedType;
  final Map<String, dynamic>? editingTransaction;
  final bool isSubmitting;
  final Function(DateTime) onDateChanged;
  final Function(String) onTypeChanged;
  final Function(String) onPaymentMethodChanged;
  final String selectedPaymentMethod;
  final Future<void> Function() onPickDate;
  final Future<void> Function() onSubmit;
  final void Function() onCancel;

  const _CashflowFormDialog({
    required this.formKey,
    required this.dateController,
    required this.amountController,
    required this.customerMoneyController,
    required this.descriptionController,
    required this.notesController,
    required this.selectedDate,
    required this.selectedType,
    required this.editingTransaction,
    required this.isSubmitting,
    required this.onDateChanged,
    required this.onTypeChanged,
    required this.onPaymentMethodChanged,
    required this.selectedPaymentMethod,
    required this.onPickDate,
    required this.onSubmit,
    required this.onCancel,
  });

  @override
  State<_CashflowFormDialog> createState() => _CashflowFormDialogState();
}

class _CashflowFormDialogState extends State<_CashflowFormDialog> {
  late String _currentType;
  bool _showTypeSelection = true; // true = tampilkan pilihan tipe, false = tampilkan form

  @override
  void initState() {
    super.initState();
    _currentType = widget.selectedType;
    // Jika sedang edit, langsung tampilkan form (skip pilihan tipe)
    if (widget.editingTransaction != null) {
      _showTypeSelection = false;
    }
  }

  void _handleTypeSelected(String type) {
    setState(() {
      _currentType = type;
      widget.onTypeChanged(type);
      // Reset payment_method ke 'cash' saat pilih tipe baru
      if (type == 'income') {
        widget.onPaymentMethodChanged('cash');
      }
      _showTypeSelection = false; // Pindah ke form setelah pilih tipe
    });
  }

  void _handleBackToTypeSelection() {
    setState(() {
      _showTypeSelection = true;
    });
  }

  Future<void> _handleSubmit() async {
    if (!widget.formKey.currentState!.validate()) return;
    await widget.onSubmit();
    if (mounted) {
      Navigator.of(context).pop();
    }
  }

  void _handleCancel() {
    widget.onCancel();
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Container(
        constraints: BoxConstraints(
          maxHeight: MediaQuery.of(context).size.height * 0.9,
          maxWidth: isLandscape ? MediaQuery.of(context).size.width * 0.8 : double.infinity,
        ),
        child: SingleChildScrollView(
          padding: EdgeInsets.all(isLandscape ? 20 : 24),
          child: _showTypeSelection 
              ? _buildTypeSelection(isLandscape)
              : Form(
                  key: widget.formKey,
                  child: _buildFormContent(isLandscape),
                ),
        ),
      ),
    );
  }

  Widget _buildTypeSelection(bool isLandscape) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Pilih Tipe Transaksi',
              style: TextStyle(
                fontSize: isLandscape ? 18 : 20,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF0A4D68),
              ),
            ),
            IconButton(
              onPressed: _handleCancel,
              icon: const Icon(Icons.close),
            ),
          ],
        ),
        SizedBox(height: isLandscape ? 24 : 32),
        Row(
          children: [
            Expanded(
              child: InkWell(
                onTap: () => _handleTypeSelected('income'),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    border: Border.all(
                      color: Colors.green,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        Icons.trending_up,
                        color: Colors.green,
                        size: 48,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Pemasukan',
                        style: TextStyle(
                          color: Colors.green.shade900,
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: InkWell(
                onTap: () => _handleTypeSelected('expense'),
                child: Container(
                  padding: const EdgeInsets.symmetric(vertical: 24),
                  decoration: BoxDecoration(
                    color: Colors.red.shade50,
                    border: Border.all(
                      color: Colors.red,
                      width: 2,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Icon(
                        Icons.trending_down,
                        color: Colors.red,
                        size: 48,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        'Pengeluaran',
                        style: TextStyle(
                          color: Colors.red.shade900,
                          fontWeight: FontWeight.bold,
                          fontSize: 18,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildFormContent(bool isLandscape) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Row(
              children: [
                if (widget.editingTransaction == null)
                  IconButton(
                    onPressed: _handleBackToTypeSelection,
                    icon: const Icon(Icons.arrow_back),
                    padding: EdgeInsets.zero,
                    constraints: const BoxConstraints(),
                  ),
                if (widget.editingTransaction == null) const SizedBox(width: 8),
                Text(
                  widget.editingTransaction != null 
                      ? 'Edit Cashflow' 
                      : (_currentType == 'income' ? 'Tambah Pemasukan' : 'Tambah Pengeluaran'),
                  style: TextStyle(
                    fontSize: isLandscape ? 18 : 20,
                    fontWeight: FontWeight.bold,
                    color: const Color(0xFF0A4D68),
                  ),
                ),
              ],
            ),
            IconButton(
              onPressed: _handleCancel,
              icon: const Icon(Icons.close),
            ),
          ],
        ),
        SizedBox(height: isLandscape ? 16 : 20),
        // Payment Method (hanya untuk Pemasukan) - menggunakan Dropdown
        if (_currentType == 'income') ...[
          DropdownButtonFormField<String>(
            value: widget.selectedPaymentMethod,
            decoration: InputDecoration(
              labelText: 'Metode Pembayaran *',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              isDense: isLandscape,
              contentPadding: isLandscape 
                  ? const EdgeInsets.symmetric(vertical: 16, horizontal: 12)
                  : const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
            ),
            items: [
              DropdownMenuItem(
                value: 'cash',
                child: Row(
                  children: [
                    Icon(Icons.money, color: Colors.blue, size: 20),
                    const SizedBox(width: 8),
                    const Text('Cash'),
                  ],
                ),
              ),
              DropdownMenuItem(
                value: 'transfer',
                child: Row(
                  children: [
                    Icon(Icons.account_balance_wallet, color: Colors.purple, size: 20),
                    const SizedBox(width: 8),
                    const Text('Transfer'),
                  ],
                ),
              ),
            ],
            onChanged: (String? value) {
              if (value != null) {
                print('🔄 [DIALOG] Dropdown payment method berubah ke: $value');
                print('🔄 [DIALOG] Sebelum: widget.selectedPaymentMethod = ${widget.selectedPaymentMethod}');
                widget.onPaymentMethodChanged(value);
                print('🔄 [DIALOG] Sesudah: widget.selectedPaymentMethod = ${widget.selectedPaymentMethod}');
                setState(() {});
              } else {
                print('⚠️ [DIALOG] Dropdown payment method value is null!');
              }
            },
          ),
          SizedBox(height: isLandscape ? 12 : 16),
        ],
        // Jumlah (Rp)
        TextFormField(
          controller: widget.amountController,
          keyboardType: const TextInputType.numberWithOptions(decimal: false),
          inputFormatters: [
            FilteringTextInputFormatter.digitsOnly,
            ThousandsSeparatorInputFormatter(),
          ],
          decoration: InputDecoration(
            labelText: 'Jumlah (Rp) *',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
            isDense: isLandscape,
            contentPadding: isLandscape 
                ? const EdgeInsets.symmetric(vertical: 16, horizontal: 12)
                : const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
            prefixText: 'Rp ',
            hintText: '0',
          ),
          validator: (value) {
            final amount = value == null
                ? 0
                : ThousandsSeparatorInputFormatter.parseToDouble(value) ?? 0;
            if (amount <= 0) {
              return 'Jumlah harus lebih dari 0';
            }
            return null;
          },
        ),
        SizedBox(height: isLandscape ? 12 : 16),
        // Uang Customer dan Kembalian (hanya untuk Pemasukan dengan Cash)
        if (_currentType == 'income' && widget.selectedPaymentMethod == 'cash') ...[
          TextFormField(
            controller: widget.customerMoneyController,
            keyboardType: const TextInputType.numberWithOptions(decimal: false),
            inputFormatters: [
              FilteringTextInputFormatter.digitsOnly,
              ThousandsSeparatorInputFormatter(),
            ],
            decoration: InputDecoration(
              labelText: 'Uang Customer (Rp)',
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              isDense: isLandscape,
              contentPadding: isLandscape 
                  ? const EdgeInsets.symmetric(vertical: 16, horizontal: 12)
                  : const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
              prefixText: 'Rp ',
              hintText: '0',
              helperText: 'Masukkan uang yang diberikan customer',
            ),
            onChanged: (_) => setState(() {}), // Trigger rebuild untuk update kembalian
          ),
          SizedBox(height: isLandscape ? 8 : 12),
          // Tampilkan Nilai Kembalian (hanya jika ada input uang customer)
          Builder(
            builder: (context) {
              final amount = ThousandsSeparatorInputFormatter.parseToDouble(widget.amountController.text) ?? 0;
              final customerMoney = ThousandsSeparatorInputFormatter.parseToDouble(widget.customerMoneyController.text) ?? 0;
              
              // Hanya tampilkan kembalian jika ada input uang customer
              if (customerMoney <= 0) {
                return const SizedBox.shrink();
              }
              
              final kembalian = customerMoney - amount;
              
              return Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: kembalian >= 0 ? Colors.green.shade50 : Colors.red.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(
                    color: kembalian >= 0 ? Colors.green.shade200 : Colors.red.shade200,
                    width: 1.5,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        Icon(
                          kembalian >= 0 ? Icons.check_circle_outline : Icons.error_outline,
                          color: kembalian >= 0 ? Colors.green.shade700 : Colors.red.shade700,
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Kembalian:',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: isLandscape ? 13 : 14,
                            color: Colors.black87,
                          ),
                        ),
                      ],
                    ),
                    Text(
                      'Rp ${ThousandsSeparatorInputFormatter.formatNumber(kembalian >= 0 ? kembalian : 0)}',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: isLandscape ? 15 : 16,
                        color: kembalian >= 0 ? Colors.green.shade800 : Colors.red.shade800,
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
          SizedBox(height: isLandscape ? 12 : 16),
        ],
        // Description and Notes Row (landscape) or Column (portrait)
                if (isLandscape)
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: widget.descriptionController,
                          decoration: InputDecoration(
                            labelText: 'Deskripsi *',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                          ),
                          validator: (value) {
                            if (value == null || value.trim().isEmpty) {
                              return 'Deskripsi wajib diisi';
                            }
                            return null;
                          },
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: TextFormField(
                          controller: widget.notesController,
                          maxLines: 3,
                          decoration: InputDecoration(
                            labelText: 'Catatan (Opsional)',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                          ),
                          validator: (value) => null,
                        ),
                      ),
                    ],
                  )
                else
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      TextFormField(
                        controller: widget.descriptionController,
                        decoration: InputDecoration(
                          labelText: 'Deskripsi *',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) {
                          if (value == null || value.trim().isEmpty) {
                            return 'Deskripsi wajib diisi';
                          }
                          return null;
                        },
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: widget.notesController,
                        maxLines: 3,
                        decoration: InputDecoration(
                          labelText: 'Catatan (Opsional)',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        validator: (value) => null,
                      ),
                    ],
                  ),
        SizedBox(height: isLandscape ? 16 : 24),
        if (widget.editingTransaction != null) ...[
                  OutlinedButton(
                    onPressed: widget.isSubmitting ? null : _handleCancel,
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text(
                      'Batal Edit',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                    ),
                  ),
          const SizedBox(height: 12),
        ],
        ElevatedButton(
                  onPressed: widget.isSubmitting ? null : _handleSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00ACC1),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: widget.isSubmitting
                      ? const SizedBox(
                          height: 24,
                          width: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 3,
                            valueColor: AlwaysStoppedAnimation(Colors.white),
                          ),
                        )
                      : Text(
                          widget.editingTransaction != null ? 'Update Cashflow' : 'Simpan Cashflow',
                          style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                        ),
        ),
      ],
    );
  }
}







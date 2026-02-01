import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';
import 'package:sistem_absen_flutter_v2/services/cash_drawer_service.dart';
import 'package:sistem_absen_flutter_v2/widgets/cashflow_form_modal.dart';

class CashflowHomeScreen extends StatefulWidget {
  const CashflowHomeScreen({super.key});

  @override
  State<CashflowHomeScreen> createState() => _CashflowHomeScreenState();
}

class _CashflowHomeScreenState extends State<CashflowHomeScreen> {
  final _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
  bool _loading = true;
  Map<String, dynamic> _summary = {};
  List<Map<String, dynamic>> _transactions = [];

  @override
  void initState() {
    super.initState();
    _reloadAll();
  }

  Future<void> _reloadAll() async {
    setState(() => _loading = true);
    try {
      final summary = await ApiService.fetchCashflowSummary();
      final transactions = await ApiService.fetchCashflow();
      if (!mounted) return;
      transactions.sort((a, b) {
        final aDate = _parseDate(a['date'] ?? a['created_at']) ?? DateTime.fromMillisecondsSinceEpoch(0);
        final bDate = _parseDate(b['date'] ?? b['created_at']) ?? DateTime.fromMillisecondsSinceEpoch(0);
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
          content: Text('Gagal memuat data cashflow: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  DateTime? _parseDate(dynamic raw) {
    if (raw == null) return null;
    final text = raw.toString();
    final cleaned = text.contains('T') ? text.split('T').first : text;
    return DateTime.tryParse(cleaned);
  }

  bool _isIncome(Map<String, dynamic> entry) {
    final type = (entry['category'] ?? '').toString().toLowerCase();
    return type == 'income' || type == 'pemasukan';
  }

  List<Map<String, dynamic>> get _incomes => _transactions.where((tx) => _isIncome(tx)).toList();
  List<Map<String, dynamic>> get _expenses => _transactions.where((tx) => !_isIncome(tx)).toList();

  Future<void> _openAddCashflow() async {
    final result = await showModalBottomSheet<Map<String, String>>(
      context: context,
      isScrollControlled: true,
      builder: (_) => const CashflowFormModal(),
    );

    if (result == null) return;
    await _reloadAll();

    final type = result['type'];
    final method = result['method'];
    final shouldOpenDrawer =
        type == 'Pengeluaran' || (type == 'Pemasukan' && method == 'cash');

    if (shouldOpenDrawer) {
      await _openCashDrawer();
    }
  }

  Future<void> _openCashDrawer() async {
    try {
      final opened = await CashDrawerService.open();
      if (!mounted) return;
      final message = opened ? 'Laci kasir berhasil dibuka.' : 'Gagal membuka laci kasir.';
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(message), backgroundColor: opened ? Colors.green : Colors.orange),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Laci kasir gagal dibuka'), backgroundColor: Colors.orange),
      );
    }
  }

  Widget _buildSummaryCard() {
    final income = (_summary['total_income'] as num?)?.toDouble() ?? 0;
    final expense = (_summary['total_expense'] as num?)?.toDouble() ?? 0;
    final balance = (_summary['balance'] as num?)?.toDouble() ?? (income - expense);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        elevation: 2,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _SummaryMetric(label: 'Pemasukan', value: _currency.format(income), color: Colors.green),
              _SummaryMetric(label: 'Pengeluaran', value: _currency.format(expense), color: Colors.red),
              _SummaryMetric(label: 'Saldo Kas', value: _currency.format(balance), color: Colors.blue),
            ],
          ),
        ),
      ),
    );
  }

  Widget _sectionTitle(String title) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
    );
  }

  Widget _buildTransactionItem(Map<String, dynamic> tx) {
    final date = _parseDate(tx['date'] ?? tx['created_at']);
    final dateLabel = date != null ? DateFormat('dd MMM yyyy · HH:mm').format(date) : '-';
    final isIncome = _isIncome(tx);
    final amount = (tx['amount'] as num?)?.toDouble() ?? 0;
    final method = (tx['payment_method'] ?? 'cash').toString().toUpperCase();
    final description = tx['description']?.toString() ?? (isIncome ? 'Pemasukan' : 'Pengeluaran');
    final notes = tx['notes']?.toString();

    return ListTile(
      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      leading: CircleAvatar(
        backgroundColor: isIncome ? Colors.green.shade50 : Colors.red.shade50,
        child: Icon(
          isIncome ? Icons.arrow_upward : Icons.arrow_downward,
          color: isIncome ? Colors.green : Colors.red,
        ),
      ),
      title: Text(description, style: const TextStyle(fontWeight: FontWeight.w600)),
      subtitle: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$dateLabel • $method'),
          if (notes != null && notes.isNotEmpty)
            Text(notes, style: const TextStyle(fontSize: 12, color: Colors.black54)),
        ],
      ),
      trailing: Text(
        '${isIncome ? '+' : '-'}${_currency.format(amount.abs())}',
        style: TextStyle(
          color: isIncome ? Colors.green.shade700 : Colors.red.shade700,
          fontWeight: FontWeight.bold,
        ),
      ),
    );
  }

  Widget _buildTransactionList() {
    final children = <Widget>[
      _sectionTitle('Pemasukan'),
      if (_incomes.isEmpty)
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text('Belum ada pemasukan'),
        )
      else
        ..._incomes.map(_buildTransactionItem),
      const SizedBox(height: 16),
      _sectionTitle('Pengeluaran'),
      if (_expenses.isEmpty)
        const Padding(
          padding: EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          child: Text('Belum ada pengeluaran'),
        )
      else
        ..._expenses.map(_buildTransactionItem),
      const SizedBox(height: 16),
    ];

    return Expanded(
      child: RefreshIndicator(
        onRefresh: _reloadAll,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: _loading
              ? const [
                  SizedBox(
                    height: 200,
                    child: Center(child: CircularProgressIndicator()),
                  ),
                ]
              : children,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cashflow'),
        backgroundColor: const Color(0xFF0A4D68),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          _buildSummaryCard(),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: _openAddCashflow,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0A4D68),
                  textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
                child: const Text('Tambah Cashflow'),
              ),
            ),
          ),
          _buildTransactionList(),
        ],
      ),
    );
  }
}

class _SummaryMetric extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _SummaryMetric({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

class CashflowHomeScreen extends StatefulWidget {
  const CashflowHomeScreen({super.key});

  @override
  State<CashflowHomeScreen> createState() => _CashflowHomeScreenState();
}

class _CashflowHomeScreenState extends State<CashflowHomeScreen> {
  final _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);
  final _dateFormatter = DateFormat('dd MMM yyyy', 'id_ID');

  bool _isLoadingSummary = true;
  bool _isLoadingTransactions = true;
  Map<String, dynamic>? _summary;
  List<Map<String, dynamic>> _transactions = [];

  @override
  void initState() {
    super.initState();
    _loadCashflowSummary();
    _loadCashflowTransactions();
  }

  DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    final raw = value.toString();
    final cleaned = raw.contains('T') ? raw.split('T').first : raw;
    return DateTime.tryParse(cleaned);
  }

  Future<void> _loadCashflowSummary() async {
    setState(() => _isLoadingSummary = true);
    try {
      final data = await ApiService.fetchCashflowSummary();
      if (!mounted) return;
      setState(() {
        _summary = data;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal memuat ringkasan cashflow: $e'),
          backgroundColor: Colors.orange,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoadingSummary = false);
      }
    }
  }

  Future<void> _loadCashflowTransactions() async {
    setState(() => _isLoadingTransactions = true);
    try {
      final fetched = await ApiService.fetchCashflow();
      if (!mounted) return;
      final normalized = List<Map<String, dynamic>>.from(fetched);
      normalized.sort((a, b) {
        final aDate = _parseDate(a['date'] ?? a['created_at']) ?? DateTime.fromMillisecondsSinceEpoch(0);
        final bDate = _parseDate(b['date'] ?? b['created_at']) ?? DateTime.fromMillisecondsSinceEpoch(0);
        return bDate.compareTo(aDate);
      });
      setState(() {
        _transactions = normalized;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal memuat transaksi cashflow: $e'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoadingTransactions = false);
      }
    }
  }

  bool _isIncome(Map<String, dynamic> tx) {
    final type = (tx['category'] ?? '').toString().toLowerCase();
    return type == 'income' || type == 'pemasukan';
  }

  Future<void> _showAddCashflowModal() async {
    final formKey = GlobalKey<FormState>();
    final amountController = TextEditingController();
    final notesController = TextEditingController();
    DateTime selectedDate = DateTime.now();
    String selectedType = 'Pemasukan';
    String paymentMethod = 'cash';
    bool isSubmitting = false;
    final dateController = TextEditingController(text: _dateFormatter.format(selectedDate));

    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (modalContext) {
        return StatefulBuilder(builder: (context, setModalState) {
          Future<void> _pickDate() async {
            final picked = await showDatePicker(
              context: modalContext,
              initialDate: selectedDate,
              firstDate: DateTime(2020),
              lastDate: DateTime.now(),
            );
            if (picked != null) {
              selectedDate = picked;
              dateController.text = _dateFormatter.format(selectedDate);
              setModalState(() {});
            }
          }

          return Padding(
            padding: EdgeInsets.only(
              bottom: MediaQuery.of(modalContext).viewInsets.bottom,
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: SingleChildScrollView(
                child: Form(
                  key: formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text('Catat Cashflow', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      TextFormField(
                        readOnly: true,
                        onTap: _pickDate,
                        decoration: InputDecoration(
                          labelText: 'Tanggal',
                          border: const OutlineInputBorder(),
                          suffixIcon: const Icon(Icons.calendar_today),
                        ),
                        controller: dateController,
                      ),
                      const SizedBox(height: 12),
                      DropdownButtonFormField<String>(
                        value: selectedType,
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
                          setModalState(() {
                            selectedType = value;
                            if (value == 'Pengeluaran') {
                              paymentMethod = 'cash';
                            }
                          });
                        },
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: amountController,
                        keyboardType: TextInputType.number,
                        inputFormatters: [FilteringTextInputFormatter.digitsOnly],
                        validator: (value) {
                          final cleaned = (value ?? '').replaceAll(RegExp(r'[^\d]'), '');
                          final numeric = double.tryParse(cleaned) ?? 0;
                          if (numeric <= 0) {
                            return 'Jumlah wajib lebih dari 0';
                          }
                          return null;
                        },
                        decoration: const InputDecoration(
                          labelText: 'Jumlah (Rp)',
                          border: OutlineInputBorder(),
                        ),
                      ),
                      const SizedBox(height: 12),
                      if (selectedType == 'Pemasukan') ...[
                        DropdownButtonFormField<String>(
                          value: paymentMethod,
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
                            setModalState(() => paymentMethod = value);
                          },
                        ),
                        const SizedBox(height: 12),
                      ],
                      TextFormField(
                        controller: notesController,
                        decoration: const InputDecoration(
                          labelText: 'Catatan (opsional)',
                          border: OutlineInputBorder(),
                        ),
                        maxLines: 3,
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: isSubmitting
                            ? null
                            : () async {
                                if (!formKey.currentState!.validate()) return;
                                final rawAmount = amountController.text.replaceAll(RegExp(r'[^\d]'), '');
                                final amount = double.tryParse(rawAmount) ?? 0;
                                if (amount <= 0) return;
                                setModalState(() => isSubmitting = true);
                                final payload = {
                                  'date': DateFormat('yyyy-MM-dd').format(selectedDate),
                                  'category': selectedType == 'Pemasukan' ? 'income' : 'expense',
                                  'amount': amount,
                                  'description': notesController.text.trim().isNotEmpty
                                      ? notesController.text.trim()
                                      : selectedType,
                                  'payment_method': selectedType == 'Pemasukan' ? paymentMethod : 'cash',
                                };
                                if (notesController.text.trim().isNotEmpty) {
                                  payload['notes'] = notesController.text.trim();
                                }
                                try {
                                  await ApiService.createCashflow(payload);
                                  final shouldOpenDrawer = (selectedType == 'Pemasukan' && paymentMethod == 'cash') ||
                                      selectedType == 'Pengeluaran';
                                  if (shouldOpenDrawer) {
                                    final opened = await CashDrawerService.open();
                                    if (!opened) {
                                      ScaffoldMessenger.of(modalContext).showSnackBar(
                                        const SnackBar(
                                          content: Text('Gagal membuka laci kasir'),
                                          backgroundColor: Colors.orange,
                                        ),
                                      );
                                    }
                                  }
                                  if (!mounted) return;
                                  Navigator.of(modalContext).pop(true);
                                } catch (e) {
                                  if (!mounted) return;
                                  ScaffoldMessenger.of(modalContext).showSnackBar(
                                    SnackBar(
                                      content: Text('Gagal menyimpan cashflow: $e'),
                                      backgroundColor: Colors.red,
                                    ),
                                  );
                                } finally {
                                  if (mounted) setModalState(() => isSubmitting = false);
                                }
                              },
                        child: Text(isSubmitting ? 'Menyimpan...' : 'Simpan Cashflow'),
                      ),
                      const SizedBox(height: 12),
                    ],
                  ),
                ),
              ),
            ),
          );
        });
      },
    );

    dateController.dispose();
    amountController.dispose();
    notesController.dispose();

    if (saved == true) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cashflow tersimpan'), backgroundColor: Colors.green),
      );
      await _loadCashflowSummary();
      await _loadCashflowTransactions();
    }
  }

  Widget _buildSummaryCard() {
    final income = (_summary?['total_income'] as num?)?.toDouble() ?? 0;
    final expense = (_summary?['total_expense'] as num?)?.toDouble() ?? 0;
    final balance = (_summary?['balance'] as num?)?.toDouble() ?? (income - expense);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Card(
        elevation: 2,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              _SummaryMetric(label: 'Pemasukan', value: _currency.format(income), color: Colors.green),
              _SummaryMetric(label: 'Pengeluaran', value: _currency.format(expense), color: Colors.red),
              _SummaryMetric(label: 'Saldo Kas', value: _currency.format(balance), color: Colors.blue),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTransactionList() {
    final listContent = _isLoadingTransactions
        ? ListView(
            physics: const AlwaysScrollableScrollPhysics(),
            children: const [
              SizedBox(
                height: 200,
                child: Center(child: CircularProgressIndicator()),
              ),
            ],
          )
        : (_transactions.isEmpty
            ? ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(
                    height: 200,
                    child: Center(child: Text('Belum ada transaksi cashflow')),
                  ),
                ],
              )
            : ListView.separated(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                itemCount: _transactions.length,
                separatorBuilder: (context, index) => const Divider(height: 8),
                itemBuilder: (context, index) {
                  final tx = _transactions[index];
                  final date = _parseDate(tx['date'] ?? tx['created_at']);
                  final dateLabel = date != null ? DateFormat('dd MMM yyyy · HH:mm').format(date) : '-';
                  final isIncome = _isIncome(tx);
                  final amount = (tx['amount'] as num?)?.toDouble() ?? 0;
                  final method = (tx['payment_method'] ?? 'cash').toString().toUpperCase();
                  final description = tx['description']?.toString() ?? (isIncome ? 'Pemasukan' : 'Pengeluaran');
                  final notes = tx['notes']?.toString();
                  return ListTile(
                    contentPadding: const EdgeInsets.symmetric(horizontal: 0, vertical: 4),
                    leading: CircleAvatar(
                      backgroundColor: isIncome ? Colors.green.shade50 : Colors.red.shade50,
                      child: Icon(isIncome ? Icons.arrow_upward : Icons.arrow_downward,
                          color: isIncome ? Colors.green : Colors.red),
                    ),
                    title: Text(description, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('$dateLabel • $method'),
                        if (notes != null && notes.isNotEmpty)
                          Text(
                            notes,
                            style: const TextStyle(fontSize: 12, color: Colors.black54),
                          ),
                      ],
                    ),
                    trailing: Text(
                      '${isIncome ? '+' : '-'}${_currency.format(amount.abs())}',
                      style: TextStyle(
                        color: isIncome ? Colors.green.shade700 : Colors.red.shade700,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  );
                },
              ));

    return Expanded(
      child: RefreshIndicator(
        onRefresh: () async {
          await Future.wait([
            _loadCashflowSummary(),
            _loadCashflowTransactions(),
          ]);
        },
        child: listContent,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cashflow'),
        backgroundColor: const Color(0xFF0A4D68),
      ),
      body: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const SizedBox(height: 16),
          _buildSummaryCard(),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: SizedBox(
              height: 48,
              child: ElevatedButton(
                onPressed: _showAddCashflowModal,
                child: const Text('Tambah Cashflow'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF0A4D68),
                  textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                ),
              ),
            ),
          ),
          _buildTransactionList(),
        ],
      ),
    );
  }
}

class _SummaryMetric extends StatelessWidget {
  final String label;
  final String value;
  final Color color;

  const _SummaryMetric({
    required this.label,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: TextStyle(color: color, fontWeight: FontWeight.w600)),
        const SizedBox(height: 6),
        Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
      ],
    );
  }
}


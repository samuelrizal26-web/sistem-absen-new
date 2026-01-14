import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';
import 'package:sistem_absen_flutter_v2/services/cash_drawer_service.dart';

class CashflowHomeScreen extends StatefulWidget {
  const CashflowHomeScreen({super.key});

  @override
  State<CashflowHomeScreen> createState() => _CashflowHomeScreenState();
}

class _CashflowHomeScreenState extends State<CashflowHomeScreen> with SingleTickerProviderStateMixin {
  final _currency = NumberFormat.currency(locale: 'id_ID', symbol: 'Rp ', decimalDigits: 0);

  bool _isLoading = true;
  List<Map<String, dynamic>> _entries = [];
  late final TabController _tabController;
  final List<String> _tabKeys = ['cash', 'transfer', 'pengeluaran'];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _tabKeys.length, vsync: this)
      ..addListener(() {
        if (!_tabController.indexIsChanging) {
          setState(() {});
        }
      });
    _loadTransactions();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadTransactions() async {
    setState(() => _isLoading = true);
    try {
      final fetched = await ApiService.fetchCashflow();
      if (!mounted) return;
      setState(() {
        _entries = List<Map<String, dynamic>>.from(fetched);
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memuat cashflow: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  DateTime? _parseDate(dynamic value) {
    if (value == null) return null;
    final text = value.toString();
    final clean = text.contains('T') ? text.split('T').first : text;
    return DateTime.tryParse(clean);
  }

  bool _isIncome(Map<String, dynamic> tx) {
    final type = (tx['type'] ?? tx['category'])?.toString().toLowerCase() ?? '';
    return type == 'income' || type == 'pemasukan';
  }

  List<Map<String, dynamic>> _filterEntriesByTab(String tabKey) {
    return _entries.where((tx) {
      final method = (tx['payment_method'] ?? '').toString().toLowerCase();
      final type = (tx['type'] ?? tx['category'])?.toString().toLowerCase() ?? '';
      if (tabKey == 'cash') {
        return _isIncome(tx) && method == 'cash';
      }
      if (tabKey == 'transfer') {
        return _isIncome(tx) && method == 'transfer';
      }
      return type == 'expense' || type == 'pengeluaran';
    }).toList();
  }

  Widget _buildSummaryCards(List<Map<String, dynamic>> filteredEntries) {
    final now = DateTime.now();
    final monthEntries = filteredEntries.where((tx) {
      final date = _parseDate(tx['date'] ?? tx['created_at']);
      if (date == null) return false;
      return date.year == now.year && date.month == now.month;
    });
    final income = monthEntries.where(_isIncome).fold<double>(0, (sum, tx) {
      final amount = (tx['amount'] as num?)?.toDouble() ?? 0;
      return sum + amount;
    });
    final expense = monthEntries.where((tx) => !_isIncome(tx)).fold<double>(0, (sum, tx) {
      final amount = (tx['amount'] as num?)?.toDouble() ?? 0;
      return sum + amount;
    });
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16),
      child: Row(
        children: [
          Expanded(
            child: _SummaryCard(
              label: 'Pemasukan',
              value: _currency.format(income),
              icon: Icons.arrow_upward,
              color: Colors.green,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: _SummaryCard(
              label: 'Pengeluaran',
              value: _currency.format(expense),
              icon: Icons.arrow_downward,
              color: Colors.red,
            ),
          ),
        ],
      ),
    );
  }

  List<_TimelineRow> _buildTimelineRows(List<Map<String, dynamic>> entries) {
    final sorted = List<Map<String, dynamic>>.from(entries)
      ..sort((a, b) {
        final aDate = _parseDate(a['date'] ?? a['created_at']) ?? DateTime.fromMillisecondsSinceEpoch(0);
        final bDate = _parseDate(b['date'] ?? b['created_at']) ?? DateTime.fromMillisecondsSinceEpoch(0);
        return bDate.compareTo(aDate);
      });
    final rows = <_TimelineRow>[];
    String? currentLabel;
    for (final entry in sorted) {
      final date = _parseDate(entry['date'] ?? entry['created_at']);
      if (date == null) continue;
      final label = DateFormat('MMMM yyyy', 'id_ID').format(date);
      if (currentLabel != label) {
        currentLabel = label;
        rows.add(_TimelineRow.header(label));
      }
      rows.add(_TimelineRow.entry(entry));
    }
    return rows;
  }

  Widget _buildTabContent(String tabKey) {
    final entries = _filterEntriesByTab(tabKey);
    if (entries.isEmpty) {
      return const Center(child: Text('Belum ada transaksi untuk tab ini.'));
    }
    final rows = _buildTimelineRows(entries);
    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: rows.length,
      itemBuilder: (context, index) {
        final row = rows[index];
        if (row.isHeader) {
          return Padding(
            padding: const EdgeInsets.only(top: 12, bottom: 4),
            child: Text(row.header!, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
          );
        }
        final tx = row.entry!;
        final date = _parseDate(tx['date'] ?? tx['created_at']);
        final timeLabel = date != null ? DateFormat.Hm().format(date) : '-';
        final amount = (tx['amount'] as num?)?.toDouble() ?? 0.0;
        final method = (tx['payment_method'] ?? '').toString().toUpperCase();
        final isIncome = _isIncome(tx);
        return Column(
          children: [
            ListTile(
              leading: CircleAvatar(
                backgroundColor: isIncome ? Colors.green.shade100 : Colors.red.shade100,
                child: Icon(isIncome ? Icons.arrow_upward : Icons.arrow_downward, color: isIncome ? Colors.green : Colors.red),
              ),
              title: Text(tx['description'] ?? '-', style: const TextStyle(fontWeight: FontWeight.w600)),
              subtitle: Text('$timeLabel • $method'),
              trailing: Text(
                _currency.format(amount),
                style: TextStyle(color: isIncome ? Colors.green.shade700 : Colors.red.shade700, fontWeight: FontWeight.bold),
              ),
            ),
            const Divider(height: 1),
          ],
        );
      },
    );
  }

  Future<void> _showTypeSelection() async {
    await showModalBottomSheet(
      context: context,
      builder: (context) {
        return Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Pilih Tipe Transaksi', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  _showIncomeForm();
                },
                style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
                child: const Text('Pemasukan'),
              ),
              const SizedBox(height: 12),
              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pop();
                  _showExpenseForm();
                },
                style: ElevatedButton.styleFrom(backgroundColor: Colors.redAccent),
                child: const Text('Pengeluaran'),
              ),
            ],
          ),
        );
      },
    );
  }

  Future<void> _showIncomeForm() async {
    final amountController = TextEditingController();
    final customerController = TextEditingController();
    final descriptionController = TextEditingController();
    final notesController = TextEditingController();
    String paymentMethod = 'cash';
    bool isSubmitting = false;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(builder: (context, setModalState) {
          return Padding(
            padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Tambah Pemasukan', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  const Text('Metode Pembayaran', style: TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      ChoiceChip(
                        label: const Text('Cash'),
                        selected: paymentMethod == 'cash',
                        onSelected: (_) => setModalState(() => paymentMethod = 'cash'),
                      ),
                      const SizedBox(width: 12),
                      ChoiceChip(
                        label: const Text('Transfer'),
                        selected: paymentMethod == 'transfer',
                        onSelected: (_) => setModalState(() => paymentMethod = 'transfer'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: amountController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Jumlah (Rp)', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  if (paymentMethod == 'cash') ...[
                    TextField(
                      controller: customerController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Uang Customer (Rp)', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                  ],
                  TextField(
                    controller: descriptionController,
                    decoration: const InputDecoration(labelText: 'Deskripsi', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: notesController,
                    decoration: const InputDecoration(labelText: 'Catatan (opsional)', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            final amount = double.tryParse(amountController.text.replaceAll(RegExp(r'[^\d]'), '')) ?? 0;
                            final description = descriptionController.text.trim();
                            if (amount <= 0 || description.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Jumlah dan deskripsi wajib diisi'), backgroundColor: Colors.orange),
                              );
                              return;
                            }
                            if (paymentMethod == 'cash') {
                              final customer = double.tryParse(customerController.text.replaceAll(RegExp(r'[^\d]'), '')) ?? 0;
                              if (customer <= 0) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Uang customer wajib diisi untuk cash'), backgroundColor: Colors.orange),
                                );
                                return;
                              }
                            }
                            setModalState(() => isSubmitting = true);
                            if (paymentMethod == 'cash') {
                              final opened = await CashDrawerService.open();
                              if (!opened) {
                                ScaffoldMessenger.of(context).showSnackBar(
                                  const SnackBar(content: Text('Gagal membuka laci kasir'), backgroundColor: Colors.orange),
                                );
                              }
                            }
                            final body = {
                              'type': 'income',
                              'amount': amount,
                              'description': description,
                              'payment_method': paymentMethod,
                            };
                            if (notesController.text.trim().isNotEmpty) {
                              body['notes'] = notesController.text.trim();
                            }
                            try {
                              await ApiService.createCashflow(body);
                              if (!mounted) return;
                              Navigator.of(context).pop();
                              await _loadTransactions();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Cashflow tersimpan'), backgroundColor: Colors.green),
                              );
                            } catch (e) {
                              if (!mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Gagal menyimpan: $e'), backgroundColor: Colors.red),
                              );
                            } finally {
                              setModalState(() => isSubmitting = false);
                            }
                          },
                    child: Text(isSubmitting ? 'Menyimpan...' : 'Simpan'),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          );
        });
      },
    );
  }

  Future<void> _showExpenseForm() async {
    final amountController = TextEditingController();
    final descriptionController = TextEditingController();
    final notesController = TextEditingController();
    bool isSubmitting = false;

    await showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (context) {
        return StatefulBuilder(builder: (context, setModalState) {
          return Padding(
            padding: EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text('Tambah Pengeluaran', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  const SizedBox(height: 12),
                  TextField(
                    controller: amountController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Jumlah (Rp)', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: descriptionController,
                    decoration: const InputDecoration(labelText: 'Deskripsi', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 12),
                  TextField(
                    controller: notesController,
                    decoration: const InputDecoration(labelText: 'Catatan (opsional)', border: OutlineInputBorder()),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: isSubmitting
                        ? null
                        : () async {
                            final amount = double.tryParse(amountController.text.replaceAll(RegExp(r'[^\d]'), '')) ?? 0;
                            final description = descriptionController.text.trim();
                            if (amount <= 0 || description.isEmpty) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Jumlah dan deskripsi wajib diisi'), backgroundColor: Colors.orange),
                              );
                              return;
                            }
                            setModalState(() => isSubmitting = true);
                            final opened = await CashDrawerService.open();
                            if (!opened) {
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Gagal membuka laci kasir'), backgroundColor: Colors.orange),
                              );
                            }
                            final body = {
                              'type': 'expense',
                              'amount': amount,
                              'description': description,
                              'payment_method': 'cash',
                            };
                            if (notesController.text.trim().isNotEmpty) {
                              body['notes'] = notesController.text.trim();
                            }
                            try {
                              await ApiService.createCashflow(body);
                              if (!mounted) return;
                              Navigator.of(context).pop();
                              await _loadTransactions();
                              ScaffoldMessenger.of(context).showSnackBar(
                                const SnackBar(content: Text('Cashflow tersimpan'), backgroundColor: Colors.green),
                              );
                            } catch (e) {
                              if (!mounted) return;
                              ScaffoldMessenger.of(context).showSnackBar(
                                SnackBar(content: Text('Gagal menyimpan: $e'), backgroundColor: Colors.red),
                              );
                            } finally {
                              setModalState(() => isSubmitting = false);
                            }
                          },
                    child: Text(isSubmitting ? 'Menyimpan...' : 'Simpan'),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
          );
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final currentTabKey = _tabKeys[_tabController.index];
    final filteredForSummary = _filterEntriesByTab(currentTabKey);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Cashflow'),
        backgroundColor: const Color(0xFF0A4D68),
        actions: [
          TextButton(
            onPressed: _showTypeSelection,
            child: const Text('+ Tambah Cashflow', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Column(
              children: [
                const SizedBox(height: 16),
                _buildSummaryCards(filteredForSummary),
                const SizedBox(height: 8),
                TabBar(
                  controller: _tabController,
                  labelColor: const Color(0xFF0A4D68),
                  unselectedLabelColor: Colors.grey,
                  tabs: const [
                    Tab(text: 'CASH'),
                    Tab(text: 'TRANSFER'),
                    Tab(text: 'PENGELUARAN'),
                  ],
                ),
                const Divider(height: 0),
                Expanded(
                  child: TabBarView(
                    controller: _tabController,
                    children: _tabKeys.map((key) => _buildTabContent(key)).toList(),
                  ),
                ),
              ],
            ),
    );
  }
}

class _TimelineRow {
  final String? header;
  final Map<String, dynamic>? entry;

  const _TimelineRow._({this.header, this.entry});

  factory _TimelineRow.header(String label) => _TimelineRow._(header: label);
  factory _TimelineRow.entry(Map<String, dynamic> tx) => _TimelineRow._(entry: tx);

  bool get isHeader => header != null;
}

class _SummaryCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _SummaryCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: const [
          BoxShadow(color: Color(0x14000000), blurRadius: 12, offset: Offset(0, 6)),
        ],
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: color.withOpacity(0.15),
            child: Icon(icon, color: color),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}


import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:sistem_absen_flutter_v2/models/employee.dart';
import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';
import 'package:sistem_absen_flutter_v2/services/cash_drawer_service.dart';

class AdminKasbonScreen extends StatefulWidget {
  const AdminKasbonScreen({super.key});

  @override
  State<AdminKasbonScreen> createState() => _AdminKasbonScreenState();
}

class _AdminKasbonScreenState extends State<AdminKasbonScreen> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  late Future<List<dynamic>> _dataFuture;
  String? _selectedEmployeeId;
  bool _isSubmitting = false;
  String _paymentMethod = 'cash';
  DateTime _activePeriod = DateTime(DateTime.now().year, DateTime.now().month);
  bool _isSelectingPeriod = false;

  @override
  void initState() {
    super.initState();
    _dataFuture = _loadData();
  }

  Future<List<dynamic>> _loadData() {
    return Future.wait([
      ApiService.fetchEmployees(),
      ApiService.fetchKasbon(),
    ]);
  }

  Future<void> _refreshData() async {
    final next = _loadData();
    setState(() => _dataFuture = next);
    await next;
  }

  Future<void> _submitKasbon() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedEmployeeId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih pegawai terlebih dahulu')),
      );
      return;
    }
    final amount = int.tryParse(_amountController.text.replaceAll('.', '')) ?? 0;
    if (amount <= 0) return;
    setState(() => _isSubmitting = true);
    try {
      await ApiService.createKasbon(
        employeeId: _selectedEmployeeId!,
        amount: amount,
        note: _noteController.text.trim(),
        payment_method: _paymentMethod,
      );
      if (_paymentMethod == 'cash') {
        final opened = await CashDrawerService.open();
        if (!opened) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Gagal membuka laci kasir'), backgroundColor: Colors.orange),
          );
        }
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kasbon disimpan'), backgroundColor: Colors.green),
      );
      _amountController.clear();
      _noteController.clear();
      await _refreshData();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  String _formatCurrency(num value) {
    final formatter = NumberFormat.currency(locale: 'id', symbol: 'Rp ', decimalDigits: 0);
    return formatter.format(value);
  }

  bool get _isReadOnlyPeriod =>
      _activePeriod.year != DateTime.now().year || _activePeriod.month != DateTime.now().month;

  List<Map<String, dynamic>> _filterKasbonByPeriod(
    List<Map<String, dynamic>> records,
    DateTime period,
  ) {
    return records.where((record) {
      final date = _parseDate(record);
      if (date == null) return false;
      return date.year == period.year && date.month == period.month;
    }).toList();
  }

  Future<void> _pickKasbonPeriod() async {
    setState(() => _isSelectingPeriod = true);
    final now = DateTime.now();
    int selectedMonth = _activePeriod.month;
    int selectedYear = _activePeriod.year;
    final period = await showDialog<DateTime>(
      context: context,
      builder: (context) {
        return StatefulBuilder(builder: (context, setState) {
          return AlertDialog(
            title: const Text('Pilih Periode Kasbon'),
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
                      child: Text(DateFormat('MMMM', 'id_ID').format(DateTime(0, index + 1))),
                    ),
                  ),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => selectedMonth = value);
                    }
                  },
                ),
                const SizedBox(height: 12),
                DropdownButtonFormField<int>(
                  value: selectedYear,
                  decoration: const InputDecoration(labelText: 'Tahun'),
                  items: List.generate(5, (index) => now.year - index)
                      .map((year) => DropdownMenuItem(value: year, child: Text(year.toString())))
                      .toList(),
                  onChanged: (value) {
                    if (value != null) {
                      setState(() => selectedYear = value);
                    }
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
                onPressed: () => Navigator.of(context).pop(DateTime(selectedYear, selectedMonth)),
                child: const Text('Pilih'),
              ),
            ],
          );
        });
      },
    );
    if (!mounted) return;
    setState(() {
      _isSelectingPeriod = false;
      if (period != null) {
        _activePeriod = DateTime(period.year, period.month);
      }
    });
  }

  DateTime? _parseDate(Map<String, dynamic> row) {
    final raw = row['date'] ?? row['created_at'];
    if (raw == null) return null;
    return DateTime.tryParse(raw.toString());
  }

  @override
  void dispose() {
    _amountController.dispose();
    _noteController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      appBar: AppBar(
        title: const Text('Admin Kasbon'),
        backgroundColor: const Color(0xFF0A4D68),
        actions: [
          IconButton(
            tooltip: 'Pilih Periode Kasbon',
            onPressed: _isSelectingPeriod ? null : _pickKasbonPeriod,
            icon: const Icon(Icons.calendar_month),
          ),
        ],
      ),
      body: FutureBuilder<List<dynamic>>(
        future: _dataFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Gagal memuat data: ${snapshot.error}'));
          }
          final employees = (snapshot.data?[0] as List<Employee>?) ?? [];
          final kasbonRecords = (snapshot.data?[1] as List<Map<String, dynamic>>?) ?? [];
          if (_selectedEmployeeId == null && employees.isNotEmpty) {
            _selectedEmployeeId = employees.first.employeeId;
          }
          final employeeNames = {for (final emp in employees) emp.employeeId: emp.name};
          final filteredRecords = _filterKasbonByPeriod(kasbonRecords, _activePeriod);
          return RefreshIndicator(
            onRefresh: _refreshData,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Pengajuan kasbon dicatat sebagai kas keluar.',
                    style: TextStyle(color: Colors.black54),
                  ),
                  const SizedBox(height: 16),
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Form(
                        key: _formKey,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            DropdownButtonFormField<String>(
                              decoration: const InputDecoration(
                                labelText: 'Pilih Pegawai',
                                border: OutlineInputBorder(),
                              ),
                              value: _selectedEmployeeId,
                              items: employees
                                  .map(
                                    (employee) => DropdownMenuItem(
                                      value: employee.employeeId,
                                      child: Text(employee.name),
                                    ),
                                  )
                                  .toList(),
                              onChanged: (value) => setState(() => _selectedEmployeeId = value),
                              validator: (value) => value == null ? 'Pilih pegawai' : null,
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _amountController,
                              keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Jumlah (Rp)',
                              border: OutlineInputBorder(),
                            ),
                              validator: (value) {
                                if (value == null || value.trim().isEmpty) {
                                  return 'Jumlah wajib diisi';
                                }
                                if (int.tryParse(value.replaceAll('.', '')) == null) {
                                  return 'Masukkan angka yang valid';
                                }
                                return null;
                              },
                            ),
                            const SizedBox(height: 16),
                            const SizedBox(height: 16),
                            Text(
                              'Metode Pembayaran',
                              style: TextStyle(color: Colors.grey.shade700, fontWeight: FontWeight.w600),
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                ChoiceChip(
                                  label: const Text('CASH'),
                                  selected: _paymentMethod == 'cash',
                                  onSelected: (_) => setState(() => _paymentMethod = 'cash'),
                                ),
                                const SizedBox(width: 8),
                                ChoiceChip(
                                  label: const Text('TRANSFER'),
                                  selected: _paymentMethod == 'transfer',
                                  onSelected: (_) => setState(() => _paymentMethod = 'transfer'),
                                ),
                              ],
                            ),
                            const SizedBox(height: 16),
                            TextFormField(
                              controller: _noteController,
                              maxLines: 2,
                              decoration: const InputDecoration(
                                labelText: 'Catatan (opsional)',
                                border: OutlineInputBorder(),
                              ),
                            ),
                            const SizedBox(height: 20),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed:
                                    (_isSubmitting || _isReadOnlyPeriod) ? null : _submitKasbon,
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: const Color(0xFF0A4D68),
                                  padding: const EdgeInsets.symmetric(vertical: 16),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                ),
                                child: _isSubmitting
                                    ? const SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                          valueColor: AlwaysStoppedAnimation(Colors.white),
                                        ),
                                      )
                                    : const Text('Ajukan Kasbon'),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Text(
                    'Riwayat Kasbon (${filteredRecords.length}) • ${DateFormat('MMMM yyyy').format(_activePeriod)}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                  ),
                  const SizedBox(height: 8),
                  ListView.separated(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: filteredRecords.length,
                    separatorBuilder: (_, __) => const SizedBox(height: 8),
                    itemBuilder: (context, index) {
                      final item = filteredRecords[index];
                      final amount = (item['amount'] as num?)?.toDouble() ?? 0;
                      final remaining = (item['remaining_balance'] as num?)?.toDouble() ??
                          (item['remaining'] as num?)?.toDouble() ??
                          0;
                      final date = _parseDate(item);
                      final desc = item['description'] ?? item['reason'] ?? '-';
                      final name = employeeNames[item['employee_id']] ?? item['employee_name'] ?? '-';
                      return Card(
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        child: ListTile(
                          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          leading: CircleAvatar(
                            backgroundColor: Colors.red.shade50,
                            child: const Icon(Icons.money_off, color: Colors.red),
                          ),
                          title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text(
                                desc.toString(),
                                style: const TextStyle(color: Colors.black54),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                date != null ? DateFormat('dd MMM yyyy').format(date) : '-',
                                style: const TextStyle(fontSize: 12, color: Colors.black45),
                              ),
                            ],
                          ),
                          trailing: Column(
                            crossAxisAlignment: CrossAxisAlignment.end,
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Text(
                                '-${_formatCurrency(amount.abs())}',
                                style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Sisa: ${_formatCurrency(remaining)}',
                                style: const TextStyle(fontSize: 12),
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }
}


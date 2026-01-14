import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';
import 'package:sistem_absen_flutter_v2/models/employee.dart';

class AdminKasbonCutScreen extends StatefulWidget {
  const AdminKasbonCutScreen({super.key});

  @override
  State<AdminKasbonCutScreen> createState() => _AdminKasbonCutScreenState();
}

class _AdminKasbonCutScreenState extends State<AdminKasbonCutScreen> {
  late Future<List<dynamic>> _dataFuture;
  String? _selectedEmployeeId;
  String? _selectedKasbonId;
  double? _selectedKasbonRemaining;
  final _amountController = TextEditingController();
  final _noteController = TextEditingController();
  bool _isSubmitting = false;

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

  void _selectKasbon(Map<String, dynamic> kasbon) {
    final remaining = (kasbon['remaining_balance'] as num?)?.toDouble() ??
        (kasbon['remaining'] as num?)?.toDouble() ??
        0;
    setState(() {
      _selectedKasbonId = kasbon['id']?.toString() ?? kasbon['kasbon_id']?.toString();
      _selectedKasbonRemaining = remaining;
      _selectedEmployeeId = kasbon['employee_id']?.toString() ?? _selectedEmployeeId;
    });
  }

  Future<void> _submitDeduction() async {
    if (_selectedKasbonId == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih kasbon terlebih dahulu')),
      );
      return;
    }
    final amount = double.tryParse(_amountController.text.replaceAll('.', '')) ?? 0;
    if (amount <= 0) {
      return;
    }
    if (_selectedKasbonRemaining != null && amount > _selectedKasbonRemaining!) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Jumlah melebihi sisa kasbon'), backgroundColor: Colors.orange),
      );
      return;
    }
    setState(() => _isSubmitting = true);
    try {
      await ApiService.deductKasbon(
        kasbonId: _selectedKasbonId!,
        employeeId: _selectedEmployeeId ?? '',
        amount: amount.toInt(),
        note: _noteController.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Kasbon dipotong'), backgroundColor: Colors.green),
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

  double _parseAmount(Map<String, dynamic> item, String key) {
    return (item[key] as num?)?.toDouble() ?? 0;
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
        title: const Text('Admin Kasbon Cut'),
        backgroundColor: const Color(0xFF0A4D68),
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
          final filteredKasbon = _selectedEmployeeId == null
              ? kasbonRecords
              : kasbonRecords.where((item) => item['employee_id']?.toString() == _selectedEmployeeId).toList();
          return RefreshIndicator(
            onRefresh: _refreshData,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  DropdownButtonFormField<String>(
                    decoration: const InputDecoration(
                      labelText: 'Pilih Pegawai',
                      border: OutlineInputBorder(),
                    ),
                    items: employees
                        .map((employee) => DropdownMenuItem(
                              value: employee.employeeId,
                              child: Text(employee.name),
                            ))
                        .toList(),
                    value: _selectedEmployeeId ?? (employees.isNotEmpty ? employees.first.employeeId : null),
                    onChanged: (value) => setState(() {
                      _selectedEmployeeId = value;
                      _selectedKasbonId = null;
                      _selectedKasbonRemaining = null;
                    }),
                  ),
                  const SizedBox(height: 16),
                  if (filteredKasbon.isEmpty)
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 20),
                      child: Text(
                        'Tidak ada kasbon aktif untuk pegawai ini',
                        style: TextStyle(color: Colors.grey.shade600),
                      ),
                    )
                  else
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Kasbon Aktif', style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        ...filteredKasbon.map((kasbon) => _buildKasbonTile(kasbon)).toList(),
                      ],
                    ),
                  const SizedBox(height: 24),
                  Card(
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text('Potong Kasbon', style: TextStyle(fontWeight: FontWeight.bold)),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _amountController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Jumlah Potongan',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          TextFormField(
                            controller: _noteController,
                            maxLines: 2,
                            decoration: const InputDecoration(
                              labelText: 'Catatan (opsional)',
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 16),
                          SizedBox(
                            width: double.infinity,
                            child: ElevatedButton(
                              onPressed: _isSubmitting ? null : _submitDeduction,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF0A4D68),
                                padding: const EdgeInsets.symmetric(vertical: 14),
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
                                  : const Text('Kirim Potongan'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildKasbonTile(Map<String, dynamic> kasbon) {
    final amount = _parseAmount(kasbon, 'amount');
    final remaining = (kasbon['remaining_balance'] as num?)?.toDouble() ??
        (kasbon['remaining'] as num?)?.toDouble() ??
        0;
    final date = _parseDate(kasbon);
    final employee = kasbon['employee_name'] ?? kasbon['employee']?['name'] ?? '-';
    final title = '$employee · ${DateFormat('dd MMM yyyy').format(date ?? DateTime.now())}';
    final isSelected = _selectedKasbonId == (kasbon['id']?.toString() ?? kasbon['kasbon_id']?.toString());
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: ListTile(
        selected: isSelected,
        selectedTileColor: Colors.grey.shade100,
        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold)),
        subtitle: Text(
          'Total: ${_formatCurrency(amount)} · Sisa: ${_formatCurrency(remaining)}',
          style: const TextStyle(color: Colors.black54),
        ),
        trailing: TextButton(
          onPressed: () => _selectKasbon(kasbon),
          child: const Text('Pilih'),
        ),
      ),
    );
  }

  String _formatCurrency(double value) {
    final formatter = NumberFormat.currency(locale: 'id', symbol: 'Rp ', decimalDigits: 0);
    return formatter.format(value);
  }
}


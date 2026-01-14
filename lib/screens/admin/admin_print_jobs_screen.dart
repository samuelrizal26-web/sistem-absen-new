import 'package:flutter/material.dart';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

class AdminPrintJobsScreen extends StatefulWidget {
  const AdminPrintJobsScreen({super.key});

  @override
  State<AdminPrintJobsScreen> createState() => _AdminPrintJobsScreenState();
}

class _AdminPrintJobsScreenState extends State<AdminPrintJobsScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _jobs = [];

  @override
  void initState() {
    super.initState();
    _loadJobs();
  }

  Future<void> _loadJobs() async {
    setState(() => _isLoading = true);
    try {
      final data = await ApiService.fetchPrintJobs();
      if (!mounted) return;
      setState(() => _jobs = data);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  double get _totalRevenue {
    return _jobs.fold<double>(
      0,
      (sum, item) => sum + ((item['quantity'] as num?)?.toDouble() ?? 0) * ((item['price'] as num?)?.toDouble() ?? 0),
    );
  }

  Map<String, double> get _materialSummary {
    final Map<String, double> summary = {};
    for (final item in _jobs) {
      final material = item['material_name'] ?? 'Lainnya';
      final price = ((item['quantity'] as num?)?.toDouble() ?? 0) * ((item['price'] as num?)?.toDouble() ?? 0);
      summary.update(material, (value) => value + price, ifAbsent: () => price);
    }
    return summary;
  }

  Future<void> _openJobForm({Map<String, dynamic>? job}) async {
    final shouldRefresh = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (_) => _PrintJobFormDialog(job: job),
    );
    if (shouldRefresh == true) {
      _loadJobs();
    }
  }

  Future<void> _confirmDelete(Map<String, dynamic> job) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (_) => const _DeletePrintJobDialog(),
    );
    if (shouldDelete == true) {
      try {
        await ApiService.deletePrintJob(job['job_id'] ?? job['id']);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Pekerjaan dihapus'), backgroundColor: Colors.green),
        );
        _loadJobs();
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    }
  }

  String _formatNumber(num value) {
    return value.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (match) => '${match.group(1)}.');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A4D68),
        title: const Text('Pekerjaan Printing'),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadJobs,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildSummarySection(),
                    const SizedBox(height: 24),
                    _buildJobsTable(),
                  ],
                ),
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => _openJobForm(),
        backgroundColor: const Color(0xFF00ACC1),
        icon: const Icon(Icons.add),
        label: const Text('Tambah Pekerjaan'),
      ),
    );
  }

  Widget _buildSummarySection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Total Pendapatan',
          style: TextStyle(color: Colors.black54),
        ),
        const SizedBox(height: 8),
        Container(
          width: double.infinity,
          padding: const EdgeInsets.all(20),
          decoration: BoxDecoration(
            color: const Color(0xFF4CAF50),
            borderRadius: BorderRadius.circular(24),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Rp', style: TextStyle(color: Colors.white70)),
              Text(
                _formatNumber(_totalRevenue),
                style: const TextStyle(color: Colors.white, fontSize: 28, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              Wrap(
                spacing: 12,
                runSpacing: 12,
                children: _materialSummary.entries.map((entry) {
                  return Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    decoration: BoxDecoration(
                      color: Colors.white.withOpacity(0.15),
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(entry.key, style: const TextStyle(color: Colors.white70)),
                        Text(
                          'Rp ${_formatNumber(entry.value)}',
                          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  );
                }).toList(),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildJobsTable() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [BoxShadow(color: Color(0x14000000), blurRadius: 24, offset: Offset(0, 12))],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            decoration: const BoxDecoration(
              color: Color(0xFF424242),
              borderRadius: BorderRadius.only(topLeft: Radius.circular(24), topRight: Radius.circular(24)),
            ),
            child: const Text(
              'Daftar Pekerjaan',
              style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              columnSpacing: 24,
              headingRowColor: MaterialStateProperty.all(const Color(0xFFF5F5F5)),
              columns: const [
                DataColumn(label: Text('Tanggal')),
                DataColumn(label: Text('Bahan')),
                DataColumn(label: Text('Qty')),
                DataColumn(label: Text('Harga')),
                DataColumn(label: Text('Total')),
                DataColumn(label: Text('Customer')),
                DataColumn(label: Text('Catatan')),
                DataColumn(label: Text('Aksi')),
              ],
              rows: _jobs.map((job) {
                final qty = (job['quantity'] as num?)?.toDouble() ?? 0;
                final price = (job['price'] as num?)?.toDouble() ?? 0;
                final total = qty * price;
                return DataRow(
                  cells: [
                    DataCell(Text(job['created_at']?.toString().split('T').first ?? '-')),
                    DataCell(_buildMaterialBadge(job['material_name'] ?? 'Bahan')),
                    DataCell(Text(qty.toStringAsFixed(0))),
                    DataCell(Text('Rp ${_formatNumber(price)}')),
                    DataCell(Text('Rp ${_formatNumber(total)}')),
                    DataCell(Text(job['customer_name'] ?? '-')),
                    DataCell(Text(job['notes'] ?? '-')),
                    DataCell(
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          IconButton(
                            icon: const Icon(Icons.edit_outlined, color: Color(0xFF2E7D32)),
                            onPressed: () => _openJobForm(job: job),
                          ),
                          IconButton(
                            icon: const Icon(Icons.delete_outline, color: Color(0xFFD32F2F)),
                            onPressed: () => _confirmDelete(job),
                          ),
                        ],
                      ),
                    ),
                  ],
                );
              }).toList(),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMaterialBadge(String name) {
    final colorMap = {
      'Vinyl': const Color(0xFF2962FF),
      'Kromo': const Color(0xFF8E24AA),
      'Transparan': const Color(0xFF00ACC1),
      'Art Carton': const Color(0xFFFF7043),
    };
    final color = colorMap[name] ?? const Color(0xFF757575);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(
        name,
        style: TextStyle(color: color, fontWeight: FontWeight.w600),
      ),
    );
  }
}

class _DeletePrintJobDialog extends StatelessWidget {
  const _DeletePrintJobDialog();

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 48),
            const SizedBox(height: 16),
            const Text(
              'Hapus pekerjaan ini?',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text(
              'Stock bahan akan dikembalikan sesuai jumlah pekerjaan.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(child: OutlinedButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Batal'))),
                const SizedBox(width: 12),
                Expanded(child: ElevatedButton(onPressed: () => Navigator.of(context).pop(true), style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD32F2F)), child: const Text('Ya, Hapus'))),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _PrintJobFormDialog extends StatefulWidget {
  final Map<String, dynamic>? job;

  const _PrintJobFormDialog({this.job});

  @override
  State<_PrintJobFormDialog> createState() => _PrintJobFormDialogState();
}

class _PrintJobFormDialogState extends State<_PrintJobFormDialog> {
  final _formKey = GlobalKey<FormState>();
  final _dateController = TextEditingController();
  final _quantityController = TextEditingController();
  final _priceController = TextEditingController();
  final _customerController = TextEditingController();
  final _notesController = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  String? _material;
  bool _isSubmitting = false;
  List<Map<String, dynamic>> _materials = [];

  @override
  void initState() {
    super.initState();
    _loadMaterials();
    final job = widget.job;
    if (job != null) {
      _selectedDate = DateTime.tryParse(job['created_at'] ?? '') ?? DateTime.now();
      _dateController.text = _selectedDate.toIso8601String().split('T').first;
      _quantityController.text = (job['quantity'] as num?)?.toString() ?? '';
      _priceController.text = (job['price'] as num?)?.toString() ?? '';
      _customerController.text = job['customer_name'] ?? '';
      _notesController.text = job['notes'] ?? '';
      _material = job['material_name'];
    } else {
      _dateController.text = _selectedDate.toIso8601String().split('T').first;
    }
  }

  Future<void> _loadMaterials() async {
    try {
      final data = await ApiService.fetchStock();
      if (!mounted) return;
      setState(() => _materials = data);
    } catch (_) {
      // ignore
    }
  }

  @override
  void dispose() {
    _dateController.dispose();
    _quantityController.dispose();
    _priceController.dispose();
    _customerController.dispose();
    _notesController.dispose();
    super.dispose();
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
    final body = {
      'material_name': _material,
      'quantity': double.tryParse(_quantityController.text) ?? 0,
      'price': double.tryParse(_priceController.text) ?? 0,
      'customer_name': _customerController.text,
      'notes': _notesController.text,
      'date': _dateController.text,
    };
    try {
      await ApiService.createPrintJob(body);
      if (!mounted) return;
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.job == null ? 'Pekerjaan ditambahkan' : 'Pekerjaan diperbarui'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      insetPadding: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    widget.job == null ? 'Tambah Pekerjaan Printing' : 'Edit Pekerjaan Printing',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0A4D68)),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _dateController,
                readOnly: true,
                onTap: _pickDate,
                decoration: InputDecoration(
                  labelText: 'Tanggal',
                  suffixIcon: const Icon(Icons.calendar_today),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _material,
                decoration: InputDecoration(
                  labelText: 'Bahan',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
                items: _materials
                    .map(
                      (item) => DropdownMenuItem<String>(
                        value: (item['name'] ?? '').toString(),
                        child: Text(item['name'] ?? '-'),
                      ),
                    )
                    .toList(),
                onChanged: (value) => setState(() => _material = value),
                validator: (value) => value == null ? 'Pilih bahan' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _quantityController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Jumlah',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
                validator: (value) => (value == null || value.isEmpty) ? 'Jumlah wajib diisi' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _priceController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Harga per Unit',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
                validator: (value) => (value == null || value.isEmpty) ? 'Harga wajib diisi' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _customerController,
                decoration: InputDecoration(
                  labelText: 'Nama Customer (Opsional)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _notesController,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: 'Catatan (Opsional)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00ACC1),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 3,
                            valueColor: AlwaysStoppedAnimation(Colors.white),
                          ),
                        )
                      : const Text('Simpan Pekerjaan', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}






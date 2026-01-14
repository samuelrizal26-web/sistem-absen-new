import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';
import 'package:sistem_absen_flutter_v2/core/utils/number_formatter.dart';
import 'package:sistem_absen_flutter_v2/core/utils/error_handler.dart';
import 'package:sistem_absen_flutter_v2/features/print/print_job_summary_screen.dart';

class PrintJobsScreen extends StatefulWidget {
  const PrintJobsScreen({super.key});

  @override
  State<PrintJobsScreen> createState() => _PrintJobsScreenState();
}

class _PrintJobsScreenState extends State<PrintJobsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _dateController = TextEditingController();
  final _quantityController = TextEditingController();
  final _priceController = TextEditingController();
  final _customerController = TextEditingController();
  final _notesController = TextEditingController();
  
  DateTime _selectedDate = DateTime.now();
  String? _selectedMaterial;
  String _selectedPaymentMethod = 'cash'; // NEW: Payment method selection
  bool _isSubmitting = false;
  bool _isLoadingSummary = true;
  Map<String, dynamic> _summary = {};
  Map<String, dynamic>? _stockInfo;
  
  final List<Map<String, String>> _materials = [
    {'value': 'vinyl', 'label': 'Vinyl'},
    {'value': 'kromo', 'label': 'Kromo'},
    {'value': 'transparan', 'label': 'Transparant'},
    {'value': 'art_carton', 'label': 'Art Carton'},
  ];

  @override
  void initState() {
    super.initState();
    _dateController.text = _selectedDate.toIso8601String().split('T').first;
    _selectedMaterial = _materials.first['value'];
    _loadSummary();
    _checkStock(_selectedMaterial!);
    
    // Add listeners for real-time total calculation
    _quantityController.addListener(() {
      setState(() {}); // Trigger rebuild to update total preview
    });
    _priceController.addListener(() {
      setState(() {}); // Trigger rebuild to update total preview
    });
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

  Future<void> _loadSummary() async {
    setState(() => _isLoadingSummary = true);
    try {
      final summary = await ApiService.fetchPrintJobsSummary();
      if (!mounted) return;
      setState(() {
        _summary = summary;
        _isLoadingSummary = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoadingSummary = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memuat summary: $e'), backgroundColor: Colors.orange),
      );
    }
  }

  Future<void> _checkStock(String material) async {
    try {
      final stockInfo = await ApiService.checkStockForMaterial(material);
      if (!mounted) return;
      setState(() => _stockInfo = stockInfo);
    } catch (e) {
      if (!mounted) return;
      setState(() => _stockInfo = null);
    }
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

  void _resetForm() {
    setState(() {
      _quantityController.clear();
      _priceController.clear();
      _customerController.clear();
      _notesController.clear();
      _selectedDate = DateTime.now();
      _dateController.text = _selectedDate.toIso8601String().split('T').first;
      _selectedMaterial = _materials.first['value'];
      _selectedPaymentMethod = 'cash'; // Reset payment method
      _stockInfo = null;
    });
    if (_selectedMaterial != null) {
      _checkStock(_selectedMaterial!);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    if (_selectedMaterial == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih bahan terlebih dahulu'), backgroundColor: Colors.red),
      );
      return;
    }

    // Check stock before submit
    if (_stockInfo != null && _stockInfo!['available'] == true) {
      final availableQty = (_stockInfo!['quantity'] as num?)?.toDouble() ?? 0;
      final requestedQty = ThousandsSeparatorInputFormatter.parseToDouble(_quantityController.text) ?? 0;
      if (requestedQty > availableQty) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Stock tidak cukup! Tersedia: ${availableQty.toInt()}, Dibutuhkan: ${requestedQty.toInt()}'),
            backgroundColor: Colors.red,
          ),
        );
        return;
      }
    }

    setState(() => _isSubmitting = true);
    
    try {
      final customerName = _customerController.text.trim();
      final notes = _notesController.text.trim();
      final body = {
        'date': _dateController.text,
        'material': _selectedMaterial!,
        'quantity': ThousandsSeparatorInputFormatter.parseToDouble(_quantityController.text) ?? 0,
        'price': ThousandsSeparatorInputFormatter.parseToDouble(_priceController.text) ?? 0,
        'payment_method': _selectedPaymentMethod, // NEW: Include payment method
        if (customerName.isNotEmpty) 'customer_name': customerName,
        if (notes.isNotEmpty) 'notes': notes,
      };

      final createdJob = await ApiService.createPrintJob(body);
      
      if (!mounted) return;
      
      // Navigasi ke halaman ringkasan dengan data print job
      Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => PrintJobSummaryScreen(summaryData: createdJob),
        ),
      );
      
      // Reset form
      _resetForm();
      
      // Reload summary
      _loadSummary();
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

  String _formatNumber(num value) {
    return value.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (match) => '${match.group(1)}.',
    );
  }

  Future<void> _showMaterialDetail(String material, String materialLabel) async {
    try {
      // Fetch all print jobs
      final allJobs = await ApiService.fetchPrintJobs();
      
      // Calculate date range (1 month ago from today)
      final now = DateTime.now();
      final oneMonthAgo = DateTime(now.year, now.month, now.day).subtract(const Duration(days: 30));
      
      // Filter by material and date (only last 1 month)
      final filteredJobs = allJobs.where((job) {
        final jobMaterial = job['material']?.toString().toLowerCase();
        if (jobMaterial != material.toLowerCase()) return false;
        
        // Parse date from job
        try {
          final dateStr = job['date']?.toString() ?? job['created_at']?.toString() ?? '';
          if (dateStr.isEmpty) return false;
          
          DateTime? jobDate;
          if (dateStr.contains('T')) {
            jobDate = DateTime.tryParse(dateStr.split('T').first);
          } else {
            jobDate = DateTime.tryParse(dateStr.split(' ').first);
          }
          
          if (jobDate == null) return false;
          
          // Only include jobs from last 1 month
          return jobDate.isAfter(oneMonthAgo) || jobDate.isAtSameMomentAs(oneMonthAgo);
        } catch (e) {
          return false;
        }
      }).toList();

      if (!mounted) return;

      // Show dialog with material details
      await showDialog(
        context: context,
        builder: (context) => _MaterialDetailDialog(
          materialLabel: materialLabel,
          jobs: filteredJobs,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal memuat detail: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    
    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A4D68),
        title: const Text('Pekerjaan Printing', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          if (isLandscape) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(12),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    flex: 2,
                    child: _buildSummarySection(),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    flex: 3,
                    child: _buildFormSection(),
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
                // Summary Section
                _buildSummarySection(),
                const SizedBox(height: 24),
                // Form Section
                _buildFormSection(),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSummarySection() {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    
    if (_isLoadingSummary) {
      return Card(
        child: Padding(
          padding: EdgeInsets.all(isLandscape ? 16 : 24),
          child: const Center(child: CircularProgressIndicator()),
        ),
      );
    }

    final totalRevenue = (_summary['total_revenue'] as num?)?.toDouble() ?? 0;
    final totalRevenueCash = (_summary['total_revenue_cash'] as num?)?.toDouble() ?? 0; // NEW
    final totalRevenueTransfer = (_summary['total_revenue_transfer'] as num?)?.toDouble() ?? 0; // NEW
    final totalJobs = (_summary['total_jobs'] as num?)?.toInt() ?? 0;
    final byMaterial = _summary['by_material'] as Map<String, dynamic>? ?? {};

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF4CAF50), Color(0xFF2E7D32)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(16),
        ),
        padding: EdgeInsets.all(isLandscape ? 16 : 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Total Pendapatan',
              style: TextStyle(
                color: Colors.white70,
                fontSize: isLandscape ? 12 : 14,
              ),
            ),
            SizedBox(height: isLandscape ? 6 : 8),
            Text(
              'Rp ${_formatNumber(totalRevenue)}',
              style: TextStyle(
                color: Colors.white,
                fontSize: isLandscape ? 24 : 32,
                fontWeight: FontWeight.bold,
              ),
            ),
            SizedBox(height: isLandscape ? 12 : 16),
            Container(
              padding: EdgeInsets.all(isLandscape ? 10 : 12),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.15),
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Total Pekerjaan',
                    style: TextStyle(
                      color: Colors.white70,
                      fontSize: isLandscape ? 11 : 12,
                    ),
                  ),
                  SizedBox(height: isLandscape ? 2 : 4),
                  Text(
                    totalJobs.toString(),
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: isLandscape ? 18 : 20,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            // NEW: Cash and Transfer indicators
            SizedBox(height: isLandscape ? 12 : 16),
            Row(
              children: [
                Expanded(
                  child: Container(
                    padding: EdgeInsets.all(isLandscape ? 8 : 10),
                    decoration: BoxDecoration(
                      color: Colors.green.shade700.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Cash',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: isLandscape ? 10 : 11,
                          ),
                        ),
                        SizedBox(height: isLandscape ? 2 : 4),
                        Text(
                          'Rp ${_formatNumber(totalRevenueCash)}',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: isLandscape ? 14 : 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                SizedBox(width: isLandscape ? 8 : 10),
                Expanded(
                  child: Container(
                    padding: EdgeInsets.all(isLandscape ? 8 : 10),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade700.withOpacity(0.3),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white.withOpacity(0.3)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Transfer',
                          style: TextStyle(
                            color: Colors.white70,
                            fontSize: isLandscape ? 10 : 11,
                          ),
                        ),
                        SizedBox(height: isLandscape ? 2 : 4),
                        Text(
                          'Rp ${_formatNumber(totalRevenueTransfer)}',
                          style: TextStyle(
                            color: Colors.white,
                            fontSize: isLandscape ? 14 : 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
            if (byMaterial.isNotEmpty) ...[
              SizedBox(height: isLandscape ? 12 : 16),
              Text(
                'Pendapatan per Bahan',
                style: TextStyle(
                  color: Colors.white70,
                  fontSize: isLandscape ? 12 : 14,
                ),
              ),
              SizedBox(height: isLandscape ? 6 : 8),
              Wrap(
                spacing: isLandscape ? 6 : 8,
                runSpacing: isLandscape ? 6 : 8,
                children: byMaterial.entries.map((entry) {
                  final materialLabel = _materials.firstWhere(
                    (m) => m['value'] == entry.key,
                    orElse: () => {'label': entry.key},
                  )['label']!;
                  final revenue = (entry.value['revenue'] as num?)?.toDouble() ?? 0;
                  final materialValue = entry.key;
                  return InkWell(
                    onTap: () => _showMaterialDetail(materialValue, materialLabel),
                    borderRadius: BorderRadius.circular(12),
                    child: Container(
                      padding: EdgeInsets.symmetric(
                        horizontal: isLandscape ? 10 : 12,
                        vertical: isLandscape ? 6 : 8,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.15),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            materialLabel,
                            style: TextStyle(
                              color: Colors.white70,
                              fontSize: isLandscape ? 11 : 12,
                            ),
                          ),
                          Text(
                            'Rp ${_formatNumber(revenue)}',
                            style: TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: isLandscape ? 12 : 14,
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildFormSection() {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: EdgeInsets.all(isLandscape ? 16 : 20),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text(
                'Tambah Pekerjaan Printing',
                style: TextStyle(
                  fontSize: isLandscape ? 18 : 20,
                  fontWeight: FontWeight.bold,
                  color: const Color(0xFF0A4D68),
                ),
              ),
              SizedBox(height: isLandscape ? 16 : 20),
              // Date and Material Row (landscape) or Column (portrait)
              if (isLandscape)
                Row(
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _dateController,
                        readOnly: true,
                        onTap: _pickDate,
                        decoration: InputDecoration(
                          labelText: 'Tanggal *',
                          suffixIcon: const Icon(Icons.calendar_today),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: DropdownButtonFormField<String>(
                        value: _selectedMaterial,
                        decoration: InputDecoration(
                          labelText: 'Bahan *',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                        ),
                        items: _materials.map((material) {
                          return DropdownMenuItem<String>(
                            value: material['value'],
                            child: Text(material['label']!),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            _selectedMaterial = value;
                          });
                          if (value != null) {
                            _checkStock(value);
                          }
                        },
                        validator: (value) => value == null ? 'Pilih bahan' : null,
                      ),
                    ),
                  ],
                )
              else
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: _dateController,
                      readOnly: true,
                      onTap: _pickDate,
                      decoration: InputDecoration(
                        labelText: 'Tanggal *',
                        suffixIcon: const Icon(Icons.calendar_today),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    DropdownButtonFormField<String>(
                      value: _selectedMaterial,
                      decoration: InputDecoration(
                        labelText: 'Bahan *',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      items: _materials.map((material) {
                        return DropdownMenuItem<String>(
                          value: material['value'],
                          child: Text(material['label']!),
                        );
                      }).toList(),
                      onChanged: (value) {
                        setState(() {
                          _selectedMaterial = value;
                        });
                        if (value != null) {
                          _checkStock(value);
                        }
                      },
                      validator: (value) => value == null ? 'Pilih bahan' : null,
                    ),
                  ],
                ),
              const SizedBox(height: 16),
              // NEW: Payment Method Selection
              DropdownButtonFormField<String>(
                value: _selectedPaymentMethod,
                decoration: InputDecoration(
                  labelText: 'Metode Pembayaran *',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  isDense: isLandscape,
                  contentPadding: isLandscape
                      ? const EdgeInsets.symmetric(vertical: 16, horizontal: 12)
                      : null,
                ),
                items: const [
                  DropdownMenuItem<String>(
                    value: 'cash',
                    child: Row(
                      children: [
                        Icon(Icons.money, color: Colors.green, size: 20),
                        SizedBox(width: 8),
                        Text('Cash'),
                      ],
                    ),
                  ),
                  DropdownMenuItem<String>(
                    value: 'transfer',
                    child: Row(
                      children: [
                        Icon(Icons.account_balance, color: Colors.blue, size: 20),
                        SizedBox(width: 8),
                        Text('Transfer'),
                      ],
                    ),
                  ),
                ],
                onChanged: (value) {
                  if (value != null) {
                    setState(() {
                      _selectedPaymentMethod = value;
                    });
                  }
                },
                validator: (value) => value == null ? 'Pilih metode pembayaran' : null,
              ),
              // Stock Info
              if (_stockInfo != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: _stockInfo!['available'] == true
                        ? (_stockInfo!['low_stock'] == true
                            ? Colors.orange.shade50
                            : Colors.green.shade50)
                        : Colors.red.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: _stockInfo!['available'] == true
                          ? (_stockInfo!['low_stock'] == true
                              ? Colors.orange.shade300
                              : Colors.green.shade300)
                          : Colors.red.shade300,
                    ),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        _stockInfo!['available'] == true
                            ? (_stockInfo!['low_stock'] == true
                                ? Icons.warning
                                : Icons.check_circle)
                            : Icons.error,
                        color: _stockInfo!['available'] == true
                            ? (_stockInfo!['low_stock'] == true
                                ? Colors.orange
                                : Colors.green)
                            : Colors.red,
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _stockInfo!['message'] ?? 'Stock tersedia',
                          style: TextStyle(
                            color: _stockInfo!['available'] == true
                                ? (_stockInfo!['low_stock'] == true
                                    ? Colors.orange.shade900
                                    : Colors.green.shade900)
                                : Colors.red.shade900,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              // Quantity and Price Row
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _quantityController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: true),
                      decoration: InputDecoration(
                        labelText: 'Jumlah *',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        isDense: isLandscape,
                        contentPadding: isLandscape
                            ? const EdgeInsets.symmetric(vertical: 16, horizontal: 12)
                            : null,
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Jumlah wajib diisi';
                        }
                        final qty = double.tryParse(value);
                        if (qty == null || qty <= 0) {
                          return 'Jumlah harus > 0';
                        }
                        return null;
                      },
                    ),
                  ),
                  SizedBox(width: isLandscape ? 10 : 12),
                  Expanded(
                    child: TextFormField(
                      controller: _priceController,
                      keyboardType: const TextInputType.numberWithOptions(decimal: false),
                      inputFormatters: [
                        FilteringTextInputFormatter.digitsOnly,
                        ThousandsSeparatorInputFormatter(),
                      ],
                      decoration: InputDecoration(
                        labelText: 'Harga (Rp) *',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        isDense: isLandscape,
                        contentPadding: isLandscape
                            ? const EdgeInsets.symmetric(vertical: 16, horizontal: 12)
                            : null,
                        prefixText: 'Rp ',
                        hintText: '0',
                      ),
                      validator: (value) {
                        if (value == null || value.isEmpty) {
                          return 'Harga wajib diisi';
                        }
                        final price = ThousandsSeparatorInputFormatter.parseToDouble(value);
                        if (price == null || price <= 0) {
                          return 'Harga harus > 0';
                        }
                        return null;
                      },
                    ),
                  ),
                ],
              ),
              // Total Preview
              if (_quantityController.text.isNotEmpty && _priceController.text.isNotEmpty) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.green.shade50,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.green.shade300),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Total Harga:',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                      Text(
                        'Rp ${_formatNumber((ThousandsSeparatorInputFormatter.parseToDouble(_quantityController.text) ?? 0) * (ThousandsSeparatorInputFormatter.parseToDouble(_priceController.text) ?? 0))}',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: Colors.green.shade900,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              SizedBox(height: isLandscape ? 12 : 16),
              // Customer Name and Notes Row (landscape) or Column (portrait)
              if (isLandscape)
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: TextFormField(
                        controller: _customerController,
                        decoration: InputDecoration(
                          labelText: 'Nama Customer (Opsional)',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextFormField(
                        controller: _notesController,
                        maxLines: 3,
                        decoration: InputDecoration(
                          labelText: 'Catatan (Opsional)',
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
                        ),
                      ),
                    ),
                  ],
                )
              else
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: _customerController,
                      decoration: InputDecoration(
                        labelText: 'Nama Customer (Opsional)',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _notesController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        labelText: 'Catatan (Opsional)',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ),
              SizedBox(height: isLandscape ? 16 : 24),
              // Submit Button
              ElevatedButton(
                onPressed: _isSubmitting ? null : _submit,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00ACC1),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                child: _isSubmitting
                    ? const SizedBox(
                        height: 24,
                        width: 24,
                        child: CircularProgressIndicator(
                          strokeWidth: 3,
                          valueColor: AlwaysStoppedAnimation(Colors.white),
                        ),
                      )
                    : const Text(
                        'Simpan Pekerjaan',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Colors.white),
                      ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// Dialog untuk menampilkan detail per bahan
class _MaterialDetailDialog extends StatelessWidget {
  final String materialLabel;
  final List<Map<String, dynamic>> jobs;

  const _MaterialDetailDialog({
    required this.materialLabel,
    required this.jobs,
  });

  String _formatNumber(num value) {
    return value.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (match) => '${match.group(1)}.',
    );
  }

  String _formatDate(dynamic date) {
    if (date == null) return '-';
    try {
      final dateStr = date.toString();
      if (dateStr.contains('T')) {
        return dateStr.split('T').first;
      }
      return dateStr.split(' ').first;
    } catch (e) {
      return date.toString();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 500, maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0A4D68), Color(0xFF1A7BD0)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Text(
                      'Detail $materialLabel',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            Flexible(
              child: jobs.isEmpty
                  ? const Padding(
                      padding: EdgeInsets.all(48),
                      child: Center(
                        child: Text(
                          'Belum ada data untuk bahan ini',
                          style: TextStyle(fontSize: 16, color: Colors.black54),
                        ),
                      ),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
                      padding: const EdgeInsets.all(16),
                      itemCount: jobs.length,
                      itemBuilder: (context, index) {
                        final job = jobs[index];
                        final date = _formatDate(job['date'] ?? job['created_at']);
                        final quantity = (job['quantity'] as num?)?.toDouble() ?? 0;
                        final price = (job['price'] as num?)?.toDouble() ?? 0;
                        final total = quantity * price;
                        final paymentMethod = job['payment_method']?.toString().toLowerCase() ?? 'cash';
                        final customerName = job['customer_name']?.toString() ?? '-';
                        final notes = job['notes']?.toString() ?? '-';

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Expanded(
                                      child: Text(
                                        date,
                                        style: const TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                        ),
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 8,
                                        vertical: 4,
                                      ),
                                      decoration: BoxDecoration(
                                        color: paymentMethod == 'transfer'
                                            ? Colors.blue.shade100
                                            : Colors.green.shade100,
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                      child: Text(
                                        paymentMethod == 'transfer' ? 'Transfer' : 'Cash',
                                        style: TextStyle(
                                          color: paymentMethod == 'transfer'
                                              ? Colors.blue.shade900
                                              : Colors.green.shade900,
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Qty: ${quantity.toStringAsFixed(0)}',
                                      style: const TextStyle(fontSize: 12, color: Colors.black54),
                                    ),
                                    Text(
                                      'Rp ${_formatNumber(price)}',
                                      style: const TextStyle(fontSize: 12, color: Colors.black54),
                                    ),
                                    Text(
                                      'Total: Rp ${_formatNumber(total)}',
                                      style: const TextStyle(
                                        fontSize: 14,
                                        fontWeight: FontWeight.bold,
                                        color: Color(0xFF0A4D68),
                                      ),
                                    ),
                                  ],
                                ),
                                if (customerName != '-') ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    'Customer: $customerName',
                                    style: const TextStyle(fontSize: 12, color: Colors.black54),
                                  ),
                                ],
                                if (notes != '-') ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    'Catatan: $notes',
                                    style: const TextStyle(fontSize: 12, color: Colors.black54),
                                  ),
                                ],
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        ),
      ),
    );
  }
}






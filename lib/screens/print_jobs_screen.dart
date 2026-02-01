import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:sistem_absen_flutter_v2/core/utils/error_handler.dart';
import 'package:sistem_absen_flutter_v2/core/utils/number_formatter.dart';
import 'package:sistem_absen_flutter_v2/screens/print_job_summary_screen.dart';
import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

// =======================================
// 🔒 FROZEN FILE – DO NOT MODIFY
// Screen: PrintJobsScreen
// Status: STABLE & VERIFIED
// Reason: Avoid regression from other screens
// Date: 2026-02-01
// =======================================

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
  DateTime _activePeriod = DateTime(DateTime.now().year, DateTime.now().month);
  List<Map<String, dynamic>> _stockItems = [];
  Map<String, dynamic>? _selectedStock;
  String? _selectedStockId;
  static const String _emptyStockValue = '__EMPTY__';
  static const Map<String, String> _legacyMaterialLabels = {
    'vinyl': 'Vinyl',
    'kromo': 'Kromo',
    'transparan': 'Transparant',
    'art_carton': 'Art Carton',
  };

  @override
  void initState() {
    super.initState();
    debugPrint('🔥 ACTIVE PRINT JOBS SCREEN LOADED 🔥');
    _dateController.text = _selectedDate.toIso8601String().split('T').first;
    _loadSummary();
    _loadStock();

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
      final byMaterialRaw = (summary['by_material'] as List<dynamic>?) ?? [];
      final byMaterial = byMaterialRaw
          .map((entry) => {
                'material': entry['material']?.toString() ?? 'unknown',
                'total_qty': (entry['total_qty'] as num?)?.toDouble() ?? 0,
                'total_revenue': (entry['total_revenue'] as num?)?.toDouble() ?? 0,
              })
          .toList();
      if (!mounted) return;
      setState(() {
        _summary = {
          'total_revenue': (summary['total_revenue'] as num?)?.toDouble() ?? 0,
          'total_revenue_cash': (summary['cash_revenue'] as num?)?.toDouble() ?? 0,
          'total_revenue_transfer': (summary['transfer_revenue'] as num?)?.toDouble() ?? 0,
          'total_jobs': (summary['total_jobs'] as num?)?.toInt() ?? 0,
          'by_material': byMaterial,
        };
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal memuat summary: $e'),
          backgroundColor: Colors.orange,
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isLoadingSummary = false);
      }
    }
  }

  List<Map<String, dynamic>> _filterJobsByPeriod(
    DateTime period,
    List<Map<String, dynamic>> jobs,
  ) {
    final result = <Map<String, dynamic>>[];
    for (final job in jobs) {
      final jobDate = _parseJobDate(job);
      if (jobDate == null) continue;
      if (jobDate.year == period.year && jobDate.month == period.month) {
        result.add(job);
      }
    }
    return result;
  }

  Future<void> _loadStock() async {
    try {
      final normalized = (await ApiService.fetchStocks(
        onlyActive: true,
      )).map(_normalizeStockItem).toList();
      final printStocks = normalized.where((stock) {
        return (stock['usage_category']?.toString().toUpperCase() ?? 'UMUM') ==
            'PRINT';
      }).toList();

      if (!mounted) return;

      Map<String, dynamic>? nextSelection;
      if (_selectedStock != null) {
        final previousId = _getStockId(_selectedStock!);
        for (final stock in printStocks) {
          if (_getStockId(stock) == previousId) {
            nextSelection = stock;
            break;
          }
        }
      }

      nextSelection ??= printStocks.isNotEmpty ? printStocks.first : null;

      setState(() {
        _stockItems = printStocks;
        _selectedStock = nextSelection;
        if (nextSelection != null) {
          _selectedStockId = _getStockId(nextSelection);
          _selectedMaterial = _deriveMaterialKey(nextSelection);
        } else {
          _selectedStockId = _emptyStockValue;
          _selectedMaterial = null;
        }
        if (_selectedStock != null &&
            !_stockItems.any(
              (stock) => _getStockId(stock) == _getStockId(_selectedStock!),
            )) {
          _selectedStock = null;
          _selectedStockId = null;
          _selectedMaterial = null;
        }
      });
    } catch (e) {
      if (!mounted) return;
      ErrorHandler.showError(context, e, type: ErrorType.api);
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
      _selectedPaymentMethod = 'cash'; // Reset payment method
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    if (_selectedStock == null || _selectedStockId == _emptyStockValue) {
      ErrorHandler.showError(
        context,
        'Pilih bahan terlebih dahulu',
        type: ErrorType.unknown,
      );
      return;
    }

    final quantityText = _quantityController.text
        .replaceAll('.', '')
        .replaceAll(',', '')
        .trim();
    final quantity = int.tryParse(quantityText) ?? 0;
    final quantityForStock = quantity.toDouble();

    final rawPriceText = _priceController.text
        .replaceAll('Rp', '')
        .replaceAll('.', '')
        .replaceAll(',', '')
        .trim();
    final unitPrice = double.tryParse(rawPriceText) ?? 0;

    if (quantity <= 0) {
      ErrorHandler.showError(
        context,
        'Jumlah harus lebih dari 0',
        type: ErrorType.unknown,
      );
      return;
    }

    if (unitPrice <= 0) {
      ErrorHandler.showError(
        context,
        'Harga harus lebih dari 0',
        type: ErrorType.unknown,
      );
      return;
    }

    final availableQty = _getStockQuantity(_selectedStock!);
    if (quantityForStock > availableQty) {
      ErrorHandler.showError(
        context,
        'Stock tidak cukup! Tersedia: ${availableQty.toInt()}, Dibutuhkan: ${quantity.toInt()}',
        type: ErrorType.unknown,
      );
      return;
    }

    final stockId = _getStockId(_selectedStock!);
    if (stockId.isEmpty) {
      ErrorHandler.showError(
        context,
        'Data stock tidak valid',
        type: ErrorType.api,
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final dateStr = DateFormat('yyyy-MM-dd').format(_selectedDate);
    try {
      final customerName = _customerController.text.trim();
      final notes = _notesController.text.trim();
      final body = {
        'material': _selectedMaterial ?? _deriveMaterialKey(_selectedStock!),
        'material_id': _getStockId(_selectedStock!),
        'date': dateStr,
        'quantity': quantity,
        'price': unitPrice,
        'payment_method': _selectedPaymentMethod,
        if (customerName.isNotEmpty) 'customer_name': customerName,
        if (notes.isNotEmpty) 'notes': notes,
      };

      final createdJob = await ApiService.createPrintJob(body);

      await _loadSummary();
      await _loadStock();

      if (!mounted) return;
      _resetForm();

      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => PrintJobSummaryScreen(printJob: createdJob),
        ),
      );

      await _loadSummary();
      await _loadStock();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  String _formatNumber(num value) {
    return value
        .toStringAsFixed(0)
        .replaceAllMapped(
          RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
          (match) => '${match.group(1)}.',
        );
  }

  String? _resolveJobId(Map<String, dynamic>? job) {
    if (job == null) return null;
    for (final key in ['job_id', 'id', '_id']) {
      final value = job[key];
      if (value != null && value.toString().isNotEmpty) {
        return value.toString();
      }
    }
    return null;
  }

  String _getStockId(Map<String, dynamic> stock) {
    return stock['material_id']?.toString() ??
        stock['id']?.toString() ??
        stock['stock_id']?.toString() ??
        stock['uuid']?.toString() ??
        '';
  }

  String _deriveMaterialKey(Map<String, dynamic> stock) {
    final raw =
        stock['material'] ??
        stock['material_name'] ??
        stock['code'] ??
        stock['slug'] ??
        stock['name'];
    final text = raw?.toString().toLowerCase().trim() ?? '';
    if (text.isEmpty) {
      return _getStockId(stock);
    }
    final sanitized = text
        .replaceAll(RegExp(r'[^a-z0-9]+'), '_')
        .replaceAll(RegExp(r'_+'), '_');
    return sanitized.replaceAll(RegExp(r'^_+|_+$'), '');
  }

  Map<String, dynamic> _normalizeStockItem(Map<String, dynamic> raw) {
    final quantity = _parseNumeric(
      raw['quantity'] ?? raw['jumlah'] ?? raw['qty'] ?? raw['stock_amount'],
    );
    final price = _parseNumeric(
      raw['price_per_unit'] ?? raw['hpp'] ?? raw['price'] ?? raw['harga'],
    );
    final threshold = _parseNumeric(
      raw['thresholdMinimum'] ??
          raw['threshold_minimum'] ??
          raw['threshold'] ??
          raw['limit'],
    );
    final name =
        raw['name'] ?? raw['material_name'] ?? raw['title'] ?? 'Unnamed';
    final unit = raw['unit'] ?? raw['satuan'] ?? '-';
    final id =
        raw['material_id'] ?? raw['stock_id'] ?? raw['id'] ?? raw['uuid'];
    final category =
        (raw['category'] ??
                raw['kategori'] ??
                raw['type'] ??
                raw['group'] ??
                'stock')
            .toString()
            .toUpperCase()
            .trim();
    final isActiveRaw = raw['is_active'] ?? raw['active'] ?? raw['status'];
    final isActive = isActiveRaw is bool
        ? isActiveRaw
        : isActiveRaw != null
        ? isActiveRaw.toString().toLowerCase() != 'false'
        : true;

    return {
      'id': id,
      'material_id': id,
      'stock_id': id,
      'name': name,
      'quantity': quantity,
      'unit': unit,
      'price_per_unit': price,
      'thresholdMinimum': threshold,
      'hpp': price,
      'is_active': isActive,
      'category': category,
      'usage_category': _normalizeUsageCategory(raw),
      'notes': raw['notes'] ?? raw['description'] ?? raw['note'],
    };
  }

  String _normalizeUsageCategory(Map<String, dynamic> raw) {
    final rawValue =
        raw['usage_category'] ??
        raw['usageCategory'] ??
        raw['usage'] ??
        raw['type'] ??
        raw['group'];
    final normalized = rawValue?.toString().toUpperCase() ?? '';
    if (normalized == 'PRINT') return 'PRINT';
    return 'UMUM';
  }

  double _parseNumeric(dynamic value) {
    if (value == null) return 0;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString()) ?? 0;
  }

  double _getStockQuantity(Map<String, dynamic> stock) {
    return _parseNumeric(
      stock['quantity'] ??
          stock['jumlah'] ??
          stock['qty'] ??
          stock['stock_amount'],
    );
  }

  double _getStockThreshold(Map<String, dynamic> stock) {
    return _parseNumeric(
      stock['thresholdMinimum'] ??
          stock['threshold_minimum'] ??
          stock['threshold'],
    );
  }

  bool _isLowStock(Map<String, dynamic> stock) {
    final threshold = _getStockThreshold(stock);
    if (threshold <= 0) return false;
    final qty = _getStockQuantity(stock);
    return qty <= threshold;
  }

  Map<String, dynamic>? _findStockById(String? id) {
    if (id == null) return null;
    for (final stock in _stockItems) {
      if (_getStockId(stock) == id) {
        return stock;
      }
    }
    return null;
  }

  Map<String, dynamic>? _findStockByMaterialKey(String materialKey) {
    final normalized = materialKey.toLowerCase();
    for (final stock in _stockItems) {
      if (_deriveMaterialKey(stock) == normalized) return stock;
    }
    return null;
  }

  String _materialLabel(String? materialKey) {
    if (materialKey == null || materialKey.isEmpty) return '-';
    final normalized = materialKey.toLowerCase();
    final stock = _findStockByMaterialKey(normalized);
    if (stock != null) {
      return stock['name']?.toString() ??
          _legacyMaterialLabels[normalized] ??
          normalized;
    }
    return _legacyMaterialLabels[normalized] ?? normalized;
  }

  DateTime? _parseJobDate(Map<String, dynamic> job) {
    try {
      final dateStr =
          job['date']?.toString() ?? job['created_at']?.toString() ?? '';
      if (dateStr.isEmpty) return null;
      if (dateStr.contains('T')) {
        return DateTime.tryParse(dateStr.split('T').first);
      }
      return DateTime.tryParse(dateStr.split(' ').first);
    } catch (_) {
      return null;
    }
  }

  double _toDouble(dynamic value) {
    if (value == null) return 0;
    if (value is num) return value.toDouble();
    if (value is String) {
      return double.tryParse(value.replaceAll(RegExp(r'[^0-9.]'), '')) ?? 0;
    }
    return 0;
  }

  Future<void> _showMaterialDetail(String material) async {
    try {
      // Fetch all print jobs
      final allJobs = await ApiService.fetchPrintJobs();

      // Filter by material and active period
      final periodJobs = _filterJobsByPeriod(_activePeriod, allJobs);
      final filteredJobs = periodJobs.where((job) {
        final jobMaterial = job['material']?.toString().toLowerCase();
        if (jobMaterial != material.toLowerCase()) return false;

        // Parse date from job
        final jobDate = _parseJobDate(job);
        if (jobDate == null) return false;
        return jobDate.year == _activePeriod.year &&
            jobDate.month == _activePeriod.month;
      }).toList();

      if (!mounted) return;

      final materialLabel = _materialLabel(material);
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
    final isLandscape =
        MediaQuery.of(context).orientation == Orientation.landscape;

    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A4D68),
        title: const Text(
          'Pekerjaan Printing',
          style: TextStyle(color: Colors.white),
        ),
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
                  Expanded(flex: 2, child: _buildSummarySection()),
                  const SizedBox(width: 16),
                  Expanded(flex: 3, child: _buildFormSection()),
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
    final isLandscape =
        MediaQuery.of(context).orientation == Orientation.landscape;

    if (_isLoadingSummary) {
      return Card(
        child: Padding(
          padding: EdgeInsets.all(isLandscape ? 16 : 24),
          child: const Center(child: CircularProgressIndicator()),
        ),
      );
    }

    final totalRevenue = (_summary['total_revenue'] as num?)?.toDouble() ?? 0;
    final totalRevenueCash =
        (_summary['total_revenue_cash'] as num?)?.toDouble() ?? 0; // NEW
    final totalRevenueTransfer =
        (_summary['total_revenue_transfer'] as num?)?.toDouble() ?? 0; // NEW
    final totalJobs = (_summary['total_jobs'] as num?)?.toInt() ?? 0;
    final byMaterial = (_summary['by_material'] as List<dynamic>?) ?? [];

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
                children: byMaterial.map((entry) {
                  final materialValue = entry['material']?.toString() ?? 'unknown';
                  final materialLabel = _materialLabel(materialValue);
                  final revenue =
                      (entry['total_revenue'] as num?)?.toDouble() ?? 0;
                  final quantity = (entry['total_qty'] as num?)?.toDouble() ?? 0;
                  return InkWell(
                    onTap: () => _showMaterialDetail(materialValue),
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
                            '${quantity.toStringAsFixed(0)} lembar',
                            style: TextStyle(
                              color: Colors.white54,
                              fontSize: isLandscape ? 10 : 11,
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
    final isLandscape =
        MediaQuery.of(context).orientation == Orientation.landscape;

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
                LayoutBuilder(
                  builder: (context, constraints) {
                    final gap = 12.0;
                    final availableWidth = constraints.maxWidth - gap;
                    final fieldWidth = availableWidth > 0
                        ? availableWidth / 2
                        : constraints.maxWidth;
                    return Row(
                      children: [
                        SizedBox(
                          width: fieldWidth,
                          child: TextFormField(
                            controller: _dateController,
                            readOnly: true,
                            onTap: _pickDate,
                            decoration: InputDecoration(
                              labelText: 'Tanggal *',
                              suffixIcon: const Icon(Icons.calendar_today),
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(
                                vertical: 16,
                                horizontal: 12,
                              ),
                            ),
                          ),
                        ),
                        SizedBox(width: gap),
                        SizedBox(
                          width: fieldWidth,
                          child: DropdownButtonFormField<String>(
                            isExpanded: true,
                            value: _selectedStockId,
                            decoration: InputDecoration(
                              labelText: 'Bahan *',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(
                                vertical: 16,
                                horizontal: 12,
                              ),
                            ),
                            items: _stockItems.isEmpty
                                ? [
                                    DropdownMenuItem<String>(
                                      value: _emptyStockValue,
                                      child: Text(
                                        'Belum ada bahan PRINT (tambahkan di Stock)',
                                      ),
                                    ),
                                  ]
                                : _stockItems.map((stock) {
                                    final stockId = _getStockId(stock);
                                    final label =
                                        stock['name']?.toString() ?? 'Bahan';
                                    final qty = _getStockQuantity(
                                      stock,
                                    ).toInt();
                                    return DropdownMenuItem<String>(
                                      value: stockId,
                                      child: Row(
                                        children: [
                                          Expanded(
                                            child: Text(
                                              '$label (${_formatNumber(qty)})',
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                          if (_isLowStock(stock))
                                            Padding(
                                              padding: const EdgeInsets.only(
                                                left: 8,
                                              ),
                                              child: Icon(
                                                Icons.warning_amber_rounded,
                                                color: Colors.orange,
                                                size: 16,
                                              ),
                                            ),
                                        ],
                                      ),
                                    );
                                  }).toList(),
                            onChanged: (value) {
                              final selected = _findStockById(value);
                              setState(() {
                                _selectedStockId = value;
                                _selectedStock = selected;
                                _selectedMaterial = selected != null
                                    ? _deriveMaterialKey(selected)
                                    : null;
                              });
                            },
                            validator: (value) =>
                                value == null ? 'Pilih bahan' : null,
                          ),
                        ),
                      ],
                    );
                  },
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
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: DropdownButtonFormField<String>(
                        isExpanded: true,
                        value: _selectedStockId,
                        decoration: InputDecoration(
                          labelText: 'Bahan *',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                        items: _stockItems.isEmpty
                            ? [
                                DropdownMenuItem<String>(
                                  value: _emptyStockValue,
                                  child: Text(
                                    'Belum ada bahan PRINT (tambahkan di Stock)',
                                  ),
                                ),
                              ]
                            : _stockItems.map((stock) {
                                final stockId = _getStockId(stock);
                                final label =
                                    stock['name']?.toString() ?? 'Bahan';
                                final qty = _getStockQuantity(stock).toInt();
                                return DropdownMenuItem<String>(
                                  value: stockId,
                                  child: Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          '$label (${_formatNumber(qty)})',
                                          overflow: TextOverflow.ellipsis,
                                        ),
                                      ),
                                      if (_isLowStock(stock))
                                        Padding(
                                          padding: const EdgeInsets.only(
                                            left: 8,
                                          ),
                                          child: Icon(
                                            Icons.warning_amber_rounded,
                                            color: Colors.orange,
                                            size: 16,
                                          ),
                                        ),
                                    ],
                                  ),
                                );
                              }).toList(),
                        onChanged: (value) {
                          final selected = _findStockById(value);
                          setState(() {
                            _selectedStockId = value;
                            _selectedStock = selected;
                            _selectedMaterial = selected != null
                                ? _deriveMaterialKey(selected)
                                : null;
                          });
                        },
                        validator: (value) =>
                            value == null ? 'Pilih bahan' : null,
                      ),
                    ),
                  ],
                ),
              const SizedBox(height: 16),
              // NEW: Payment Method Selection
              DropdownButtonFormField<String>(
                value: _selectedPaymentMethod,
                decoration: InputDecoration(
                  labelText: 'Metode Pembayaran *',
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
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
                        Icon(
                          Icons.account_balance,
                          color: Colors.blue,
                          size: 20,
                        ),
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
                validator: (value) =>
                    value == null ? 'Pilih metode pembayaran' : null,
              ),
              // Stock Info
              if (_selectedStock != null) ...[
                const SizedBox(height: 12),
                Builder(
                  builder: (context) {
                    final qty = _getStockQuantity(_selectedStock!);
                    final available = qty > 0;
                    final lowStock = _isLowStock(_selectedStock!);
                    final bgColor = !available
                        ? Colors.red.shade50
                        : lowStock
                        ? Colors.orange.shade50
                        : Colors.green.shade50;
                    final borderColor = !available
                        ? Colors.red.shade300
                        : lowStock
                        ? Colors.orange.shade300
                        : Colors.green.shade300;
                    final icon = !available
                        ? Icons.error
                        : lowStock
                        ? Icons.warning
                        : Icons.check_circle;
                    final iconColor = !available
                        ? Colors.red
                        : lowStock
                        ? Colors.orange
                        : Colors.green;
                    final message = !available
                        ? 'Stock habis'
                        : lowStock
                        ? 'Stok menipis (${qty.toInt()} tersisa)'
                        : 'Stock tersedia: ${qty.toInt()}';
                    return Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: bgColor,
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: borderColor),
                      ),
                      child: Row(
                        children: [
                          Icon(icon, color: iconColor),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              message,
                              style: TextStyle(
                                color: !available
                                    ? Colors.red.shade900
                                    : lowStock
                                    ? Colors.orange.shade900
                                    : Colors.green.shade900,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ],
              const SizedBox(height: 16),
              // Quantity and Price Row
              LayoutBuilder(
                builder: (context, constraints) {
                  final gap = isLandscape ? 10.0 : 12.0;
                  final availableWidth = constraints.maxWidth - gap;
                  final fieldWidth = availableWidth > 0
                      ? availableWidth / 2
                      : constraints.maxWidth;
                  return Row(
                    children: [
                      SizedBox(
                        width: fieldWidth,
                        child: TextFormField(
                          controller: _quantityController,
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: true,
                          ),
                          decoration: InputDecoration(
                            labelText: 'Jumlah *',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            isDense: isLandscape,
                            contentPadding: isLandscape
                                ? const EdgeInsets.symmetric(
                                    vertical: 16,
                                    horizontal: 12,
                                  )
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
                      SizedBox(width: gap),
                      SizedBox(
                        width: fieldWidth,
                        child: TextFormField(
                          controller: _priceController,
                          keyboardType: const TextInputType.numberWithOptions(
                            decimal: false,
                          ),
                          inputFormatters: [
                            FilteringTextInputFormatter.digitsOnly,
                            RupiahThousandsFormatter(),
                          ],
                          decoration: InputDecoration(
                            labelText: 'Harga (Rp) *',
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                            isDense: isLandscape,
                            contentPadding: isLandscape
                                ? const EdgeInsets.symmetric(
                                    vertical: 16,
                                    horizontal: 12,
                                  )
                                : null,
                            prefixText: 'Rp ',
                            hintText: '0',
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Harga wajib diisi';
                            }
                            final price =
                                ThousandsSeparatorInputFormatter.parseToDouble(
                                  value,
                                );
                            if (price == null || price <= 0) {
                              return 'Harga harus > 0';
                            }
                            return null;
                          },
                        ),
                      ),
                    ],
                  );
                },
              ),
              // Total Preview
              if (_quantityController.text.isNotEmpty &&
                  _priceController.text.isNotEmpty) ...[
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
                LayoutBuilder(
                  builder: (context, constraints) {
                    final gap = 12.0;
                    final availableWidth = constraints.maxWidth - gap;
                    final fieldWidth = availableWidth > 0
                        ? availableWidth / 2
                        : constraints.maxWidth;
                    return Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          width: fieldWidth,
                          child: TextFormField(
                            controller: _customerController,
                            decoration: InputDecoration(
                              labelText: 'Nama Customer (Opsional)',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(
                                vertical: 16,
                                horizontal: 12,
                              ),
                            ),
                          ),
                        ),
                        SizedBox(width: gap),
                        SizedBox(
                          width: fieldWidth,
                          child: TextFormField(
                            controller: _notesController,
                            maxLines: 3,
                            decoration: InputDecoration(
                              labelText: 'Catatan (Opsional)',
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              isDense: true,
                              contentPadding: const EdgeInsets.symmetric(
                                vertical: 16,
                                horizontal: 12,
                              ),
                            ),
                          ),
                        ),
                      ],
                    );
                  },
                )
              else
                Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    TextFormField(
                      controller: _customerController,
                      decoration: InputDecoration(
                        labelText: 'Nama Customer (Opsional)',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                    TextFormField(
                      controller: _notesController,
                      maxLines: 3,
                      decoration: InputDecoration(
                        labelText: 'Catatan (Opsional)',
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
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
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
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
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
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
    return value
        .toStringAsFixed(0)
        .replaceAllMapped(
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
                        final date = _formatDate(
                          job['date'] ?? job['created_at'],
                        );
                        final quantity =
                            (job['quantity'] as num?)?.toDouble() ?? 0;
                        final price = (job['price'] as num?)?.toDouble() ?? 0;
                        final total = quantity * price;
                        final paymentMethod =
                            job['payment_method']?.toString().toLowerCase() ??
                            'cash';
                        final customerName =
                            job['customer_name']?.toString() ?? '-';
                        final notes = job['notes']?.toString() ?? '-';

                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: Padding(
                            padding: const EdgeInsets.all(12),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
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
                                        paymentMethod == 'transfer'
                                            ? 'Transfer'
                                            : 'Cash',
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
                                  mainAxisAlignment:
                                      MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Qty: ${quantity.toStringAsFixed(0)}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Colors.black54,
                                      ),
                                    ),
                                    Text(
                                      'Rp ${_formatNumber(price)}',
                                      style: const TextStyle(
                                        fontSize: 12,
                                        color: Colors.black54,
                                      ),
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
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Colors.black54,
                                    ),
                                  ),
                                ],
                                if (notes != '-') ...[
                                  const SizedBox(height: 4),
                                  Text(
                                    'Catatan: $notes',
                                    style: const TextStyle(
                                      fontSize: 12,
                                      color: Colors.black54,
                                    ),
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

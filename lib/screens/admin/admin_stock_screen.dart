// ============================================
// ADMIN STOCK SCREEN - STABLE MODULE
// FINAL UI:
// - Portrait: vertical layout
// - Landscape: LEFT (info static) + RIGHT (list scrollable)
// - Color palette: teal soft & consistent
// - "Min Stok" REMOVED (feature not ready)
// - Form dialog: scrollable
// - NO overflow, NO logic/API changes
// ============================================
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:sistem_absen_flutter_v2/core/utils/number_formatter.dart';
import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

const List<String> _stockUnitOptions = [
  'pcs',
  'Roll',
  'Meter',
  'Kg (Kilogram)',
  'Liter',
  'Box',
  'Pack',
];

class AdminStockScreen extends StatefulWidget {
  const AdminStockScreen({super.key});

  @override
  State<AdminStockScreen> createState() => _AdminStockScreenState();
}

class _AdminStockScreenState extends State<AdminStockScreen> {
  late Future<List<Map<String, dynamic>>> _stocksFuture;

  @override
  void initState() {
    super.initState();
    _stocksFuture = _loadStocks();
  }

  Future<void> _handleEditStock(Map<String, dynamic> stock) async {
    final stockId = _stockId(stock);
    if (stockId.isEmpty) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Data stock tidak valid')),
      );
      return;
    }
    final payload = await _showEditStockDialog(stock);
    if (payload == null) return;
    await Future<void>.delayed(Duration.zero);
    if (!mounted) return;
    try {
      await _updateStockDetails(stockId, payload);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Data stock diperbarui')),
      );
      await _refreshStocks();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memperbarui stock: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<List<Map<String, dynamic>>> _loadStocks() async {
    final stocks = await ApiService.fetchStocks();
    stocks.sort((a, b) => _stockName(a).compareTo(_stockName(b)));
    return stocks;
  }

  Future<void> _refreshStocks() async {
    final next = _loadStocks();
    setState(() {
      _stocksFuture = next;
    });
    await next;
  }

  String _stockName(Map<String, dynamic> stock) {
    return (stock['name'] ?? stock['material_name'] ?? stock['title'] ?? '').toString();
  }

  String _formatNumber(num value) {
    return ThousandsSeparatorInputFormatter.formatNumber(value);
  }

  double _parseNumeric(dynamic value) {
    if (value == null) return 0;
    if (value is num) return value.toDouble();
    return double.tryParse(value.toString().replaceAll(',', '.')) ?? 0;
  }

  double _stockQuantity(Map<String, dynamic> stock) {
    return _parseNumeric(stock['quantity'] ?? stock['qty'] ?? stock['stock_amount']);
  }

  double _stockThreshold(Map<String, dynamic> stock) {
    return _parseNumeric(
      stock['thresholdMinimum'] ??
          stock['threshold_minimum'] ??
          stock['threshold'] ??
          stock['min_stock'] ??
          stock['limit'],
    );
  }

  bool _isLowStock(Map<String, dynamic> stock) {
    final threshold = _stockThreshold(stock);
    if (threshold <= 0) return false;
    return _stockQuantity(stock) <= threshold;
  }

  String _stockUsageCategory(Map<String, dynamic> stock) {
    final raw = stock['usage_category'] ?? stock['usageCategory'] ?? stock['usage'] ?? stock['type'] ?? 'UMUM';
    final normalized = raw.toString().toUpperCase();
    return normalized == 'PRINT' ? 'PRINT' : 'UMUM';
  }

  String _stockUnit(Map<String, dynamic> stock) {
    return (stock['unit'] ?? stock['satuan'] ?? '').toString();
  }

  String _stockId(Map<String, dynamic> stock) {
    return stock['material_id']?.toString() ??
        stock['stock_id']?.toString() ??
        stock['id']?.toString() ??
        stock['uuid']?.toString() ??
        '';
  }

  Future<void> _updateStockDetails(String stockId, Map<String, dynamic> payload) async {
    final uri = Uri.parse('${ApiService.baseUrl}/stock/$stockId');
    final response = await http.put(
      uri,
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal memperbarui stok');
    }
  }

  Future<Map<String, dynamic>?> _showEditStockDialog(Map<String, dynamic> stock) async {
    final stockId = _stockId(stock);
    if (stockId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Data stock tidak valid')),
      );
      return null;
    }
    final unit = _stockUnit(stock);
    final price = _parseNumeric(stock['price'] ?? stock['hpp'] ?? stock['price_per_unit']);
    final notes = stock['notes']?.toString() ?? '';
    final payload = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => _StockFormDialog(
        title: 'Edit Barang',
        initialName: _stockName(stock),
        initialQuantity: _stockQuantity(stock),
        initialUnit: unit.isNotEmpty ? unit : 'pcs',
        initialPrice: price,
        initialNotes: notes,
        initialUsageCategory: _stockUsageCategory(stock),
      ),
    );
    return payload;
  }

  Future<void> _showDeleteStockDialog(Map<String, dynamic> stock) async {
    final stockId = _stockId(stock);
    if (stockId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Data stock tidak valid')),
      );
      return;
    }
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus Stock'),
        content: const Text('Apakah Anda yakin ingin menghapus stock ini?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(false), child: const Text('Batal')),
          ElevatedButton(
            onPressed: () => Navigator.of(context).pop(true),
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Hapus'),
          ),
        ],
      ),
    );
    if (confirmed != true) return;
    try {
      await ApiService.deleteStock(stockId);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Stock dihapus')),
      );
      await _refreshStocks();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal menghapus stock: $e'), backgroundColor: Colors.red),
      );
    }
  }

  Future<Map<String, dynamic>?> _showAddStockDialog() async {
    final payload = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => const _StockFormDialog(title: 'Tambah Barang'),
    );
    return payload;
  }

  Future<void> _handleAddStock() async {
    final payload = await _showAddStockDialog();
    if (payload == null) return;
    await Future<void>.delayed(Duration.zero);
    if (!mounted) return;
    try {
      await ApiService.createStock(payload);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Barang ditambahkan')),
      );
      await _refreshStocks();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal menambahkan barang: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Widget _buildInfoSection(int totalItems, int lowStockCount) {
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          const Text(
            'Data stok bahan LB.ADV',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          const Text(
            'Pantau jumlah bahan, nilai persediaan, dan stock menipis.',
            style: TextStyle(color: Colors.black54),
          ),
          const SizedBox(height: 16),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFF4DB6AC),
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Total Item', style: TextStyle(color: Colors.white70, fontSize: 13)),
                const SizedBox(height: 6),
                Text(
                  '$totalItems',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 12),
          Container(
            decoration: BoxDecoration(
              color: const Color(0xFFFFB74D),
              borderRadius: BorderRadius.circular(12),
            ),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text('Stock Menipis', style: TextStyle(color: Colors.white70, fontSize: 13)),
                const SizedBox(height: 6),
                Text(
                  '$lowStockCount',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 20,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ElevatedButton.icon(
            onPressed: _handleAddStock,
            icon: const Icon(Icons.add),
            label: const Text('Tambah Barang'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2EC4B6),
              foregroundColor: Colors.white,
              minimumSize: const Size.fromHeight(48),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStockListItem(Map<String, dynamic> stock) {
    final quantity = _stockQuantity(stock);
    final threshold = _stockThreshold(stock);
    final lowStock = _isLowStock(stock);
    final unit = _stockUnit(stock);
    final price = _parseNumeric(stock['price'] ?? stock['hpp'] ?? stock['price_per_unit']);
    
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    radius: 22,
                    backgroundColor: lowStock ? const Color(0xFFFFB74D) : const Color(0xFF4DB6AC),
                    child: Text(
                      _stockName(stock).isEmpty ? '-' : _stockName(stock)[0].toUpperCase(),
                      style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      _stockName(stock),
                      style: const TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  PopupMenuButton<String>(
                    icon: const Icon(Icons.more_vert),
                    onSelected: (value) {
                      if (value == 'edit') {
                        _handleEditStock(stock);
                      } else if (value == 'delete') {
                        _showDeleteStockDialog(stock);
                      }
                    },
                    itemBuilder: (context) => const [
                      PopupMenuItem(value: 'edit', child: Text('Edit')),
                      PopupMenuItem(value: 'delete', child: Text('Hapus')),
                    ],
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                '${_formatNumber(quantity)} ${unit.isNotEmpty ? unit : ''}',
                style: const TextStyle(fontWeight: FontWeight.w500),
              ),
              const SizedBox(height: 6),
              Text(
                'HPP: Rp ${_formatNumber(price)}',
                style: TextStyle(color: Colors.grey.shade700),
              ),
              const SizedBox(height: 3),
              Text(
                'Penggunaan: ${_stockUsageCategory(stock)}',
                style: TextStyle(color: Colors.grey.shade700),
              ),
              if (lowStock) ...[
                const SizedBox(height: 6),
                Text(
                  'Stok rendah',
                  style: TextStyle(color: Colors.orange.shade700, fontWeight: FontWeight.w600),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildPortraitLayout(List<Map<String, dynamic>> stocks) {
    final totalItems = stocks.length;
    final lowStockCount = stocks.where(_isLowStock).length;
    
    return RefreshIndicator(
      onRefresh: _refreshStocks,
      child: ListView.builder(
        padding: const EdgeInsets.symmetric(vertical: 8),
        itemCount: stocks.length + 1,
        itemBuilder: (context, index) {
          if (index == 0) {
            return Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFF4DB6AC).withOpacity(0.3), width: 2),
                ),
                child: _buildInfoSection(totalItems, lowStockCount),
              ),
            );
          }
          return _buildStockListItem(stocks[index - 1]);
        },
      ),
    );
  }

  Widget _buildLandscapeLayout(List<Map<String, dynamic>> stocks) {
    final totalItems = stocks.length;
    final lowStockCount = stocks.where(_isLowStock).length;
    
    return Row(
      children: [
        SizedBox(
          width: 420,
          child: Container(
            color: Colors.white,
            child: _buildInfoSection(totalItems, lowStockCount),
          ),
        ),
        const VerticalDivider(width: 1, thickness: 1, color: Colors.black12),
        Expanded(
          child: RefreshIndicator(
            onRefresh: _refreshStocks,
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: stocks.length,
              itemBuilder: (context, index) => _buildStockListItem(stocks[index]),
            ),
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
        title: const Text('Admin Stock'),
        backgroundColor: const Color(0xFF2EC4B6),
      ),
      backgroundColor: const Color(0xFFEAF7FA),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _handleAddStock,
        backgroundColor: const Color(0xFF2EC4B6),
        icon: const Icon(Icons.add),
        label: const Text('Tambah Barang'),
      ),
      body: FutureBuilder<List<Map<String, dynamic>>>(
        future: _stocksFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(
              child: Text('Gagal memuat data: ${snapshot.error}'),
            );
          }
          final stocks = snapshot.data ?? [];
          if (stocks.isEmpty) {
            return RefreshIndicator(
              onRefresh: _refreshStocks,
              child: ListView(
                physics: const AlwaysScrollableScrollPhysics(),
                children: const [
                  SizedBox(height: 120),
                  Center(child: Text('Belum ada data stock')),
                ],
              ),
            );
          }
          return isLandscape
              ? _buildLandscapeLayout(stocks)
              : _buildPortraitLayout(stocks);
        },
      ),
    );
  }
}

class _StockFormDialog extends StatefulWidget {
  final String title;
  final String initialName;
  final double initialQuantity;
  final String initialUnit;
  final double initialPrice;
  final String initialNotes;
  final String initialUsageCategory;

  const _StockFormDialog({
    Key? key,
    required this.title,
    this.initialName = '',
    this.initialQuantity = 0,
    this.initialUnit = 'pcs',
    this.initialPrice = 0,
    this.initialNotes = '',
    this.initialUsageCategory = 'UMUM',
  }) : super(key: key);

  @override
  State<_StockFormDialog> createState() => _StockFormDialogState();
}

class _StockFormDialogState extends State<_StockFormDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _quantityController;
  late final TextEditingController _priceController;
  late final TextEditingController _notesController;
  late String _selectedUnit;
  late String _usageCategory;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialName);
    _quantityController = TextEditingController(
      text: widget.initialQuantity > 0 ? widget.initialQuantity.toString() : '',
    );
    _priceController = TextEditingController(
      text: widget.initialPrice > 0 ? widget.initialPrice.toString() : '',
    );
    _notesController = TextEditingController(text: widget.initialNotes);
    _selectedUnit = widget.initialUnit.isNotEmpty ? widget.initialUnit : 'pcs';
    _usageCategory = widget.initialUsageCategory.isNotEmpty ? widget.initialUsageCategory : 'UMUM';
  }

  @override
  void dispose() {
    _nameController.dispose();
    _quantityController.dispose();
    _priceController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  void _handleSave() {
    final name = _nameController.text.trim();
    final unit = _selectedUnit.trim();
    final quantity = double.tryParse(_quantityController.text.replaceAll(',', '.')) ?? 0;
    if (name.isEmpty || unit.isEmpty || quantity <= 0) {
      return;
    }
    Navigator.of(context).pop({
      'name': name,
      'quantity': quantity,
      'unit': _selectedUnit,
      'price': double.tryParse(_priceController.text.replaceAll(',', '.')) ?? 0,
      'notes': _notesController.text.trim(),
      'usage_category': _usageCategory,
    });
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: Text(widget.title),
      content: SizedBox(
        width: double.maxFinite,
        child: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: _nameController,
                decoration: const InputDecoration(labelText: 'Nama'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _quantityController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Jumlah'),
              ),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                value: _selectedUnit,
                decoration: const InputDecoration(labelText: 'Satuan'),
                items: _stockUnitOptions
                    .map((unit) => DropdownMenuItem(value: unit, child: Text(unit)))
                    .toList(),
                onChanged: (value) {
                  if (value == null) return;
                  setState(() => _selectedUnit = value);
                },
              ),
              const SizedBox(height: 12),
              TextField(
                controller: _priceController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: const InputDecoration(labelText: 'Harga per Unit (Opsional)'),
              ),
              const SizedBox(height: 8),
              TextField(
                controller: _notesController,
                decoration: const InputDecoration(labelText: 'Catatan (Opsional)'),
              ),
              const SizedBox(height: 16),
              const Align(
                alignment: Alignment.centerLeft,
                child: Text('Kategori Penggunaan', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
              Row(
                children: [
                  Radio<String>(
                    value: 'UMUM',
                    groupValue: _usageCategory,
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() => _usageCategory = value);
                    },
                  ),
                  const Text('UMUM'),
                  Radio<String>(
                    value: 'PRINT',
                    groupValue: _usageCategory,
                    onChanged: (value) {
                      if (value == null) return;
                      setState(() => _usageCategory = value);
                    },
                  ),
                  const Text('PRINT'),
                ],
              ),
            ],
          ),
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.of(context).pop(), child: const Text('Batal')),
        ElevatedButton(
          onPressed: _handleSave,
          child: const Text('Simpan'),
        ),
      ],
    );
  }
}

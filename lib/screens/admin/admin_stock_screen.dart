import 'package:flutter/material.dart';
import 'package:sistem_absen_flutter_v2/core/utils/number_formatter.dart';
import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

class AdminStockScreen extends StatefulWidget {
  const AdminStockScreen({super.key});

  @override
  State<AdminStockScreen> createState() => _AdminStockScreenState();
}

class _AdminStockScreenState extends State<AdminStockScreen> {
  late Future<List<Map<String, dynamic>>> _stocksFuture;
  final Map<String, bool> _isUpdatingUsage = {};

  @override
  void initState() {
    super.initState();
    _stocksFuture = _loadStocks();
  }

  Future<List<Map<String, dynamic>>> _loadStocks() async {
    final stocks = await ApiService.fetchStocks();
    stocks.sort((a, b) => _stockName(a).compareTo(_stockName(b)));
    return stocks;
  }

  Future<void> _refreshStocks() async {
    final next = _loadStocks();
    setState(() => _stocksFuture = next);
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

  String _stockCategory(Map<String, dynamic> stock) {
    final raw = stock['category'] ?? stock['kategori'] ?? stock['type'] ?? stock['group'];
    return raw?.toString() ?? 'UMUM';
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

  Future<void> _showAdjustStockDialog(Map<String, dynamic> stock, String type) async {
    final controller = TextEditingController();
    final formKey = GlobalKey<FormState>();
    final actionLabel = type == 'in' ? 'Tambah Stok' : 'Kurangi Stok';
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(actionLabel),
        content: Form(
          key: formKey,
          child: TextFormField(
            controller: controller,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: const InputDecoration(
              labelText: 'Jumlah',
              prefixIcon: Icon(Icons.numbers),
            ),
            validator: (value) {
              final parsed = double.tryParse(value?.replaceAll(',', '.') ?? '');
              if (parsed == null || parsed <= 0) {
                return 'Masukkan angka lebih dari 0';
              }
              return null;
            },
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
          ElevatedButton(
            onPressed: () {
              if (formKey.currentState?.validate() ?? false) {
                Navigator.of(context).pop(true);
              }
            },
            child: const Text('Simpan'),
          ),
        ],
      ),
    );
    if (result != true) {
      return;
    }
    final quantity = double.tryParse(controller.text.replaceAll(',', '.')) ?? 0;
    if (quantity <= 0) {
      return;
    }
    final stockId = _stockId(stock);
    if (stockId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Data stock tidak valid')),
      );
      return;
    }
    try {
      await ApiService.updateStock(
        stockId: stockId,
        quantity: quantity,
        type: type,
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$actionLabel berhasil')),
      );
      await _refreshStocks();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal memperbarui stok: $e')),
      );
    }
  }

  Future<void> _changeUsageCategory(Map<String, dynamic> stock, String usage) async {
    final stockId = _stockId(stock);
    if (stockId.isEmpty) return;
    if (_stockUsageCategory(stock) == usage) return;
    setState(() => _isUpdatingUsage[stockId] = true);
    try {
      await ApiService.updateStockUsageCategory(
        stockId: stockId,
        usageCategory: usage,
      );
      if (!mounted) return;
      await _refreshStocks();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal mengubah penggunaan: $e'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) {
        setState(() => _isUpdatingUsage[stockId] = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Admin Stock'),
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
          return RefreshIndicator(
            onRefresh: _refreshStocks,
            child: ListView.builder(
              padding: const EdgeInsets.symmetric(vertical: 8),
              itemCount: stocks.length,
              itemBuilder: (context, index) {
                final stock = stocks[index];
                final quantity = _stockQuantity(stock);
                final threshold = _stockThreshold(stock);
                final lowStock = _isLowStock(stock);
                final unit = _stockUnit(stock);
                final category = _stockCategory(stock);
                return Card(
                  margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
                  child: ListTile(
                    isThreeLine: true,
                    leading: CircleAvatar(
                      backgroundColor: lowStock ? Colors.red.shade300 : Colors.blue.shade300,
                      child: Text(
                        _stockName(stock).isEmpty ? '-' : _stockName(stock)[0].toUpperCase(),
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                    title: Text(
                      _stockName(stock),
                      style: const TextStyle(fontWeight: FontWeight.w600),
                    ),
                    subtitle: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          '$category • ${_formatNumber(quantity)} ${unit.isNotEmpty ? unit : ''}',
                        ),
                        const SizedBox(height: 4),
                        Row(
                          children: [
                            const Text('Penggunaan: ', style: TextStyle(color: Colors.black87)),
                            DropdownButton<String>(
                              value: _stockUsageCategory(stock),
                              items: const [
                                DropdownMenuItem(value: 'PRINT', child: Text('PRINT')),
                                DropdownMenuItem(value: 'UMUM', child: Text('UMUM')),
                              ],
                              onChanged: (value) {
                                if (value != null) {
                                  _changeUsageCategory(stock, value);
                                }
                              },
                            ),
                            if (_isUpdatingUsage[_stockId(stock)] == true)
                              const SizedBox(width: 8, height: 24, child: CircularProgressIndicator(strokeWidth: 2)),
                          ],
                        ),
                        Row(
                          children: [
                        Text(
                          'Min stok: ${threshold > 0 ? _formatNumber(threshold) : '-'}',
                          style: TextStyle(color: Colors.grey.shade600),
                        ),
                            if (lowStock) ...[
                              const SizedBox(width: 8),
                              Icon(Icons.warning_amber, color: Colors.red.shade600, size: 18),
                              const SizedBox(width: 4),
                              const Text(
                                'Stok rendah',
                                style: TextStyle(color: Colors.red),
                              ),
                            ],
                          ],
                        ),
                      ],
                    ),
                    trailing: PopupMenuButton<String>(
                      icon: const Icon(Icons.more_vert),
                      onSelected: (value) => _showAdjustStockDialog(stock, value),
                      itemBuilder: (context) => const [
                        PopupMenuItem(value: 'in', child: Text('Tambah Stok')),
                        PopupMenuItem(value: 'out', child: Text('Kurangi Stok')),
                      ],
                    ),
                  ),
                );
              },
            ),
          );
        },
      ),
    );
  }
}

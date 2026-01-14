import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';
import 'package:sistem_absen_flutter_v2/core/utils/number_formatter.dart';

class AdminProjectScreen extends StatefulWidget {
  const AdminProjectScreen({super.key});

  @override
  State<AdminProjectScreen> createState() => _AdminProjectScreenState();
}

class _AdminProjectScreenState extends State<AdminProjectScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _projects = [];

  @override
  void initState() {
    super.initState();
    _loadProjects();
  }

  Future<void> _loadProjects() async {
    setState(() => _isLoading = true);
    try {
      // Gunakan method khusus yang hanya menggunakan endpoint /projects tanpa fallback
      final data = await ApiService.fetchProjectsOnly();
      if (!mounted) return;
      
      // Debug: log struktur data untuk melihat field yang tersedia
      if (data.isNotEmpty) {
        debugPrint('Sample project data: ${data.first}');
        debugPrint('Project name fields: project_name=${data.first['project_name']}, name=${data.first['name']}');
      }
      
      setState(() {
        _projects = _filterRecentProjects(data);
      });
    } catch (e) {
      if (!mounted) return;
      // Jika error, set projects ke empty list dan tampilkan pesan error
      setState(() {
        _projects = [];
      });
      // Hanya tampilkan error jika bukan 404 (endpoint tidak ditemukan)
      final errorMessage = e.toString();
      if (!errorMessage.contains('404') && !errorMessage.contains('Not Found')) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Gagal memuat data project: ${e.toString()}'),
            backgroundColor: Colors.red,
            duration: const Duration(seconds: 3),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  double get _totalHPP {
    double total = 0;
    for (final project in _projects) {
      double hpp = _parseToDouble(project['hpp']) ?? 0;
      // Jika HPP = 0, hitung dari materials
      if (hpp == 0 && project['materials'] != null) {
        final materials = project['materials'];
        if (materials is List) {
          for (var material in materials) {
            if (material is Map) {
              final qty = _parseToDouble(material['quantity']) ?? 0;
              final price = _parseToDouble(material['price']) ?? 0;
              hpp += qty * price;
            }
          }
        }
      }
      total += hpp;
    }
    return total;
  }

  double get _totalRevenue {
    double total = 0;
    for (final project in _projects) {
      final price = _parseToDouble(project['price']) ?? 0;
      total += price;
    }
    return total;
  }

  List<Map<String, dynamic>> _filterRecentProjects(List<Map<String, dynamic>> data) {
    final now = DateTime.now();
    final cutoff = DateTime(now.year, now.month - 6, now.day);

    DateTime? _parseDate(dynamic value) {
      if (value == null) return null;
      final raw = value.toString();
      if (raw.isEmpty) return null;
      final clean = raw.contains('T') ? raw.split('T').first : raw.split(' ').first;
      return DateTime.tryParse(clean);
    }

    return data.where((project) {
      final date = _parseDate(project['date'] ?? project['created_at']);
      if (date == null) return true;
      return !date.isBefore(cutoff);
    }).toList();
  }

  Future<void> _openProjectForm({Map<String, dynamic>? project}) async {
    debugPrint('_openProjectForm called, project: ${project != null ? "edit" : "new"}');
    
    // Jika edit project, langsung buka form (payment_method sudah ada)
    if (project != null) {
      debugPrint('Opening edit form directly');
      final shouldRefresh = await showDialog<bool>(
        context: context,
        barrierDismissible: false,
        builder: (context) => _ProjectFormDialog(project: project),
      );
      if (shouldRefresh == true) {
        _loadProjects();
      }
      return;
    }
    
    // Jika tambah project baru, tampilkan popup pilih payment method dulu
    debugPrint('Showing payment method selection dialog');
    
    // Pastikan dialog muncul dengan delay kecil untuk memastikan context siap
    await Future.delayed(const Duration(milliseconds: 100));
    
    if (!mounted) return;
    
    final selectedPaymentMethod = await showDialog<String>(
      context: context,
      barrierDismissible: true,
      useRootNavigator: true,
      barrierColor: Colors.black54,
      builder: (context) {
        debugPrint('Building _PaymentMethodSelectionDialog');
        return const _PaymentMethodSelectionDialog();
      },
    );
    
    debugPrint('Payment method selected: $selectedPaymentMethod');
    
    // Jika user cancel atau tidak pilih, tidak buka form
    if (selectedPaymentMethod == null || selectedPaymentMethod.isEmpty) {
      debugPrint('No payment method selected, cancelling');
      return;
    }
    
    // Buka form dengan payment method yang dipilih
    debugPrint('Opening form with payment method: $selectedPaymentMethod');
    final shouldRefresh = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _ProjectFormDialog(
        project: null,
        initialPaymentMethod: selectedPaymentMethod,
      ),
    );
    if (shouldRefresh == true) {
      _loadProjects();
    }
  }

  Future<void> _confirmDelete(Map<String, dynamic> project) async {
    final shouldDelete = await showDialog<bool>(
      context: context,
      builder: (_) => const _DeleteProjectDialog(),
    );
    if (shouldDelete == true) {
      try {
        final id = project['id'];
        if (id == null) {
          throw Exception('ID project tidak ditemukan');
        }
        await ApiService.deleteProjectOnly(id.toString());
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Project dihapus'), backgroundColor: Colors.green),
        );
        _loadProjects();
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
        );
      }
    }
  }

  Future<void> _viewProjectDetails(Map<String, dynamic> project) async {
    Map<String, dynamic> detail = project;
    final id = project['id']?.toString();
    if (id != null && id.isNotEmpty) {
      try {
        detail = await ApiService.fetchProjectDetail(id);
      } catch (_) {
        // TEMPORARY: backend belum menyediakan endpoint detail project
        // Jangan cache / memoize
        detail = project;
      }
    } else {
      // TEMPORARY: backend belum menyediakan endpoint detail project
      // Jangan cache / memoize
      detail = project;
    }

    if (!mounted) return;

    await showDialog(
      context: context,
      builder: (_) => _ViewProjectDialog(project: detail),
    );
  }

  String _formatNumber(num value) {
    return value.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (match) => '${match.group(1)}.',
    );
  }

  double? _parseToDouble(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    if (value is String) {
      var normalized = value.trim();
      if (normalized.isEmpty) return null;
      normalized = normalized.replaceAll(RegExp(r'[^0-9,.\-]'), '');
      if (normalized.isEmpty) return null;
      final hasComma = normalized.contains(',');
      final hasDot = normalized.contains('.');
      if (hasComma && hasDot) {
        if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
          normalized = normalized.replaceAll('.', '').replaceAll(',', '.');
        } else {
          normalized = normalized.replaceAll(',', '');
        }
      } else if (hasComma) {
        normalized = normalized.replaceAll('.', '').replaceAll(',', '.');
      } else if (hasDot && RegExp(r'^\d{1,3}(\.\d{3})+$').hasMatch(normalized)) {
        normalized = normalized.replaceAll('.', '');
      }
      return double.tryParse(normalized);
    }
    return null;
  }

  bool get _isMobile {
    return MediaQuery.of(context).size.width < 600;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A4D68),
        title: const Text('Project', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadProjects,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: EdgeInsets.all(_isMobile ? 16 : 24),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildIndicators(),
                    const SizedBox(height: 16),
                    _buildAddProjectButton(),
                    const SizedBox(height: 24),
                    _buildProjectsTable(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildIndicators() {
    return Row(
      children: [
        Expanded(
          child: Card(
            elevation: 4,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFE53935), Color(0xFFC62828)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.inventory_2_outlined, color: Colors.white70, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Total HPP',
                        style: TextStyle(color: Colors.white70, fontSize: 14),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Rp ${_formatNumber(_totalHPP)}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
        const SizedBox(width: 16),
        Expanded(
          child: Card(
            elevation: 4,
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            child: Container(
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF43A047), Color(0xFF2E7D32)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.trending_up, color: Colors.white70, size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Total Pemasukan',
                        style: TextStyle(color: Colors.white70, fontSize: 14),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Text(
                    'Rp ${_formatNumber(_totalRevenue)}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAddProjectButton() {
    return Align(
      alignment: Alignment.centerRight,
      child: ElevatedButton.icon(
        onPressed: () => _openProjectForm(),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF00ACC1),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
        icon: const Icon(Icons.add),
        label: const Text(
          'Tambah Project',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
      ),
    );
  }

  Widget _buildProjectsTable() {
    if (_projects.isEmpty) {
      return Card(
        elevation: 4,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        child: Padding(
          padding: const EdgeInsets.all(48),
          child: Center(
            child: Column(
              children: [
                Icon(Icons.work_outline, size: 64, color: Colors.grey.shade400),
                const SizedBox(height: 16),
                Text(
                  'Belum ada data project',
                  style: TextStyle(color: Colors.grey.shade600, fontSize: 16),
                ),
              ],
            ),
          ),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.1),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: EdgeInsets.all(_isMobile ? 16 : 20),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                colors: [Color(0xFF0A4D68), Color(0xFF1A7BD0)],
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
              ),
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(16),
                topRight: Radius.circular(16),
              ),
            ),
            child: const Text(
              'Daftar Project',
              style: TextStyle(
                color: Colors.white,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
          ),
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: DataTable(
              columnSpacing: 24,
              headingRowColor: MaterialStateProperty.all(const Color(0xFFF5F5F5)),
              headingRowHeight: 56,
              columns: const [
                DataColumn(
                  label: Text(
                    'No',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: Color(0xFF0A4D68),
                    ),
                  ),
                ),
                DataColumn(
                  label: Text(
                    'Tanggal',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: Color(0xFF0A4D68),
                    ),
                  ),
                ),
                DataColumn(
                  label: Text(
                    'Nama Project',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: Color(0xFF0A4D68),
                    ),
                  ),
                ),
                DataColumn(
                  label: Text(
                    'Customer',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: Color(0xFF0A4D68),
                    ),
                  ),
                ),
                DataColumn(
                  label: Text(
                    'Nilai HPP',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: Color(0xFF0A4D68),
                    ),
                  ),
                ),
                DataColumn(
                  label: Text(
                    'Nilai Project',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: Color(0xFF0A4D68),
                    ),
                  ),
                ),
                DataColumn(
                  label: Text(
                    'Aksi',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: Color(0xFF0A4D68),
                    ),
                  ),
                ),
              ],
              rows: List<DataRow>.generate(
                _projects.length,
                (index) {
                  final project = _projects[index];
                  final rowNumber = index + 1;
                  final dateStr = project['date'] ?? project['created_at'] ?? '';
                  final displayDate = dateStr.toString().contains('T')
                      ? dateStr.toString().split('T').first
                      : dateStr.toString().split(' ').first;
                  
                  // Ambil nama project - hanya dari project_name atau name, JANGAN dari material
                  String projectName = '-';
                  if (project['project_name'] != null && project['project_name'].toString().trim().isNotEmpty) {
                    projectName = project['project_name'].toString().trim();
                  } else if (project['name'] != null && project['name'].toString().trim().isNotEmpty) {
                    // Hanya gunakan 'name' jika bukan dari material (cek dulu apakah name sama dengan material)
                    final nameValue = project['name'].toString().trim();
                    final materialValue = project['material']?.toString().trim() ?? '';
                    // Jika name berbeda dengan material, berarti itu nama project
                    if (nameValue != materialValue || materialValue.isEmpty) {
                      projectName = nameValue;
                    }
                  }
                  
                  final customerName = project['customer_name']?.toString().trim() ?? '-';
                  
                  // Hitung HPP dari materials jika hpp tidak ada atau 0
                  double hppValue = _parseToDouble(project['hpp']) ?? 0;
                  if (hppValue == 0 && project['materials'] != null) {
                    final materials = project['materials'];
                    if (materials is List) {
                      for (var material in materials) {
                        if (material is Map) {
                          final qty = _parseToDouble(material['quantity']) ?? 0;
                          final price = _parseToDouble(material['price']) ?? 0;
                          hppValue += qty * price;
                        }
                      }
                    }
                  }
                  
                  final price = _parseToDouble(project['price']) ?? 0;

                  return DataRow(
                    cells: [
                      DataCell(Text(rowNumber.toString())),
                      DataCell(Text(displayDate)),
                      DataCell(
                        SizedBox(
                          width: 180,
                          child: Text(
                            projectName,
                            style: const TextStyle(fontWeight: FontWeight.w600),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                      DataCell(
                        SizedBox(
                          width: 150,
                          child: Text(
                            customerName,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                      ),
                      DataCell(
                        Text(
                          hppValue > 0 ? 'Rp ${_formatNumber(hppValue)}' : '-',
                          style: TextStyle(
                            color: hppValue > 0 ? const Color(0xFFE53935) : Colors.grey,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      DataCell(
                        Text(
                          price > 0 ? 'Rp ${_formatNumber(price)}' : '-',
                          style: TextStyle(
                            color: price > 0 ? const Color(0xFF43A047) : Colors.grey,
                            fontWeight: FontWeight.w500,
                          ),
                        ),
                      ),
                      DataCell(
                        SizedBox(
                          width: 140,
                          child: Row(
                            children: [
                              InkWell(
                                onTap: () => _viewProjectDetails(project),
                                child: const Padding(
                                  padding: EdgeInsets.all(8),
                                  child: Icon(Icons.visibility_outlined, color: Color(0xFF1976D2), size: 20),
                                ),
                              ),
                              InkWell(
                                onTap: () => _openProjectForm(project: project),
                                child: const Padding(
                                  padding: EdgeInsets.all(8),
                                  child: Icon(Icons.edit_outlined, color: Color(0xFF2E7D32), size: 20),
                                ),
                              ),
                              InkWell(
                                onTap: () => _confirmDelete(project),
                                child: const Padding(
                                  padding: EdgeInsets.all(8),
                                  child: Icon(Icons.delete_outline, color: Color(0xFFD32F2F), size: 20),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ProjectFormDialog extends StatefulWidget {
  final Map<String, dynamic>? project;
  final String? initialPaymentMethod;

  const _ProjectFormDialog({this.project, this.initialPaymentMethod});

  @override
  State<_ProjectFormDialog> createState() => _ProjectFormDialogState();
}

class _ProjectFormDialogState extends State<_ProjectFormDialog> {
  final _formKey = GlobalKey<FormState>();
  final _dateController = TextEditingController();
  final _projectNameController = TextEditingController();
  final _quantityController = TextEditingController();
  final _hppController = TextEditingController();
  final _priceController = TextEditingController();
  final _customerController = TextEditingController();
  final _notesController = TextEditingController();

  DateTime _selectedDate = DateTime.now();
  late String _selectedPaymentMethod; // Akan di-set di initState
  bool _isSubmitting = false;
  bool _isLoadingStock = false;
  List<Map<String, dynamic>> _stockItems = [];
  List<Map<String, dynamic>> _selectedMaterials = [];

  @override
  void initState() {
    super.initState();
    // Set payment method: dari initialPaymentMethod, atau dari project yang di-edit, atau default transfer
    if (widget.initialPaymentMethod != null) {
      _selectedPaymentMethod = widget.initialPaymentMethod!;
    } else if (widget.project != null) {
      final paymentMethod = (widget.project!['payment_method']?.toString().toLowerCase() ?? 'transfer').trim();
      _selectedPaymentMethod = (paymentMethod == 'cash') ? 'cash' : 'transfer';
    } else {
      _selectedPaymentMethod = 'transfer'; // Default transfer untuk project custom
    }
    
    _loadStock();
    final project = widget.project;
    if (project != null) {
      _selectedDate = DateTime.tryParse(project['date'] ?? project['created_at'] ?? '') ?? DateTime.now();
      _dateController.text = _selectedDate.toIso8601String().split('T').first;
      
      // Ambil nama project dengan benar - hanya dari project_name atau name (bukan material)
      String projectName = '';
      if (project['project_name'] != null && project['project_name'].toString().trim().isNotEmpty) {
        projectName = project['project_name'].toString().trim();
      } else if (project['name'] != null && project['name'].toString().trim().isNotEmpty) {
        final nameValue = project['name'].toString().trim();
        final materialValue = project['material']?.toString().trim() ?? '';
        // Jika name berbeda dengan material, berarti itu nama project
        if (nameValue != materialValue || materialValue.isEmpty) {
          projectName = nameValue;
        }
      }
      _projectNameController.text = projectName;
      
      _quantityController.text = (project['quantity'] as num?)?.toString() ?? '';
      
      // Load materials dengan berbagai kemungkinan struktur
      double hppValue = _parseToDouble(project['hpp']) ?? 0;
      _selectedMaterials = [];
      
      // Cek berbagai kemungkinan field untuk materials
      dynamic materialsData = project['materials'] ?? 
                              project['resolved_materials'] ?? 
                              null;
      
      if (materialsData != null) {
        if (materialsData is List) {
          // Pastikan setiap item adalah Map
          for (var item in materialsData) {
            if (item is Map) {
              _selectedMaterials.add(Map<String, dynamic>.from(item));
            }
          }
        } else if (materialsData is Map) {
          // Jika hanya satu material sebagai Map, convert ke List
          _selectedMaterials.add(Map<String, dynamic>.from(materialsData));
        }
        
        // Hitung ulang HPP dari materials jika ada
        if (_selectedMaterials.isNotEmpty) {
          hppValue = 0;
          for (var material in _selectedMaterials) {
            final qty = _parseToDouble(material['quantity']) ?? 0;
            final price = _parseToDouble(material['price']) ?? 0;
            hppValue += qty * price;
          }
        }
      }
      
      // Debug: log untuk melihat materials yang di-load
      debugPrint('Edit project - loaded ${_selectedMaterials.length} materials');
      if (_selectedMaterials.isNotEmpty) {
        debugPrint('First material: ${_selectedMaterials.first}');
      }
      
      _hppController.text = hppValue.toStringAsFixed(0);
      final priceValue = (project['price'] as num?)?.toDouble() ?? 0.0;
      _priceController.text = priceValue > 0 ? ThousandsSeparatorInputFormatter.formatNumber(priceValue) : '';
      _customerController.text = project['customer_name']?.toString() ?? '';
      _notesController.text = project['notes']?.toString() ?? '';
      // Payment method sudah di-set di initState
    } else {
      _dateController.text = _selectedDate.toIso8601String().split('T').first;
    }
    // Hitung HPP dari materials yang sudah di-load (jika ada)
    // Untuk edit mode, HPP sudah dihitung di atas, tapi tetap perlu di-update jika materials berubah
    if (_selectedMaterials.isNotEmpty) {
      _calculateTotalHPP();
    }
  }

  Future<void> _loadStock() async {
    if (_isLoadingStock) return;
    setState(() => _isLoadingStock = true);
    try {
      final data = await ApiService.fetchStock();
      if (!mounted) return;
      setState(() {
        _stockItems = data;
        _isLoadingStock = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoadingStock = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal memuat daftar stock: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _calculateTotalHPP() {
    double total = 0;
    for (final material in _selectedMaterials) {
      final qty = _parseToDouble(material['quantity']) ?? 0;
      final price = _parseToDouble(material['price']) ?? 0;
      total += qty * price;
    }
    setState(() {
      _hppController.text = total.toStringAsFixed(0);
    });
  }

  @override
  void dispose() {
    _dateController.dispose();
    _projectNameController.dispose();
    _quantityController.dispose();
    _hppController.dispose();
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

  Future<void> _addMaterialFromStock() async {
    // Pastikan stock sudah dimuat sebelum membuka dialog
    if (_stockItems.isEmpty) {
      await _loadStock();
      // Tunggu sedikit untuk memastikan state sudah terupdate
      await Future.delayed(const Duration(milliseconds: 100));
    }
    
    final selectedStock = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => _SelectStockDialog(
        stockItems: _stockItems,
        isLoading: _isLoadingStock,
        onRefresh: _loadStock,
      ),
    );
    if (selectedStock != null && selectedStock.isNotEmpty) {
      final qty = await showDialog<double>(
        context: context,
        builder: (_) => _QuantityDialog(),
      );
      if (qty != null && qty > 0) {
        final stockName = selectedStock['name']?.toString();
        final stockId = selectedStock['material_id']?.toString() ?? 
                       selectedStock['id']?.toString();
        // Cek berbagai kemungkinan field untuk harga
        final stockPrice = _parseToDouble(selectedStock['price']) ??
            _parseToDouble(selectedStock['price_per_unit']) ??
            _parseToDouble(selectedStock['hpp']) ??
            0;
        
        if (stockName == null || stockName.isEmpty) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Data stock tidak valid'),
              backgroundColor: Colors.orange,
            ),
          );
          return;
        }
        
        setState(() {
          _selectedMaterials.add({
            'name': stockName,
            'material_name': stockName,
            'material_id': stockId,
            'quantity': qty,
            'price': stockPrice,
            'is_custom': false,
          });
        });
        _calculateTotalHPP();
      }
    }
  }

  Future<void> _addCustomMaterial() async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (_) => const _CustomMaterialDialog(),
    );
    if (result != null) {
      setState(() {
        _selectedMaterials.add({
          'name': result['name'],
          'quantity': result['quantity'],
          'price': result['price'],
          'is_custom': true,
        });
      });
      _calculateTotalHPP();
    }
  }

  void _removeMaterial(int index) {
    setState(() {
      _selectedMaterials.removeAt(index);
    });
    _calculateTotalHPP();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_selectedMaterials.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih minimal satu bahan'), backgroundColor: Colors.orange),
      );
      return;
    }
    setState(() => _isSubmitting = true);

    final projectName = _projectNameController.text.trim();
    if (projectName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nama project wajib diisi'), backgroundColor: Colors.orange),
      );
      setState(() => _isSubmitting = false);
      return;
    }
    
    // Hitung HPP dari materials yang dipilih
    double calculatedHPP = 0;
    for (var material in _selectedMaterials) {
      final qty = _parseToDouble(material['quantity']) ?? 0;
      final price = _parseToDouble(material['price']) ?? 0;
      calculatedHPP += qty * price;
    }
    
    // Gunakan HPP yang dihitung dari materials jika lebih besar dari 0
    final finalHPP = calculatedHPP > 0 ? calculatedHPP : (double.tryParse(_hppController.text) ?? 0);
    
    // Normalisasi materials sesuai dengan schema backend ProjectMaterial
    final normalizedMaterials = _selectedMaterials.map((material) {
      final name = material['name']?.toString() ?? material['material_name']?.toString() ?? '';
      if (name.isEmpty) {
        throw Exception('Nama material tidak boleh kosong');
      }
      
      // Pastikan quantity dan price adalah double, bukan int
      final qty = _parseToDouble(material['quantity']) ?? 0.0;
      final price = _parseToDouble(material['price']) ?? 0.0;
      
      // Build material object sesuai dengan schema ProjectMaterial
      // Pastikan is_custom adalah boolean, bukan string atau null
      bool isCustom = false;
      if (material['is_custom'] != null) {
        if (material['is_custom'] is bool) {
          isCustom = material['is_custom'] as bool;
        } else if (material['is_custom'] is String) {
          isCustom = material['is_custom'].toString().toLowerCase() == 'true';
        } else {
          isCustom = material['is_custom'] == 1 || material['is_custom'] == true;
        }
      }
      
      final materialObj = <String, dynamic>{
        'name': name,
        'quantity': qty,
        'price': price,
        'is_custom': isCustom,
      };
      
      // Tambahkan material_id jika ada dan tidak kosong
      if (material['material_id'] != null) {
        final materialId = material['material_id'].toString();
        if (materialId.isNotEmpty) {
          materialObj['material_id'] = materialId;
        }
      }
      
      // Tambahkan unit jika ada dan tidak kosong
      if (material['unit'] != null) {
        final unit = material['unit'].toString();
        if (unit.isNotEmpty) {
          materialObj['unit'] = unit;
        }
      }
      
      return materialObj;
    }).toList();
    
    // Validasi materials tidak boleh kosong
    if (normalizedMaterials.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih minimal satu bahan'), backgroundColor: Colors.orange),
      );
      setState(() => _isSubmitting = false);
      return;
    }
    
    // Body sesuai dengan schema ProjectCreate di backend
    // Tanggal transaksi ditentukan backend (server time)
    final body = {
      'project_name': projectName,
      'customer_name': _customerController.text.trim(),
      'quantity': double.tryParse(_quantityController.text) ?? 1.0,
      'hpp': finalHPP,
      'price': ThousandsSeparatorInputFormatter.parseToDouble(_priceController.text) ?? 0.0,
      'notes': _notesController.text.trim(),
      'materials': normalizedMaterials,
      'payment_method': _selectedPaymentMethod,
    };
    
    // Debug: log body sebelum dikirim
    debugPrint('=== SUBMIT PROJECT ===');
    debugPrint('Project Name: ${body['project_name']}');
    debugPrint('Quantity: ${body['quantity']}');
    debugPrint('HPP: ${body['hpp']}');
    debugPrint('Price: ${body['price']}');
    debugPrint('Materials count: ${normalizedMaterials.length}');
    if (normalizedMaterials.isNotEmpty) {
      debugPrint('First material: ${normalizedMaterials.first}');
    }
    
    try {
      if (widget.project == null) {
        // Gunakan method khusus yang hanya menggunakan endpoint /projects tanpa fallback
        await ApiService.createProjectOnly(body);
      } else {
        final id = widget.project!['id'];
        if (id == null) throw Exception('ID project tidak ditemukan');
        // Gunakan method khusus yang hanya menggunakan endpoint /projects tanpa fallback
        await ApiService.updateProjectOnly(id.toString(), body);
      }
      if (!mounted) return;
      Navigator.of(context).pop(true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.project == null ? 'Project ditambahkan' : 'Project diperbarui'),
          backgroundColor: Colors.green,
        ),
      );
    } catch (e) {
      if (!mounted) return;
      final errorMessage = e.toString();
      // Tampilkan pesan error yang lebih informatif
      String displayMessage = 'Gagal menyimpan project';
      // Coba extract detail dari error message
      if (errorMessage.contains('detail')) {
        final detailStart = errorMessage.indexOf('detail');
        final detailEnd = errorMessage.indexOf('\'', detailStart + 7);
        if (detailEnd > detailStart) {
          final detailValue = errorMessage.substring(detailStart + 7, detailEnd);
          if (detailValue.isNotEmpty) {
            displayMessage = detailValue;
          } else {
            displayMessage = errorMessage.replaceAll('Exception: ', '');
          }
        } else {
          displayMessage = errorMessage.replaceAll('Exception: ', '');
        }
      } else {
        displayMessage = errorMessage.replaceAll('Exception: ', '');
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(displayMessage),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 5),
        ),
      );
      debugPrint('Error saving project: $e');
      debugPrint('Request body: $body');
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

  double? _parseToDouble(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    if (value is String) {
      var normalized = value.trim();
      if (normalized.isEmpty) return null;
      normalized = normalized.replaceAll(RegExp(r'[^0-9,.\-]'), '');
      if (normalized.isEmpty) return null;
      final hasComma = normalized.contains(',');
      final hasDot = normalized.contains('.');
      if (hasComma && hasDot) {
        if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
          normalized = normalized.replaceAll('.', '').replaceAll(',', '.');
        } else {
          normalized = normalized.replaceAll(',', '');
        }
      } else if (hasComma) {
        normalized = normalized.replaceAll('.', '').replaceAll(',', '.');
      } else if (hasDot && RegExp(r'^\d{1,3}(\.\d{3})+$').hasMatch(normalized)) {
        normalized = normalized.replaceAll('.', '');
      }
      return double.tryParse(normalized);
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    final isMobile = MediaQuery.of(context).size.width < 600;
    final totalHPP = _selectedMaterials.fold<double>(
      0,
      (sum, m) =>
          sum + ((_parseToDouble(m['quantity']) ?? 0) * (_parseToDouble(m['price']) ?? 0)),
    );

    return Dialog(
      insetPadding: EdgeInsets.all(isMobile ? 16 : 24),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.9),
        child: SingleChildScrollView(
          padding: EdgeInsets.all(isMobile ? 20 : 24),
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
                      widget.project == null ? 'Tambah Project' : 'Edit Project',
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
                    labelText: 'Tanggal *',
                    suffixIcon: const Icon(Icons.calendar_today),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  validator: (_) => null, // Tanggal transaksi ditentukan backend (server time)
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _projectNameController,
                  decoration: InputDecoration(
                    labelText: 'Nama Project *',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  validator: (value) => value == null || value.isEmpty ? 'Nama project wajib diisi' : null,
                ),
                const SizedBox(height: 16),
                const Text(
                  'Bahan *',
                  style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _addMaterialFromStock,
                        icon: const Icon(Icons.inventory_2_outlined),
                        label: const Text('Pilih dari Stock'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: OutlinedButton.icon(
                        onPressed: _addCustomMaterial,
                        icon: const Icon(Icons.add_circle_outline),
                        label: const Text('Bahan Lain-lain'),
                        style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ),
                  ],
                ),
                if (_selectedMaterials.isNotEmpty) ...[
                  const SizedBox(height: 12),
                  ..._selectedMaterials.asMap().entries.map((entry) {
                    final index = entry.key;
                    final material = entry.value;
                    final name = material['name']?.toString() ?? 
                                material['material_name']?.toString() ?? 
                                '-';
                    final qty = _parseToDouble(material['quantity']) ?? 0;
                    final price = _parseToDouble(material['price']) ?? 0;
                    final total = qty * price;

                    return Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                        subtitle: Text('${qty.toStringAsFixed(0)} x Rp ${_formatNumber(price)} = Rp ${_formatNumber(total)}'),
                        trailing: IconButton(
                          icon: const Icon(Icons.delete_outline, color: Colors.red),
                          onPressed: () => _removeMaterial(index),
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 8),
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.grey.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Total Nilai Harga Barang:', style: TextStyle(fontWeight: FontWeight.bold)),
                        Text(
                          'Rp ${_formatNumber(totalHPP)}',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFFE53935)),
                        ),
                      ],
                    ),
                  ),
                ],
                const SizedBox(height: 16),
                TextFormField(
                  controller: _quantityController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: 'Qty *',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  validator: (value) => value == null || value.isEmpty ? 'Qty wajib diisi' : null,
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _hppController,
                  readOnly: true,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: 'Total Nilai Harga Barang',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                    filled: true,
                    fillColor: Colors.grey.shade100,
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _priceController,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  inputFormatters: [
                    FilteringTextInputFormatter.digitsOnly,
                    ThousandsSeparatorInputFormatter(),
                  ],
                  decoration: InputDecoration(
                    labelText: 'Nilai Project *',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                    hintText: 'Contoh: 1.000.000',
                  ),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Nilai project wajib diisi';
                    }
                    final parsed = ThousandsSeparatorInputFormatter.parseToDouble(value);
                    if (parsed == null || parsed <= 0) {
                      return 'Nilai project harus berupa angka yang valid';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                DropdownButtonFormField<String>(
                  value: _selectedPaymentMethod,
                  decoration: InputDecoration(
                    labelText: 'Metode Pembayaran *',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  items: const [
                    DropdownMenuItem(value: 'cash', child: Text('Cash')),
                    DropdownMenuItem(value: 'transfer', child: Text('Transfer')),
                  ],
                  onChanged: (value) {
                    setState(() {
                      _selectedPaymentMethod = value!;
                    });
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _customerController,
                  decoration: InputDecoration(
                    labelText: 'Nama Customer',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _notesController,
                  maxLines: 3,
                  decoration: InputDecoration(
                    labelText: 'Catatan',
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
                        : Text(
                            widget.project == null ? 'Simpan Project' : 'Update Project',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _SelectStockDialog extends StatelessWidget {
  final List<Map<String, dynamic>> stockItems;
  final bool isLoading;
  final VoidCallback? onRefresh;

  const _SelectStockDialog({
    required this.stockItems,
    this.isLoading = false,
    this.onRefresh,
  });

  String _formatNumber(num value) {
    return value.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (match) => '${match.group(1)}.',
    );
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Container(
        constraints: const BoxConstraints(maxWidth: 400, maxHeight: 500),
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
                  const Expanded(
                    child: Text(
                      'Pilih Bahan dari Stock',
                      style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold),
                    ),
                  ),
                  if (onRefresh != null)
                    IconButton(
                      icon: const Icon(Icons.refresh, color: Colors.white),
                      onPressed: isLoading ? null : onRefresh,
                      tooltip: 'Refresh',
                    ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white),
                    onPressed: () => Navigator.of(context).pop(),
                  ),
                ],
              ),
            ),
            Flexible(
              child: isLoading
                  ? const Padding(
                      padding: EdgeInsets.all(48),
                      child: Center(child: CircularProgressIndicator()),
                    )
                  : stockItems.isEmpty
                      ? Padding(
                          padding: const EdgeInsets.all(48),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.inventory_2_outlined, size: 64, color: Colors.grey.shade400),
                              const SizedBox(height: 16),
                              const Text(
                                'Tidak ada data stock',
                                style: TextStyle(fontSize: 16, color: Colors.black54),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                'Tambahkan stock terlebih dahulu',
                                style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                              ),
                            ],
                          ),
                        )
                      : ListView.builder(
                          shrinkWrap: true,
                          padding: const EdgeInsets.all(16),
                          itemCount: stockItems.length,
                          itemBuilder: (context, index) {
                            final item = stockItems[index];
                            final name = item['name']?.toString() ?? '-';
                            final quantity = (item['quantity'] as num?)?.toDouble() ?? 0;
                            final unit = item['unit']?.toString() ?? '';
                            // Cek berbagai kemungkinan field untuk harga
                            final price = _parseToDouble(item['price']) ??
                                _parseToDouble(item['price_per_unit']) ??
                                _parseToDouble(item['hpp']) ??
                                0;

                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                title: Text(
                                  name,
                                  style: const TextStyle(fontWeight: FontWeight.w600),
                                ),
                                subtitle: Text('Stock: ${quantity.toStringAsFixed(0)} $unit'),
                                trailing: Text(
                                  price > 0 ? 'Rp ${_formatNumber(price)}' : '-',
                                  style: TextStyle(
                                    fontWeight: FontWeight.bold,
                                    color: price > 0 ? const Color(0xFF2E7D32) : Colors.grey,
                                  ),
                                ),
                                onTap: () {
                                  if (name != '-' && name.isNotEmpty) {
                                    Navigator.of(context).pop(item);
                                  } else {
                                    ScaffoldMessenger.of(context).showSnackBar(
                                      const SnackBar(
                                        content: Text('Nama stock tidak valid'),
                                        backgroundColor: Colors.orange,
                                      ),
                                    );
                                  }
                                },
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

  double? _parseToDouble(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    if (value is String) {
      var normalized = value.trim();
      if (normalized.isEmpty) return null;
      normalized = normalized.replaceAll(RegExp(r'[^0-9,.\-]'), '');
      if (normalized.isEmpty) return null;
      final hasComma = normalized.contains(',');
      final hasDot = normalized.contains('.');
      if (hasComma && hasDot) {
        if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
          normalized = normalized.replaceAll('.', '').replaceAll(',', '.');
        } else {
          normalized = normalized.replaceAll(',', '');
        }
      } else if (hasComma) {
        normalized = normalized.replaceAll('.', '').replaceAll(',', '.');
      } else if (hasDot && RegExp(r'^\d{1,3}(\.\d{3})+$').hasMatch(normalized)) {
        normalized = normalized.replaceAll('.', '');
      }
      return double.tryParse(normalized);
    }
    return null;
  }
}

class _QuantityDialog extends StatefulWidget {
  const _QuantityDialog();

  @override
  State<_QuantityDialog> createState() => _QuantityDialogState();
}

class _QuantityDialogState extends State<_QuantityDialog> {
  final _quantityController = TextEditingController();

  @override
  void dispose() {
    _quantityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Masukkan Jumlah',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _quantityController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: InputDecoration(
                labelText: 'Jumlah',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
              ),
              autofocus: true,
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(),
                    child: const Text('Batal'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () {
                      final qty = double.tryParse(_quantityController.text);
                      if (qty != null && qty > 0) {
                        Navigator.of(context).pop(qty);
                      }
                    },
                    child: const Text('Tambah'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CustomMaterialDialog extends StatefulWidget {
  const _CustomMaterialDialog();

  @override
  State<_CustomMaterialDialog> createState() => _CustomMaterialDialogState();
}

class _CustomMaterialDialogState extends State<_CustomMaterialDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _quantityController = TextEditingController();
  final _priceController = TextEditingController();

  @override
  void dispose() {
    _nameController.dispose();
    _quantityController.dispose();
    _priceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Tambah Bahan Lain-lain',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _nameController,
                decoration: InputDecoration(
                  labelText: 'Nama Barang *',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
                validator: (value) => value == null || value.isEmpty ? 'Nama barang wajib diisi' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _quantityController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  labelText: 'Jumlah *',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
                validator: (value) => value == null || value.isEmpty ? 'Jumlah wajib diisi' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _priceController,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  labelText: 'Harga *',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
                validator: (value) => value == null || value.isEmpty ? 'Harga wajib diisi' : null,
              ),
              const SizedBox(height: 24),
              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      child: const Text('Batal'),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton(
                      onPressed: () {
                        if (_formKey.currentState!.validate()) {
                          Navigator.of(context).pop({
                            'name': _nameController.text,
                            'quantity': double.tryParse(_quantityController.text) ?? 0,
                            'price': double.tryParse(_priceController.text) ?? 0,
                          });
                        }
                      },
                      child: const Text('Tambah'),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DeleteProjectDialog extends StatelessWidget {
  const _DeleteProjectDialog();

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
              'Hapus project ini?',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text(
              'Data project akan dihapus permanen dari sistem.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    child: const Text('Batal'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    onPressed: () => Navigator.of(context).pop(true),
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD32F2F)),
                    child: const Text('Ya, Hapus'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _ViewProjectDialog extends StatelessWidget {
  final Map<String, dynamic> project;

  const _ViewProjectDialog({required this.project});

  String _formatNumber(num value) {
    return value.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (match) => '${match.group(1)}.',
    );
  }

  double? _parseToDouble(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    if (value is String) {
      var normalized = value.trim();
      if (normalized.isEmpty) return null;
      normalized = normalized.replaceAll(RegExp(r'[^0-9,.\-]'), '');
      if (normalized.isEmpty) return null;
      final hasComma = normalized.contains(',');
      final hasDot = normalized.contains('.');
      if (hasComma && hasDot) {
        if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
          normalized = normalized.replaceAll('.', '').replaceAll(',', '.');
        } else {
          normalized = normalized.replaceAll(',', '');
        }
      } else if (hasComma) {
        normalized = normalized.replaceAll('.', '').replaceAll(',', '.');
      } else if (hasDot && RegExp(r'^\d{1,3}(\.\d{3})+$').hasMatch(normalized)) {
        normalized = normalized.replaceAll('.', '');
      }
      return double.tryParse(normalized);
    }
    return null;
  }

  @override
  Widget build(BuildContext context) {
    // Ambil nama project - hanya dari project_name atau name, JANGAN dari material
    String projectName = '-';
    if (project['project_name'] != null && project['project_name'].toString().trim().isNotEmpty) {
      projectName = project['project_name'].toString().trim();
    } else if (project['name'] != null && project['name'].toString().trim().isNotEmpty) {
      // Hanya gunakan 'name' jika bukan dari material
      final nameValue = project['name'].toString().trim();
      final materialValue = project['material']?.toString().trim() ?? '';
      // Jika name berbeda dengan material, berarti itu nama project
      if (nameValue != materialValue || materialValue.isEmpty) {
        projectName = nameValue;
      }
    }
    
    final dateStr = project['date'] ?? project['created_at'] ?? '';
    final displayDate = dateStr.toString().contains('T')
        ? dateStr.toString().split('T').first
        : dateStr.toString().split(' ').first;
    final customerName = project['customer_name']?.toString().trim() ?? '-';
    final quantity = _parseToDouble(project['quantity']) ?? 0;
    
    // Hitung HPP dari materials jika hpp tidak ada atau 0
    double hpp = _parseToDouble(project['hpp']) ?? 0;
    
    // Parse materials dengan berbagai kemungkinan struktur
    List<Map<String, dynamic>> materials = [];
    dynamic materialsData = project['materials'] ?? project['resolved_materials'];
    if (materialsData != null) {
      if (materialsData is List) {
        materials = materialsData
            .where((item) => item is Map)
            .map((item) => Map<String, dynamic>.from(item as Map))
            .toList();
      } else if (materialsData is Map) {
        materials = [Map<String, dynamic>.from(materialsData)];
      }
    }
    
    if (hpp == 0 && materials.isNotEmpty) {
      for (var material in materials) {
        final qty = _parseToDouble(material['quantity']) ?? 0;
        final price = _parseToDouble(material['price']) ?? 0;
        hpp += qty * price;
      }
    }
    
    final price = _parseToDouble(project['price']) ?? 0;
    final notes = project['notes']?.toString().trim() ?? '-';

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
                      projectName,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                      overflow: TextOverflow.ellipsis,
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
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildDetailRow('Tanggal', displayDate),
                    _buildDetailRow('Customer', customerName),
                    _buildDetailRow('Qty', quantity.toStringAsFixed(0)),
                    _buildDetailRow('Total Nilai Harga Barang', 'Rp ${_formatNumber(hpp)}'),
                    _buildDetailRow('Nilai Project', 'Rp ${_formatNumber(price)}'),
                    if (notes != '-') ...[
                      const SizedBox(height: 16),
                      const Text(
                        'Catatan',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(height: 8),
                      Text(notes),
                    ],
                    if (materials.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      const Text(
                        'Bahan',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(height: 8),
                      ...materials.map((material) {
                        final name = material['name']?.toString() ?? 
                                    material['material_name']?.toString() ?? 
                                    '-';
                        final qty = _parseToDouble(material['quantity']) ?? 0;
                        final price = _parseToDouble(material['price']) ?? 0;
                        final total = qty * price;
                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          child: ListTile(
                            title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
                            subtitle: Text('${qty.toStringAsFixed(0)} x Rp ${_formatNumber(price)}'),
                            trailing: Text(
                              'Rp ${_formatNumber(total)}',
                              style: const TextStyle(fontWeight: FontWeight.bold),
                            ),
                          ),
                        );
                      }),
                    ],
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 150,
            child: Text(
              label,
              style: const TextStyle(fontWeight: FontWeight.w600, color: Colors.black54),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}

class _PaymentMethodSelectionDialog extends StatelessWidget {
  const _PaymentMethodSelectionDialog();

  @override
  Widget build(BuildContext context) {
    debugPrint('_PaymentMethodSelectionDialog build called');
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Pilih Metode Pembayaran',
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Color(0xFF0A4D68),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: InkWell(
                    onTap: () {
                      debugPrint('Cash selected');
                      Navigator.of(context).pop('cash');
                    },
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.green.shade300, width: 2),
                      ),
                      child: Column(
                        children: [
                          Icon(Icons.money, size: 48, color: Colors.green.shade700),
                          const SizedBox(height: 12),
                          const Text(
                            'Cash',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
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
                    onTap: () {
                      debugPrint('Transfer selected');
                      Navigator.of(context).pop('transfer');
                    },
                    child: Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.blue.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.blue.shade300, width: 2),
                      ),
                      child: Column(
                        children: [
                          Icon(Icons.swap_horiz, size: 48, color: Colors.blue.shade700),
                          const SizedBox(height: 12),
                          const Text(
                            'Transfer',
                            style: TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Colors.black87,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Batal'),
            ),
          ],
        ),
      ),
    );
  }
}






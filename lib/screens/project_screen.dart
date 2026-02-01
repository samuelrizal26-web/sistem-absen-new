import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:http/http.dart' as http;
import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';
import 'package:sistem_absen_flutter_v2/core/utils/number_formatter.dart';

class ProjectScreen extends StatefulWidget {
  const ProjectScreen({super.key});

  @override
  State<ProjectScreen> createState() => _ProjectScreenState();
}

class _ProjectScreenState extends State<ProjectScreen> {
  bool _isAuthenticated = false;
  final TextEditingController _pinController = TextEditingController();
  bool _isVerifying = false;
  String? _errorMessage;
  int _attemptCount = 0;
  static const int _maxAttempts = 3;
  DateTime? _lockUntil;
  bool _isLocked = false;

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }

  void _checkLockStatus() {
    if (_lockUntil != null && DateTime.now().isBefore(_lockUntil!)) {
      final remainingSeconds = _lockUntil!.difference(DateTime.now()).inSeconds;
      setState(() {
        _isLocked = true;
        _errorMessage = 'Terlalu banyak percobaan salah. Coba lagi dalam $remainingSeconds detik.';
      });
    } else {
      setState(() {
        _isLocked = false;
        if (_lockUntil != null && DateTime.now().isAfter(_lockUntil!)) {
          // Reset setelah lock berakhir
          _attemptCount = 0;
          _lockUntil = null;
          _errorMessage = null;
        }
      });
    }
  }

  Future<void> _verifyPin() async {
    // Cek status lock
    _checkLockStatus();
    if (_isLocked) {
      return;
    }

    final pin = _pinController.text.trim();
    if (pin.length != 6) {
      setState(() {
        _errorMessage = 'PIN harus 6 digit';
      });
      return;
    }

    setState(() {
      _isVerifying = true;
      _errorMessage = null;
    });

    try {
      // Verifikasi PIN dengan admin login endpoint
      final url = Uri.parse('${ApiService.baseUrl}/auth/admin-login');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'pin': pin}),
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        // Reset counter jika berhasil
        setState(() {
          _isAuthenticated = true;
          _attemptCount = 0;
          _lockUntil = null;
          _isLocked = false;
        });
      } else {
        final error = jsonDecode(response.body);
        final errorMsg = error['detail'] ?? 'PIN salah';
        
        setState(() {
          _attemptCount++;
          final remainingAttempts = _maxAttempts - _attemptCount;
          
          if (_attemptCount >= _maxAttempts) {
            // Lock selama 30 detik
            _lockUntil = DateTime.now().add(const Duration(seconds: 30));
            _isLocked = true;
            _errorMessage = 'Terlalu banyak percobaan salah. Akses dikunci selama 30 detik.';
          } else {
            _errorMessage = '$errorMsg\nSisa percobaan: $remainingAttempts dari $_maxAttempts';
          }
          _pinController.clear();
        });
      }
    } catch (e) {
      if (!mounted) return;
      
      setState(() {
        _attemptCount++;
        final remainingAttempts = _maxAttempts - _attemptCount;
        
        if (_attemptCount >= _maxAttempts) {
          _lockUntil = DateTime.now().add(const Duration(seconds: 30));
          _isLocked = true;
          _errorMessage = 'Terlalu banyak percobaan salah. Akses dikunci selama 30 detik.';
        } else {
          final errorStr = e.toString().replaceFirst('Exception: ', '');
          _errorMessage = '$errorStr\nSisa percobaan: $remainingAttempts dari $_maxAttempts';
        }
        _pinController.clear();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isVerifying = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    // Update lock status setiap build
    if (_lockUntil != null) {
      _checkLockStatus();
      // Auto-update setiap detik saat locked
      if (_isLocked) {
        Future.delayed(const Duration(seconds: 1), () {
          if (mounted) setState(() {});
        });
      }
    }

    if (!_isAuthenticated) {
      final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
      
      return Scaffold(
        backgroundColor: const Color(0xFFEAFBFF),
        appBar: AppBar(
          backgroundColor: const Color(0xFF0A4D68),
          title: const Text('Project', style: TextStyle(color: Colors.white)),
          iconTheme: const IconThemeData(color: Colors.white),
        ),
        body: Center(
          child: SingleChildScrollView(
            padding: EdgeInsets.all(isLandscape ? 16 : 24),
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: isLandscape ? 500 : double.infinity,
              ),
              child: Card(
                elevation: 4,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                child: Padding(
                padding: EdgeInsets.all(isLandscape ? 20 : 32),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    CircleAvatar(
                      radius: isLandscape ? 32 : 40,
                      backgroundColor: const Color(0xFFEAFBFF),
                      child: Icon(
                        Icons.work_outline,
                        size: isLandscape ? 32 : 40,
                        color: const Color(0xFF0A4D68),
                      ),
                    ),
                    SizedBox(height: isLandscape ? 16 : 24),
                    Text(
                      'Verifikasi PIN',
                      style: TextStyle(
                        fontSize: isLandscape ? 20 : 24,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(height: isLandscape ? 6 : 8),
                    Text(
                      'Masukkan PIN Admin untuk mengakses Project',
                      style: TextStyle(
                        color: Colors.grey,
                        fontSize: isLandscape ? 13 : 14,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    SizedBox(height: isLandscape ? 6 : 8),
                    Text(
                      'PIN sama dengan PIN Admin',
                      style: TextStyle(
                        color: Colors.grey,
                        fontSize: isLandscape ? 11 : 12,
                      ),
                      textAlign: TextAlign.center,
                    ),
                    SizedBox(height: isLandscape ? 20 : 32),
                    TextField(
                      controller: _pinController,
                      maxLength: 6,
                      textAlign: TextAlign.center,
                      keyboardType: TextInputType.number,
                      obscureText: true,
                      autofocus: !_isLocked,
                      enabled: !_isLocked,
                      style: TextStyle(
                        fontSize: isLandscape ? 20 : 24,
                        letterSpacing: isLandscape ? 8 : 12,
                        fontWeight: FontWeight.bold,
                      ),
                      decoration: InputDecoration(
                        hintText: _isLocked ? 'Terkunci' : 'Masukkan PIN',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                        counterText: '',
                        filled: _isLocked,
                        fillColor: _isLocked ? Colors.grey.shade200 : null,
                        contentPadding: EdgeInsets.symmetric(
                          vertical: isLandscape ? 14 : 16,
                          horizontal: 12,
                        ),
                      ),
                      onSubmitted: (_) => _isLocked ? null : _verifyPin(),
                    ),
                    SizedBox(height: isLandscape ? 6 : 8),
                    if (_errorMessage != null)
                      Container(
                        padding: EdgeInsets.all(isLandscape ? 10 : 12),
                        decoration: BoxDecoration(
                          color: _isLocked ? Colors.orange.shade50 : Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(
                            color: _isLocked ? Colors.orange : Colors.red,
                            width: 1,
                          ),
                        ),
                        child: Text(
                          _errorMessage!,
                          style: TextStyle(
                            color: _isLocked ? Colors.orange.shade900 : Colors.red.shade900,
                            fontSize: isLandscape ? 11 : 12,
                            fontWeight: FontWeight.w500,
                          ),
                          textAlign: TextAlign.center,
                        ),
                      )
                    else
                      Text(
                        'Masukkan PIN 6 digit',
                        style: TextStyle(
                          color: Colors.grey,
                          fontSize: isLandscape ? 11 : 12,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    if (_attemptCount > 0 && !_isLocked) ...[
                      SizedBox(height: isLandscape ? 6 : 8),
                      Text(
                        'Percobaan: $_attemptCount/$_maxAttempts',
                        style: TextStyle(
                          color: Colors.orange.shade700,
                          fontSize: isLandscape ? 11 : 12,
                          fontWeight: FontWeight.w500,
                        ),
                        textAlign: TextAlign.center,
                      ),
                    ],
                    SizedBox(height: isLandscape ? 16 : 24),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton(
                        onPressed: (_isVerifying || _isLocked) ? null : _verifyPin,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: _isLocked 
                              ? Colors.grey 
                              : const Color(0xFF1976D2),
                          padding: EdgeInsets.symmetric(
                            vertical: isLandscape ? 14 : 16,
                          ),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                        ),
                        child: _isVerifying
                            ? SizedBox(
                                width: isLandscape ? 20 : 24,
                                height: isLandscape ? 20 : 24,
                                child: const CircularProgressIndicator(
                                  strokeWidth: 3,
                                  valueColor: AlwaysStoppedAnimation(Colors.white),
                                ),
                              )
                            : Text(
                                _isLocked 
                                    ? 'Terkunci' 
                                    : 'Masuk',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: Colors.white,
                                  fontSize: isLandscape ? 14 : 16,
                                ),
                              ),
                      ),
                    ),
                    SizedBox(height: isLandscape ? 12 : 16),
                    InkWell(
                      onTap: () {
                        showDialog(
                          context: context,
                          builder: (context) => AlertDialog(
                            title: const Text('Informasi PIN'),
                            content: const Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'PIN Project menggunakan PIN Admin yang sama.',
                                  style: TextStyle(fontWeight: FontWeight.bold),
                                ),
                                SizedBox(height: 12),
                                Text('Untuk mengatur atau mengubah PIN:'),
                                SizedBox(height: 8),
                                Text('1. Masuk ke halaman Admin'),
                                Text('2. Buka menu Settings'),
                                Text('3. Pilih "Setup PIN" atau "Ubah PIN"'),
                                SizedBox(height: 12),
                                Text(
                                  'PIN default: 123456',
                                  style: TextStyle(
                                    fontStyle: FontStyle.italic,
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                            actions: [
                              TextButton(
                                onPressed: () => Navigator.of(context).pop(),
                                child: const Text('Mengerti'),
                              ),
                            ],
                          ),
                        );
                      },
                      child: Text(
                        'Cara set PIN?',
                        style: TextStyle(
                          color: const Color(0xFF1976D2),
                          fontSize: isLandscape ? 11 : 12,
                          decoration: TextDecoration.underline,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
    }

    return _ProjectContent();
  }
}

class _ProjectContent extends StatefulWidget {
  @override
  State<_ProjectContent> createState() => _ProjectContentState();
}

class _ProjectContentState extends State<_ProjectContent> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _projects = [];
  DateTime _activePeriod = DateTime(DateTime.now().year, DateTime.now().month);

  @override
  void initState() {
    super.initState();
    _loadProjects();
  }

  Future<void> _loadProjects() async {
    setState(() => _isLoading = true);
    try {
      final data = await ApiService.fetchProjectsOnly();
      if (!mounted) return;
      setState(() {
        _projects = _filterProjectsByPeriod(data, _activePeriod);
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _projects = [];
      });
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

  double get _totalRevenueCash {
    double total = 0;
    for (final project in _projects) {
      final paymentMethod = (project['payment_method']?.toString().toLowerCase() ?? 'transfer').trim();
      if (paymentMethod == 'cash') {
        final price = _parseToDouble(project['price']) ?? 0;
        total += price;
      }
    }
    return total;
  }

  double get _totalRevenueTransfer {
    double total = 0;
    for (final project in _projects) {
      final paymentMethod = (project['payment_method']?.toString().toLowerCase() ?? 'transfer').trim();
      if (paymentMethod == 'transfer') {
        final price = _parseToDouble(project['price']) ?? 0;
        total += price;
      }
    }
    return total;
  }

  double get _totalMargin {
    return _totalRevenue - _totalHPP;
  }

  List<Map<String, dynamic>> _filterProjectsByPeriod(
    List<Map<String, dynamic>> data,
    DateTime period,
  ) {
    return data.where((project) {
      final date = _parseProjectDate(project);
      if (date == null) return false;
      return date.year == period.year && date.month == period.month;
    }).toList();
  }

  DateTime? _parseProjectDate(Map<String, dynamic>? project) {
    if (project == null) return null;
    final raw = project['date']?.toString() ?? project['created_at']?.toString();
    if (raw == null || raw.isEmpty) return null;
    final clean = raw.contains('T') ? raw.split('T').first : raw.split(' ').first;
    return DateTime.tryParse(clean);
  }

  double? _parseToDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) {
      return double.tryParse(value);
    }
    return null;
  }

  Future<void> _openProjectForm({Map<String, dynamic>? project}) async {
    final shouldRefresh = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _ProjectFormDialog(project: project),
    );
    if (shouldRefresh == true) {
      // Refresh data setelah simpan berhasil
      debugPrint('=== REFRESHING PROJECTS AFTER SAVE ===');
      await _loadProjects();
      debugPrint('=== PROJECTS LOADED: ${_projects.length} items ===');
    }
  }

  Future<void> _viewProject(Map<String, dynamic> project) async {
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

    showDialog(
      context: context,
      builder: (context) => _ViewProjectDialog(project: detail),
    );
  }

  Future<void> _deleteProject(Map<String, dynamic> project) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Hapus Project'),
        content: Text('Yakin ingin menghapus project "${project['project_name'] ?? project['name'] ?? 'Project'}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Batal'),
          ),
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
      final id = project['id']?.toString();
      if (id == null) throw Exception('ID project tidak ditemukan');
      await ApiService.deleteProjectOnly(id);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Project berhasil dihapus'), backgroundColor: Colors.green),
      );
      _loadProjects();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Gagal menghapus project: ${e.toString()}'), backgroundColor: Colors.red),
      );
    }
  }

  String _formatCurrency(num value) {
    return 'Rp ${value.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (match) => '${match.group(1)}.')}';
  }

  @override
  Widget build(BuildContext context) {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    
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
              child: LayoutBuilder(
                builder: (context, constraints) {
                  if (isLandscape) {
                    return Padding(
                      padding: const EdgeInsets.all(8),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          // Kiri: Indikator + tombol
                          Expanded(
                            flex: 2,
                            child: SingleChildScrollView(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  _buildHeaderIndicators(),
                                  const SizedBox(height: 8),
                                  _buildMarginCard(),
                                  const SizedBox(height: 8),
                                  _buildAddButton(),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          // Kanan: Tabel
                          Expanded(
                            flex: 3,
                            child: _buildProjectsTable(),
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
                        _buildHeaderIndicators(),
                        const SizedBox(height: 10),
                        _buildMarginCard(),
                        const SizedBox(height: 10),
                        _buildAddButton(),
                        const SizedBox(height: 24),
                        _buildProjectsTable(),
                      ],
                    ),
                  );
                },
              ),
            ),
    );
  }

  Widget _buildHeaderIndicators() {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    
    return Column(
      children: [
        // Baris 1: Total HPP, Cash, Transfer
        Row(
          children: [
            Expanded(
              child: Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Container(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFFFF9800), Color(0xFFF57C00)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: EdgeInsets.symmetric(
                    horizontal: isLandscape ? 6 : 12,
                    vertical: isLandscape ? 6 : 12,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        'Total HPP',
                        style: TextStyle(
                          color: Colors.white70,
                          fontSize: isLandscape ? 9 : 12,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      SizedBox(height: isLandscape ? 2 : 4),
                      Text(
                        _formatCurrency(_totalHPP),
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: isLandscape ? 14 : 18,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
            ),
            SizedBox(width: isLandscape ? 6 : 10),
            Expanded(
              child: Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Container(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF4CAF50), Color(0xFF2E7D32)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: EdgeInsets.symmetric(
                    horizontal: isLandscape ? 6 : 12,
                    vertical: isLandscape ? 6 : 12,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.money, size: isLandscape ? 10 : 14, color: Colors.white70),
                          SizedBox(width: 3),
                          Flexible(
                            child: Text(
                              'Cash',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: isLandscape ? 9 : 12,
                                fontWeight: FontWeight.w500,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: isLandscape ? 2 : 4),
                      Text(
                        _formatCurrency(_totalRevenueCash),
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: isLandscape ? 14 : 18,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
            ),
            SizedBox(width: isLandscape ? 6 : 10),
            Expanded(
              child: Card(
                elevation: 2,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                child: Container(
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF2196F3), Color(0xFF1976D2)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  padding: EdgeInsets.symmetric(
                    horizontal: isLandscape ? 6 : 12,
                    vertical: isLandscape ? 6 : 12,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.swap_horiz, size: isLandscape ? 10 : 14, color: Colors.white70),
                          SizedBox(width: 3),
                          Flexible(
                            child: Text(
                              'Transfer',
                              style: TextStyle(
                                color: Colors.white70,
                                fontSize: isLandscape ? 9 : 12,
                                fontWeight: FontWeight.w500,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      SizedBox(height: isLandscape ? 2 : 4),
                      Text(
                        _formatCurrency(_totalRevenueTransfer),
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: isLandscape ? 14 : 18,
                          fontWeight: FontWeight.bold,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMarginCard() {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    final marginValue = _totalMargin;
    final isPositive = marginValue >= 0;

    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Container(
        padding: EdgeInsets.symmetric(
          horizontal: isLandscape ? 8 : 12,
          vertical: isLandscape ? 8 : 10,
        ),
        decoration: BoxDecoration(
          color: isPositive ? const Color(0xFFE8F5E9) : const Color(0xFFFFEBEE),
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: isPositive ? Colors.green.shade200 : Colors.red.shade200,
            width: 1.5,
          ),
        ),
        child: Row(
          children: [
            Container(
              padding: EdgeInsets.all(isLandscape ? 6 : 8),
              decoration: BoxDecoration(
                color: isPositive ? Colors.green.shade50 : Colors.red.shade50,
                shape: BoxShape.circle,
              ),
              child: Icon(
                isPositive ? Icons.trending_up : Icons.trending_down,
                color: isPositive ? Colors.green.shade700 : Colors.red.shade700,
                size: isLandscape ? 14 : 18,
              ),
            ),
            SizedBox(width: isLandscape ? 8 : 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    'Total Margin',
                    style: TextStyle(
                      fontWeight: FontWeight.w600,
                      color: Colors.black54,
                      fontSize: isLandscape ? 11 : 13,
                    ),
                  ),
                  SizedBox(height: isLandscape ? 2 : 3),
                  Text(
                    _formatCurrency(marginValue),
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: isLandscape ? 14 : 16,
                      color: isPositive ? Colors.green.shade800 : Colors.red.shade800,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAddButton() {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    
    return SizedBox(
      width: double.infinity,
      child: ElevatedButton.icon(
        onPressed: () => _openProjectForm(),
        icon: Icon(
          Icons.add,
          color: Colors.white,
          size: isLandscape ? 20 : 24,
        ),
        label: Text(
          'Tambah Pekerjaan',
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.white,
            fontSize: isLandscape ? 14 : 16,
          ),
        ),
        style: ElevatedButton.styleFrom(
          backgroundColor: const Color(0xFF1976D2),
          padding: EdgeInsets.symmetric(
            vertical: isLandscape ? 10 : 16,
            horizontal: isLandscape ? 12 : 16,
          ),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        ),
      ),
    );
  }

  Widget _buildProjectsTable() {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    
    if (_projects.isEmpty) {
      return Card(
        child: Padding(
          padding: EdgeInsets.all(isLandscape ? 16 : 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.work_outline,
                size: isLandscape ? 48 : 64,
                color: Colors.grey,
              ),
              SizedBox(height: isLandscape ? 12 : 16),
              Text(
                'Belum ada project',
                style: TextStyle(
                  fontSize: isLandscape ? 16 : 18,
                  fontWeight: FontWeight.bold,
                ),
              ),
              SizedBox(height: isLandscape ? 6 : 8),
              Text(
                'Klik "Tambah Pekerjaan" untuk menambahkan project baru',
                style: TextStyle(
                  color: Colors.grey,
                  fontSize: isLandscape ? 12 : 14,
                ),
                textAlign: TextAlign.center,
              ),
            ],
          ),
        ),
      );
    }
    
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          headingRowColor: MaterialStateProperty.all(const Color(0xFF424242)),
          headingRowHeight: isLandscape ? 36 : 48,
          headingTextStyle: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.bold,
            fontSize: isLandscape ? 11 : 14,
          ),
          dataRowHeight: isLandscape ? 40 : 56,
          columnSpacing: isLandscape ? 12 : 24,
          columns: [
            DataColumn(
              label: Text(
                'No',
                style: TextStyle(fontSize: isLandscape ? 11 : 14),
              ),
            ),
            DataColumn(
              label: Text(
                'Tanggal',
                style: TextStyle(fontSize: isLandscape ? 11 : 14),
              ),
            ),
            DataColumn(
              label: Text(
                'Nama Project',
                style: TextStyle(fontSize: isLandscape ? 11 : 14),
              ),
            ),
            DataColumn(
              label: Text(
                'Nama Customer',
                style: TextStyle(fontSize: isLandscape ? 11 : 14),
              ),
            ),
            DataColumn(
              label: Text(
                'HPP',
                style: TextStyle(fontSize: isLandscape ? 11 : 14),
              ),
            ),
            DataColumn(
              label: Text(
                'Nilai Project',
                style: TextStyle(fontSize: isLandscape ? 11 : 14),
              ),
            ),
            DataColumn(
              label: Text(
                'Aksi',
                style: TextStyle(fontSize: isLandscape ? 11 : 14),
              ),
            ),
          ],
          rows: _projects.asMap().entries.map((entry) {
            final index = entry.key;
            final project = entry.value;
            
            // Parse project name dengan prioritas yang benar
            final projectName = project['project_name']?.toString() ?? 
                               project['name']?.toString() ?? 
                               '-';
            
            // Parse customer name
            final customerName = project['customer_name']?.toString() ?? '-';
            
            // Parse dan format tanggal
            String formattedDate = '-';
            final dateStr = project['date']?.toString();
            if (dateStr != null && dateStr.isNotEmpty) {
              try {
                // Coba parse tanggal ISO format
                final dateTime = DateTime.tryParse(dateStr);
                if (dateTime != null) {
                  // Format: YYYY-MM-DD
                  formattedDate = '${dateTime.year}-${dateTime.month.toString().padLeft(2, '0')}-${dateTime.day.toString().padLeft(2, '0')}';
                } else {
                  // Jika tidak bisa parse, gunakan string asli
                  formattedDate = dateStr;
                }
              } catch (_) {
                formattedDate = dateStr;
              }
            }
            
            // Hitung HPP
            double hpp = _parseToDouble(project['hpp']) ?? 0;
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
            
            // Parse nilai project
            final projectValue = _parseToDouble(project['price']) ?? 0;

            return DataRow(
              cells: [
                DataCell(Text(
                  '${index + 1}',
                  style: TextStyle(
                    fontWeight: FontWeight.w500,
                    fontSize: isLandscape ? 11 : 14,
                  ),
                )),
                DataCell(Text(
                  formattedDate,
                  style: TextStyle(fontSize: isLandscape ? 11 : 14),
                )),
                DataCell(Text(
                  projectName,
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                    fontSize: isLandscape ? 11 : 14,
                  ),
                )),
                DataCell(Text(
                  customerName.isEmpty ? '-' : customerName,
                  style: TextStyle(fontSize: isLandscape ? 11 : 14),
                )),
                DataCell(Text(
                  _formatCurrency(hpp),
                  style: TextStyle(
                    color: const Color(0xFFFF9800),
                    fontWeight: FontWeight.bold,
                    fontSize: isLandscape ? 11 : 14,
                  ),
                )),
                DataCell(Text(
                  _formatCurrency(projectValue),
                  style: TextStyle(
                    color: const Color(0xFF4CAF50),
                    fontWeight: FontWeight.bold,
                    fontSize: isLandscape ? 11 : 14,
                  ),
                )),
                DataCell(
                  Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      IconButton(
                        icon: Icon(
                          Icons.visibility,
                          color: const Color(0xFF1976D2),
                          size: isLandscape ? 18 : 20,
                        ),
                        onPressed: () => _viewProject(project),
                        tooltip: 'Lihat',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                      SizedBox(width: isLandscape ? 4 : 8),
                      IconButton(
                        icon: Icon(
                          Icons.edit,
                          color: const Color(0xFF2E7D32),
                          size: isLandscape ? 18 : 20,
                        ),
                        onPressed: () => _openProjectForm(project: project),
                        tooltip: 'Edit',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                      SizedBox(width: isLandscape ? 4 : 8),
                      IconButton(
                        icon: Icon(
                          Icons.delete,
                          color: const Color(0xFFD32F2F),
                          size: isLandscape ? 18 : 20,
                        ),
                        onPressed: () => _deleteProject(project),
                        tooltip: 'Hapus',
                        padding: EdgeInsets.zero,
                        constraints: const BoxConstraints(),
                      ),
                    ],
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }
}

// Form Dialog untuk tambah/edit project
class _ProjectFormDialog extends StatefulWidget {
  final Map<String, dynamic>? project;

  const _ProjectFormDialog({this.project});

  @override
  State<_ProjectFormDialog> createState() => _ProjectFormDialogState();
}

class _ProjectFormDialogState extends State<_ProjectFormDialog> {
  final _formKey = GlobalKey<FormState>();
  final _dateController = TextEditingController();
  final _projectNameController = TextEditingController();
  final _customerController = TextEditingController();
  final _quantityController = TextEditingController();
  final _totalCostController = TextEditingController();
  final _projectValueController = TextEditingController();
  final _notesController = TextEditingController();

  DateTime _selectedDate = DateTime.now();
  late String _selectedPaymentMethod; // Akan di-set di initState
  List<Map<String, dynamic>> _selectedMaterials = [];
  List<Map<String, dynamic>> _stockItems = [];
  bool _isSubmitting = false;
  bool _isLoadingStock = false;

  @override
  void initState() {
    super.initState();
    // Set payment method: dari project yang di-edit, atau default transfer
    if (widget.project != null) {
      final paymentMethod = (widget.project!['payment_method']?.toString().toLowerCase() ?? 'transfer').trim();
      _selectedPaymentMethod = (paymentMethod == 'cash') ? 'cash' : 'transfer';
    } else {
      _selectedPaymentMethod = 'transfer'; // Default transfer untuk project custom
    }
    
    _dateController.text = _selectedDate.toIso8601String().split('T').first;
    // Quantity default kosong, tidak ada default value
    
    if (widget.project != null) {
      final project = widget.project!;
      _projectNameController.text = project['project_name']?.toString() ?? project['name']?.toString() ?? '';
      _customerController.text = project['customer_name']?.toString() ?? '';
      final quantity = project['quantity'];
      if (quantity != null) {
        _quantityController.text = quantity.toString();
      }
      final price = project['price'];
      if (price != null) {
        final priceNum = _parseToDouble(price);
        _projectValueController.text = priceNum != null ? ThousandsSeparatorInputFormatter.formatNumber(priceNum) : '';
      }
      _notesController.text = project['notes']?.toString() ?? '';
      
      final dateStr = project['date']?.toString();
      if (dateStr != null) {
        final parsed = DateTime.tryParse(dateStr);
        if (parsed != null) {
          _selectedDate = parsed;
          _dateController.text = _selectedDate.toIso8601String().split('T').first;
        }
      }

      // Load materials
      if (project['materials'] != null) {
        final materials = project['materials'];
        if (materials is List) {
          _selectedMaterials = List<Map<String, dynamic>>.from(materials);
        } else if (materials is Map) {
          _selectedMaterials = [Map<String, dynamic>.from(materials)];
        }
      } else if (project['resolved_materials'] != null) {
        final materials = project['resolved_materials'];
        if (materials is List) {
          _selectedMaterials = List<Map<String, dynamic>>.from(materials);
        } else if (materials is Map) {
          _selectedMaterials = [Map<String, dynamic>.from(materials)];
        }
      }
      
      _updateTotalCost();
    }
    
    _loadStock();
  }

  @override
  void dispose() {
    _dateController.dispose();
    _projectNameController.dispose();
    _customerController.dispose();
    _quantityController.dispose();
    _totalCostController.dispose();
    _projectValueController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  Future<void> _loadStock() async {
    setState(() => _isLoadingStock = true);
    try {
      final stock = await ApiService.fetchStock();
      if (!mounted) return;
      setState(() {
        _stockItems = stock;
      });
    } catch (e) {
      if (!mounted) return;
      debugPrint('Error loading stock: $e');
    } finally {
      if (mounted) setState(() => _isLoadingStock = false);
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

  void _updateTotalCost() {
    double total = 0;
    for (var material in _selectedMaterials) {
      final qty = _parseToDouble(material['quantity']) ?? 0;
      final price = _parseToDouble(material['price']) ?? 0;
      total += qty * price;
    }
    _totalCostController.text = ThousandsSeparatorInputFormatter.formatNumber(total);
  }

  double? _parseToDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) {
      // Parse string yang mungkin sudah diformat dengan titik (misalnya "1.000.000")
      final cleaned = value.replaceAll('.', '').replaceAll(',', '');
      return double.tryParse(cleaned);
    }
    return null;
  }

  // Format angka untuk input dengan titik pemisah ribuan

  Future<void> _addMaterialFromStock() async {
    await _loadStock();
    await Future.delayed(const Duration(milliseconds: 100));
    
    if (!mounted) return;
    
    final selected = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => _SelectStockDialog(stockItems: _stockItems),
    );
    
    if (selected != null) {
      // Tampilkan dialog untuk input jumlah
      final quantityResult = await showDialog<Map<String, dynamic>>(
        context: context,
        builder: (context) => _StockQuantityDialog(
          stockItem: selected,
        ),
      );
      
      if (quantityResult != null && quantityResult['quantity'] != null) {
        setState(() {
          _selectedMaterials.add({
            'name': selected['name']?.toString() ?? '',
            'material_id': selected['id']?.toString(),
            'quantity': _parseToDouble(quantityResult['quantity']) ?? 1.0,
            'price': _parseToDouble(selected['price']) ?? 
                     _parseToDouble(selected['price_per_unit']) ?? 
                     _parseToDouble(selected['hpp']) ?? 0.0,
            'unit': selected['unit']?.toString(),
            'is_custom': false,
          });
          _updateTotalCost();
        });
      }
    }
  }

  Future<void> _addOtherMaterial() async {
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => _OtherMaterialDialog(),
    );
    
    if (result != null) {
      setState(() {
        _selectedMaterials.add({
          'name': result['name'] ?? '',
          'quantity': _parseToDouble(result['quantity']) ?? 1.0,
          'price': _parseToDouble(result['price']) ?? 0.0,
          'is_custom': true,
        });
        _updateTotalCost();
      });
    }
  }

  void _removeMaterial(int index) {
    setState(() {
      _selectedMaterials.removeAt(index);
      _updateTotalCost();
    });
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    
    // Validasi nama project
    final projectName = _projectNameController.text.trim();
    if (projectName.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Nama project wajib diisi'), backgroundColor: Colors.orange),
      );
      return;
    }

    // Validasi materials
    if (_selectedMaterials.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Pilih minimal satu bahan'), backgroundColor: Colors.orange),
      );
      return;
    }

    // Validasi total nilai project (parse dari format dengan titik)
    final projectValue = ThousandsSeparatorInputFormatter.parseToDouble(_projectValueController.text);
    if (projectValue == null || projectValue <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Total nilai project wajib diisi dan harus lebih dari 0'), backgroundColor: Colors.orange),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    try {
      // Normalize materials sesuai dengan schema ProjectMaterial
      final normalizedMaterials = <Map<String, dynamic>>[];
      for (var material in _selectedMaterials) {
        final name = material['name']?.toString() ?? material['material_name']?.toString() ?? '';
        if (name.isEmpty) {
          throw Exception('Nama material tidak boleh kosong');
        }
        
        final qty = _parseToDouble(material['quantity']);
        if (qty == null || qty <= 0) {
          throw Exception('Quantity material "$name" harus lebih dari 0');
        }
        
        final price = _parseToDouble(material['price']);
        if (price == null || price < 0) {
          throw Exception('Harga material "$name" tidak valid');
        }

        // Build material object sesuai dengan schema ProjectMaterial
        // Pastikan semua field sesuai dengan yang diharapkan backend
        final materialObj = <String, dynamic>{
          'name': name.trim(), // Pastikan tidak ada whitespace
          'quantity': qty, // Sudah validasi > 0
          'price': price, // Sudah validasi >= 0
          'is_custom': material['is_custom'] is bool 
              ? material['is_custom'] as bool 
              : (material['is_custom'] == true || material['is_custom'] == 1 || material['is_custom'] == 'true'),
        };

        // Tambahkan material_id jika ada (optional)
        if (material['material_id'] != null) {
          final materialId = material['material_id'].toString().trim();
          if (materialId.isNotEmpty) {
            materialObj['material_id'] = materialId;
          }
        }

        // Tambahkan unit jika ada (optional)
        if (material['unit'] != null) {
          final unit = material['unit'].toString().trim();
          if (unit.isNotEmpty) {
            materialObj['unit'] = unit;
          }
        }

        normalizedMaterials.add(materialObj);
      }

      // Hitung HPP dari materials
      double finalHPP = 0.0;
      for (var material in normalizedMaterials) {
        final qty = _parseToDouble(material['quantity']) ?? 0.0;
        final price = _parseToDouble(material['price']) ?? 0.0;
        finalHPP += qty * price;
      }

      // Validasi quantity project
      final quantity = ThousandsSeparatorInputFormatter.parseToDouble(_quantityController.text);
      if (quantity == null || quantity <= 0) {
        throw Exception('Quantity project harus lebih dari 0');
      }

      // Parse project value yang sudah diformat
      final projectValue = ThousandsSeparatorInputFormatter.parseToDouble(_projectValueController.text);
      if (projectValue == null || projectValue <= 0) {
        throw Exception('Total nilai project harus lebih dari 0');
      }

    // Build request body sesuai dengan schema ProjectCreate di backend
    // Hanya kirim field yang ada di schema, tidak ada field tambahan
    // Tanggal transaksi ditentukan backend (server time)
      final body = <String, dynamic>{
        'date': _selectedDate.toIso8601String(),
        'project_name': projectName,
        'customer_name': _customerController.text.trim(),
        'quantity': quantity,
        'hpp': finalHPP,
        'price': projectValue,
        'notes': _notesController.text.trim(),
        'materials': normalizedMaterials,
        'payment_method': _selectedPaymentMethod,
      };

      // Debug: log body sebelum dikirim
      debugPrint('=== PROJECT SUBMIT ===');
      debugPrint('Project Name: ${body['project_name']}');
      debugPrint('Customer Name: ${body['customer_name']}');
      debugPrint('Quantity: ${body['quantity']}');
      debugPrint('HPP: ${body['hpp']}');
      debugPrint('Price: ${body['price']}');
      debugPrint('Notes: ${body['notes']}');
      debugPrint('Materials Count: ${normalizedMaterials.length}');
      for (var i = 0; i < normalizedMaterials.length; i++) {
        debugPrint('Material $i: ${normalizedMaterials[i]}');
      }
      debugPrint('Full Body JSON: ${jsonEncode(body)}');

      if (widget.project == null) {
        final result = await ApiService.createProjectOnly(body);
        debugPrint('=== CREATE RESULT ===');
        debugPrint('Result: $result');
      } else {
        final id = widget.project!['id'];
        if (id == null) throw Exception('ID project tidak ditemukan');
        final result = await ApiService.updateProjectOnly(id.toString(), body);
        debugPrint('=== UPDATE RESULT ===');
        debugPrint('Result: $result');
      }
      
      if (!mounted) return;
      
      debugPrint('Save completed successfully');
      
      // Tutup dialog dan refresh data
      Navigator.of(context).pop(true);
      
      // Tampilkan pesan sukses
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(widget.project == null ? 'Project berhasil ditambahkan' : 'Project berhasil diperbarui'),
          backgroundColor: Colors.green,
          duration: const Duration(seconds: 2),
        ),
      );
    } catch (e) {
      if (!mounted) return;
      
      // Extract error message yang lebih jelas
      String errorMessage = 'Gagal menyimpan project';
      final errorStr = e.toString();
      if (errorStr.contains('detail')) {
        try {
          // Coba extract detail dari error message
          final detailPattern = RegExp(r'detail[:\s]+([^,\n}]+)');
          final detailMatch = detailPattern.firstMatch(errorStr);
          if (detailMatch != null) {
            errorMessage = detailMatch.group(1)?.trim() ?? errorMessage;
          } else {
            errorMessage = errorStr.replaceAll('Exception: ', '');
          }
        } catch (_) {
          errorMessage = errorStr.replaceAll('Exception: ', '');
        }
      } else {
        errorMessage = errorStr.replaceAll('Exception: ', '');
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: Colors.red,
          duration: const Duration(seconds: 4),
        ),
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
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 700, maxHeight: 800),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      widget.project == null ? 'Tambah Pekerjaan' : 'Edit Pekerjaan',
                      style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0A4D68)),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(false),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                Expanded(
                  child: SingleChildScrollView(
                    child: Column(
                      children: [
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
                          validator: (value) => value?.isEmpty ?? true ? 'Nama project wajib diisi' : null,
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
                        const Text('Bahan *', style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _isLoadingStock ? null : _addMaterialFromStock,
                                icon: const Icon(Icons.inventory_2),
                                label: const Text('Pilih dari Stock'),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: OutlinedButton.icon(
                                onPressed: _addOtherMaterial,
                                icon: const Icon(Icons.add_circle_outline),
                                label: const Text('Bahan Lain-lain'),
                                style: OutlinedButton.styleFrom(
                                  padding: const EdgeInsets.symmetric(vertical: 12),
                                ),
                              ),
                            ),
                          ],
                        ),
                        if (_selectedMaterials.isNotEmpty) ...[
                          const SizedBox(height: 16),
                          ..._selectedMaterials.asMap().entries.map((entry) {
                            final index = entry.key;
                            final material = entry.value;
                            return Card(
                              margin: const EdgeInsets.only(bottom: 8),
                              child: ListTile(
                                title: Text(material['name']?.toString() ?? '-'),
                                subtitle: Text(
                                  'Qty: ${material['quantity']} ${material['unit'] ?? ''} • Harga: ${_formatCurrency(_parseToDouble(material['price']) ?? 0)}',
                                ),
                                trailing: IconButton(
                                  icon: const Icon(Icons.delete, color: Colors.red),
                                  onPressed: () => _removeMaterial(index),
                                ),
                              ),
                            );
                          }),
                        ],
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _totalCostController,
                          readOnly: true,
                          decoration: InputDecoration(
                            labelText: 'Total Nilai Harga Barang',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                            prefixText: 'Rp ',
                          ),
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _quantityController,
                          keyboardType: TextInputType.number,
                          decoration: InputDecoration(
                            labelText: 'Qty *',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                          ),
                          validator: (value) => value?.isEmpty ?? true ? 'Qty wajib diisi' : null,
                        ),
                        const SizedBox(height: 16),
                        TextFormField(
                          controller: _projectValueController,
                          keyboardType: TextInputType.number,
                          inputFormatters: [
                            FilteringTextInputFormatter.allow(RegExp(r'[\d.]')),
                            ThousandsSeparatorInputFormatter(),
                          ],
                          decoration: InputDecoration(
                            labelText: 'Total Nilai Project *',
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                            prefixText: 'Rp ',
                            hintText: '0',
                          ),
                          validator: (value) {
                            if (value == null || value.isEmpty) {
                              return 'Total nilai project wajib diisi';
                            }
                            final parsed = ThousandsSeparatorInputFormatter.parseToDouble(value);
                            if (parsed == null || parsed <= 0) {
                              return 'Total nilai project harus lebih dari 0';
                            }
                            return null;
                          },
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
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 24),
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton(
                    onPressed: _isSubmitting ? null : _submit,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1976D2),
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
                            widget.project == null ? 'Simpan' : 'Update',
                            style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
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

  String _formatCurrency(num value) {
    return value.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (match) => '${match.group(1)}.',
    );
  }
}

// Dialog untuk memilih stock
class _SelectStockDialog extends StatelessWidget {
  final List<Map<String, dynamic>> stockItems;

  const _SelectStockDialog({required this.stockItems});

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600, maxHeight: 600),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Padding(
              padding: const EdgeInsets.all(24),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Pilih dari Stock', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
            ),
            Expanded(
              child: stockItems.isEmpty
                  ? const Center(child: Text('Tidak ada stock tersedia'))
                  : ListView.builder(
                      itemCount: stockItems.length,
                      itemBuilder: (context, index) {
                        final item = stockItems[index];
                        return ListTile(
                          title: Text(item['name']?.toString() ?? '-'),
                          subtitle: Text(
                            'Stock: ${item['quantity'] ?? 0} ${item['unit'] ?? ''} • Harga: Rp ${((item['price'] ?? item['price_per_unit'] ?? item['hpp'] ?? 0) as num).toStringAsFixed(0)}',
                          ),
                          onTap: () => Navigator.of(context).pop(item),
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

// Dialog untuk input jumlah stock yang dipilih
class _StockQuantityDialog extends StatefulWidget {
  final Map<String, dynamic> stockItem;

  const _StockQuantityDialog({required this.stockItem});

  @override
  State<_StockQuantityDialog> createState() => _StockQuantityDialogState();
}

class _StockQuantityDialogState extends State<_StockQuantityDialog> {
  final _quantityController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  @override
  void initState() {
    super.initState();
    // Quantity default kosong, tidak ada default value
  }

  @override
  void dispose() {
    _quantityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final stockName = widget.stockItem['name']?.toString() ?? '-';
    final availableStock = widget.stockItem['quantity'] ?? 0;
    final unit = widget.stockItem['unit']?.toString() ?? '';
    
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
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Input Jumlah', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'Bahan: $stockName',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
              ),
              const SizedBox(height: 8),
              Text(
                'Stock tersedia: $availableStock $unit',
                style: const TextStyle(color: Colors.grey),
              ),
              const SizedBox(height: 24),
              TextFormField(
                controller: _quantityController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Jumlah *',
                  hintText: 'Masukkan jumlah',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                  suffixText: unit,
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Jumlah wajib diisi';
                  }
                  final qty = double.tryParse(value);
                  if (qty == null || qty <= 0) {
                    return 'Jumlah harus lebih dari 0';
                  }
                  if (qty > availableStock) {
                    return 'Jumlah melebihi stock tersedia ($availableStock $unit)';
                  }
                  return null;
                },
                autofocus: true,
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () {
                    if (_formKey.currentState!.validate()) {
                      Navigator.of(context).pop({
                        'quantity': _quantityController.text,
                      });
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1976D2),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: const Text(
                    'Tambah',
                    style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white),
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

// Dialog untuk bahan lain-lain
class _OtherMaterialDialog extends StatefulWidget {
  @override
  State<_OtherMaterialDialog> createState() => _OtherMaterialDialogState();
}

class _OtherMaterialDialogState extends State<_OtherMaterialDialog> {
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
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Bahan Lain-lain', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.close),
                ),
              ],
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _nameController,
              decoration: InputDecoration(
                labelText: 'Nama Bahan *',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _quantityController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Quantity *',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
              ),
            ),
            const SizedBox(height: 16),
            TextFormField(
              controller: _priceController,
              keyboardType: TextInputType.number,
              inputFormatters: [
                FilteringTextInputFormatter.allow(RegExp(r'[\d.]')),
                ThousandsSeparatorInputFormatter(),
              ],
              decoration: InputDecoration(
                labelText: 'Harga *',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                prefixText: 'Rp ',
                hintText: '0',
              ),
            ),
            const SizedBox(height: 24),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton(
                onPressed: () {
                  if (_nameController.text.isEmpty ||
                      _quantityController.text.isEmpty ||
                      _priceController.text.isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      const SnackBar(content: Text('Semua field wajib diisi'), backgroundColor: Colors.orange),
                    );
                    return;
                  }
                  Navigator.of(context).pop({
                    'name': _nameController.text,
                    'quantity': _quantityController.text,
                    'price': ThousandsSeparatorInputFormatter.parseToDouble(_priceController.text) ?? 0.0,
                  });
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF1976D2),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                child: const Text('Tambah', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}


// Dialog untuk melihat detail project
class _ViewProjectDialog extends StatelessWidget {
  final Map<String, dynamic> project;

  const _ViewProjectDialog({required this.project});

  double? _parseToDouble(dynamic value) {
    if (value == null) return null;
    if (value is double) return value;
    if (value is int) return value.toDouble();
    if (value is String) {
      return double.tryParse(value);
    }
    return null;
  }

  String _formatCurrency(num value) {
    return 'Rp ${value.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (match) => '${match.group(1)}.')}';
  }

  @override
  Widget build(BuildContext context) {
    final projectName = project['project_name']?.toString() ?? project['name']?.toString() ?? '-';
    final customerName = project['customer_name']?.toString() ?? '-';
    final date = project['date']?.toString() ?? '-';
    final notes = project['notes']?.toString() ?? '-';
    final quantity = project['quantity'] ?? 1;
    final projectValue = _parseToDouble(project['price']) ?? 0;
    
    double hpp = _parseToDouble(project['hpp']) ?? 0;
    List<Map<String, dynamic>> materials = [];
    
    if (project['materials'] != null) {
      final mats = project['materials'];
      if (mats is List) {
        materials = List<Map<String, dynamic>>.from(mats);
        if (hpp == 0) {
          for (var mat in materials) {
            final qty = _parseToDouble(mat['quantity']) ?? 0;
            final price = _parseToDouble(mat['price']) ?? 0;
            hpp += qty * price;
          }
        }
      }
    }

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 600, maxHeight: 700),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Detail Project', style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _buildDetailRow('Tanggal', date),
                      _buildDetailRow('Nama Project', projectName),
                      _buildDetailRow('Nama Customer', customerName),
                      _buildDetailRow('Qty', quantity.toString()),
                      _buildDetailRow('HPP', _formatCurrency(hpp)),
                      _buildDetailRow('Nilai Project', _formatCurrency(projectValue)),
                      if (materials.isNotEmpty) ...[
                        const SizedBox(height: 16),
                        const Text('Bahan:', style: TextStyle(fontWeight: FontWeight.bold)),
                        const SizedBox(height: 8),
                        ...materials.map((mat) {
                          final name = mat['name']?.toString() ?? '-';
                          final qty = _parseToDouble(mat['quantity']) ?? 0;
                          final price = _parseToDouble(mat['price']) ?? 0;
                          final unit = mat['unit']?.toString() ?? '';
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: Text('• $name: $qty $unit × ${_formatCurrency(price)} = ${_formatCurrency(qty * price)}'),
                          );
                        }),
                      ],
                      if (notes.isNotEmpty && notes != '-') ...[
                        const SizedBox(height: 16),
                        _buildDetailRow('Catatan', notes),
                      ],
                    ],
                  ),
                ),
              ),
            ],
          ),
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
            width: 120,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          Expanded(child: Text(value)),
        ],
      ),
    );
  }
}






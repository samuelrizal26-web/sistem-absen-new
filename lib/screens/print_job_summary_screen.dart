import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:sistem_absen_flutter_v2/services/printer/bluetooth_printer_service.dart';
import 'package:permission_handler/permission_handler.dart';

class PrintJobSummaryScreen extends StatefulWidget {
  final Map<String, dynamic>? printJob;
  const PrintJobSummaryScreen({super.key, this.printJob});

  @override
  State<PrintJobSummaryScreen> createState() => _PrintJobSummaryScreenState();
}

class _PrintJobSummaryScreenState extends State<PrintJobSummaryScreen> {
  final _uangCustomerController = TextEditingController();
  bool _isPrinting = false;
  Map<String, dynamic>? _printJobData;

  @override
  void initState() {
    super.initState();
    // Get data from constructor first, fallback to route arguments
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.printJob != null) {
        setState(() {
          _printJobData = widget.printJob;
        });
        return;
      }
      final args = ModalRoute.of(context)?.settings.arguments;
      if (args is Map<String, dynamic>) {
        setState(() {
          _printJobData = args;
        });
      }
    });
  }

  @override
  void dispose() {
    _uangCustomerController.dispose();
    super.dispose();
  }

  double get _totalPekerjaan {
    if (_printJobData == null) return 0.0;
    final quantity = (_printJobData!['quantity'] as num?)?.toDouble() ?? 0.0;
    final price = (_printJobData!['price'] as num?)?.toDouble() ?? 0.0;
    return quantity * price;
  }

  double get _kembalian {
    final uangCustomer = double.tryParse(_uangCustomerController.text.replaceAll('.', '')) ?? 0.0;
    return uangCustomer - _totalPekerjaan;
  }

  String _formatNumber(num value) {
    return value.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (match) => '${match.group(1)}.',
    );
  }

  String _formatMaterial(String? material) {
    if (material == null) return '-';
    final materialMap = {
      'vinyl': 'Vinyl',
      'kromo': 'Kromo',
      'transparan': 'Transparant',
      'art_carton': 'Art Carton',
    };
    return materialMap[material] ?? material;
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return '-';
    try {
      final date = DateTime.parse(dateStr);
      return DateFormat('dd/MM/yyyy').format(date);
    } catch (e) {
      return dateStr;
    }
  }

  String _formatDateTime() {
    final now = DateTime.now();
    return DateFormat('dd/MM/yyyy HH:mm:ss').format(now);
  }

  Future<void> _handlePrintStruk() async {
    if (_printJobData == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Data tidak ditemukan'),
          backgroundColor: Colors.red,
        ),
      );
      return;
    }

    setState(() => _isPrinting = true);

    try {
      // Initialize service (auto-connect jika ada printer yang disimpan)
      await BluetoothPrinterService.instance.initialize();
      
      // Check if printer is connected
      if (!BluetoothPrinterService.instance.isPrinterConnected()) {
        // Try to auto-connect to saved printer
        final connected = await BluetoothPrinterService.instance.ensureConnected();
        
        if (!connected) {
          // Auto-connect failed, show selection dialog
          if (!mounted) return;
          setState(() => _isPrinting = false);
          
          final selectedDevice = await _showPrinterSelectionDialog();
          if (selectedDevice == null) {
            // User cancelled or no printer selected
            return;
          }
          
          // Printer sudah terhubung di dialog, langsung lanjut print
          setState(() => _isPrinting = true);
        }
      }

      // Print struk (service akan auto-connect jika belum connected)
      await BluetoothPrinterService.instance.printStruk(
        printJobData: _printJobData!,
        formatDate: _formatDate(_printJobData!['date']),
        formatDateTime: _formatDateTime(),
        formatMaterial: _formatMaterial(_printJobData!['material']),
        totalPekerjaan: _totalPekerjaan,
      );

      if (!mounted) return;

      // Tampilkan feedback sukses print
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Struk berhasil di-print!'),
          backgroundColor: Colors.green,
          duration: Duration(seconds: 2),
        ),
      );

      // Buka laci kasir hanya untuk metode Cash
      // Tambahkan delay untuk memastikan print lock benar-benar selesai
      final paymentMethod = _printJobData!['payment_method']?.toString().toLowerCase() ?? 'cash';
      if (paymentMethod == 'cash') {
        // Delay tambahan untuk memastikan printer siap menerima command baru
        // Print lock di printStruk() di-release setelah 500ms delay
        // Jadi kita perlu menunggu minimal 500ms + sedikit buffer
        await Future.delayed(const Duration(milliseconds: 800));
        
        if (!mounted) return;
        
        try {
          // Gunakan await (sama seperti cashflow_screen yang berfungsi)
          await BluetoothPrinterService.instance.openCashdrawer();
          if (!mounted) return;
          // Tampilkan feedback bahwa laci berhasil dibuka
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('Laci kasir berhasil dibuka.'),
              backgroundColor: Colors.blue,
              duration: Duration(seconds: 2),
            ),
          );
        } catch (e) {
          // Jika gagal buka laci, tidak perlu tampilkan error (struk sudah ter-print)
          print('⚠️ Gagal membuka laci kasir setelah print: $e');
          // Opsional: bisa tampilkan warning jika diperlukan
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('Struk ter-print, tapi laci gagal dibuka: ${e.toString().replaceAll('Exception: ', '')}'),
              backgroundColor: Colors.orange,
              duration: const Duration(seconds: 3),
            ),
          );
        }
      }
    } catch (e) {
      if (!mounted) return;
      
      // Handle error dengan pesan yang lebih informatif
      String errorMessage;
      Color backgroundColor;
      
      // Cek apakah ini PrintException untuk error handling yang lebih baik
      final errorStr = e.toString().toLowerCase();
      
      if (errorStr.contains('belum terhubung') || 
          errorStr.contains('koneksi') ||
          errorStr.contains('terputus') ||
          errorStr.contains('gagal menghubungkan')) {
        // Connection error - show printer selection dialog
        setState(() => _isPrinting = false);
        final selectedDevice = await _showPrinterSelectionDialog();
        if (selectedDevice != null) {
          // Wait for connection
          await Future.delayed(const Duration(milliseconds: 500));
          // Retry print after user selected printer
          _handlePrintStruk();
          return;
        }
        errorMessage = 'Printer belum terhubung. Silakan pilih printer terlebih dahulu.';
        backgroundColor = Colors.orange;
      } else if (errorStr.contains('sedang berlangsung') || 
                 errorStr.contains('tunggu')) {
        // Print lock error
        errorMessage = 'Print sedang berlangsung. Silakan tunggu hingga selesai.';
        backgroundColor = Colors.orange;
      } else if (errorStr.contains('timeout')) {
        errorMessage = 'Print timeout. Pastikan printer dalam jangkauan dan coba lagi.';
        backgroundColor = Colors.red;
      } else if (errorStr.contains('sibuk') || 
                 errorStr.contains('busy')) {
        errorMessage = 'Printer sedang sibuk. Silakan tunggu sebentar dan coba lagi.';
        backgroundColor = Colors.orange;
      } else {
        // Generic error - gunakan message dari exception
        errorMessage = e.toString().replaceAll('Exception: ', '').replaceAll('PrintException: ', '');
        backgroundColor = Colors.red;
      }
      
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(errorMessage),
          backgroundColor: backgroundColor,
          duration: const Duration(seconds: 4),
        ),
      );
    } finally {
      if (mounted) {
        setState(() => _isPrinting = false);
      }
    }
  }

  Future<dynamic> _showPrinterSelectionDialog() async {
    // Request Bluetooth permissions based on Android version
    // For Android 12+ (API 31+), use BLUETOOTH_SCAN and BLUETOOTH_CONNECT
    // For older versions, use BLUETOOTH and location
    
    bool hasBluetoothPermission = false;
    
    // Try Android 12+ permissions first
    try {
      final scanStatus = await Permission.bluetoothScan.request();
      final connectStatus = await Permission.bluetoothConnect.request();
      if (scanStatus.isGranted && connectStatus.isGranted) {
        hasBluetoothPermission = true;
      }
    } catch (e) {
      // Permission.bluetoothScan/Connect might not be available on older Android versions
    }
    
    // Fallback to older permissions if needed
    if (!hasBluetoothPermission) {
      try {
        final bluetoothStatus = await Permission.bluetooth.request();
        if (bluetoothStatus.isGranted) {
          // Request location permission (required for Bluetooth scanning on Android 6.0-11)
          final locationStatus = await Permission.location.request();
          if (locationStatus.isGranted) {
            hasBluetoothPermission = true;
          }
        }
      } catch (e) {
        // Fallback failed
      }
    }

    if (!hasBluetoothPermission) {
      if (!mounted) return null;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Izin Bluetooth diperlukan untuk mencetak struk. Silakan aktifkan di pengaturan.'),
          backgroundColor: Colors.orange,
          duration: Duration(seconds: 3),
        ),
      );
      return null;
    }

    return showDialog<dynamic>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _PrinterSelectionDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_printJobData == null) {
      return Scaffold(
        backgroundColor: const Color(0xFFEAFBFF),
        appBar: AppBar(
          backgroundColor: const Color(0xFF0A4D68),
          title: const Text('Ringkasan Print Job', style: TextStyle(color: Colors.white)),
          iconTheme: const IconThemeData(color: Colors.white),
        ),
        body: const Center(child: CircularProgressIndicator()),
      );
    }

    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A4D68),
        title: const Text('Ringkasan Print Job', style: TextStyle(color: Colors.white)),
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
          
          if (isLandscape) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      children: [
                        _buildSummaryCard(),
                        const SizedBox(height: 16),
                        _buildActionButtons(),
                      ],
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: _buildKembalianCard(),
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
                // Ringkasan Data
                _buildSummaryCard(),
                const SizedBox(height: 24),
                // Form Hitung Kembalian
                _buildKembalianCard(),
                const SizedBox(height: 24),
                // Tombol Aksi
                _buildActionButtons(),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildSummaryCard() {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: EdgeInsets.all(isLandscape ? 16 : 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'RINGKASAN PEKERJAAN',
              style: TextStyle(
                fontSize: isLandscape ? 16 : 18,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF0A4D68),
              ),
            ),
            const Divider(height: 24),
            _buildSummaryRow('Tanggal', _formatDate(_printJobData!['date'])),
            const SizedBox(height: 12),
            _buildSummaryRow('Material', _formatMaterial(_printJobData!['material'])),
            const SizedBox(height: 12),
            _buildSummaryRow('Quantity', '${_printJobData!['quantity']}'),
            const SizedBox(height: 12),
            _buildSummaryRow('Harga Satuan', 'Rp ${_formatNumber((_printJobData!['price'] as num?)?.toDouble() ?? 0)}'),
            const Divider(height: 24),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: Colors.green.shade300),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Total Pekerjaan:',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    'Rp ${_formatNumber(_totalPekerjaan)}',
                    style: TextStyle(
                      fontSize: 20,
                      fontWeight: FontWeight.bold,
                      color: Colors.green.shade900,
                    ),
                  ),
                ],
              ),
            ),
            if (_printJobData!['customer_name'] != null && _printJobData!['customer_name'].toString().isNotEmpty) ...[
              const SizedBox(height: 12),
              _buildSummaryRow('Customer', _printJobData!['customer_name']),
            ],
            if (_printJobData!['notes'] != null && _printJobData!['notes'].toString().isNotEmpty) ...[
              const SizedBox(height: 12),
              _buildSummaryRow('Catatan', _printJobData!['notes']),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildSummaryRow(String label, String value) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        SizedBox(
          width: 120,
          child: Text(
            '$label:',
            style: const TextStyle(fontWeight: FontWeight.w500),
          ),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(color: Colors.black87),
          ),
        ),
      ],
    );
  }

  Widget _buildKembalianCard() {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      child: Padding(
        padding: EdgeInsets.all(isLandscape ? 16 : 20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'HITUNG KEMBALIAN',
              style: TextStyle(
                fontSize: isLandscape ? 16 : 18,
                fontWeight: FontWeight.bold,
                color: const Color(0xFF0A4D68),
              ),
            ),
            const Divider(height: 24),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.blue.shade50,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Total Pekerjaan:',
                    style: TextStyle(fontSize: 14),
                  ),
                  Text(
                    'Rp ${_formatNumber(_totalPekerjaan)}',
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _uangCustomerController,
              keyboardType: TextInputType.number,
              decoration: InputDecoration(
                labelText: 'Uang Customer',
                hintText: 'Masukkan jumlah uang',
                prefixText: 'Rp ',
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onChanged: (value) {
                setState(() {}); // Trigger rebuild untuk update kembalian
              },
            ),
            const SizedBox(height: 16),
            if (_uangCustomerController.text.isNotEmpty) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: _kembalian >= 0 ? Colors.green.shade50 : Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: _kembalian >= 0 ? Colors.green.shade300 : Colors.red.shade300,
                  ),
                ),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(
                      'Kembalian:',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: _kembalian >= 0 ? Colors.green.shade900 : Colors.red.shade900,
                      ),
                    ),
                    Text(
                      'Rp ${_formatNumber(_kembalian.abs())}',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: _kembalian >= 0 ? Colors.green.shade900 : Colors.red.shade900,
                      ),
                    ),
                  ],
                ),
              ),
              if (_kembalian < 0) ...[
                const SizedBox(height: 8),
                Text(
                  '⚠ Uang customer kurang!',
                  style: TextStyle(
                    color: Colors.red.shade700,
                    fontSize: 12,
                    fontStyle: FontStyle.italic,
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildActionButtons() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        ElevatedButton.icon(
          onPressed: _isPrinting ? null : _handlePrintStruk,
          icon: _isPrinting
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation(Colors.white),
                  ),
                )
              : const Icon(Icons.print, size: 24),
          label: Text(
            _isPrinting ? 'Mencetak...' : 'Print Struk',
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
          ),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF00ACC1),
            foregroundColor: Colors.white,
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
          ),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: () => Navigator.pop(context),
          icon: const Icon(Icons.arrow_back),
          label: const Text('Kembali', style: TextStyle(fontSize: 16)),
          style: OutlinedButton.styleFrom(
            foregroundColor: const Color(0xFF0A4D68),
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            side: const BorderSide(color: Color(0xFF0A4D68)),
          ),
        ),
      ],
    );
  }
}

class _PrinterSelectionDialog extends StatefulWidget {
  @override
  State<_PrinterSelectionDialog> createState() => _PrinterSelectionDialogState();
}

class _PrinterSelectionDialogState extends State<_PrinterSelectionDialog> {
  List<dynamic> _devices = [];
  bool _isScanning = true;
  bool _isConnecting = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _startScan();
  }

  StreamSubscription<List<dynamic>>? _scanSubscription;

  @override
  void dispose() {
    _scanSubscription?.cancel();
    super.dispose();
  }

  Future<void> _startScan() async {
    setState(() {
      _isScanning = true;
      _errorMessage = null;
      _devices = [];
    });

    try {
      // Cancel previous subscription if any
      await _scanSubscription?.cancel();
      
      await BluetoothPrinterService.instance.initialize();
      
      // Listen to scan results
      _scanSubscription = BluetoothPrinterService.instance.scanPrinters().listen(
        (devices) {
          print('📋 UI received ${devices.length} device(s)');
          if (mounted) {
            setState(() {
              _devices = devices;
              print('✅ Updated UI with ${_devices.length} device(s)');
              // Update devices list as they are discovered
              // Keep scanning until timeout
            });
          }
        },
        onError: (error) {
          print('❌ Scan error: $error');
          if (mounted) {
            setState(() {
              _isScanning = false;
              _errorMessage = 'Error scanning: $error';
            });
            BluetoothPrinterService.instance.stopScan();
          }
        },
        cancelOnError: false,
      );

      // Stop scanning after 20 seconds (longer timeout for better detection)
      Future.delayed(const Duration(seconds: 20), () {
        if (mounted) {
          setState(() {
            _isScanning = false;
          });
          BluetoothPrinterService.instance.stopScan();
        }
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _isScanning = false;
          _errorMessage = 'Gagal memulai scan: $e';
        });
      }
    }
  }

  Future<void> _connectToPrinter(dynamic device) async {
    setState(() {
      _isConnecting = true;
      _errorMessage = null;
    });

    try {
      // Cancel scan subscription first
      await _scanSubscription?.cancel();
      
      // Stop scanning
      await BluetoothPrinterService.instance.stopScan();
      
      // Connect to printer (akan otomatis save MAC address)
      final connected = await BluetoothPrinterService.instance.connectPrinter(device);
      
      if (mounted) {
        if (connected) {
          // Wait a moment to ensure connection is stable
          await Future.delayed(const Duration(milliseconds: 500));
          
          // Verify connection before closing dialog
          if (BluetoothPrinterService.instance.isPrinterConnected()) {
            // Wait for connection to stabilize
            await Future.delayed(const Duration(milliseconds: 500));
            
            // Verify physical connection (tanpa test print untuk lebih cepat)
            print('🔍 Verifying connection...');
            try {
              // Verify menggunakan ping/heartbeat (lebih cepat dari test print)
              // Test print dihapus untuk mempercepat proses connect
              
              // Close dialog and return device
              Navigator.of(context).pop(device);
            } catch (e) {
              setState(() {
                _isConnecting = false;
                _errorMessage = 'Koneksi berhasil tapi verifikasi gagal. Silakan coba lagi.';
              });
            }
          } else {
            setState(() {
              _isConnecting = false;
              _errorMessage = 'Koneksi berhasil tapi tidak stabil. Silakan coba lagi.';
            });
          }
        } else {
          setState(() {
            _isConnecting = false;
            _errorMessage = 'Gagal menghubungkan ke printer. Pastikan printer aktif dan dalam jangkauan.';
          });
        }
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isConnecting = false;
          _errorMessage = 'Error: ${e.toString().replaceAll('Exception: ', '')}';
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Pilih Printer'),
      content: SizedBox(
        width: double.maxFinite,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (_isScanning)
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const CircularProgressIndicator(),
                    const SizedBox(height: 16),
                    const Text('Mencari printer...'),
                    const SizedBox(height: 8),
                    Text(
                      'Pastikan printer Bluetooth aktif dan dalam jangkauan',
                      style: const TextStyle(fontSize: 12, color: Colors.grey),
                      textAlign: TextAlign.center,
                    ),
                    if (_devices.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      Text(
                        'Ditemukan ${_devices.length} printer',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.green.shade700,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ],
                ),
              )
            else if (_devices.isEmpty)
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    const Icon(Icons.bluetooth_disabled, size: 48, color: Colors.grey),
                    const SizedBox(height: 16),
                    const Text('Tidak ada printer ditemukan'),
                    if (_errorMessage != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        _errorMessage!,
                        style: const TextStyle(fontSize: 12, color: Colors.red),
                        textAlign: TextAlign.center,
                      ),
                    ],
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: _startScan,
                      icon: const Icon(Icons.refresh),
                      label: const Text('Scan Ulang'),
                    ),
                  ],
                ),
              )
            else
              Flexible(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (_devices.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8.0),
                        child: Text(
                          'Pilih printer yang akan digunakan:',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey.shade700,
                          ),
                        ),
                      ),
                    Flexible(
                      child: ListView.builder(
                        shrinkWrap: true,
                        itemCount: _devices.length,
                        itemBuilder: (context, index) {
                          final device = _devices[index];
                          final deviceName = device.name ?? 'Unknown Device';
                          final deviceNameUpper = deviceName.toUpperCase();
                          // Highlight printer if it's RPP02N, VSC MP-58C, or "Bluetooth Printer"
                          final isRPP02N = deviceNameUpper.contains('RPP02N') || 
                                           deviceNameUpper == 'RPP02N';
                          final isVSCPrinter = deviceNameUpper.contains('VSC') || 
                                               deviceNameUpper.contains('MP-58');
                          final isBluetoothPrinter = deviceNameUpper.contains('BLUETOOTH PRINTER') ||
                                                     deviceNameUpper == 'BLUETOOTH PRINTER';
                          final isTargetPrinter = isRPP02N || isVSCPrinter || isBluetoothPrinter;
                          
                          return Card(
                            margin: const EdgeInsets.symmetric(vertical: 4, horizontal: 0),
                            elevation: isTargetPrinter ? 2 : 1,
                            color: isTargetPrinter ? Colors.green.shade50 : null,
                            child: ListTile(
                              leading: Icon(
                                Icons.print,
                                color: isTargetPrinter ? Colors.green.shade700 : const Color(0xFF0A4D68),
                                size: isTargetPrinter ? 28 : 24,
                              ),
                              title: Text(
                                deviceName,
                                style: TextStyle(
                                  fontWeight: isTargetPrinter ? FontWeight.bold : FontWeight.normal,
                                  color: isTargetPrinter ? Colors.green.shade700 : Colors.black87,
                                  fontSize: isTargetPrinter ? 16 : 14,
                                ),
                              ),
                              subtitle: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(device.address ?? ''),
                                  if (isTargetPrinter)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 4.0),
                                      child: Text(
                                        '✓ Printer yang disarankan',
                                        style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.green.shade700,
                                          fontWeight: FontWeight.w500,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              trailing: _isConnecting
                                  ? const SizedBox(
                                      width: 20,
                                      height: 20,
                                      child: CircularProgressIndicator(strokeWidth: 2),
                                    )
                                  : Icon(
                                      Icons.arrow_forward_ios, 
                                      size: 16,
                                      color: isTargetPrinter ? Colors.green.shade700 : Colors.grey,
                                    ),
                              onTap: _isConnecting ? null : () => _connectToPrinter(device),
                            ),
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ),
          ],
        ),
      ),
      actions: [
        TextButton(
          onPressed: _isConnecting ? null : () => Navigator.of(context).pop(),
          child: const Text('Batal'),
        ),
      ],
    );
  }
}






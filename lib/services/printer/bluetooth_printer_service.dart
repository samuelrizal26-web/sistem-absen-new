import 'dart:async';
import 'dart:typed_data';
import 'package:flutter/services.dart';
import 'package:image/image.dart' as img;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:esc_pos_utils/esc_pos_utils.dart';
import 'package:bluetooth_print_plus/bluetooth_print_plus.dart';

/// Bluetooth Printer Service menggunakan bluetooth_print_plus + esc_pos_utils
/// Stack: bluetooth_print_plus untuk komunikasi, esc_pos_utils untuk generate ESC/POS bytes
class BluetoothPrinterService {
  // Singleton instance
  static final BluetoothPrinterService instance = BluetoothPrinterService._internal();
  factory BluetoothPrinterService() => instance;
  BluetoothPrinterService._internal();

  // Menggunakan bluetooth_print_plus untuk semua operasi (static class)
  BluetoothDevice? _selectedPrinter;
  
  String? _savedMacAddress;
  bool _isInitialized = false;
  
  // Print lock untuk prevent multiple print simultan
  bool _isPrinting = false;
  
  // Cached logo untuk optimasi
  img.Image? _cachedLogo;
  
  // Helper untuk format row dengan alignment konsisten
  static const int labelWidth = 14;
  
  String _row(String label, String value) {
    return label.padRight(labelWidth) + ': ' + value;
  }

  // SharedPreferences keys
  static const String _printerMacKey = 'printer_mac';
  static const String _printerNameKey = 'printer_name';
  
  // Contact info keys
  static const String _contactPhoneKey = 'struk_contact_phone';
  static const String _contactWebsiteKey = 'struk_contact_website';
  static const String _contactInstagramKey = 'struk_contact_instagram';
  
  // Default contact info
  static const String _defaultPhone = '085740280800';
  static const String _defaultWebsite = 'www.labalabaa.com';
  static const String _defaultInstagram = 'labalabaadv';

  /// Initialize Bluetooth print instance
  Future<void> initialize() async {
    if (_isInitialized) {
      return;
    }

    // bluetooth_print_plus tidak perlu instance, semua method static
    // Load saved MAC address
    final prefs = await SharedPreferences.getInstance();
    _savedMacAddress = prefs.getString(_printerMacKey);

    _isInitialized = true;
  }

  /// Simpan MAC address printer ke SharedPreferences
  Future<void> savePrinterDevice(String mac, {String name = ''}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_printerMacKey, mac);
      if (name.isNotEmpty) {
        await prefs.setString(_printerNameKey, name);
      }
      _savedMacAddress = mac;
      print('✅ Printer saved: ${name.isEmpty ? 'Unknown' : name} ($mac)');
    } catch (e) {
      print('❌ Failed to save printer: $e');
    }
  }

  /// Connect langsung ke printer dengan MAC address (untuk printer yang sudah di-pair)
  /// Berguna jika MAC address sudah diketahui tapi printer tidak muncul di scan
  Future<bool> connectToPrinterByMac(String macAddress, {String name = ''}) async {
    try {
      print('🔌 Attempting direct connect to printer: ${name.isEmpty ? 'Unknown' : name} ($macAddress)');
      
      // Save MAC address first
      await savePrinterDevice(macAddress, name: name);
      
      // Try to connect using saved printer method (which will scan and find it)
      return await connectToSavedPrinter(maxRetries: 1);
    } catch (e) {
      print('❌ Error connecting to printer by MAC: $e');
      return false;
    }
  }

  /// Connect ke printer yang disimpan berdasarkan MAC address
  /// Dengan retry mechanism dan stop scan lebih cepat
  Future<bool> connectToSavedPrinter({int maxRetries = 2}) async {
    for (int attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        if (_savedMacAddress == null || _savedMacAddress!.isEmpty) {
          print('⚠️ No saved printer found');
          return false;
        }

        await initialize();

        print('🔍 Searching for printer: $_savedMacAddress (attempt ${attempt + 1}/${maxRetries + 1})');

        // Start scan untuk mencari printer dengan MAC yang disimpan
        const scanDuration = Duration(seconds: 8);
        
        BluetoothDevice? foundPrinter;
        bool found = false;
        
        // Listen to scan results
        final subscription = BluetoothPrintPlus.scanResults.listen((devices) {
          print('📱 Scan found ${devices.length} device(s)');
          for (final device in devices) {
            final deviceAddress = device.address.toUpperCase();
            final savedAddress = _savedMacAddress!.toUpperCase();
            
            print('   Checking: ${device.name} ($deviceAddress)');
            
            if (deviceAddress == savedAddress) {
              foundPrinter = device;
              found = true;
              print('✅ Found saved printer: ${device.name} ($deviceAddress)');
              // Stop scan segera setelah printer ditemukan
              BluetoothPrintPlus.stopScan();
              break;
            }
          }
        });

        // Start scan
        BluetoothPrintPlus.startScan(timeout: scanDuration);

        // Wait untuk scan selesai atau printer ditemukan
        await Future.delayed(scanDuration + const Duration(milliseconds: 500));
        await subscription.cancel();
        await BluetoothPrintPlus.stopScan();

        if (foundPrinter != null && found) {
          // Connect to printer
          final printer = foundPrinter!;
          await BluetoothPrintPlus.connect(printer);
          // Wait for connection to establish
          await Future.delayed(const Duration(milliseconds: 1000));
          if (BluetoothPrintPlus.isConnected) {
            _selectedPrinter = printer;
            print('✅ Printer connected: ${printer.name} ($_savedMacAddress)');
            return true;
          } else {
            print('⚠️ Failed to connect to printer');
          }
        }

        // Jika tidak ditemukan dan masih ada retry, tunggu dengan exponential backoff
        if (attempt < maxRetries) {
          final delayMs = 500 * (attempt + 1); // 500ms, 1000ms, 1500ms
          print('⚠️ Printer not found, retrying in ${delayMs}ms... (attempt ${attempt + 1}/${maxRetries})');
          await Future.delayed(Duration(milliseconds: delayMs));
        }
      } catch (e) {
        print('❌ Error connecting to saved printer (attempt ${attempt + 1}): $e');
        if (attempt < maxRetries) {
          final delayMs = 500 * (attempt + 1);
          await Future.delayed(Duration(milliseconds: delayMs));
        }
      }
    }

    print('❌ Saved printer not found after ${maxRetries + 1} attempts: $_savedMacAddress');
    print('💡 Make sure printer is paired in Android Settings → Bluetooth');
    return false;
  }

  /// Check if printer is connected (logical check)
  bool isPrinterConnected() {
    return BluetoothPrintPlus.isConnected && _selectedPrinter != null;
  }

  /// Verify koneksi fisik dengan ping/heartbeat
  /// Mengirim command kecil untuk test koneksi sebelum print
  Future<bool> verifyConnection({Duration? timeout}) async {
    if (!isPrinterConnected()) {
      return false;
    }

    try {
      // Kirim command kecil untuk test koneksi (ESC @ = reset printer)
      final testBytes = Uint8List.fromList([0x1B, 0x40]); // ESC @
      
      // Gunakan timeout yang lebih pendek (5 detik) untuk verification
      final verificationTimeout = timeout ?? const Duration(seconds: 5);
      
      // Wrap dengan timeout untuk menghindari hang terlalu lama
      await BluetoothPrintPlus.write(testBytes)
          .timeout(
            verificationTimeout,
            onTimeout: () {
              print('⚠️ Connection verification timeout after ${verificationTimeout.inSeconds}s');
              return;
            },
          );
      
      // Jika berhasil, berarti koneksi masih aktif
      return BluetoothPrintPlus.isConnected;
    } catch (e) {
      print('⚠️ Connection verification failed: $e');
      // Jika verify gagal, coba reconnect
      return false;
    }
  }

  /// Scan untuk printer (hanya digunakan saat pertama kali pilih device)
  Stream<List<BluetoothDevice>> scanPrinters() {
    print('🔍 Starting Bluetooth printer scan...');
    
    // Start new scan
    BluetoothPrintPlus.startScan(timeout: const Duration(seconds: 10));

    // Add logging to scan results stream
    return BluetoothPrintPlus.scanResults.map((devices) {
      print('📱 Scan results: Found ${devices.length} device(s)');
      for (var device in devices) {
        print('   - ${device.name} (${device.address})');
      }
      return devices;
    });
  }

  /// Stop scanning
  Future<void> stopScan() async {
    await BluetoothPrintPlus.stopScan();
  }

  /// Connect ke printer yang dipilih user (hanya saat pertama kali pilih)
  Future<bool> connectPrinter(BluetoothDevice printer) async {
    await initialize();

    try {
      // Connect to printer
      await BluetoothPrintPlus.connect(printer);
      // Wait for connection to establish
      await Future.delayed(const Duration(milliseconds: 1000));
      if (BluetoothPrintPlus.isConnected) {
        _selectedPrinter = printer;
        
        // Save printer MAC address
        final printerName = printer.name;
        await savePrinterDevice(
          printer.address,
          name: printerName,
        );
        _savedMacAddress = printer.address;
        
        print('✅ Printer connected: ${printer.name} (${printer.address})');
        return true;
      } else {
        throw Exception('Failed to connect to printer');
      }
    } catch (e) {
      print('❌ Error connecting printer: $e');
      throw Exception('Gagal memilih printer: $e');
    }
  }

  /// Disconnect printer
  Future<void> disconnectPrinter() async {
    if (_selectedPrinter != null) {
      await BluetoothPrintPlus.disconnect();
    }
    _selectedPrinter = null;
    _savedMacAddress = null;
    print('✅ Printer disconnected');
  }

  /// Clear saved printer
  Future<void> clearSavedPrinter() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_printerMacKey);
    await prefs.remove(_printerNameKey);
    _savedMacAddress = null;
    _selectedPrinter = null;
    print('✅ Saved printer cleared');
  }

  /// Ensure printer is connected (Thermer-style: simple and fast)
  /// No verification, just check if printer is selected and connect if needed
  Future<bool> ensureConnected({bool verifyPhysical = false}) async {
    // Thermer-style: Simple check - if printer is selected, assume it's ready
    // No complex verification that slows down the process
    if (isPrinterConnected()) {
      return true; // Already connected, skip verification for speed
    }
    
    // Try to connect to saved printer (fast connection, no verification)
    if (_savedMacAddress != null && _savedMacAddress!.isNotEmpty) {
      return await connectToSavedPrinter();
    }
    
    return false;
  }

  /// Print struk thermal dengan format lengkap menggunakan bluetooth_print_plus
  /// Logo dan teks dicetak menggunakan ESC/POS Generator (100% Dart)
  /// Dengan retry mechanism dan print lock
  Future<void> printStruk({
    required Map<String, dynamic> printJobData,
    required String formatDate,
    required String formatDateTime,
    required String formatMaterial,
    required double totalPekerjaan,
    int maxRetries = 2, // Kurangi dari 3 ke 2 (total 3 attempts) untuk menghindari proses terlalu lama
  }) async {
    // Print lock: prevent multiple print simultan
    // Tunggu sampai print sebelumnya selesai (max 15 detik)
    int waitCount = 0;
    while (_isPrinting && waitCount < 30) {
      print('⏳ Waiting for previous print to complete... (${waitCount * 0.5}s)');
      await Future.delayed(const Duration(milliseconds: 500));
      waitCount++;
    }
    
    if (_isPrinting) {
      throw PrintException(
        'Print sedang berlangsung terlalu lama. Silakan tunggu atau restart aplikasi.',
        PrintErrorType.printerBusy,
      );
    }

    _isPrinting = true;
    print('🔒 Print lock acquired');
    
    try {
      // Ensure initialized
      if (!_isInitialized) {
        await initialize();
      }

      // Thermer-style: Simple connection check, no verification
      // Just ensure printer is selected, plugin will handle connection automatically
      if (!isPrinterConnected()) {
        // Try to connect to saved printer (fast, no verification)
        final connected = await ensureConnected(verifyPhysical: false);
        if (!connected) {
          throw PrintException(
            'Printer belum terhubung. Silakan pilih printer terlebih dahulu.',
            PrintErrorType.connection,
          );
        }
      }
      
      // Thermer-style: No verification, no delay - just print directly
      // Plugin will handle connection automatically when print is called

      print('🖨️ Printing struk via bluetooth_print_plus...');

      if (_selectedPrinter == null) {
        throw PrintException(
          'Printer belum dipilih. Silakan pilih printer terlebih dahulu.',
          PrintErrorType.notSelected,
        );
      }

      // Load capability profile untuk ESC/POS
      final profile = await CapabilityProfile.load();
      final generator = Generator(PaperSize.mm58, profile);
      
      List<int> bytes = [];
      
      // Initialize printer
      bytes += generator.reset();
      bytes += generator.setGlobalCodeTable('CP437');
      
      // ==========================
      // LOGO (CENTER) - dengan caching
      // ==========================
      try {
        // Gunakan cached logo jika ada
        img.Image? processedLogo = _cachedLogo;
        
        if (processedLogo == null) {
          // Load dan process logo jika belum di-cache
          final ByteData logoData = await rootBundle.load('assets/logo_prints.png');
          final Uint8List logoBytes = logoData.buffer.asUint8List();
          
          if (logoBytes.isNotEmpty) {
            final img.Image? raw = img.decodeImage(logoBytes);
            
            if (raw != null && raw.width > 0 && raw.height > 0) {
              // Resize logo ke max width 384px (keep aspect ratio)
              var resized = raw;
              if (raw.width > 384) {
                resized = img.copyResize(raw, width: 384);
              }
              
              // Convert to grayscale
              final img.Image grayscale = img.grayscale(resized);
              
              // Convert to monochrome dengan threshold ±150
              processedLogo = monochromeWithThreshold(grayscale, threshold: 150);
              
              // Cache processed logo untuk penggunaan berikutnya
              _cachedLogo = processedLogo;
              print('✅ Logo processed and cached: ${processedLogo.width}x${processedLogo.height}');
            }
          }
        } else {
          print('✅ Using cached logo: ${processedLogo.width}x${processedLogo.height}');
        }
        
        if (processedLogo != null) {
          // Generate ESC/POS image bytes menggunakan generator.image()
          bytes += generator.image(processedLogo, align: PosAlign.center);
          bytes += generator.feed(1);
        }
      } catch (e) {
        print('⚠️ Error processing logo: $e');
        // Continue without logo
      }

      // ==========================
      // HEADER TOKO
      // ==========================
      bytes += generator.text(
        fixAscii('LABALABA.ADV'),
        styles: const PosStyles(align: PosAlign.center, bold: true, codeTable: 'CP437'),
      );
      bytes += generator.text(
        fixAscii('Cutting Sticker & Advertising'),
        styles: const PosStyles(align: PosAlign.center, codeTable: 'CP437'),
      );
      bytes += generator.text(
        fixAscii(_getDividerLine()),
        styles: const PosStyles(align: PosAlign.center, codeTable: 'CP437'),
      );
      bytes += generator.feed(1);

      // ==========================
      // JUDUL STRUK
      // ==========================
      bytes += generator.text(
        fixAscii('STRUK TRANSAKSI'),
        styles: const PosStyles(align: PosAlign.center, bold: true, codeTable: 'CP437'),
      );
      bytes += generator.feed(1);

      // ==========================
      // INFO TANGGAL / WAKTU / JOB
      // ==========================
      final jobIdRaw = printJobData['id']?.toString() ??
          printJobData['_id']?.toString() ??
          'N/A';

      // Gunakan helper _row() untuk semua baris
      bytes += generator.text(
        fixAscii(_row('Tanggal', formatDate)),
        styles: const PosStyles(codeTable: 'CP437'),
      );
      bytes += generator.text(
        fixAscii(_row('Waktu', _formatTimeOnly(formatDateTime))),
        styles: const PosStyles(codeTable: 'CP437'),
      );
      bytes += generator.text(
        fixAscii(_row('No. Job', _formatJobId(jobIdRaw))),
        styles: const PosStyles(codeTable: 'CP437'),
      );
      bytes += generator.text(
        fixAscii(_getDividerLine()),
        styles: const PosStyles(align: PosAlign.center, codeTable: 'CP437'),
      );
      bytes += generator.feed(1);

      // ==========================
      // DETAIL PEKERJAAN
      // ==========================
      final material = fixAscii(formatMaterial);
      final qty = (printJobData['quantity'] ?? '').toString();
      final hargaSatuan = _formatCurrency(
          (printJobData['price'] as num?)?.toDouble() ?? 0.0);

      // Gunakan helper _row() untuk semua baris (WAJIB)
      bytes += generator.text(
        fixAscii(_row('Material', material)),
        styles: const PosStyles(codeTable: 'CP437'),
      );
      bytes += generator.text(
        fixAscii(_row('Quantity', qty)),
        styles: const PosStyles(codeTable: 'CP437'),
      );
      bytes += generator.text(
        fixAscii(_row('Harga Satuan', 'Rp $hargaSatuan')),
        styles: const PosStyles(codeTable: 'CP437'),
      );

      // Subtotal: WAJIB menggunakan _row() dengan titik dua
      final formattedTotal = _formatCurrency(totalPekerjaan);
      bytes += generator.text(
        fixAscii(_row('Subtotal', 'Rp $formattedTotal')),
        styles: const PosStyles(bold: true, codeTable: 'CP437'),
      );

      bytes += generator.text(
        fixAscii(_getDividerLine()),
        styles: const PosStyles(align: PosAlign.center, codeTable: 'CP437'),
      );
      bytes += generator.feed(1);

      // ==========================
      // CUSTOMER & CATATAN
      // ==========================
      final customer = fixAscii(
        (printJobData['customer_name'] ??
                printJobData['customer'] ??
                '-')
            .toString(),
      );
      final notes = (printJobData['notes'] ?? '').toString();

      // Gunakan helper _row() untuk semua baris
      bytes += generator.text(
        fixAscii(_row('Customer', customer)),
        styles: const PosStyles(codeTable: 'CP437'),
      );

      if (notes.isNotEmpty) {
        bytes += generator.text(
          fixAscii(_row('Catatan', fixAscii(notes))),
          styles: const PosStyles(codeTable: 'CP437'),
        );
      }

      bytes += generator.text(
        fixAscii(_getDividerLine()),
        styles: const PosStyles(align: PosAlign.center, codeTable: 'CP437'),
      );
      bytes += generator.feed(1);

      // ==========================
      // FOOTER + KONTAK
      // ==========================
      bytes += generator.text(
        fixAscii('TERIMA KASIH'),
        styles: const PosStyles(align: PosAlign.center, bold: true, codeTable: 'CP437'),
      );
      bytes += generator.text(
        fixAscii('Atas Kepercayaan Anda!'),
        styles: const PosStyles(align: PosAlign.center, codeTable: 'CP437'),
      );
      bytes += generator.feed(1);

      final contactPhone = await _getContactPhone();
      final contactWebsite = await _getContactWebsite();
      final contactInstagram = await _getContactInstagram();
      bytes += generator.text(
        fixAscii('Hubungi kami:'),
        styles: const PosStyles(align: PosAlign.center, codeTable: 'CP437'),
      );
      bytes += generator.text(
        fixAscii('Tel $contactPhone'),
        styles: const PosStyles(align: PosAlign.center, codeTable: 'CP437'),
      );
      bytes += generator.text(
        fixAscii('Web $contactWebsite'),
        styles: const PosStyles(align: PosAlign.center, codeTable: 'CP437'),
      );
      bytes += generator.text(
        fixAscii('IG $contactInstagram'),
        styles: const PosStyles(align: PosAlign.center, codeTable: 'CP437'),
      );
      
      bytes += generator.feed(2);
      bytes += generator.cut();

      // ==========================
      // KIRIM KE PRINTER VIA bluetooth_print_plus
      // Dengan retry mechanism
      // ==========================
      bool? lastResult;
      Exception? lastException;
      final printBytes = Uint8List.fromList(bytes);
      
      for (int attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await BluetoothPrintPlus.write(printBytes);
          lastResult = true;
          
          if (BluetoothPrintPlus.isConnected) {
            print('✅ Struk berhasil dicetak via bluetooth_print_plus');
            return; // Success, exit function
          } else {
            // Print gagal, coba retry dengan delay
            print('⚠️ Print gagal (attempt ${attempt + 1}/${maxRetries + 1})');
            
            // Categorize error
            PrintErrorType errorType = PrintErrorType.printFailed;
            String errorMessage = 'Gagal mencetak struk.';
            
            if (attempt < maxRetries) {
              final delayMs = [300, 500][attempt]; // Shorter delays: 300ms, 500ms
              print('⚠️ Retrying in ${delayMs}ms...');
        
              // Thermer-style: Simple reconnect before retry
              if (!isPrinterConnected()) {
                try {
                  await ensureConnected(verifyPhysical: false);
                } catch (e) {
                  print('⚠️ Reconnect error: $e, will retry anyway...');
                }
              }
              
              await Future.delayed(Duration(milliseconds: delayMs));
            } else {
              // Semua retry gagal
              throw PrintException(
                errorMessage,
                errorType,
              );
            }
          }
        } catch (e) {
          lastException = e is Exception ? e : Exception(e.toString());
          
          // Jika bukan PrintException, wrap it
          if (e is! PrintException) {
            // Categorize error
            final errorMsg = e.toString().toLowerCase();
            PrintErrorType errorType;
            
            if (errorMsg.contains('connection') || 
                errorMsg.contains('connect') || 
                errorMsg.contains('terhubung')) {
              errorType = PrintErrorType.connection;
            } else if (errorMsg.contains('timeout') || 
                       errorMsg.contains('timed out')) {
              errorType = PrintErrorType.timeout;
            } else if (errorMsg.contains('busy') || 
                       errorMsg.contains('buffer')) {
              errorType = PrintErrorType.printerBusy;
            } else {
              errorType = PrintErrorType.unknown;
            }
            
            lastException = PrintException(
              'Error saat mencetak: ${e.toString()}',
              errorType,
            );
          }
          
          // Jika masih ada retry, tunggu dan coba lagi
          if (attempt < maxRetries) {
            final delayMs = [300, 500][attempt]; // Shorter delays
            print('⚠️ Print error (attempt ${attempt + 1}/${maxRetries + 1}): $e. Retrying in ${delayMs}ms...');
          
            // Coba reconnect sebelum retry (skip verification untuk speed)
            try {
              await ensureConnected(verifyPhysical: false); // Skip verification untuk speed
            } catch (_) {
              // Ignore reconnect error, akan di-handle di retry berikutnya
            }
            
            await Future.delayed(Duration(milliseconds: delayMs));
          } else {
            // Semua retry gagal, throw error
            rethrow;
          }
        }
      }
      
      // Fallback: jika sampai sini berarti semua retry gagal
      if (lastException != null) {
        throw lastException;
      } else if (lastResult != null && lastResult == false) {
        throw PrintException(
          'Gagal mencetak struk: Print failed',
          PrintErrorType.printFailed,
        );
      } else {
        throw PrintException(
          'Gagal mencetak struk: Unknown error',
          PrintErrorType.unknown,
        );
      }
    } catch (e) {
      // Log error dengan detail
      final errorType = e is PrintException ? e.type.toString() : 'Unknown';
      print('❌ Error printing struk [Type: $errorType]: $e');
      
      // Re-throw dengan error yang lebih informatif
      if (e is PrintException) {
        rethrow;
      } else {
        throw PrintException(
          'Gagal mencetak struk: ${e.toString()}',
          PrintErrorType.unknown,
        );
      }
    } finally {
      // Release print lock dengan delay untuk memastikan print benar-benar selesai
      // Delay 1 detik untuk memastikan koneksi Bluetooth benar-benar selesai
      // Release print lock lebih cepat untuk responsivitas lebih baik
      await Future.delayed(const Duration(milliseconds: 500));
      _isPrinting = false;
      print('🔓 Print lock released');
    }
  }

  /// Test print (print struk test sederhana)
  Future<void> testPrint() async {
    await printStruk(
      printJobData: {
        'id': 'TEST',
        'quantity': '1',
        'price': 10000,
        'customer_name': 'Test Customer',
        'notes': 'Test Print',
      },
      formatDate: DateTime.now().toString().split(' ')[0],
      formatDateTime: DateTime.now().toString(),
      formatMaterial: 'Test Material',
      totalPekerjaan: 10000,
    );
  }

  /// Open cash drawer
  /// Menggunakan bluetooth_print_plus (sama seperti printStruk)
  /// - Gunakan ensureConnected() yang cepat (tidak perlu scan)
  /// - Kirim command ESC/POS via print() (konsisten dengan printStruk)
  /// - Menunggu print lock selesai jika ada print sebelumnya
  Future<void> openCashdrawer() async {
    try {
      if (!_isInitialized) {
        await initialize();
      }

      // Jika printer belum dipilih, coba connect ke saved printer dulu
      if (_selectedPrinter == null) {
        print('⚠️ Printer belum dipilih, mencoba connect ke saved printer...');
        if (_savedMacAddress != null && _savedMacAddress!.isNotEmpty) {
          final connected = await connectToSavedPrinter(maxRetries: 1);
          if (!connected || _selectedPrinter == null) {
            throw Exception('Printer belum dipilih. Silakan pilih printer terlebih dahulu.');
          }
        } else {
          throw Exception('Printer belum dipilih. Silakan pilih printer terlebih dahulu.');
        }
      }

      if (_selectedPrinter == null) {
        throw Exception('Printer belum dipilih. Silakan pilih printer terlebih dahulu.');
      }

      print('💰 Mengirim command buka laci kasir via bluetooth_print_plus...');

      // Pastikan printer terhubung (sama seperti printStruk)
      if (!isPrinterConnected()) {
        print('🔌 Memastikan printer terhubung (fast, no scan)...');
        final connected = await ensureConnected(verifyPhysical: false);
        if (!connected) {
          throw Exception('Printer belum terhubung. Silakan pilih printer terlebih dahulu.');
        }
      }

      // Tunggu print lock selesai jika ada print sebelumnya
      // Ini penting jika openCashdrawer() dipanggil setelah printStruk()
      int waitCount = 0;
      while (_isPrinting && waitCount < 20) {
        print('⏳ Waiting for print lock to release before opening cash drawer... (${waitCount * 0.5}s)');
        await Future.delayed(const Duration(milliseconds: 500));
        waitCount++;
      }
      
      // Tambahkan delay kecil untuk memastikan printer siap menerima command baru
      // Setelah print struk, printer mungkin masih memproses
      if (waitCount > 0) {
        print('⏳ Additional delay to ensure printer is ready...');
        await Future.delayed(const Duration(milliseconds: 500));
      }

      // ESC/POS command untuk buka laci kasir: ESC p 0 25 250
      // Format: ESC p m t1 t2
      // m: 0 = pin 2, 1 = pin 5
      // t1: pulse time 1 (25 = 25ms)
      // t2: pulse time 2 (250 = 250ms)
      final cashdrawerBytes = Uint8List.fromList([
        0x1B, // ESC
        0x70, // 'p'
        0x00, // m (0 = pin 2)
        0x19, // t1 (25 = 25ms)
        0xFA, // t2 (250 = 250ms)
      ]);

      // Kirim command via print() dengan retry mechanism
      print('📤 Mengirim command buka laci via print()...');
      bool? result;
      int maxRetries = 2;
      
      for (int attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          await BluetoothPrintPlus.write(cashdrawerBytes);
          result = true;
          
          if (BluetoothPrintPlus.isConnected) {
            print('✅ Command buka laci berhasil dikirim');
            return; // Success, exit function
          } else {
            print('⚠️ Buka laci result: failed (tetap anggap berhasil)');
            // Tetap anggap berhasil karena beberapa printer tidak mengirim response
            // Command sudah dikirim, laci akan terbuka
            return;
          }
        } catch (e) {
          print('⚠️ Error mengirim command buka laci (attempt ${attempt + 1}/${maxRetries + 1}): $e');
          if (attempt < maxRetries) {
            await Future.delayed(const Duration(milliseconds: 500));
            continue;
          }
          rethrow;
        }
      }
      
      // Jika sampai sini, semua retry gagal
      if (result != null && result == false) {
        print('⚠️ Buka laci result: failed (tetap anggap berhasil)');
        // Tetap anggap berhasil karena command sudah dikirim
      }
    } catch (e) {
      print('❌ Error membuka laci: $e');
      rethrow;
    }
  }

  // ==========================
  // HELPER FUNCTIONS
  // ==========================

  /// Get contact phone
  Future<String> _getContactPhone() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_contactPhoneKey) ?? _defaultPhone;
    } catch (e) {
      return _defaultPhone;
    }
  }

  /// Get contact website
  Future<String> _getContactWebsite() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_contactWebsiteKey) ?? _defaultWebsite;
    } catch (e) {
      return _defaultWebsite;
    }
  }

  /// Get contact Instagram
  Future<String> _getContactInstagram() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      return prefs.getString(_contactInstagramKey) ?? _defaultInstagram;
    } catch (e) {
      return _defaultInstagram;
    }
  }

  /// Fix ASCII untuk printer thermal ESC/POS yang tidak mendukung Unicode
  /// Dengan mapping untuk karakter Indonesia umum
  String fixAscii(String input) {
    if (input.isEmpty) return input;
    
    String result = input;
    
    // Dash panjang → '-'
    result = result.replaceAll('—', '-');
    result = result.replaceAll('–', '-');
    
    // Titik tiga (…) → '...'
    result = result.replaceAll('…', '...');
    
    // Karakter garis Unicode ke ASCII
    result = result.replaceAll('═', '=');
    result = result.replaceAll('━', '-');
    result = result.replaceAll('─', '-');
    
    // Tanda kutip fancy → kutip biasa
    result = result.replaceAll('"', '"');
    result = result.replaceAll('"', '"');
    result = result.replaceAll(''', "'");
    result = result.replaceAll(''', "'");
    
    // Spasi khusus ke spasi biasa
    result = result.replaceAll('\u00A0', ' ');
    result = result.replaceAll('\u2000', ' ');
    result = result.replaceAll('\u2001', ' ');
    result = result.replaceAll('\u2002', ' ');
    result = result.replaceAll('\u2003', ' ');
    
    // Mapping karakter Indonesia umum (transliteration)
    final indonesianMap = {
      'ā': 'a', 'Ā': 'A',
      'ē': 'e', 'Ē': 'E',
      'ī': 'i', 'Ī': 'I',
      'ō': 'o', 'Ō': 'O',
      'ū': 'u', 'Ū': 'U',
      'ñ': 'n', 'Ñ': 'N',
      'ç': 'c', 'Ç': 'C',
    };
    
    for (final entry in indonesianMap.entries) {
      result = result.replaceAll(entry.key, entry.value);
    }
    
    // Konversi karakter ke ASCII murni (0-127)
    // Jangan langsung jadi '?' untuk semua non-ASCII
    final buffer = StringBuffer();
    for (int i = 0; i < result.length; i++) {
      final char = result[i];
      final codeUnit = char.codeUnitAt(0);
      
      if (codeUnit >= 0 && codeUnit <= 127) {
        buffer.write(char);
      } else {
        // Coba transliteration untuk karakter umum
        // Jika tidak ada mapping, baru jadi '?'
        buffer.write('?');
      }
    }
    
    return buffer.toString();
  }

  /// Format currency
  String _formatCurrency(double value) {
    if (value.isNaN || value.isInfinite) return '0';
    final formatted = value.toStringAsFixed(0).replaceAllMapped(
      RegExp(r'(\d)(?=(\d{3})+(?!\d))'),
      (match) => '${match.group(1)}.',
    );
    return fixAscii(formatted);
  }

  /// Format No. Job menjadi 5 karakter yang mudah dibaca
  String _formatJobId(String jobId) {
    if (jobId == 'N/A' || jobId.isEmpty) {
      return 'N/A';
    }
    
    // Jika ID adalah UUID atau panjang, ambil 5 karakter terakhir
    if (jobId.length > 5) {
      final last5 = jobId.substring(jobId.length - 5);
      final clean = last5.replaceAll(RegExp(r'[^0-9A-Za-z]'), '');
      if (clean.length >= 3) {
        return clean.substring(0, clean.length > 5 ? 5 : clean.length).toUpperCase();
      }
    }
    
    // Jika ID pendek, gunakan langsung (max 5 karakter)
    final clean = jobId.replaceAll(RegExp(r'[^0-9A-Za-z]'), '');
    return clean.length > 5 ? clean.substring(0, 5).toUpperCase() : clean.toUpperCase();
  }

  /// Format waktu menjadi hanya jam (HH:mm:ss)
  String _formatTimeOnly(String dateTime) {
    try {
      final parts = dateTime.split(' ');
      if (parts.length >= 2) {
        return parts[1];
      }
      final parsed = DateTime.tryParse(dateTime);
      if (parsed != null) {
        return '${parsed.hour.toString().padLeft(2, '0')}:${parsed.minute.toString().padLeft(2, '0')}:${parsed.second.toString().padLeft(2, '0')}';
      }
      return dateTime;
    } catch (e) {
      return dateTime;
    }
  }

  /// Format garis pemisah untuk printer thermal 58mm
  String _getDividerLine() {
    return fixAscii('--------------------------------');
  }

  /// Convert grayscale image to monochrome dengan threshold manual
  img.Image monochromeWithThreshold(img.Image grayscale, {int threshold = 150}) {
    final result = img.copyResize(grayscale, width: grayscale.width, height: grayscale.height);
    
    for (int y = 0; y < grayscale.height; y++) {
      for (int x = 0; x < grayscale.width; x++) {
        final pixel = grayscale.getPixel(x, y);
        final r = (pixel >> 16) & 0xFF;
        final g = (pixel >> 8) & 0xFF;
        final b = pixel & 0xFF;
        
        // Calculate luminance
        final luminance = (0.299 * r + 0.587 * g + 0.114 * b).round();
        
        // Apply threshold
        final value = luminance >= threshold ? 255 : 0;
        final newPixel = (0xFF << 24) | (value << 16) | (value << 8) | value;
        result.setPixel(x, y, newPixel);
      }
    }
    
    return result;
  }

  /// Save contact phone
  Future<void> saveContactPhone(String phone) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_contactPhoneKey, phone);
    } catch (e) {
      // Ignore
    }
  }

  /// Save contact website
  Future<void> saveContactWebsite(String website) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_contactWebsiteKey, website);
    } catch (e) {
      // Ignore
    }
  }

  /// Save contact Instagram
  Future<void> saveContactInstagram(String instagram) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_contactInstagramKey, instagram);
    } catch (e) {
      // Ignore
    }
  }

  /// Get contact phone (public)
  Future<String> getContactPhone() => _getContactPhone();

  /// Get contact website (public)
  Future<String> getContactWebsite() => _getContactWebsite();

  /// Get contact Instagram (public)
  Future<String> getContactInstagram() => _getContactInstagram();

  /// Clear cached logo (untuk reload logo baru)
  void clearLogoCache() {
    _cachedLogo = null;
    print('✅ Logo cache cleared');
  }

  /// Dispose resources
  void dispose() {
    _cachedLogo = null;
    _isPrinting = false;
  }
}

// ==========================
// ERROR HANDLING CLASSES
// ==========================

/// Kategori error untuk print
enum PrintErrorType {
  connection,      // Masalah koneksi Bluetooth
  notSelected,    // Printer belum dipilih
  printFailed,    // Print gagal (printer error, buffer full, dll)
  timeout,        // Timeout saat print
  printerBusy,    // Printer sedang sibuk
  invalidData,    // Data tidak valid
  unknown,         // Error tidak diketahui
}

/// Custom exception untuk print dengan kategori error
class PrintException implements Exception {
  final String message;
  final PrintErrorType type;

  PrintException(this.message, this.type);

  @override
  String toString() {
    // Jika message sudah informatif dan bukan technical message, gunakan langsung
    if (message.isNotEmpty && 
        !message.contains('Exception:') && 
        !message.contains('Error:') &&
        message.length < 100) {
      return message;
    }
    
    // Fallback ke default message berdasarkan type
    String userMessage;
    switch (type) {
      case PrintErrorType.connection:
        userMessage = 'Koneksi printer terputus. Silakan pilih printer lagi.';
        break;
      case PrintErrorType.notSelected:
        userMessage = 'Printer belum dipilih. Silakan pilih printer terlebih dahulu.';
        break;
      case PrintErrorType.printFailed:
        // Gunakan message spesifik jika ada, atau default message
        if (message.isNotEmpty && message != 'Gagal mencetak struk: Unknown error') {
          userMessage = message;
        } else {
          userMessage = 'Gagal mencetak struk. Pastikan printer aktif dan kertas tersedia.';
        }
        break;
      case PrintErrorType.timeout:
        userMessage = 'Print timeout. Pastikan printer dalam jangkauan dan coba lagi.';
        break;
      case PrintErrorType.printerBusy:
        userMessage = 'Printer sedang sibuk. Silakan tunggu sebentar dan coba lagi.';
        break;
      case PrintErrorType.invalidData:
        userMessage = 'Data tidak valid untuk dicetak.';
        break;
      case PrintErrorType.unknown:
        userMessage = message.isNotEmpty ? message : 'Terjadi kesalahan saat mencetak. Silakan coba lagi.';
        break;
    }
    return userMessage;
  }

  /// Get technical message untuk debugging
  String get technicalMessage => message;
}






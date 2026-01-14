import 'dart:typed_data';
import 'package:flutter/material.dart';
// import 'package:printing/printing.dart'; // Commented out karena tidak kompatibel dengan Flutter 3.38.2

/// Wrapper untuk PDF export yang menangani error dengan graceful fallback
/// CATATAN: printing 5.9.3 tidak kompatibel dengan Flutter 3.38.2
/// Wrapper ini akan memberikan pesan yang jelas bahwa PDF export tidak tersedia
/// tetapi printing thermal tetap berfungsi dengan baik
class PdfExportWrapper {
  /// Export PDF dengan graceful error handling
  /// CATATAN: Karena printing 5.9.3 tidak kompatibel dengan Flutter 3.38.2,
  /// fitur PDF export sementara tidak tersedia. Printing thermal tetap berfungsi.
  static Future<void> sharePdf({
    required Uint8List bytes,
    required String filename,
    required BuildContext context,
  }) async {
    // Karena printing package tidak kompatibel dengan Flutter 3.38.2,
    // kita akan memberikan pesan yang jelas kepada user
    if (!context.mounted) return;
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text(
          'Fitur export PDF sementara tidak tersedia karena masalah kompatibilitas dengan Flutter 3.38.2. '
          'Fitur printing thermal tetap berfungsi dengan baik. '
          'Silakan gunakan fitur print struk untuk mencetak informasi yang diperlukan.',
        ),
        backgroundColor: Colors.orange,
        duration: const Duration(seconds: 8),
        action: SnackBarAction(
          label: 'OK',
          textColor: Colors.white,
          onPressed: () {},
        ),
      ),
    );
  }

  /// Check apakah PDF export tersedia
  /// Return false karena printing package tidak kompatibel dengan Flutter 3.38.2
  static bool get isPdfExportAvailable => false;
}






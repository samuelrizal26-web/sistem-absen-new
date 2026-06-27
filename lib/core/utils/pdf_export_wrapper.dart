import 'dart:io';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';

/// Wrapper untuk PDF export yang menulis ke file sementara lalu memanggil share sheet
class PdfExportWrapper {
  /// Export PDF dengan graceful error handling
  static Future<void> sharePdf({
    required Uint8List bytes,
    required String filename,
    required BuildContext context,
  }) async {
    try {
      final tempDir = await getTemporaryDirectory();
      final filePath = p.join(tempDir.path, filename);
      final file = File(filePath);
      if (await file.exists()) {
        await file.delete();
      }
      await file.writeAsBytes(bytes, flush: true);
      await Share.shareXFiles(
        [XFile(file.path, name: filename)],
        text: 'Slip gaji tersedia',
        subject: filename,
      );
    } catch (e) {
      if (!context.mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Gagal export slip gaji: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  /// Check apakah PDF export tersedia
  static bool get isPdfExportAvailable => true;
}






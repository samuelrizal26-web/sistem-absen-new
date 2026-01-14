import 'package:flutter/foundation.dart';

/// Helper untuk conditional debug printing
/// Hanya print di debug mode, tidak akan muncul di release build
class DebugHelper {
  /// Print hanya di debug mode
  static void log(String message) {
    if (kDebugMode) {
      debugPrint(message);
    }
  }

  /// Print error (selalu muncul untuk error tracking)
  static void error(String message) {
    debugPrint('❌ ERROR: $message');
  }

  /// Print warning (selalu muncul untuk warning tracking)
  static void warning(String message) {
    debugPrint('⚠️ WARNING: $message');
  }

  /// Print info (hanya di debug mode)
  static void info(String message) {
    if (kDebugMode) {
      debugPrint('ℹ️ INFO: $message');
    }
  }
}







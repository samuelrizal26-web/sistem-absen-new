import 'package:flutter/material.dart';

/// Error types untuk kategorisasi error
enum ErrorType {
  api,
  bluetooth,
  printer,
  network,
  permission,
  unknown,
}

/// Error handler terpusat untuk semua jenis error di aplikasi
/// Semua error API, Bluetooth, dan Printer di-handle di sini
class ErrorHandler {
  /// Handle error dan return user-friendly message
  static String handleError(dynamic error, {ErrorType? type}) {
    final errorStr = error.toString().toLowerCase();
    
    // Auto-detect error type jika tidak disediakan
    if (type == null) {
      if (errorStr.contains('bluetooth') || 
          errorStr.contains('scan') || 
          errorStr.contains('connect') ||
          errorStr.contains('printer') ||
          errorStr.contains('terhubung')) {
        type = ErrorType.bluetooth;
      } else if (errorStr.contains('print') || 
                 errorStr.contains('cetak') ||
                 errorStr.contains('esc/pos')) {
        type = ErrorType.printer;
      } else if (errorStr.contains('network') || 
                 errorStr.contains('connection') ||
                 errorStr.contains('timeout') ||
                 errorStr.contains('internet')) {
        type = ErrorType.network;
      } else if (errorStr.contains('permission') || 
                 errorStr.contains('izin') ||
                 errorStr.contains('unauthorized')) {
        type = ErrorType.permission;
      } else if (errorStr.contains('api') || 
                 errorStr.contains('server') ||
                 errorStr.contains('404') ||
                 errorStr.contains('500')) {
        type = ErrorType.api;
      } else {
        type = ErrorType.unknown;
      }
    }
    
    // Handle berdasarkan type
    switch (type) {
      case ErrorType.api:
        return _handleApiError(error, errorStr);
      case ErrorType.bluetooth:
        return _handleBluetoothError(error, errorStr);
      case ErrorType.printer:
        return _handlePrinterError(error, errorStr);
      case ErrorType.network:
        return _handleNetworkError(error, errorStr);
      case ErrorType.permission:
        return _handlePermissionError(error, errorStr);
      case ErrorType.unknown:
        return _handleUnknownError(error, errorStr);
    }
  }
  
  /// Handle API errors
  static String _handleApiError(dynamic error, String errorStr) {
    if (errorStr.contains('404') || errorStr.contains('not found')) {
      return 'Data tidak ditemukan.';
    }
    if (errorStr.contains('401') || errorStr.contains('unauthorized')) {
      return 'Anda tidak memiliki izin untuk melakukan aksi ini.';
    }
    if (errorStr.contains('403') || errorStr.contains('forbidden')) {
      return 'Akses ditolak.';
    }
    if (errorStr.contains('500') || errorStr.contains('server')) {
      return 'Terjadi kesalahan pada server. Silakan coba lagi.';
    }
    if (errorStr.contains('timeout')) {
      return 'Waktu koneksi habis. Silakan coba lagi.';
    }
    
    // Try to extract detail from error
    final detailPattern = RegExp(r'detail[:\s]+([^,\n}]+)');
    final detailMatch = detailPattern.firstMatch(errorStr);
    if (detailMatch != null) {
      return detailMatch.group(1)?.trim() ?? 'Gagal melakukan operasi.';
    }
    
    return 'Gagal melakukan operasi. Silakan coba lagi.';
  }
  
  /// Handle Bluetooth errors
  static String _handleBluetoothError(dynamic error, String errorStr) {
    if (errorStr.contains('belum terhubung') || 
        errorStr.contains('not connected') ||
        errorStr.contains('disconnected')) {
      return 'Printer belum terhubung. Silakan pilih printer terlebih dahulu.';
    }
    if (errorStr.contains('scan') && errorStr.contains('kosong')) {
      return 'Tidak ada printer ditemukan. Pastikan printer dalam jangkauan dan Bluetooth aktif.';
    }
    if (errorStr.contains('pairing') || errorStr.contains('pair')) {
      return 'Printer belum di-pair. Silakan pair printer di Settings terlebih dahulu.';
    }
    if (errorStr.contains('permission') || errorStr.contains('izin')) {
      return 'Izin Bluetooth diperlukan. Silakan aktifkan di Settings.';
    }
    if (errorStr.contains('timeout')) {
      return 'Koneksi Bluetooth timeout. Pastikan printer dalam jangkauan.';
    }
    
    return 'Gagal menghubungkan ke printer. Pastikan printer aktif dan dalam jangkauan.';
  }
  
  /// Handle Printer errors
  static String _handlePrinterError(dynamic error, String errorStr) {
    if (errorStr.contains('sedang berlangsung') || 
        errorStr.contains('tunggu') ||
        errorStr.contains('busy')) {
      return 'Print sedang berlangsung. Silakan tunggu hingga selesai.';
    }
    if (errorStr.contains('timeout')) {
      return 'Print timeout. Pastikan printer dalam jangkauan dan coba lagi.';
    }
    if (errorStr.contains('sibuk') || errorStr.contains('buffer')) {
      return 'Printer sedang sibuk. Silakan tunggu sebentar dan coba lagi.';
    }
    if (errorStr.contains('kertas') || errorStr.contains('paper')) {
      return 'Printer kehabisan kertas atau kertas macet.';
    }
    if (errorStr.contains('image') || errorStr.contains('logo')) {
      return 'Gagal memproses gambar. Pastikan format gambar valid.';
    }
    
    // Extract original message jika ada
    final messagePattern = RegExp(r'error[:\s]+([^,\n}]+)');
    final messageMatch = messagePattern.firstMatch(errorStr);
    if (messageMatch != null) {
      return messageMatch.group(1)?.trim() ?? 'Gagal mencetak.';
    }
    
    return 'Gagal mencetak. Pastikan printer terhubung dan siap digunakan.';
  }
  
  /// Handle Network errors
  static String _handleNetworkError(dynamic error, String errorStr) {
    if (errorStr.contains('timeout')) {
      return 'Waktu koneksi habis. Periksa koneksi internet Anda.';
    }
    if (errorStr.contains('connection') || errorStr.contains('connect')) {
      return 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
    }
    if (errorStr.contains('no internet') || errorStr.contains('offline')) {
      return 'Tidak ada koneksi internet. Periksa koneksi Anda.';
    }
    
    return 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
  }
  
  /// Handle Permission errors
  static String _handlePermissionError(dynamic error, String errorStr) {
    if (errorStr.contains('bluetooth')) {
      return 'Izin Bluetooth diperlukan. Silakan aktifkan di Settings.';
    }
    if (errorStr.contains('location')) {
      return 'Izin Lokasi diperlukan untuk Bluetooth. Silakan aktifkan di Settings.';
    }
    
    return 'Izin diperlukan untuk melakukan operasi ini. Silakan aktifkan di Settings.';
  }
  
  /// Handle Unknown errors
  static String _handleUnknownError(dynamic error, String errorStr) {
    // Try to extract meaningful message
    final cleanError = error.toString()
        .replaceAll('Exception: ', '')
        .replaceAll('Error: ', '')
        .trim();
    
    if (cleanError.isNotEmpty && cleanError.length < 100) {
      return cleanError;
    }
    
    return 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.';
  }
  
  /// Show error snackbar dengan styling yang konsisten
  static void showError(
    BuildContext context,
    dynamic error, {
    ErrorType? type,
    Duration duration = const Duration(seconds: 4),
  }) {
    final message = handleError(error, type: type);
    final backgroundColor = _getErrorColor(type ?? ErrorType.unknown);
    
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: backgroundColor,
        duration: duration,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
  
  /// Get error color berdasarkan type
  static Color _getErrorColor(ErrorType type) {
    switch (type) {
      case ErrorType.api:
      case ErrorType.network:
        return Colors.red;
      case ErrorType.bluetooth:
      case ErrorType.printer:
        return Colors.orange;
      case ErrorType.permission:
        return Colors.amber.shade700;
      case ErrorType.unknown:
        return Colors.grey.shade700;
    }
  }
  
  /// Show success snackbar
  static void showSuccess(
    BuildContext context,
    String message, {
    Duration duration = const Duration(seconds: 2),
  }) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: Colors.green,
        duration: duration,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }
}

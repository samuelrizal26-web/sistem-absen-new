import 'package:flutter/services.dart';

/// TextInputFormatter untuk format angka dengan titik pemisah ribuan
/// Contoh: 1000000 -> 1.000.000
class ThousandsSeparatorInputFormatter extends TextInputFormatter {
  @override
  TextEditingValue formatEditUpdate(
    TextEditingValue oldValue,
    TextEditingValue newValue,
  ) {
    // Hapus semua karakter non-digit kecuali titik
    String text = newValue.text.replaceAll(RegExp(r'[^\d]'), '');
    
    if (text.isEmpty) {
      return newValue.copyWith(text: '');
    }
    
    // Format dengan pemisah ribuan (titik)
    String formatted = _formatWithSeparator(text);
    
    // Hitung posisi cursor baru
    int selectionIndex = formatted.length;
    
    return TextEditingValue(
      text: formatted,
      selection: TextSelection.collapsed(offset: selectionIndex),
    );
  }
  
  /// Format angka dengan pemisah ribuan (titik)
  String _formatWithSeparator(String value) {
    if (value.isEmpty) return '';
    
    // Balik string untuk memudahkan penambahan titik
    String reversed = value.split('').reversed.join();
    String formatted = '';
    
    for (int i = 0; i < reversed.length; i++) {
      if (i > 0 && i % 3 == 0) {
        formatted += '.';
      }
      formatted += reversed[i];
    }
    
    // Balik kembali
    return formatted.split('').reversed.join();
  }
  
  /// Parse string dengan pemisah ribuan menjadi integer
  static int? parseToInt(String value) {
    if (value.isEmpty) return null;
    final cleaned = value.replaceAll('.', '');
    return int.tryParse(cleaned);
  }
  
  /// Parse string dengan pemisah ribuan menjadi double
  static double? parseToDouble(String value) {
    if (value.isEmpty) return null;
    final cleaned = value.replaceAll('.', '');
    return double.tryParse(cleaned);
  }
  
  /// Format angka menjadi string dengan pemisah ribuan
  static String formatNumber(num value) {
    if (value == 0) return '0';
    
    final isNegative = value < 0;
    final absValue = value.abs();
    
    // Format dengan pemisah ribuan
    String str = absValue.toStringAsFixed(0);
    String reversed = str.split('').reversed.join();
    String formatted = '';
    
    for (int i = 0; i < reversed.length; i++) {
      if (i > 0 && i % 3 == 0) {
        formatted += '.';
      }
      formatted += reversed[i];
    }
    
    formatted = formatted.split('').reversed.join();
    
    return isNegative ? '-$formatted' : formatted;
  }
  
  /// Format angka menjadi string dengan pemisah ribuan dan desimal
  static String formatNumberWithDecimal(double value, {int decimalPlaces = 2}) {
    if (value == 0) return '0';
    
    final isNegative = value < 0;
    final absValue = value.abs();
    
    // Pisahkan bagian integer dan desimal
    final parts = absValue.toStringAsFixed(decimalPlaces).split('.');
    final integerPart = parts[0];
    final decimalPart = parts.length > 1 ? parts[1] : '';
    
    // Format bagian integer dengan pemisah ribuan
    String reversed = integerPart.split('').reversed.join();
    String formatted = '';
    
    for (int i = 0; i < reversed.length; i++) {
      if (i > 0 && i % 3 == 0) {
        formatted += '.';
      }
      formatted += reversed[i];
    }
    
    formatted = formatted.split('').reversed.join();
    
    // Gabungkan dengan bagian desimal
    if (decimalPart.isNotEmpty && decimalPart != '00') {
      formatted += ',$decimalPart';
    }
    
    return isNegative ? '-$formatted' : formatted;
  }
}






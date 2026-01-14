/// Constants untuk error messages yang sering digunakan
/// Memastikan konsistensi error messages di seluruh aplikasi
class ErrorMessages {
  // Clock-in/Clock-out errors
  static const String clockInFailed = 'Gagal melakukan clock in';
  static const String clockOutFailed = 'Gagal melakukan clock out';
  static const String clockActionFailed = 'Gagal melakukan aksi absensi';
  static const String clockStatusCheckFailed = 'Gagal memeriksa status absensi';
  
  // Employee errors
  static const String fetchEmployeesFailed = 'Gagal memuat data karyawan';
  static const String addEmployeeFailed = 'Gagal menambahkan crew';
  static const String updateEmployeeFailed = 'Gagal memperbarui crew';
  static const String deleteEmployeeFailed = 'Gagal menghapus crew';
  static const String employeeDetailFailed = 'Gagal memuat detail karyawan';
  
  // Cashflow errors
  static const String saveCashflowFailed = 'Gagal menyimpan cashflow';
  static const String updateCashflowFailed = 'Gagal memperbarui cashflow';
  static const String deleteCashflowFailed = 'Gagal menghapus cashflow';
  static const String fetchCashflowFailed = 'Gagal memuat data cashflow';
  
  // Print job errors
  static const String fetchPrintJobsFailed = 'Gagal memuat pekerjaan printing';
  static const String updatePrintJobFailed = 'Gagal memperbarui pekerjaan';
  static const String deletePrintJobFailed = 'Gagal menghapus pekerjaan';
  
  // Stock errors
  static const String fetchStockFailed = 'Gagal memuat data stok';
  static const String addStockFailed = 'Gagal menambahkan stok';
  static const String updateStockFailed = 'Gagal memperbarui stok';
  static const String deleteStockFailed = 'Gagal menghapus stok';
  
  // Project errors
  static const String fetchProjectsFailed = 'Gagal memuat data project';
  static const String addProjectFailed = 'Gagal menambahkan project';
  static const String updateProjectFailed = 'Gagal memperbarui project';
  static const String deleteProjectFailed = 'Gagal menghapus project';
  
  // General errors
  static const String networkError = 'Gagal terhubung ke server. Periksa koneksi internet Anda.';
  static const String serverError = 'Terjadi kesalahan pada server. Silakan coba lagi.';
  static const String unknownError = 'Terjadi kesalahan yang tidak diketahui. Silakan coba lagi.';
  static const String parseError = 'Gagal memproses data dari server';
  
  // Helper untuk mendapatkan error message dari API response
  static String getApiErrorMessage(Map<String, dynamic> errorResponse, String defaultMessage) {
    return errorResponse['detail']?.toString() ?? defaultMessage;
  }
  
  // Helper untuk mendapatkan user-friendly error message
  static String getUserFriendlyError(dynamic error) {
    final errorStr = error.toString().toLowerCase();
    
    if (errorStr.contains('network') || errorStr.contains('connection')) {
      return networkError;
    }
    
    if (errorStr.contains('timeout')) {
      return 'Waktu koneksi habis. Silakan coba lagi.';
    }
    
    if (errorStr.contains('404') || errorStr.contains('not found')) {
      return 'Data tidak ditemukan.';
    }
    
    if (errorStr.contains('401') || errorStr.contains('unauthorized')) {
      return 'Anda tidak memiliki izin untuk melakukan aksi ini.';
    }
    
    if (errorStr.contains('500') || errorStr.contains('server')) {
      return serverError;
    }
    
    // Return original error message jika tidak match dengan pattern di atas
    return error.toString();
  }
}







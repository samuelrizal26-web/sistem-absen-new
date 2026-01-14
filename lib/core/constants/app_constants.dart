/// Application-wide constants
class AppConstants {
  // App info
  static const String appName = 'LB.ADV Absensi';
  static const String appVersion = '2.0.0';
  
  // API
  static const String apiBaseUrl = 'https://sistem-absen-production.up.railway.app/api';
  
  // SharedPreferences keys
  static const String printerMacKey = 'printer_mac';
  static const String printerNameKey = 'printer_name';
  static const String contactPhoneKey = 'struk_contact_phone';
  static const String contactWebsiteKey = 'struk_contact_website';
  static const String contactInstagramKey = 'struk_contact_instagram';
  
  // Default contact info
  static const String defaultPhone = '085740280800';
  static const String defaultWebsite = 'www.labalabaa.com';
  static const String defaultInstagram = 'labalabaadv';
  
  // Printer settings
  static const int printerLabelWidth = 14;
  static const int printerWidth58mm = 384;
  static const int printerWidth80mm = 576;
  
  // Timeouts
  static const Duration scanTimeout = Duration(seconds: 10);
  static const Duration connectionTimeout = Duration(seconds: 5);
  static const Duration printTimeout = Duration(seconds: 30);
}

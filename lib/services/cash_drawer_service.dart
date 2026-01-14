import 'package:sistem_absen_flutter_v2/services/printer/bluetooth_printer_service.dart';

class CashDrawerService {
  /// Open the physical cash drawer if connected.
  /// Reuses the Bluetooth printer service's cash drawer command.
  static Future<bool> open() async {
    try {
      await BluetoothPrinterService.instance.openCashdrawer();
      return true;
    } catch (e) {
      print('⚠️ Cash drawer open failed: $e');
      return false;
    }
  }
}


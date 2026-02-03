import 'dart:developer';

import 'package:sistem_absen_flutter_v2/services/printer/bluetooth_printer_service.dart';

class PrintAndCashDrawerResult {
  final bool printed;
  final bool drawerAttempted;
  final bool drawerOpened;
  final Object? drawerError;
  final StackTrace? drawerStackTrace;

  const PrintAndCashDrawerResult({
    required this.printed,
    required this.drawerAttempted,
    required this.drawerOpened,
    this.drawerError,
    this.drawerStackTrace,
  });
}

Future<PrintAndCashDrawerResult> handlePrintAndCashDrawer({
  required BluetoothPrinterService printerService,
  required Map<String, dynamic> printJobData,
  required String formatDate,
  required String formatDateTime,
  required String formatMaterial,
  required double totalPekerjaan,
  required bool openDrawer,
}) async {
  await printerService.printStruk(
    printJobData: printJobData,
    formatDate: formatDate,
    formatDateTime: formatDateTime,
    formatMaterial: formatMaterial,
    totalPekerjaan: totalPekerjaan,
  );

  if (!openDrawer) {
    return const PrintAndCashDrawerResult(
      printed: true,
      drawerAttempted: false,
      drawerOpened: false,
    );
  }

  try {
    await printerService.openCashdrawer();
    return const PrintAndCashDrawerResult(
      printed: true,
      drawerAttempted: true,
      drawerOpened: true,
    );
  } catch (e, s) {
    log(
      'openCashDrawer failed',
      error: e,
      stackTrace: s,
    );
    return PrintAndCashDrawerResult(
      printed: true,
      drawerAttempted: true,
      drawerOpened: false,
      drawerError: e,
      drawerStackTrace: s,
    );
  }
}


import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import 'package:sistem_absen_flutter_v2/models/employee.dart';

class ApiService {
  static const String _baseUrl =
      'https://sistem-absen-production.up.railway.app/api';
  static String get baseUrl => _baseUrl;

  static Uri _uri(String path, [Map<String, dynamic>? queryParameters]) {
    return Uri.parse(
      '$_baseUrl$path',
    ).replace(queryParameters: queryParameters);
  }

  static Future<List<Employee>> fetchEmployees({
    bool onlyActive = false,
  }) async {
    final response = await http.get(
      _uri('/employees', onlyActive ? {'status': 'active'} : null),
    );

    if (response.statusCode == 200) {
      debugPrint('FETCH EMPLOYEES RESPONSE: ${response.body}');
      final List<dynamic> data = jsonDecode(response.body);
      return data.map((e) => Employee.fromJson(e)).toList();
    }
    throw Exception('Gagal memuat data karyawan');
  }

  static Future<Map<String, dynamic>> fetchDashboardStats() async {
    final response = await http.get(_uri('/stats/dashboard'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('Gagal memuat statistik dashboard');
  }

  static Future<Map<String, double>> fetchEmployeeAdvances() async {
    final response = await http.get(_uri('/advances/all'));
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      final Map<String, double> result = {};
      for (final item in data) {
        final id = item['employee_id'] as String?;
        final amount = (item['amount'] as num?)?.toDouble() ?? 0;
        if (id == null) continue;
        result.update(id, (value) => value + amount, ifAbsent: () => amount);
      }
      return result;
    }
    throw Exception('Gagal memuat data kasbon');
  }

  static Future<List<Map<String, dynamic>>> fetchPayrollPeriods() async {
    final response = await http.get(_uri('/payroll-periods'));
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    }
    throw Exception('Gagal memuat daftar periode payroll');
  }

  static Future<Map<String, dynamic>> fetchPayrollPeriodDetail(
    String periodId,
  ) async {
    final response = await http.get(_uri('/payroll-periods/$periodId'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    final error = _safeDecode(response.body);
    throw Exception(error['detail'] ?? 'Gagal memuat detail periode payroll');
  }

  static Future<Map<String, dynamic>> fetchPayrollSlip({
    required String periodId,
    required String employeeId,
  }) async {
    final response = await http.get(
      _uri('/payroll-periods/$periodId/slip/$employeeId'),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    final error = _safeDecode(response.body);
    throw Exception(error['detail'] ?? 'Gagal memuat slip payroll');
  }

  static Future<List<Map<String, dynamic>>>
  fetchExportablePayrollPeriods() async {
    final response = await http.get(_uri('/payroll-periods'));
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    }
    throw Exception('Gagal memuat periode exportable');
  }

  static Future<Uint8List> downloadPayrollSlipPdf({
    required String periodId,
    required String employeeId,
  }) async {
    final response = await http.get(
      _uri('/payroll-periods/$periodId/slip/$employeeId/pdf'),
    );
    if (response.statusCode == 200) {
      return response.bodyBytes;
    }
    final error = _safeDecode(response.body);
    throw Exception(error['detail'] ?? 'Gagal mengunduh slip payroll');
  }

  static Future<void> deductKasbon({
    required String kasbonId,
    required String employeeId,
    required int amount,
    String? note,
  }) async {
    final payload = <String, dynamic>{
      'kasbon_id': kasbonId,
      'employee_id': employeeId,
      'amount': amount,
      if (note != null && note.isNotEmpty) 'note': note,
    };
    final response = await http.post(
      _uri('/advances/deduct'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (response.statusCode != 200) {
      final error = _safeDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal memotong kasbon');
    }
  }

  static Future<void> createEmployee(Map<String, dynamic> body) async {
    final response = await http.post(
      _uri('/employees'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal menambahkan crew');
    }
  }

  static Future<void> updateEmployee(
    String employeeId,
    Map<String, dynamic> body,
  ) async {
    debugPrint('UPDATE EMPLOYEE PAYLOAD: ${jsonEncode(body)}');
    final response = await http.put(
      _uri('/employees/$employeeId'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    debugPrint('UPDATE EMPLOYEE RESPONSE: ${response.body}');
    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal memperbarui crew');
    }
  }

  static Future<void> deleteEmployee(String employeeId) async {
    final response = await http.delete(_uri('/employees/$employeeId'));
    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal menghapus crew');
    }
  }

  static Future<void> deleteEmployeePermanent(String employeeId) async {
    final response = await http.delete(_uri('/employees/$employeeId/force'));
    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal menghapus permanen crew');
    }
  }

  // PROJECTS ------------------------------------------------------------------
  static Future<List<Map<String, dynamic>>> fetchProjects() async {
    final response = await http.get(_uri('/projects'));
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    }
    final error = _safeDecode(response.body);
    throw Exception(error['detail'] ?? 'Gagal memuat data project');
  }

  static Future<Map<String, dynamic>> fetchProjectDetail(
    String projectId,
  ) async {
    final response = await http.get(_uri('/projects/$projectId'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    final error = _safeDecode(response.body);
    throw Exception(error['detail'] ?? 'Gagal memuat detail project');
  }

  static Future<Map<String, dynamic>> createProject(
    Map<String, dynamic> body,
  ) async {
    final response = await http.post(
      _uri('/projects'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    final error = _safeDecode(response.body);
    throw Exception(error['detail'] ?? 'Gagal menambahkan project');
  }

  static Future<Map<String, dynamic>> updateProject(
    String projectId,
    Map<String, dynamic> body,
  ) async {
    final response = await http.put(
      _uri('/projects/$projectId'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    final error = _safeDecode(response.body);
    throw Exception(error['detail'] ?? 'Gagal memperbarui project');
  }

  static Future<void> deleteProject(String projectId) async {
    final response = await http.delete(_uri('/projects/$projectId'));
    if (response.statusCode != 200) {
      final error = _safeDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal menghapus project');
    }
  }

  // ONLY LAYER (delegasi ke method utama)
  static Future<List<Map<String, dynamic>>> fetchProjectsOnly() {
    return fetchProjects();
  }

  static Future<Map<String, dynamic>> createProjectOnly(
    Map<String, dynamic> body,
  ) {
    return createProject(body);
  }

  static Future<Map<String, dynamic>> updateProjectOnly(
    String projectId,
    Map<String, dynamic> body,
  ) {
    return updateProject(projectId, body);
  }

  static Future<void> deleteProjectOnly(String projectId) {
    return deleteProject(projectId);
  }

  // STOCK --------------------------------------------------------------------
  static Future<List<Map<String, dynamic>>> fetchStock() async {
    final response = await http.get(_uri('/stock'));
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    }
    throw Exception('Gagal memuat data stok');
  }

  static Future<List<Map<String, dynamic>>> fetchStocks({
    bool onlyActive = false,
  }) async {
    final allStock = await fetchStock();
    if (!onlyActive) return allStock;
    return allStock.where((stock) {
      final activeFlag = stock['is_active'] ?? stock['active'];
      if (activeFlag is bool) {
        return activeFlag;
      }
      final status = stock['status']?.toString().toLowerCase() ?? '';
      if (status.isNotEmpty) {
        return status == 'active';
      }
      return true;
    }).toList();
  }

  static Future<void> createStock(Map<String, dynamic> body) async {
    final response = await http.post(
      _uri('/stock'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal menambah stok');
    }
  }

  static Future<void> updateStock({
    required String stockId,
    required double quantity,
    required String type,
    String? usageCategory,
  }) async {
    final payload = <String, dynamic>{
      'quantity': quantity,
      'type': type,
      if (usageCategory != null) 'usage_category': usageCategory,
    };
    await _updateStockRecord(stockId, payload);
  }

  static Future<void> updateStockUsageCategory({
    required String stockId,
    required String usageCategory,
  }) async {
    final payload = <String, dynamic>{'usage_category': usageCategory};
    await _updateStockRecord(stockId, payload);
  }

  static Future<void> _updateStockRecord(
    String stockId,
    Map<String, dynamic> body,
  ) async {
    final response = await http.put(
      _uri('/stock/$stockId'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal memperbarui stok');
    }
  }

  static Future<void> deleteStock(String stockId) async {
    final response = await http.delete(_uri('/stock/$stockId'));
    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal menghapus stok');
    }
  }

  static Future<void> consumeStock(
    String stockId,
    double quantity, {
    String source = 'print',
    String? refId,
  }) async {
    final body = <String, dynamic>{
      'quantity': quantity,
      'source': source,
      if (refId != null && refId.isNotEmpty) 'ref_id': refId,
    };

    final response = await http.post(
      _uri('/stock/$stockId/consume'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (response.statusCode != 200) {
      final error = _safeDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal mengurangi stok');
    }
  }

  // CASHFLOW -----------------------------------------------------------------
  static Future<void> createCashflow(Map<String, dynamic> body) async {
    final response = await http.post(
      _uri('/cashflow'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal menyimpan cashflow');
    }
  }

  static Future<void> updateCashflow(
    String id,
    Map<String, dynamic> body,
  ) async {
    final response = await http.put(
      _uri('/cashflow/$id'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal memperbarui cashflow');
    }
  }

  static Future<List<Map<String, dynamic>>> fetchKasbon() async {
    final response = await http.get(_uri('/advances'));
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    }
    throw Exception('Gagal memuat data kasbon');
  }

  static Future<void> createKasbon({
    required String employeeId,
    required int amount,
    required String payment_method,
    String? note,
  }) async {
    final payload = <String, dynamic>{
      'employee_id': employeeId,
      'amount': amount,
      'payment_method': payment_method,
      if (note != null && note.isNotEmpty) 'reason': note,
    };
    final response = await http.post(
      _uri('/advances'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );
    if (response.statusCode != 200) {
      final error = _safeDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal menambahkan kasbon');
    }
  }

  static Future<List<Map<String, dynamic>>> fetchCashflow() async {
    final response = await http.get(_uri('/cashflow'));
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    }
    throw Exception('Gagal memuat data cashflow');
  }

  static Future<Map<String, dynamic>> fetchCashflowSummary() async {
    final response = await http.get(_uri('/cashflow/summary'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    throw Exception('Gagal memuat ringkasan cashflow');
  }

  static Future<void> deleteCashflow(String id) async {
    final response = await http.delete(_uri('/cashflow/$id'));
    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal menghapus cashflow');
    }
  }

  // PRINT JOBS ---------------------------------------------------------------
  static Future<List<Map<String, dynamic>>> fetchPrintJobs() async {
    final response = await http.get(_uri('/print-jobs'));
    if (response.statusCode == 200) {
      final List<dynamic> data = jsonDecode(response.body);
      return data.cast<Map<String, dynamic>>();
    }
    throw Exception('Gagal memuat pekerjaan printing');
  }

  static Future<Map<String, dynamic>> fetchPrintJobsSummary({
    String? start,
    String? end,
  }) async {
    final query = <String, dynamic>{};
    if (start != null) query['start'] = start;
    if (end != null) query['end'] = end;
    final response = await http.get(query.isEmpty ? _uri('/print-jobs/summary') : _uri('/print-jobs/summary', query));
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    final error = _safeDecode(response.body);
    throw Exception(error['detail'] ?? 'Gagal memuat summary pekerjaan printing');
  }

  static Future<Map<String, dynamic>> checkStockForMaterial(
    String material,
  ) async {
    final response = await http.get(_uri('/print-jobs/check-stock/$material'));
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    final error = _safeDecode(response.body);
    throw Exception(error['detail'] ?? 'Gagal memeriksa stok bahan');
  }

  static Future<Map<String, dynamic>> createPrintJob(
    Map<String, dynamic> body,
  ) async {
    final response = await http.post(
      _uri('/print-jobs'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(body),
    );
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    final error = _safeDecode(response.body);
    throw Exception(error['detail'] ?? response.body);
  }

  static Future<void> deletePrintJob(String id) async {
    final response = await http.delete(_uri('/print-jobs/$id'));
    if (response.statusCode != 200) {
      final error = jsonDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal menghapus pekerjaan');
    }
  }

  // ADMIN SETTINGS -----------------------------------------------------------
  static Future<void> setupAdminPin(String newPin) async {
    final response = await http.post(
      _uri('/auth/admin-pin/setup'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'pin': newPin}),
    );
    if (response.statusCode != 200) {
      final error = _safeDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal mengatur PIN admin');
    }
  }

  static Future<void> changeAdminPin(String oldPin, String newPin) async {
    final response = await http.post(
      _uri('/auth/admin-pin/change'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'old_pin': oldPin, 'new_pin': newPin}),
    );
    if (response.statusCode != 200) {
      final error = _safeDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal mengganti PIN admin');
    }
  }

  // EMPLOYEE DETAIL ----------------------------------------------------------
  static Future<Map<String, dynamic>> fetchEmployeeDetail(
    String employeeId,
  ) async {
    debugPrint('FETCH EMPLOYEE DETAIL CALLED: $employeeId');

    final employeeRes = await http.get(_uri('/employees/$employeeId'));
    debugPrint('EMPLOYEE STATUS: ${employeeRes.statusCode}');
    if (employeeRes.statusCode != 200) {
      throw Exception('Employee tidak ditemukan');
    }

    final result = <String, dynamic>{};
    result['employee'] = jsonDecode(employeeRes.body);

    try {
      final attendanceRes = await http.get(
        _uri('/attendance/employee/$employeeId'),
      );
      debugPrint('ATTENDANCE STATUS: ${attendanceRes.statusCode}');
      if (attendanceRes.statusCode == 200) {
        final attendanceList = jsonDecode(attendanceRes.body) as List<dynamic>;
        await ensureAutoClockOut(employeeId, attendanceList);
        result['attendance'] = attendanceList;
      } else {
        result['attendance'] = [];
      }
    } catch (e) {
      debugPrint('ATTENDANCE ERROR: $e');
      result['attendance'] = [];
    }

    try {
      final advancesRes = await http.get(
        _uri('/advances/employee/$employeeId'),
      );
      debugPrint('ADVANCES STATUS: ${advancesRes.statusCode}');
      if (advancesRes.statusCode == 200) {
        result['advances'] = jsonDecode(advancesRes.body);
      } else {
        result['advances'] = [];
      }
    } catch (e) {
      debugPrint('ADVANCES ERROR: $e');
      result['advances'] = [];
    }

    try {
      final summaryRes = await http.get(
        _uri('/attendance/daily-summary/$employeeId'),
      );
      debugPrint('SUMMARY STATUS: ${summaryRes.statusCode}');
      if (summaryRes.statusCode == 200) {
        result['summary'] = jsonDecode(summaryRes.body);
      } else {
        result['summary'] = {'total_salary': 0, 'total_days': 0};
      }
    } catch (e) {
      debugPrint('SUMMARY ERROR: $e');
      result['summary'] = {'total_salary': 0, 'total_days': 0};
    }

    debugPrint('FETCH EMPLOYEE DETAIL RESPONSE: $result');
    return result;
  }

  static Future<Map<String, dynamic>> fetchDailySalarySummary(
    String employeeId,
  ) async {
    final response = await http.get(
      _uri('/attendance/daily-summary/$employeeId'),
    );
    if (response.statusCode == 200) {
      return jsonDecode(response.body) as Map<String, dynamic>;
    }
    final error = _safeDecode(response.body);
    throw Exception(error['detail'] ?? 'Gagal memuat ringkasan harian');
  }

  static Uri employeePdfUrl(String employeeId) {
    return Uri.parse('$_baseUrl/attendance/$employeeId/export');
  }

  static Future<void> ensureAutoClockOut(
    String employeeId,
    List<dynamic> attendances,
  ) async {
    final now = DateTime.now();
    final targetTime = DateTime(now.year, now.month, now.day, 21);
    if (now.isBefore(targetTime)) return;

    final todayKey =
        '${targetTime.year.toString().padLeft(4, '0')}-${targetTime.month.toString().padLeft(2, '0')}-${targetTime.day.toString().padLeft(2, '0')}';

    Map<String, dynamic>? todayRecord;
    for (final entry in attendances) {
      if (entry is Map<String, dynamic>) {
        final entryDate = entry['date']?.toString();
        if (entryDate == todayKey) {
          todayRecord = entry;
          break;
        }
      }
    }
    if (todayRecord == null) return;

    final hasClockIn =
        todayRecord['clock_in'] != null &&
        todayRecord['clock_in'].toString().isNotEmpty;
    final hasClockOut =
        todayRecord['clock_out'] != null &&
        todayRecord['clock_out'].toString().isNotEmpty;
    final alreadyAuto =
        todayRecord['auto_clockout'] == true ||
        (todayRecord['status']?.toString().toLowerCase() == 'selesai (auto)');
    if (!hasClockIn || hasClockOut || alreadyAuto) return;

    final payload = <String, dynamic>{
      'employee_id': employeeId,
      'clock_out': targetTime.toIso8601String(),
      'auto_clockout': true,
      'status': 'Selesai (Auto)',
    };

    final response = await http.post(
      _uri('/attendance/clock-out'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode(payload),
    );

    if (response.statusCode != 200) {
      final error = _safeDecode(response.body);
      throw Exception(error['detail'] ?? 'Gagal menyimpan auto clock-out');
    }

    todayRecord['clock_out'] = targetTime.toIso8601String();
    todayRecord['status'] = 'Selesai (Auto)';
    todayRecord['auto_clockout'] = true;
  }

  static Map<String, dynamic> _safeDecode(String body) {
    try {
      return jsonDecode(body) as Map<String, dynamic>;
    } catch (_) {
      return {'detail': body};
    }
  }
}

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:intl/intl.dart';
import 'dart:convert';

import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

class HistoryTabView extends StatefulWidget {
  final String employeeId;
  final DateTime activePeriod;
  final bool isReadOnly;

  const HistoryTabView({
    super.key,
    required this.employeeId,
    required this.activePeriod,
    required this.isReadOnly,
  });

  @override
  State<HistoryTabView> createState() => _HistoryTabViewState();
}

class _HistoryTabViewState extends State<HistoryTabView> {
  Future<Map<String, List<dynamic>>>? _historyData;

  @override
  void initState() {
    super.initState();
    _historyData = _fetchHistory();
  }

  Future<Map<String, List<dynamic>>> _fetchHistory() async {
    final attendanceResponse = await http.get(
      Uri.parse('https://sistem-absen-production.up.railway.app/api/attendance/employee/${widget.employeeId}'),
    );
    if (attendanceResponse.statusCode != 200) {
      throw Exception('Failed to load attendance data');
    }

    final List<dynamic> attendances = json.decode(attendanceResponse.body);
    await ApiService.ensureAutoClockOut(widget.employeeId, attendances);

    final advancesResponse = await http.get(
      Uri.parse('https://sistem-absen-production.up.railway.app/api/advances/employee/${widget.employeeId}'),
    );
    if (advancesResponse.statusCode != 200) {
      throw Exception('Failed to load kasbon data');
    }

    final List<dynamic> advances = json.decode(advancesResponse.body);

    attendances.sort((a, b) => b['date'].compareTo(a['date']));
    advances.sort((a, b) => b['date'].compareTo(a['date']));

    return {'attendances': attendances, 'advances': advances};
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Map<String, List<dynamic>>>(
      future: _historyData,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (snapshot.hasError) {
          return Center(child: Text('Error: ${snapshot.error}'));
        }

        if (!snapshot.hasData || (snapshot.data!['attendances']!.isEmpty && snapshot.data!['advances']!.isEmpty)) {
          return const Center(child: Text('Belum ada riwayat.'));
        }

        final attendances = snapshot.data!['attendances']!;
        final advances = snapshot.data!['advances']!;
        final filteredAttendances = _filterByPeriod(attendances, widget.activePeriod);
        final filteredAdvances = _filterByPeriod(advances, widget.activePeriod);

        return ListView(
          padding: const EdgeInsets.all(16.0),
          children: [
            _buildSectionTitle('Periode', Icons.date_range),
            Text(
              '${DateFormat('MMMM yyyy', 'id_ID').format(widget.activePeriod)} ${widget.isReadOnly ? '(Mode Baca)' : ''}',
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 16),
            _buildSectionTitle('Riwayat Absensi', Icons.calendar_today),
            _buildAttendanceList(filteredAttendances),
            const SizedBox(height: 24),
            _buildSectionTitle('Riwayat Kasbon', Icons.money),
            _buildAdvancesList(filteredAdvances),
          ],
        );
      },
    );
  }

  Widget _buildSectionTitle(String title, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8.0),
      child: Row(
        children: [
          Icon(icon, color: Colors.black54, size: 20),
          const SizedBox(width: 8),
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        ],
      ),
    );
  }

  Widget _buildAttendanceList(List<dynamic> items) {
    if (items.isEmpty) return const Text('Tidak ada riwayat absensi.');
    return Column(
      children: items.map((item) => Card(
        margin: const EdgeInsets.symmetric(vertical: 4.0),
        child: ListTile(
          leading: const Icon(Icons.calendar_today, color: Colors.blueAccent),
          title: Text('Tanggal: ${item['date']}'),
          subtitle: Text('Masuk: ${item['clock_in'] ?? '-'} | Keluar: ${item['clock_out'] ?? '-'}'),
          trailing: Text('${item['work_hours']?.toStringAsFixed(1) ?? '0'} jam', style: const TextStyle(fontWeight: FontWeight.bold)),
        ),
      )).toList(),
    );
  }

  Widget _buildAdvancesList(List<dynamic> items) {
    if (items.isEmpty) return const Text('Tidak ada riwayat kasbon.');
    return Column(
      children: items.map((item) => Card(
        margin: const EdgeInsets.symmetric(vertical: 4.0),
        child: ListTile(
          leading: const Icon(Icons.attach_money, color: Colors.green),
          title: Text('Rp ${item['amount']}'),
          subtitle: Text(item['notes'] ?? 'Tanpa catatan'),
          trailing: Text(item['date'] ?? '--'),
        ),
      )).toList(),
    );
  }

  List<dynamic> _filterByPeriod(List<dynamic> items, DateTime period) {
    return items.where((entry) {
      final date = _parseEntryDate(entry);
      if (date == null) return false;
      return date.year == period.year && date.month == period.month;
    }).toList();
  }

  DateTime? _parseEntryDate(dynamic entry) {
    if (entry is Map<String, dynamic>) {
      final raw = entry['date'] ?? entry['created_at'];
      if (raw == null) return null;
      final text = raw.toString();
      final clean = text.contains('T') ? text.split('T').first : text.split(' ').first;
      return DateTime.tryParse(clean);
    }
    return null;
  }
}






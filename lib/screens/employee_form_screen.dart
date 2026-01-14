import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

import 'package:sistem_absen_flutter_v2/models/employee.dart';

class EmployeeFormScreen extends StatefulWidget {
  final Employee? employee;

  const EmployeeFormScreen({super.key, this.employee});

  @override
  State<EmployeeFormScreen> createState() => _EmployeeFormScreenState();
}

class _EmployeeFormScreenState extends State<EmployeeFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _whatsappController = TextEditingController();
  final _pinController = TextEditingController();
  final _birthdateController = TextEditingController();
  final _birthplaceController = TextEditingController();
  final _positionController = TextEditingController();
  final _monthlySalaryController = TextEditingController();
  final _workHoursController = TextEditingController();

  String? _selectedStatusCrew;
  String? _selectedStatus;
  bool _isSubmitting = false;
  DateTime? _selectedDate;
  late bool _isEditMode;

  final List<String> _statusCrewOptions = ['Tetap', 'Freelancer'];
  final List<String> _statusOptions = ['active', 'inactive'];

  @override
  void initState() {
    super.initState();
    _isEditMode = widget.employee != null;

    if (_isEditMode) {
      final emp = widget.employee!;
      _nameController.text = emp.name;
      _whatsappController.text = emp.whatsapp ?? '';
      _birthplaceController.text = emp.birthplace ?? '';
      _birthdateController.text = emp.birthdate ?? '';
      _positionController.text = emp.position ?? '';
      _monthlySalaryController.text = emp.monthlySalary?.toStringAsFixed(0) ?? '';
      _workHoursController.text = emp.workHoursPerDay?.toStringAsFixed(0) ?? '';
      
      if (emp.statusCrew != null && _statusCrewOptions.contains(emp.statusCrew)) {
        _selectedStatusCrew = emp.statusCrew;
      }
      if (emp.status != null && _statusOptions.contains(emp.status)) {
        _selectedStatus = emp.status;
      }
      
      if (emp.birthdate != null && emp.birthdate!.isNotEmpty) {
        _selectedDate = DateTime.tryParse(emp.birthdate!);
      }
    }
  }

  Future<void> _selectDate(BuildContext context) async {
    final DateTime? picked = await showDatePicker(context: context, initialDate: _selectedDate ?? DateTime.now(), firstDate: DateTime(1950), lastDate: DateTime.now());
    if (picked != null && picked != _selectedDate) {
      setState(() {
        _selectedDate = picked;
        _birthdateController.text = "${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}";
      });
    }
  }

  Future<void> _saveEmployee() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _isSubmitting = true; });

    try {
      http.Response response;
      final headers = {'Content-Type': 'application/json'};
      Map<String, dynamic> requestBody = {
        'name': _nameController.text,
        'whatsapp': _whatsappController.text,
        'birthplace': _birthplaceController.text,
        'birthdate': _birthdateController.text,
        'position': _positionController.text,
        'status_crew': _selectedStatusCrew,
        'monthly_salary': double.tryParse(_monthlySalaryController.text) ?? 0,
        'work_hours_per_day': double.tryParse(_workHoursController.text) ?? 8,
        'status': _selectedStatus ?? 'active',
      };

      if (_pinController.text.isNotEmpty) {
        requestBody['pin'] = _pinController.text;
      }

      final body = json.encode(requestBody);

      if (_isEditMode) {
        final url = Uri.parse('https://sistem-absen-production.up.railway.app/api/employees/${widget.employee!.employeeId}');
        response = await http.put(url, headers: headers, body: body);
      } else {
        final url = Uri.parse('https://sistem-absen-production.up.railway.app/api/employees');
        response = await http.post(url, headers: headers, body: body);
      }

      if (!mounted) return;

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Data karyawan berhasil disimpan'), backgroundColor: Colors.green));
        Navigator.of(context).pop(true);
      } else {
        final errorBody = json.decode(response.body);
        throw Exception(errorBody['detail'] ?? 'Gagal menyimpan data');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
    } finally {
      if (mounted) setState(() { _isSubmitting = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(_isEditMode ? 'Edit Crew' : 'Tambah Anggota Crew Baru')),
      body: SingleChildScrollView(padding: const EdgeInsets.all(24.0), child: Form(key: _formKey, child: Column(children: [
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: _buildTextField(_nameController, 'Nama Lengkap', 'Nama Karyawan')), const SizedBox(width: 16), Expanded(child: _buildTextField(_whatsappController, 'Nomor WA', '0812...', keyboardType: TextInputType.phone))]),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: _buildTextField(_pinController, 'PIN (6 Digit)', _isEditMode ? 'Kosongkan jika tidak ganti' : 'PIN untuk absensi', keyboardType: TextInputType.number, maxLength: 6, isRequired: !_isEditMode)), const SizedBox(width: 16), Expanded(child: _buildTextField(_birthdateController, 'Tanggal Lahir', 'Pilih Tanggal', readOnly: true, onTap: () => _selectDate(context), suffixIcon: Icons.calendar_today))]),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: _buildTextField(_birthplaceController, 'Tempat Lahir', 'Contoh: Jakarta')), const SizedBox(width: 16), Expanded(child: _buildDropdownField('Status Crew', _selectedStatusCrew, _statusCrewOptions, (val) => setState(() => _selectedStatusCrew = val)))]),
        _buildTextField(_positionController, 'Posisi/Jabatan', 'Contoh: Desainer Grafis'),
        Row(crossAxisAlignment: CrossAxisAlignment.start, children: [Expanded(child: _buildTextField(_monthlySalaryController, 'Gaji Bulanan (Rp)', '3000000', keyboardType: TextInputType.number)), const SizedBox(width: 16), Expanded(child: _buildTextField(_workHoursController, 'Jam Kerja/Hari', '8', keyboardType: TextInputType.number))]),
        if (_isEditMode) _buildDropdownField('Status Akun', _selectedStatus, _statusOptions, (val) => setState(() => _selectedStatus = val)),
        const SizedBox(height: 32),
        _isSubmitting ? const Center(child: CircularProgressIndicator()) : ElevatedButton(onPressed: _saveEmployee, child: Text(_isEditMode ? 'UPDATE DATA' : 'TAMBAH CREW'), style: ElevatedButton.styleFrom(minimumSize: const Size(double.infinity, 50))),
      ]))),
    );
  }

  Widget _buildDropdownField(String label, String? value, List<String> items, ValueChanged<String?> onChanged) {
    return Padding(padding: const EdgeInsets.only(bottom: 16.0), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      DropdownButtonFormField<String>(
        decoration: InputDecoration(border: const OutlineInputBorder(), hintText: 'Pilih $label'),
        initialValue: value,
        items: items.map((label) => DropdownMenuItem(child: Text(label), value: label)).toList(),
        onChanged: onChanged,
        validator: (value) => value == null ? '$label tidak boleh kosong' : null,
      ),
    ]));
  }

  Widget _buildTextField(TextEditingController controller, String label, String hint, {TextInputType keyboardType = TextInputType.text, int? maxLength, bool readOnly = false, VoidCallback? onTap, IconData? suffixIcon, bool isRequired = true}) {
    return Padding(padding: const EdgeInsets.only(bottom: 16.0), child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
      Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
      const SizedBox(height: 8),
      TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        maxLength: maxLength,
        readOnly: readOnly,
        onTap: onTap,
        decoration: InputDecoration(hintText: hint, border: const OutlineInputBorder(), counterText: '', suffixIcon: suffixIcon != null ? Icon(suffixIcon) : null),
        validator: (v) => (isRequired && (v?.isEmpty ?? true)) ? '$label tidak boleh kosong' : null,
      ),
    ]));
  }
}





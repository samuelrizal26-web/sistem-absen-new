import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'package:sistem_absen_flutter_v2/models/employee.dart';
import 'package:sistem_absen_flutter_v2/screens/admin/admin_login_choice_screen.dart';
import 'package:sistem_absen_flutter_v2/screens/crew_dashboard_screen.dart';
import 'package:sistem_absen_flutter_v2/screens/print_jobs_screen.dart';
import 'package:sistem_absen_flutter_v2/screens/project_screen.dart';
import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

class CrewSelectionScreen extends StatefulWidget {
  const CrewSelectionScreen({super.key});

  @override
  State<CrewSelectionScreen> createState() => _CrewSelectionScreenState();
}

class _CrewSelectionScreenState extends State<CrewSelectionScreen> {
  Future<List<Employee>>? _employeesFuture;

  @override
  void initState() {
    super.initState();
    _loadEmployees();
  }

  void _loadEmployees() {
    setState(() {
      _employeesFuture = _fetchEmployees();
    });
  }

  Future<void> _handleRefresh() async {
    final future = _fetchEmployees();
    setState(() {
      _employeesFuture = future;
    });
    await future;
  }

  Future<List<Employee>> _fetchEmployees() async {
    try {
      final url = Uri.parse('https://sistem-absen-production.up.railway.app/api/employees?status=active');
      final response = await http.get(url);
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => Employee.fromJson(json)).toList();
      } else {
        throw Exception('Gagal memuat daftar karyawan');
      }
    } catch (e) {
      throw Exception('Error: $e');
    }
  }

  void _onCrewTapped(Employee employee) {
    showDialog(
      context: context,
      builder: (context) => _PinVerificationDialog(employee: employee),
    );
  }

  void _onAdminTapped() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const AdminLoginChoiceScreen()),
    );
  }

  void _onProjectTapped() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const ProjectScreen()),
    );
  }

  void _onPrintTapped() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const PrintJobsScreen()),
    );
  }

  void _onCashflowTapped() {
    showDialog(
      context: context,
      builder: (_) => const _CashflowDialog(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      body: SafeArea(
        child: Column(
          children: [
            _buildHeader(),
            Expanded(
              child: FutureBuilder<List<Employee>>(
                future: _employeesFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const Center(child: CircularProgressIndicator());
                  }
                  if (snapshot.hasError) {
                    return _buildError(snapshot.error.toString());
                  }
                final employees =
                    snapshot.data?.where((employee) => employee.status == null || employee.status == 'active').toList() ?? [];
                if (employees.isEmpty) {
                    return _buildEmptyState();
                  }
                  return RefreshIndicator(
                    onRefresh: _handleRefresh,
                  child: _buildCrewGrid(employees),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 36, 24, 24),
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF1A7BD0), Color(0xFF0A4D68)],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(32),
          bottomRight: Radius.circular(32),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Image.asset(
            'assets/app_icon.png',
            height: 72,
            errorBuilder: (context, error, stackTrace) => const Text(
              'LB.ADV',
              style: TextStyle(
                fontSize: 36,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'One_Stop Cutting Sticker',
            style: TextStyle(color: Colors.white70),
          ),
          const SizedBox(height: 24),
          const Text(
            'Sistem Absensi Crew',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          const Text(
            'Pilih nama Anda untuk absensi',
            style: TextStyle(color: Colors.white70),
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 16,
            runSpacing: 12,
            children: [
              _HeaderButton(
                onPressed: _onPrintTapped,
                icon: Icons.print,
                label: 'Print',
                color: const Color(0xFFF57C00),
              ),
              _HeaderButton(
                onPressed: _onCashflowTapped,
                icon: Icons.attach_money,
                label: 'Cashflow',
                color: const Color(0xFF00ACC1),
              ),
              _HeaderButton(
                onPressed: _onProjectTapped,
                icon: Icons.work_outline,
                label: 'Project',
                color: const Color(0xFF1976D2),
              ),
              _HeaderButton(
                onPressed: _onAdminTapped,
                icon: Icons.admin_panel_settings,
                label: 'Admin',
                color: const Color(0xFF6C4CEB),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildError(String message) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.error_outline, color: Colors.red, size: 48),
            const SizedBox(height: 12),
            Text(
              message,
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.red),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _loadEmployees,
              child: const Text('Coba Muat Ulang'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState() {
    return RefreshIndicator(
      onRefresh: _handleRefresh,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        children: const [
          SizedBox(height: 120),
          Icon(Icons.person_off_outlined, size: 64, color: Colors.grey),
          SizedBox(height: 16),
          Center(child: Text('Belum ada crew aktif.')),
        ],
      ),
    );
  }

  Widget _buildCrewGrid(List<Employee> employees) {
    final crossAxisCount = MediaQuery.of(context).size.width > 1000
        ? 4
        : MediaQuery.of(context).size.width > 700
            ? 3
            : 2;
    return GridView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: employees.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        mainAxisSpacing: 20,
        crossAxisSpacing: 20,
        childAspectRatio: 1,
      ),
      itemBuilder: (context, index) {
        final employee = employees[index];
        return _CrewCard(
          employee: employee,
          onTap: () => _onCrewTapped(employee),
        );
      },
    );
  }
}

class _PinVerificationDialog extends StatefulWidget {
  final Employee employee;
  const _PinVerificationDialog({Key? key, required this.employee}) : super(key: key);

  @override
  State<_PinVerificationDialog> createState() => _PinVerificationDialogState();
}

class _PinVerificationDialogState extends State<_PinVerificationDialog> {
  final TextEditingController _pinController = TextEditingController();
  bool _isLoggingIn = false;

  Future<void> _verifyPin() async {
    if (!mounted) return;
    setState(() { _isLoggingIn = true; });

    try {
      final url = Uri.parse('https://sistem-absen-production.up.railway.app/api/auth/employee-login');
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'employee_id': widget.employee.employeeId, 'pin': _pinController.text}),
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        final responseBody = json.decode(response.body);
        final loggedInEmployee = Employee.fromJson(responseBody['employee']);

        Navigator.of(context).pop();
        Navigator.of(context).push(
          MaterialPageRoute(builder: (context) => CrewDashboardScreen(employee: loggedInEmployee)),
        );
      } else {
        final errorBody = json.decode(response.body);
        throw Exception(errorBody['detail'] ?? 'PIN Salah atau tidak terdaftar');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(e.toString()), backgroundColor: Colors.red));
      Navigator.of(context).pop();
    } finally {
      if (mounted) setState(() { _isLoggingIn = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      contentPadding: const EdgeInsets.all(24),
      title: const Center(child: Text('Verifikasi Identitas')),
      content: Column(mainAxisSize: MainAxisSize.min, children: [
        const CircleAvatar(radius: 30, backgroundColor: Color(0xFFEAFBFF), child: Icon(Icons.person_outline, size: 30, color: Color(0xFF0A4D68))),
        const SizedBox(height: 16),
        Text(widget.employee.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
        const SizedBox(height: 4),
        Text(widget.employee.position ?? '', style: const TextStyle(color: Colors.grey)),
        const SizedBox(height: 24),
        const Align(alignment: Alignment.centerLeft, child: Text('PIN', style: TextStyle(fontWeight: FontWeight.bold))),
        const SizedBox(height: 8),
        TextField(
          controller: _pinController,
          maxLength: 6,
          textAlign: TextAlign.center,
          keyboardType: TextInputType.number,
          obscureText: true,
          autofocus: true,
          style: const TextStyle(fontSize: 18, letterSpacing: 8),
          decoration: const InputDecoration(hintText: 'Masukkan PIN', border: OutlineInputBorder(), counterText: ''),
        ),
        const SizedBox(height: 8),
        const Text('Masukkan PIN 6 digit', style: TextStyle(color: Colors.grey, fontSize: 12)),
        const SizedBox(height: 24),
        _isLoggingIn
            ? const CircularProgressIndicator()
            : ElevatedButton.icon(
                onPressed: _verifyPin,
                icon: const Icon(Icons.lock_open, color: Colors.white),
                label: const Text('Masuk dengan PIN', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF25A18E), minimumSize: const Size(double.infinity, 50), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30))),
              ),
      ]),
    );
  }
}

class _CrewCard extends StatelessWidget {
  final Employee employee;
  final VoidCallback onTap;

  const _CrewCard({Key? key, required this.employee, required this.onTap}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return InkWell(
      borderRadius: BorderRadius.circular(24),
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [
            BoxShadow(
              color: Color(0x14000000),
              blurRadius: 18,
              offset: Offset(0, 10),
            ),
          ],
        ),
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              width: 64,
              height: 64,
              decoration: BoxDecoration(
                color: const Color(0xFFEAFBFF),
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Icon(Icons.person_outline, color: Color(0xFF0A4D68), size: 32),
            ),
            const SizedBox(height: 16),
            Text(
              employee.name,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Colors.black87,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              employee.position ?? '—',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.black54),
            ),
          ],
        ),
      ),
    );
  }
}

class _HeaderButton extends StatelessWidget {
  final VoidCallback onPressed;
  final IconData icon;
  final String label;
  final Color color;

  const _HeaderButton({
    required this.onPressed,
    required this.icon,
    required this.label,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: 160,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, color: Colors.white),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          padding: const EdgeInsets.symmetric(vertical: 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
        ),
        label: Text(
          label,
          style: const TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
      ),
    );
  }
}

class _CashflowDialog extends StatefulWidget {
  const _CashflowDialog();

  @override
  State<_CashflowDialog> createState() => _CashflowDialogState();
}

class _CashflowDialogState extends State<_CashflowDialog> {
  final _formKey = GlobalKey<FormState>();
  final _amountController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _dateController = TextEditingController();
  DateTime _selectedDate = DateTime.now();
  String _type = 'income';
  bool _isSubmitting = false;

  @override
  void dispose() {
    _amountController.dispose();
    _descriptionController.dispose();
    _dateController.dispose();
    super.dispose();
  }

  @override
  void initState() {
    super.initState();
    _dateController.text = _selectedDate.toIso8601String().split('T').first;
  }

  Future<void> _pickDate() async {
    final result = await showDatePicker(
      context: context,
      initialDate: _selectedDate,
      firstDate: DateTime(2020),
      lastDate: DateTime.now(),
    );
    if (result != null) {
      setState(() {
        _selectedDate = result;
        _dateController.text = _selectedDate.toIso8601String().split('T').first;
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);
    try {
      await ApiService.createCashflow({
        'type': _type,
        'category': _type == 'income' ? 'Pemasukan' : 'Pengeluaran',
        'amount': double.tryParse(_amountController.text) ?? 0,
        'description': _descriptionController.text,
        'date': _selectedDate.toIso8601String().split('T').first,
      });
      if (!mounted) return;
      Navigator.of(context).pop();
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Cashflow berhasil dicatat'), backgroundColor: Colors.green),
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Catat Cashflow',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0A4D68)),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _dateController,
                readOnly: true,
                onTap: _pickDate,
                decoration: InputDecoration(
                  labelText: 'Tanggal',
                  suffixIcon: const Icon(Icons.calendar_today),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 16),
              DropdownButtonFormField<String>(
                initialValue: _type,
                decoration: InputDecoration(
                  labelText: 'Tipe',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
                items: const [
                  DropdownMenuItem(value: 'income', child: Text('Pemasukan')),
                  DropdownMenuItem(value: 'expense', child: Text('Pengeluaran')),
                ],
                onChanged: (value) => setState(() => _type = value ?? 'income'),
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _amountController,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Jumlah (Rp)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
                validator: (value) => (value == null || value.isEmpty) ? 'Jumlah wajib diisi' : null,
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _descriptionController,
                maxLines: 3,
                decoration: InputDecoration(
                  labelText: 'Catatan (opsional)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(16)),
                ),
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF00ACC1),
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  child: _isSubmitting
                      ? const SizedBox(
                          width: 24,
                          height: 24,
                          child: CircularProgressIndicator(
                            strokeWidth: 3,
                            valueColor: AlwaysStoppedAnimation(Colors.white),
                          ),
                        )
                      : const Text(
                          'Simpan Cashflow',
                          style: TextStyle(fontWeight: FontWeight.bold),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}





// ============================================
// HOME SCREEN (CREW SELECTION) - STABLE MODULE
// MODERN UI REFRESH:
// - Clean color palette (teal #2EC4B6, soft background)
// - Reduced shadows & softer contrast
// LANDSCAPE LAYOUT:
// - LEFT (40%): Logo + nav buttons (SCROLLABLE)
// - RIGHT (60%): Crew grid (scrollable)
// Both panels independently scrollable
// PORTRAIT: vertical stack (updated colors)
// NO logic/API changes, UI ONLY
// ============================================
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'package:sistem_absen_flutter_v2/models/employee.dart';
import 'package:sistem_absen_flutter_v2/screens/admin/admin_login_choice_screen.dart';
import 'package:sistem_absen_flutter_v2/screens/cashflow/cashflow_home_screen.dart';
import 'package:sistem_absen_flutter_v2/screens/crew/crew_home_screen.dart';
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

  Future<void> _onCrewTapped(Employee employee) async {
    final loggedInEmployee = await showDialog<Employee>(
      context: context,
      builder: (context) => _PinVerificationDialog(employee: employee),
    );
    if (loggedInEmployee == null) return;
    await Future<void>.delayed(Duration.zero);
    if (!mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(builder: (context) => CrewHomeScreen(employee: loggedInEmployee)),
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
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const CashflowHomeScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFEAF7FA),
      body: SafeArea(
        child: OrientationBuilder(
          builder: (context, orientation) {
            return FutureBuilder<List<Employee>>(
              future: _employeesFuture,
              builder: (context, snapshot) {
                final employees = snapshot.data?.where((employee) => employee.status == null || employee.status == 'active').toList() ?? [];
                
                if (orientation == Orientation.landscape) {
                  return _buildLandscapeLayout(snapshot, employees);
                } else {
                  return _buildPortraitLayout(snapshot, employees);
                }
              },
            );
          },
        ),
      ),
    );
  }

  Widget _buildPortraitLayout(AsyncSnapshot<List<Employee>> snapshot, List<Employee> employees) {
    return Column(
      children: [
        _buildHeader(false),
        Expanded(
          child: _buildContent(snapshot, employees),
        ),
      ],
    );
  }

  Widget _buildLandscapeLayout(AsyncSnapshot<List<Employee>> snapshot, List<Employee> employees) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          flex: 4,
          child: _buildLeftPanel(),
        ),
        const VerticalDivider(width: 1, thickness: 1),
        Expanded(
          flex: 6,
          child: _buildContent(snapshot, employees),
        ),
      ],
    );
  }

  Widget _buildContent(AsyncSnapshot<List<Employee>> snapshot, List<Employee> employees) {
    if (snapshot.connectionState == ConnectionState.waiting) {
      return const Center(child: CircularProgressIndicator());
    }
    if (snapshot.hasError) {
      return _buildError(snapshot.error.toString());
    }
    if (employees.isEmpty) {
      return _buildEmptyState();
    }
    return RefreshIndicator(
      onRefresh: _handleRefresh,
      child: _buildCrewGrid(employees),
    );
  }

  Widget _buildLeftPanel() {
    return Container(
      decoration: const BoxDecoration(
        color: Color(0xFF0A4D68),
      ),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(28),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const SizedBox(height: 24),
            Image.asset(
              'assets/app_icon.png',
              height: 56,
              errorBuilder: (context, error, stackTrace) => const Text(
                'LB.ADV',
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: 28,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
            const SizedBox(height: 10),
            const Text(
              'One_Stop Cutting Sticker',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white60, fontSize: 12),
            ),
            const SizedBox(height: 28),
            const Text(
              'Sistem Absensi Crew',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 6),
            const Text(
              'Pilih nama Anda untuk absensi',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.white60, fontSize: 12),
            ),
            const SizedBox(height: 36),
            _HeaderButton(
              onPressed: _onPrintTapped,
              icon: Icons.print,
              label: 'Print',
              color: const Color(0xFF2EC4B6),
            ),
            const SizedBox(height: 14),
            _HeaderButton(
              onPressed: _onCashflowTapped,
              icon: Icons.attach_money,
              label: 'Cashflow',
              color: const Color(0xFF2EC4B6),
            ),
            const SizedBox(height: 14),
            _HeaderButton(
              onPressed: _onProjectTapped,
              icon: Icons.work_outline,
              label: 'Project',
              color: const Color(0xFF2EC4B6),
            ),
            const SizedBox(height: 14),
            _HeaderButton(
              onPressed: _onAdminTapped,
              icon: Icons.admin_panel_settings,
              label: 'Admin',
              color: const Color(0xFFFFB74D),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildHeader(bool isLandscape) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
      decoration: const BoxDecoration(
        color: Color(0xFF0A4D68),
        borderRadius: BorderRadius.only(
          bottomLeft: Radius.circular(28),
          bottomRight: Radius.circular(28),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Image.asset(
            'assets/app_icon.png',
            height: 64,
            errorBuilder: (context, error, stackTrace) => const Text(
              'LB.ADV',
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'One_Stop Cutting Sticker',
            style: TextStyle(color: Colors.white60, fontSize: 12),
          ),
          const SizedBox(height: 20),
          const Text(
            'Sistem Absensi Crew',
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 6),
          const Text(
            'Pilih nama Anda untuk absensi',
            style: TextStyle(color: Colors.white60, fontSize: 12),
          ),
          const SizedBox(height: 24),
          Wrap(
            spacing: 14,
            runSpacing: 12,
            alignment: WrapAlignment.center,
            children: [
              _HeaderButton(
                onPressed: _onPrintTapped,
                icon: Icons.print,
                label: 'Print',
                color: const Color(0xFF2EC4B6),
              ),
              _HeaderButton(
                onPressed: _onCashflowTapped,
                icon: Icons.attach_money,
                label: 'Cashflow',
                color: const Color(0xFF2EC4B6),
              ),
              _HeaderButton(
                onPressed: _onProjectTapped,
                icon: Icons.work_outline,
                label: 'Project',
                color: const Color(0xFF2EC4B6),
              ),
              _HeaderButton(
                onPressed: _onAdminTapped,
                icon: Icons.admin_panel_settings,
                label: 'Admin',
                color: const Color(0xFFFFB74D),
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
    final screenWidth = MediaQuery.of(context).size.width;
    final crossAxisCount = screenWidth > 1000
        ? 4
        : screenWidth > 700
            ? 3
            : 2;
    
    // Aspect ratio adjusted for content height
    final aspectRatio = screenWidth > 1000 ? 0.95 : 0.85;
    
    return GridView.builder(
      padding: const EdgeInsets.all(20),
      itemCount: employees.length,
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        mainAxisSpacing: 20,
        crossAxisSpacing: 20,
        childAspectRatio: aspectRatio,
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
  String? _errorMessage;

  Future<void> _verifyPin() async {
    if (!mounted) return;
    if (_pinController.text.trim().length != 6) {
      setState(() {
        _errorMessage = 'PIN harus 6 digit';
      });
      return;
    }
    setState(() {
      _isLoggingIn = true;
      _errorMessage = null;
    });

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
        Navigator.of(context).pop(loggedInEmployee);
      } else {
        final errorBody = json.decode(response.body);
        throw Exception(errorBody['detail'] ?? 'PIN Salah atau tidak terdaftar');
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _errorMessage = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _isLoggingIn = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      contentPadding: const EdgeInsets.all(24),
      title: const Center(child: Text('Verifikasi Identitas')),
      content: SingleChildScrollView(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircleAvatar(
              radius: 30,
              backgroundColor: Color(0xFFEAFBFF),
              child: Icon(Icons.person_outline, size: 30, color: Color(0xFF0A4D68)),
            ),
            const SizedBox(height: 16),
            Text(
              widget.employee.name,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              widget.employee.position ?? '',
              style: const TextStyle(color: Colors.grey),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 24),
            const Align(
              alignment: Alignment.centerLeft,
              child: Text('PIN', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
            const SizedBox(height: 8),
            TextField(
              controller: _pinController,
              maxLength: 6,
              textAlign: TextAlign.center,
              keyboardType: TextInputType.number,
              obscureText: true,
              autofocus: true,
              style: const TextStyle(fontSize: 18, letterSpacing: 8),
              decoration: const InputDecoration(
                hintText: 'Masukkan PIN',
                border: OutlineInputBorder(),
                counterText: '',
              ),
            ),
            const SizedBox(height: 8),
            const Text(
              'Masukkan PIN 6 digit',
              style: TextStyle(color: Colors.grey, fontSize: 12),
            ),
            const SizedBox(height: 24),
            _isLoggingIn
                ? const CircularProgressIndicator()
                : ElevatedButton.icon(
                    onPressed: _verifyPin,
                    icon: const Icon(Icons.lock_open, color: Colors.white),
                    label: const Text(
                      'Masuk dengan PIN',
                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF25A18E),
                      minimumSize: const Size(double.infinity, 50),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(30),
                      ),
                    ),
                  ),
            if (_errorMessage != null) ...[
              const SizedBox(height: 12),
              Text(
                _errorMessage!,
                style: const TextStyle(color: Colors.red, fontSize: 12),
                textAlign: TextAlign.center,
              ),
            ],
          ],
        ),
      ),
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
      borderRadius: BorderRadius.circular(16),
      onTap: onTap,
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.06),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.center,
          children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(
                color: const Color(0xFF2EC4B6).withOpacity(0.15),
                borderRadius: BorderRadius.circular(14),
              ),
              child: const Icon(Icons.person_outline, color: Color(0xFF0A4D68), size: 26),
            ),
            const SizedBox(height: 10),
            Text(
              employee.name,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
              maxLines: 2,
              overflow: TextOverflow.ellipsis,
            ),
            const SizedBox(height: 4),
            Text(
              employee.position ?? '—',
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: Colors.black45,
                fontSize: 12,
              ),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
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
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    
    return SizedBox(
      width: isLandscape ? double.infinity : 160,
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon, color: Colors.white, size: isLandscape ? 20 : 24),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          padding: EdgeInsets.symmetric(vertical: isLandscape ? 16 : 14),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(isLandscape ? 12 : 20),
          ),
        ),
        label: Text(
          label,
          style: TextStyle(
            fontWeight: FontWeight.bold,
            color: Colors.white,
            fontSize: isLandscape ? 15 : 14,
          ),
        ),
      ),
    );
  }
}

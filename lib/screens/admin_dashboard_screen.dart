import 'package:flutter/material.dart';

import 'package:sistem_absen_flutter_v2/models/employee.dart';
import 'package:sistem_absen_flutter_v2/screens/admin/admin_cashflow_screen.dart';
import 'package:sistem_absen_flutter_v2/screens/admin/admin_settings_screen.dart';
import 'package:sistem_absen_flutter_v2/screens/admin/admin_stock_screen.dart';
import 'package:sistem_absen_flutter_v2/screens/admin/crew_dashboard_screen.dart';
import 'package:sistem_absen_flutter_v2/screens/employee_dashboard_screen.dart'
    as employee_detail;
import 'package:sistem_absen_flutter_v2/services/cash_drawer_service.dart';
import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

class AdminDashboardScreen extends StatefulWidget {
  const AdminDashboardScreen({super.key});

  @override
  State<AdminDashboardScreen> createState() => _AdminDashboardScreenState();
}

class _AdminDashboardScreenState extends State<AdminDashboardScreen> {
  bool _isLoading = true;
  List<Employee> _employees = [];
  Map<String, dynamic> _stats = {};
  Map<String, double> _employeeAdvances = {};
  late final TextEditingController _searchController;
  String _statusFilter = 'all';

  @override
  void initState() {
    super.initState();
    _searchController = TextEditingController()..addListener(_onSearchChanged);
    _loadDashboard();
  }

  @override
  void dispose() {
    _searchController.removeListener(_onSearchChanged);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadDashboard() async {
    setState(() => _isLoading = true);
    try {
      final results = await Future.wait([
        ApiService.fetchEmployees(onlyActive: false),
        ApiService.fetchDashboardStats(),
        ApiService.fetchEmployeeAdvances(),
      ]);
      if (!mounted) return;
      setState(() {
        _employees = results[0] as List<Employee>;
        _stats = results[1] as Map<String, dynamic>;
        _employeeAdvances = results[2] as Map<String, double>;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _navigateToStock() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const AdminStockScreen()),
    );
  }

  void _navigateToCashflow() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const AdminCashflowScreen()),
    );
  }

  void _navigateToSettings() {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const AdminSettingsScreen()),
    );
  }

  Future<void> _openCashDrawer() async {
    final opened = await CashDrawerService.open();
      if (!mounted) return;
    if (opened) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Laci kasir dibuka'), backgroundColor: Colors.blueAccent),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gagal membuka laci'), backgroundColor: Colors.orange),
      );
    }
  }

  void _logout() {
    Navigator.of(context).pop(true);
  }

  Future<void> _confirmDelete(Employee employee) async {
    final result = await showDialog<_DeleteConfirmationResult>(
      context: context,
      builder: (context) => _DeleteConfirmationDialog(employeeName: employee.name),
    );
    if (result == null || !result.confirmed) return;
    try {
      if (result.permanent) {
        await ApiService.deleteEmployeePermanent(employee.employeeId);
      } else {
        await ApiService.deleteEmployee(employee.employeeId);
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            result.permanent ? 'Crew dihapus permanen' : 'Crew berhasil dinonaktifkan',
          ),
          backgroundColor: Colors.green,
        ),
      );
      _loadDashboard();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    }
  }

  Future<void> _openCrewForm({Employee? employee}) async {
    final shouldRefresh = await showDialog<bool>(
      context: context,
      barrierDismissible: false,
      builder: (context) => _CrewFormDialog(employee: employee),
    );
    if (shouldRefresh == true) {
      _loadDashboard();
    }
  }

  String _formatCurrency(num? value) {
    final number = value ?? 0;
    return 'Rp ${number.toStringAsFixed(0).replaceAllMapped(RegExp(r'(\d)(?=(\d{3})+(?!\d))'), (match) => '${match.group(1)}.')}';
  }

  String _clockInLabel(Employee employee) {
    final created = employee.createdAt;
    if (created == null || created.isEmpty) return '-';
    final date = created.contains('T') ? created.split('T').first : created.split(' ').first;
    return date;
  }

  void _onSearchChanged() => setState(() {});

  List<Employee> get _filteredEmployees {
    final query = _searchController.text.toLowerCase();
    return _employees.where((employee) {
      final status = (employee.status ?? 'active').toLowerCase();
      final matchesStatus = _statusFilter == 'all' || status == _statusFilter;
      final matchesQuery = query.isEmpty ||
          employee.name.toLowerCase().contains(query) ||
          (employee.whatsapp ?? '').toLowerCase().contains(query) ||
          (employee.position ?? '').toLowerCase().contains(query);
      return matchesStatus && matchesQuery;
    }).toList()
      ..sort((a, b) => a.name.compareTo(b.name));
  }

  void _setStatusFilter(String? value) {
    final nextValue = value ?? 'all';
    if (_statusFilter == nextValue) return;
    setState(() => _statusFilter = nextValue);
  }

  @override
  Widget build(BuildContext context) {
    final body = _isLoading
        ? const Center(child: CircularProgressIndicator())
        : RefreshIndicator(
            onRefresh: _loadDashboard,
            child: SingleChildScrollView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(bottom: 32),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildHeader(),
                  const SizedBox(height: 16),
                  _buildStatsAndButton(),
                  const SizedBox(height: 16),
                  _buildToolbar(),
                  const SizedBox(height: 24),
                  _buildCrewTable(),
                ],
              ),
            ),
          );

    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      body: SafeArea(child: body),
    );
  }

  Widget _buildHeader() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final isWide = constraints.maxWidth > 720;
        final actionButtons = Wrap(
          spacing: 12,
          runSpacing: 8,
          alignment: isWide ? WrapAlignment.end : WrapAlignment.start,
          children: [
            _HeaderActionButton(
              label: 'Stock',
              color: const Color(0xFFFF9800),
              icon: Icons.inventory_2_outlined,
              onTap: _navigateToStock,
            ),
            _HeaderActionButton(
              label: 'Cashflow',
              color: const Color(0xFF00ACC1),
              icon: Icons.account_balance_wallet_outlined,
              onTap: _navigateToCashflow,
            ),
            _HeaderActionButton(
              label: 'Buka Laci',
              color: const Color(0xFF1F8A70),
              icon: Icons.door_sliding_outlined,
              onTap: _openCashDrawer,
            ),
            _HeaderActionButton(
              label: 'Pengaturan',
              color: const Color(0xFF1A237E),
              icon: Icons.settings_outlined,
              onTap: _navigateToSettings,
            ),
            _HeaderActionButton(
              label: 'Logout',
              color: const Color(0xFFD32F2F),
              icon: Icons.logout,
              onTap: _logout,
              outlined: true,
            ),
          ],
        );

        final titleSection = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: const [
            Text(
              'Dashboard Admin',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.white,
              ),
            ),
            SizedBox(height: 8),
            Text(
              'Kelola crew, absensi, kasbon, dan keuangan LB.ADV dari satu tempat.',
              style: TextStyle(color: Colors.white70),
            ),
          ],
        );

        return Container(
          width: double.infinity,
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 24),
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
          child: isWide
              ? Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(child: titleSection),
                    const SizedBox(width: 16),
                    actionButtons,
                  ],
                )
              : Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    titleSection,
                    const SizedBox(height: 16),
                    actionButtons,
                  ],
                ),
        );
      },
    );
  }

  Widget _buildStatsAndButton() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth > 900;
          final statsGrid = GridView.count(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            crossAxisCount: isWide ? 2 : 1,
            childAspectRatio: isWide ? 1.6 : 2.8,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            children: [
              _StatsCard(
                title: 'Total Anggota',
                value: '${_stats['total_employees'] ?? _employees.length}',
                icon: Icons.people_alt_outlined,
                color: const Color(0xFF5E35B1),
              ),
              _StatsCard(
                title: 'Absen Hari ini',
                value: '${_stats['attendance_today'] ?? 0}',
                icon: Icons.access_time,
                color: const Color(0xFF4CAF50),
              ),
              _StatsCard(
                title: 'Gaji Bulan ini',
                value: _formatCurrency(_stats['total_salary_month'] ?? 0),
                icon: Icons.trending_up,
                color: const Color(0xFFFF6B6B),
              ),
              _StatsCard(
                title: 'Kasbon Bulan ini',
                value: _formatCurrency(_stats['total_advances_month'] ?? 0),
                icon: Icons.account_balance_wallet_outlined,
                color: const Color(0xFFFFA726),
              ),
            ],
          );

          final addButton = SizedBox(
            width: isWide ? 220 : double.infinity,
            child: ElevatedButton.icon(
              onPressed: () => _openCrewForm(),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF00ACC1),
                padding: const EdgeInsets.symmetric(vertical: 20),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(20),
                ),
                elevation: 6,
              ),
              icon: const Icon(Icons.person_add_alt_1, size: 24, color: Colors.white),
              label: const Text(
                'Tambah Anggota',
                style: TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
            ),
          );

          if (isWide) {
            return Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Expanded(child: statsGrid),
                const SizedBox(width: 16),
                addButton,
              ],
            );
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              statsGrid,
              const SizedBox(height: 16),
              addButton,
            ],
          );
        },
      ),
    );
  }

  Widget _buildToolbar() {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: LayoutBuilder(
        builder: (context, constraints) {
          final isWide = constraints.maxWidth > 780;
          if (isWide) {
            return Row(
              children: [
                Expanded(child: _buildSearchField()),
                const SizedBox(width: 16),
                SizedBox(width: 190, child: _buildStatusDropdown()),
                const SizedBox(width: 16),
                _buildToolbarActions(),
              ],
            );
          }
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              _buildSearchField(),
              const SizedBox(height: 12),
              _buildStatusDropdown(),
              const SizedBox(height: 12),
              _buildToolbarActions(fullWidth: true),
            ],
          );
        },
      ),
    );
  }

  Widget _buildToolbarActions({bool fullWidth = false}) {
    final refreshButton = FilledButton.icon(
      onPressed: _isLoading ? null : _loadDashboard,
      icon: const Icon(Icons.refresh),
      label: const Text('Refresh Data'),
      style: FilledButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
    final resetButton = OutlinedButton.icon(
      onPressed: (_searchController.text.isEmpty && _statusFilter == 'all') ? null : _resetFilters,
      icon: const Icon(Icons.filter_alt_off_outlined),
      label: const Text('Reset Filter'),
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
    );
    if (fullWidth) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          refreshButton,
          const SizedBox(height: 8),
          resetButton,
        ],
      );
    }
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        refreshButton,
        const SizedBox(width: 12),
        resetButton,
      ],
    );
  }

  Widget _buildSearchField() {
    return TextField(
      controller: _searchController,
      decoration: InputDecoration(
        hintText: 'Cari nama, posisi, atau WhatsApp',
        prefixIcon: const Icon(Icons.search),
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
        contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
      ),
    );
  }

  Widget _buildStatusDropdown() {
    return DropdownButtonFormField<String>(
      value: _statusFilter,
      decoration: InputDecoration(
        labelText: 'Status Crew',
        filled: true,
        fillColor: Colors.white,
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(20), borderSide: BorderSide.none),
      ),
      items: const [
        DropdownMenuItem(value: 'all', child: Text('Semua')),
        DropdownMenuItem(value: 'active', child: Text('Aktif')),
        DropdownMenuItem(value: 'inactive', child: Text('Nonaktif')),
      ],
      onChanged: _setStatusFilter,
    );
  }

  void _resetFilters() {
    _searchController.clear();
    _setStatusFilter('all');
  }

  Widget _buildCrewTable() {
    final filteredEmployees = _filteredEmployees;
    final activeCount = _employees.where((employee) => (employee.status ?? 'active').toLowerCase() == 'active').length;
    final inactiveCount = _employees.length - activeCount;
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 24),
      child: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(24),
          boxShadow: const [
            BoxShadow(
              color: Color(0x14000000),
              blurRadius: 24,
              offset: Offset(0, 12),
            ),
          ],
        ),
        child: Column(
          children: [
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
              decoration: const BoxDecoration(
                color: Color(0xFF424242),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Text(
                        'Daftar Crew',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Spacer(),
                      IconButton(
                        onPressed: _isLoading ? null : _loadDashboard,
                        icon: const Icon(Icons.refresh, color: Colors.white),
                        tooltip: 'Muat ulang data',
                      ),
                    ],
                  ),
                  Text(
                    'Total ${_employees.length} crew • $activeCount aktif • $inactiveCount nonaktif',
                    style: const TextStyle(color: Colors.white70),
                  ),
                ],
              ),
            ),
            if (filteredEmployees.isEmpty)
              _buildEmptyCrewState()
            else
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                child: DataTable(
                  headingRowColor: MaterialStateProperty.all(const Color(0xFFF5F5F5)),
                  columnSpacing: 32,
                  columns: const [
                    DataColumn(label: Text('Nama')),
                    DataColumn(label: Text('No Whatsapp')),
                    DataColumn(label: Text('Posisi')),
                    DataColumn(label: Text('Kasbon')),
                    DataColumn(label: Text('Clock In')),
                    DataColumn(label: Text('Status')),
                    DataColumn(label: Text('Aksi')),
                  ],
                  rows: filteredEmployees
                      .map(
                        (employee) => DataRow(
                          cells: [
                            DataCell(
                              Text(employee.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                              onTap: () {
                                Navigator.of(context).push(
                                  MaterialPageRoute(
                                    builder: (_) => AdminCrewDashboardScreen(employee: employee),
                                  ),
                                );
                              },
                            ),
                            DataCell(Text(employee.whatsapp ?? '-')),
                            DataCell(Text(employee.position ?? '-')),
                            DataCell(Text(
                              _formatCurrency(_employeeAdvances[employee.employeeId] ?? 0),
                              style: const TextStyle(color: Color(0xFFFF7043), fontWeight: FontWeight.bold),
                            )),
                            DataCell(Text(_clockInLabel(employee))),
                            DataCell(_StatusChip(status: employee.status ?? 'active')),
                            DataCell(
                              Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  IconButton(
                                    tooltip: 'Lihat Detail',
                                    icon: const Icon(Icons.remove_red_eye_outlined, color: Color(0xFF1A73E8)),
                                    onPressed: () {
                                      Navigator.of(context).push(
                                        MaterialPageRoute(
                                          builder: (_) => employee_detail.EmployeeDashboardScreen(
                                            employeeId: employee.employeeId,
                                          ),
                                        ),
                                      );
                                    },
                                  ),
                                  IconButton(
                                    tooltip: 'Edit',
                                    icon: const Icon(Icons.edit_outlined, color: Color(0xFF2E7D32)),
                                    onPressed: () => _openCrewForm(employee: employee),
                                  ),
                                  IconButton(
                                    tooltip: 'Hapus',
                                    icon: const Icon(Icons.delete_outline, color: Color(0xFFD32F2F)),
                                    onPressed: () => _confirmDelete(employee),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      )
                      .toList(),
                ),
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyCrewState() {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        children: [
          const Icon(Icons.group_outlined, color: Colors.grey, size: 36),
          const SizedBox(height: 12),
          const Text(
            'Data crew tidak ditemukan',
            style: TextStyle(fontWeight: FontWeight.w600),
          ),
          const SizedBox(height: 4),
          const Text(
            'Coba ubah filter atau tambah anggota baru.',
            style: TextStyle(color: Colors.black54),
            textAlign: TextAlign.center,
          ),
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: _isLoading ? null : () => _openCrewForm(),
            icon: const Icon(Icons.person_add_alt),
            label: const Text('Tambah Crew'),
          ),
        ],
      ),
    );
  }
}

class _StatsCard extends StatelessWidget {
  final String title;
  final String value;
  final IconData icon;
  final Color color;

  const _StatsCard({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
              return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: const TextStyle(color: Colors.black54, fontWeight: FontWeight.w600),
                  ),
                ),
                CircleAvatar(
                  backgroundColor: color.withOpacity(0.15),
                  child: Icon(icon, color: color),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              value,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
                    ],
                  ),
                ),
              );
  }
}

class _HeaderActionButton extends StatelessWidget {
  final String label;
  final Color color;
  final IconData icon;
  final VoidCallback onTap;
  final bool outlined;

  const _HeaderActionButton({
    required this.label,
    required this.color,
    required this.icon,
    required this.onTap,
    this.outlined = false,
  });

  @override
  Widget build(BuildContext context) {
    final shape = RoundedRectangleBorder(borderRadius: BorderRadius.circular(16));
    if (outlined) {
      return OutlinedButton.icon(
        onPressed: onTap,
        style: OutlinedButton.styleFrom(
          side: BorderSide(color: color),
          foregroundColor: Colors.white,
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
          shape: shape,
        ),
        icon: Icon(icon, size: 18),
        label: Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
      );
    }
    return ElevatedButton.icon(
      onPressed: onTap,
      style: ElevatedButton.styleFrom(
        backgroundColor: color,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
        elevation: 0,
        shape: shape,
      ),
      icon: Icon(icon, size: 18),
      label: Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
    );
  }
}

class _StatusChip extends StatelessWidget {
  final String status;

  const _StatusChip({required this.status});

  @override
  Widget build(BuildContext context) {
    final isActive = status == 'active';
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isActive ? const Color(0xFFE8F5E9) : const Color(0xFFFFEBEE),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        isActive ? 'Active' : 'Inactive',
        style: TextStyle(
          color: isActive ? const Color(0xFF2E7D32) : const Color(0xFFC62828),
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _DeleteConfirmationResult {
  final bool confirmed;
  final bool permanent;

  const _DeleteConfirmationResult({
    required this.confirmed,
    required this.permanent,
  });
}

class _DeleteConfirmationDialog extends StatefulWidget {
  final String employeeName;

  const _DeleteConfirmationDialog({required this.employeeName});

  @override
  State<_DeleteConfirmationDialog> createState() => _DeleteConfirmationDialogState();
}

class _DeleteConfirmationDialogState extends State<_DeleteConfirmationDialog> {
  bool _permanent = false;

  void _onCancel() {
    Navigator.of(context).pop(const _DeleteConfirmationResult(confirmed: false, permanent: false));
  }

  void _onConfirm() {
    Navigator.of(context).pop(_DeleteConfirmationResult(confirmed: true, permanent: _permanent));
  }

  @override
  Widget build(BuildContext context) {
    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.warning_amber_rounded, color: Colors.orange, size: 48),
            const SizedBox(height: 16),
            Text(
              'Hapus ${widget.employeeName}?',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 8),
            Text(
              _permanent
                  ? 'Crew dan seluruh data terkait akan dihapus permanen.'
                  : 'Crew hanya dinonaktifkan dan bisa diaktifkan kembali.',
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.black54),
            ),
            const SizedBox(height: 16),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFFFF0E0),
                borderRadius: BorderRadius.circular(12),
              ),
              child: SwitchListTile.adaptive(
                value: _permanent,
                onChanged: (value) => setState(() => _permanent = value),
                title: const Text(
                  'Hapus permanen',
                  style: TextStyle(fontWeight: FontWeight.bold),
                ),
                subtitle: const Text('Data tidak bisa dikembalikan.'),
                contentPadding: EdgeInsets.zero,
                activeColor: const Color(0xFFD32F2F),
              ),
            ),
            const SizedBox(height: 24),
            Row(
              children: [
                Expanded(
                  child: OutlinedButton(
                    onPressed: _onCancel,
                    child: const Text('Batal'),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD32F2F)),
                    onPressed: _onConfirm,
                    child: Text(_permanent ? 'Hapus Permanen' : 'Ya, Hapus'),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _CrewFormDialog extends StatefulWidget {
  final Employee? employee;

  const _CrewFormDialog({this.employee});

  @override
  State<_CrewFormDialog> createState() => _CrewFormDialogState();
}

class _CrewFormDialogState extends State<_CrewFormDialog> {
  final _formKey = GlobalKey<FormState>();
  final _nameController = TextEditingController();
  final _whatsappController = TextEditingController();
  final _pinController = TextEditingController();
  final _birthplaceController = TextEditingController();
  final _birthdateController = TextEditingController();
  final _positionController = TextEditingController();
  final _salaryController = TextEditingController();
  final _hoursController = TextEditingController();
  String? _statusCrew;
  DateTime? _selectedDate;
  bool _isSubmitting = false;

  final List<String> _crewStatuses = ['Freelancer', 'Tetap'];

  @override
  void initState() {
    super.initState();
    final employee = widget.employee;
    if (employee != null) {
      _nameController.text = employee.name;
      _whatsappController.text = employee.whatsapp ?? '';
      _birthplaceController.text = employee.birthplace ?? '';
      _birthdateController.text = employee.birthdate ?? '';
      _positionController.text = employee.position ?? '';
      _salaryController.text = employee.monthlySalary?.toStringAsFixed(0) ?? '';
      _hoursController.text = employee.workHoursPerDay?.toStringAsFixed(0) ?? '';
      _statusCrew = employee.statusCrew ?? 'Freelancer';
      if (employee.birthdate != null) {
        _selectedDate = DateTime.tryParse(employee.birthdate!);
      }
    }
  }

  Future<void> _pickDate() async {
    final result = await showDatePicker(
      context: context,
      initialDate: _selectedDate ?? DateTime(1995, 1, 1),
      firstDate: DateTime(1950),
      lastDate: DateTime.now(),
    );
    if (result != null) {
      setState(() {
        _selectedDate = result;
        _birthdateController.text =
            '${result.year}-${result.month.toString().padLeft(2, '0')}-${result.day.toString().padLeft(2, '0')}';
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _isSubmitting = true);
    final body = {
      'name': _nameController.text,
      'whatsapp': _whatsappController.text,
      'pin': _pinController.text.isEmpty ? null : _pinController.text,
      'birthplace': _birthplaceController.text,
      'birthdate': _birthdateController.text,
      'position': _positionController.text,
      'status_crew': _statusCrew ?? 'Freelancer',
      'monthly_salary': double.tryParse(_salaryController.text) ?? 0,
      'work_hours_per_day': double.tryParse(_hoursController.text) ?? 8,
    };
    if (body['pin'] == null) {
      body.remove('pin');
    }
    try {
      if (widget.employee == null) {
        await ApiService.createEmployee(body);
      } else {
        if (_pinController.text.isEmpty) {
          body.remove('pin');
        }
        await ApiService.updateEmployee(widget.employee!.employeeId, body);
      }
      if (!mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      Navigator.of(context).pop(true);
      messenger.showSnackBar(
        SnackBar(
          content: Text(
            widget.employee == null ? 'Crew berhasil ditambahkan' : 'Data crew berhasil diperbarui',
          ),
          backgroundColor: Colors.green,
        ),
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
      insetPadding: const EdgeInsets.all(16),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 700),
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    widget.employee == null ? 'Tambah Anggota Crew Baru' : 'Edit Data Crew',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold, color: Color(0xFF0A4D68)),
                  ),
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(false),
                    icon: const Icon(Icons.close),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Form(
                key: _formKey,
                child: SingleChildScrollView(
                  child: Column(
                    children: [
                      _buildTwoColumn(
                        _buildTextField(_nameController, 'Nama Lengkap', required: true),
                        _buildTextField(_whatsappController, 'Nomor WA', keyboardType: TextInputType.phone, required: true),
                      ),
                      _buildTwoColumn(
                        _buildTextField(
                          _pinController,
                          widget.employee == null ? 'PIN (6 Digit)' : 'PIN (Opsional)',
                          keyboardType: TextInputType.number,
                          maxLength: 6,
                          required: widget.employee == null,
                        ),
                        _buildTextField(
                          _birthdateController,
                          'Tanggal Lahir',
                          readOnly: true,
                          onTap: _pickDate,
                          suffixIcon: Icons.calendar_today,
                          required: true,
                        ),
                      ),
                      _buildTwoColumn(
                        _buildTextField(_birthplaceController, 'Tempat Lahir', required: true),
                        _buildDropdown(),
                      ),
                      _buildTextField(_positionController, 'Posisi/Jabatan', required: true),
                      if (widget.employee != null)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF8E1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: const Text(
                            '💡 Update Gaji & Jam Kerja\nSesuaikan data ini ketika ada perubahan kebijakan.',
                            style: TextStyle(color: Color(0xFF8D6E63)),
                          ),
                        ),
                      const SizedBox(height: 12),
                      _buildTwoColumn(
                        _buildTextField(
                          _salaryController,
                          'Gaji Bulanan (Rp)',
                          keyboardType: TextInputType.number,
                          required: true,
                        ),
                        _buildTextField(
                          _hoursController,
                          'Jam Kerja/Hari',
                          keyboardType: TextInputType.number,
                          required: true,
                        ),
                      ),
                      const SizedBox(height: 12),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton(
                          onPressed: _isSubmitting ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: widget.employee == null ? const Color(0xFF00ACC1) : const Color(0xFF2E7D32),
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
                              : Text(
                                  widget.employee == null ? 'Tambah Crew' : 'Simpan Perubahan',
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTwoColumn(Widget left, Widget right) {
    return Row(
      children: [
        Expanded(child: left),
        const SizedBox(width: 16),
        Expanded(child: right),
      ],
    );
  }

  Widget _buildDropdown() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text('Status Crew *', style: TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        DropdownButtonFormField<String>(
          initialValue: _statusCrew,
          items: _crewStatuses
              .map(
                (value) => DropdownMenuItem(
                  value: value,
                  child: Text(value),
                ),
              )
              .toList(),
          onChanged: (value) => setState(() => _statusCrew = value),
          validator: (value) => value == null ? 'Status crew wajib dipilih' : null,
          decoration: InputDecoration(
            filled: true,
            fillColor: const Color(0xFFF5F5F5),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
          ),
        ),
      ],
    );
  }

  Widget _buildTextField(
    TextEditingController controller,
    String label, {
    TextInputType keyboardType = TextInputType.text,
    bool required = false,
    bool readOnly = false,
    VoidCallback? onTap,
    IconData? suffixIcon,
    int? maxLength,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('$label${required ? ' *' : ''}', style: const TextStyle(fontWeight: FontWeight.bold)),
        const SizedBox(height: 8),
        TextFormField(
          controller: controller,
          keyboardType: keyboardType,
          readOnly: readOnly,
          onTap: onTap,
          maxLength: maxLength,
          decoration: InputDecoration(
            filled: true,
            fillColor: const Color(0xFFF5F5F5),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none),
            counterText: '',
            suffixIcon: suffixIcon != null ? Icon(suffixIcon) : null,
          ),
          validator: (value) {
            if (required && (value?.isEmpty ?? true)) {
              return '$label wajib diisi';
            }
            if (maxLength != null && (value?.length ?? 0) != maxLength && required) {
              return '$label harus $maxLength digit';
            }
            return null;
          },
        ),
      ],
    );
  }

  @override
  void dispose() {
    _nameController.dispose();
    _whatsappController.dispose();
    _pinController.dispose();
    _birthplaceController.dispose();
    _birthdateController.dispose();
    _positionController.dispose();
    _salaryController.dispose();
    _hoursController.dispose();
    super.dispose();
  }
}





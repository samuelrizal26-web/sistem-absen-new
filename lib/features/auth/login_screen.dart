import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:sistem_absen_flutter_v2/core/utils/error_handler.dart';
import 'package:sistem_absen_flutter_v2/core/constants/app_constants.dart';
import 'package:sistem_absen_flutter_v2/screens/employee_dashboard_screen.dart';
import 'package:sistem_absen_flutter_v2/screens/project_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final TextEditingController _employeeIdController = TextEditingController();
  bool _isLoading = false;

  Future<void> _login() async {
    if (_employeeIdController.text.isEmpty) {
      ErrorHandler.showError(
        context,
        'ID Karyawan tidak boleh kosong',
        type: ErrorType.unknown,
      );
      return;
    }

    setState(() { _isLoading = true; });

    try {
      final url = Uri.parse('\/employees/${_employeeIdController.text}');
      final response = await http.get(url).timeout(const Duration(seconds: 15));

      if (!mounted) return;
      if (response.statusCode == 200) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => EmployeeDashboardScreen(employeeId: _employeeIdController.text),
          ),
        );
      } else {
        ErrorHandler.showError(
          context,
          'Login Gagal: Karyawan tidak ditemukan',
          type: ErrorType.api,
        );
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Terjadi kesalahan koneksi: $e'), backgroundColor: Colors.red,),
      );
    } finally {
      if (mounted) setState(() { _isLoading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50], // Background lebih bersih
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24.0),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Login Karyawan',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 18, color: Colors.grey),
                ),
                const SizedBox(height: 60),
                const Text(
                  'Selamat Datang!',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.black87),
                ),
                const SizedBox(height: 8),
                const Text(
                  'Sistem Absen Karyawan',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontSize: 16, color: Colors.black54),
                ),
                const SizedBox(height: 40),
                
                // --- Custom Text Field ---
                const Text(
                  '  ID Karyawan', // Label di luar
                  style: TextStyle(color: Colors.black54, fontWeight: FontWeight.w500),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _employeeIdController,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.person_outline, color: Colors.black54),
                    hintText: 'Masukkan ID Anda',
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey[300]!),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide(color: Colors.grey[300]!),
                    ),
                  ),
                  keyboardType: TextInputType.text,
                ),
                const SizedBox(height: 30),
                
                // --- Custom Button ---
                _isLoading
                    ? const Center(child: CircularProgressIndicator())
                    : ElevatedButton(
                        onPressed: _login,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: Colors.white, // Warna tombol
                          foregroundColor: Colors.black87, // Warna teks tombol
                          elevation: 2,
                          minimumSize: const Size(double.infinity, 50), // Ukuran tombol
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(30), // Sudut yang sangat membulat
                          ),
                        ),
                        child: const Text('Login', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const ProjectScreen()),
                    );
                  },
                  style: OutlinedButton.styleFrom(
                    minimumSize: const Size(double.infinity, 48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  ),
                  icon: const Icon(Icons.work_outline),
                  label: const Text(
                    'Project',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}












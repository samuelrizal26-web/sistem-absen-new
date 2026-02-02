// ============================================
// ADMIN PIN LOGIN SCREEN
// LANDSCAPE FIX:
// - Portrait: keep existing layout
// - Landscape: centered + constrained width (440px)
// - NO logic/auth changes
// ============================================
import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;

import 'package:sistem_absen_flutter_v2/screens/admin_dashboard_screen.dart';

class AdminPinLoginScreen extends StatefulWidget {
  const AdminPinLoginScreen({super.key});

  @override
  State<AdminPinLoginScreen> createState() => _AdminPinLoginScreenState();
}

class _AdminPinLoginScreenState extends State<AdminPinLoginScreen> {
  final TextEditingController _pinController = TextEditingController();
  bool _isSubmitting = false;

  Future<void> _login() async {
    if (_pinController.text.length < 4) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('PIN minimal 4 digit'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    try {
      final url = Uri.parse(
        'https://sistem-absen-production.up.railway.app/api/auth/admin-login',
      );
      final response = await http.post(
        url,
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'pin': _pinController.text}),
      );

      if (!mounted) return;

      if (response.statusCode == 200) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Login admin berhasil'),
            backgroundColor: Colors.green,
          ),
        );
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const AdminDashboardScreen()),
        );
      } else {
        final error = jsonDecode(response.body);
        throw Exception(error['detail'] ?? 'PIN salah');
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(e.toString()),
          backgroundColor: Colors.red,
        ),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isLandscape = MediaQuery.of(context).orientation == Orientation.landscape;
    final verticalPadding = isLandscape ? 12.0 : 24.0;
    final cardPadding = isLandscape ? 20.0 : 24.0;
    final cardRadius = isLandscape ? 18.0 : 24.0;
    final titleSpacing = isLandscape ? 16.0 : 32.0;
    
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 440),
            child: Padding(
              padding: EdgeInsets.symmetric(
                horizontal: 24,
                vertical: verticalPadding,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  SizedBox(height: verticalPadding),
                  const Text(
                    'Masuk dengan PIN',
                    style: TextStyle(
                      fontSize: 26,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF0A4D68),
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'Gunakan PIN 6 digit Anda',
                    style: TextStyle(color: Colors.black54),
                  ),
                  SizedBox(height: titleSpacing),
                  Container(
                    width: double.infinity,
                    padding: EdgeInsets.all(cardPadding),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(cardRadius),
                      boxShadow: const [
                        BoxShadow(
                          color: Color(0x14000000),
                          blurRadius: 24,
                          offset: Offset(0, 12),
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        TextField(
                          controller: _pinController,
                          autofocus: true,
                          maxLength: 6,
                          keyboardType: TextInputType.number,
                          textAlign: TextAlign.center,
                          obscureText: true,
                          decoration: InputDecoration(
                            counterText: '',
                            hintText: 'Masukkan PIN',
                            filled: true,
                            fillColor: const Color(0xFFF4F6FB),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(16),
                              borderSide: BorderSide.none,
                            ),
                          ),
                          style: const TextStyle(
                            fontSize: 24,
                            letterSpacing: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 12),
                        const Text(
                          'PIN default: 123456',
                          style: TextStyle(color: Colors.grey),
                        ),
                        SizedBox(height: isLandscape ? 16 : 24),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isSubmitting ? null : _login,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF1BC0C7),
                              minimumSize: const Size(double.infinity, 56),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: _isSubmitting
                                ? const SizedBox(
                                    width: 24,
                                    height: 24,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 3,
                                      valueColor:
                                          AlwaysStoppedAnimation(Colors.white),
                                    ),
                                  )
                                : const Text(
                                    'Masuk',
                                    style: TextStyle(
                                      fontSize: 18,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
      backgroundColor: const Color(0xFFEAFBFF),
    );
  }
}






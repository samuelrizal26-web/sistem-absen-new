import 'package:flutter/material.dart';

import 'package:sistem_absen_flutter_v2/screens/admin/admin_password_login_screen.dart';
import 'package:sistem_absen_flutter_v2/screens/admin/admin_pin_login_screen.dart';

class AdminLoginChoiceScreen extends StatelessWidget {
  const AdminLoginChoiceScreen({super.key});

  void _navigateToPin(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const AdminPinLoginScreen()),
    );
  }

  void _navigateToPassword(BuildContext context) {
    Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const AdminPasswordLoginScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      backgroundColor: const Color(0xFFEAFBFF),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 32),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                _buildLogo(),
                const SizedBox(height: 24),
                Text(
                  'Masuk Admin',
                  style: theme.textTheme.headlineMedium?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: const Color(0xFF0A4D68),
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Pilih metode login',
                  style: theme.textTheme.bodyMedium?.copyWith(
                    color: Colors.black54,
                  ),
                ),
                const SizedBox(height: 32),
                _buildCard(
                  context: context,
                  child: Column(
                    children: [
                      ElevatedButton(
                        onPressed: () => _navigateToPin(context),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF1BC0C7),
                          minimumSize: const Size(double.infinity, 56),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: const Text(
                          'Masukkan Pin',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      OutlinedButton(
                        onPressed: () => _navigateToPassword(context),
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Color(0xFF5236A6), width: 2),
                          foregroundColor: const Color(0xFF5236A6),
                          minimumSize: const Size(double.infinity, 56),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                          ),
                        ),
                        child: const Text(
                          'Masukkan Password',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(16),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF4F8FF),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Demo Credentials:',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF0A4D68),
                              ),
                            ),
                            SizedBox(height: 8),
                            Text('PIN: 123456'),
                            Text('Username: admin'),
                            Text('Password: admin123'),
                          ],
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
    );
  }

  Widget _buildLogo() {
    return Column(
      children: [
        Image.asset(
          'assets/app_icon.png',
          height: 80,
          errorBuilder: (context, error, stackTrace) => const Icon(
            Icons.shield,
            size: 74,
            color: Color(0xFF0A4D68),
          ),
        ),
        const SizedBox(height: 8),
        const Text(
          'LB.ADV',
          style: TextStyle(
            fontSize: 22,
            fontWeight: FontWeight.w700,
            color: Color(0xFF0A4D68),
          ),
        ),
        const Text(
          'One_Stop Cutting Sticker',
          style: TextStyle(color: Colors.black54),
        ),
      ],
    );
  }

  Widget _buildCard({required BuildContext context, required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: const [
          BoxShadow(
            color: Color(0x14000000),
            blurRadius: 24,
            offset: Offset(0, 8),
          ),
        ],
      ),
      child: child,
    );
  }
}






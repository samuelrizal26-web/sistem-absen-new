import 'package:flutter/material.dart';
import 'package:sistem_absen_flutter_v2/services/api/api_service.dart';

class AdminSettingsScreen extends StatefulWidget {
  const AdminSettingsScreen({super.key});

  @override
  State<AdminSettingsScreen> createState() => _AdminSettingsScreenState();
}

class _AdminSettingsScreenState extends State<AdminSettingsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _oldPinController = TextEditingController();
  final _newPinController = TextEditingController();
  final _confirmPinController = TextEditingController();
  bool _isSubmitting = false;
  String? _statusMessage;
  bool _pinSetupSuccess = false;

  Future<void> _setupPin() async {
    setState(() { _isSubmitting = true; _statusMessage = null; });
    try {
      await ApiService.setupAdminPin(_newPinController.text);
      setState(() { _statusMessage = 'PIN admin berhasil di-setup!'; _pinSetupSuccess = true; });
    } catch (e) {
      setState(() { _statusMessage = e.toString(); _pinSetupSuccess = false; });
    } finally {
      setState(() { _isSubmitting = false; });
    }
  }

  Future<void> _changePin() async {
    setState(() { _isSubmitting = true; _statusMessage = null; });
    try {
      await ApiService.changeAdminPin(_oldPinController.text, _newPinController.text);
      setState(() { _statusMessage = 'PIN admin berhasil diubah!'; _pinSetupSuccess = true; });
    } catch (e) {
      setState(() { _statusMessage = e.toString(); _pinSetupSuccess = false; });
    } finally {
      setState(() { _isSubmitting = false; });
    }
  }

  @override
  void dispose() {
    _oldPinController.dispose();
    _newPinController.dispose();
    _confirmPinController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Pengaturan Admin'),
        backgroundColor: const Color(0xFF0A4D68),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 480),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Card(
                  elevation: 8,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Form(
                      key: _formKey,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          const Text('Ganti PIN Admin', style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Color(0xFF0A4D68)), textAlign: TextAlign.center),
                          const SizedBox(height: 24),
                          TextFormField(
                            controller: _oldPinController,
                            decoration: const InputDecoration(labelText: 'PIN Lama', border: OutlineInputBorder()),
                            keyboardType: TextInputType.number,
                            obscureText: true,
                            maxLength: 6,
                            validator: (v) => v != null && v.isNotEmpty && v.length < 6 ? 'PIN lama minimal 6 digit' : null,
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _newPinController,
                            decoration: const InputDecoration(labelText: 'PIN Baru', border: OutlineInputBorder()),
                            keyboardType: TextInputType.number,
                            obscureText: true,
                            maxLength: 6,
                            validator: (v) => v == null || v.length < 6 ? 'PIN baru harus 6 digit' : null,
                          ),
                          const SizedBox(height: 16),
                          TextFormField(
                            controller: _confirmPinController,
                            decoration: const InputDecoration(labelText: 'Konfirmasi PIN Baru', border: OutlineInputBorder()),
                            keyboardType: TextInputType.number,
                            obscureText: true,
                            maxLength: 6,
                            validator: (v) => v != _newPinController.text ? 'Konfirmasi PIN tidak cocok' : null,
                          ),
                          const SizedBox(height: 24),
                          if (_isSubmitting) const Center(child: CircularProgressIndicator()),
                          if (!_isSubmitting) Row(
                            children: [
                              Expanded(
                                child: ElevatedButton(
                                  onPressed: () {
                                    if (_formKey.currentState!.validate()) {
                                      if (_oldPinController.text.isEmpty) {
                                        _setupPin();
                                      } else {
                                        _changePin();
                                      }
                                    }
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF0A4D68),
                                    minimumSize: const Size(double.infinity, 50),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                  ),
                                  child: const Text('Set/Update PIN', style: TextStyle(fontWeight: FontWeight.bold)),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 24),
                          Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: const Color(0xFFF4F6FB),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Text(
                              'PIN default admin: 123456\nJika belum pernah set PIN, masukkan hanya PIN baru lalu klik Set/Update PIN. Gunakan tombol ini untuk ganti PIN jika ingin keamanan tambahan.',
                              style: TextStyle(color: Colors.black87),
                            ),
                          ),
                          const SizedBox(height: 8),
                          if (_statusMessage != null || _pinSetupSuccess)
                            Text(_statusMessage ?? (_pinSetupSuccess ? 'PIN admin berhasil diupdate!' : ''), style: TextStyle(color: _pinSetupSuccess ? Colors.green : Colors.red), textAlign: TextAlign.center),
                        ],
                      ),
                    ),
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






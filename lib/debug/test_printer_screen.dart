import 'package:flutter/material.dart';
import '../services/printer/bluetooth_printer_service.dart';
import 'package:bluetooth_print_plus/bluetooth_print_plus.dart';

/// Test Printer Screen - Alat diagnosis printer seumur hidup
/// JANGAN DIHAPUS - ini untuk troubleshooting printer
class TestPrinterScreen extends StatefulWidget {
  const TestPrinterScreen({super.key});

  @override
  State<TestPrinterScreen> createState() => _TestPrinterScreenState();
}

class _TestPrinterScreenState extends State<TestPrinterScreen> {
  final BluetoothPrinterService printerService = BluetoothPrinterService();
  List<BluetoothDevice> _devices = [];
  String _status = 'Ready';
  bool _isScanning = false;

  @override
  void initState() {
    super.initState();
    printerService.initialize();
  }

  Future<void> _scanPrinters() async {
    setState(() {
      _isScanning = true;
      _status = 'Scanning...';
      _devices = [];
    });

    try {
      final stream = printerService.scanPrinters();
      stream.listen((devices) {
        setState(() {
          _devices = devices;
          _status = 'Found ${devices.length} device(s)';
        });
      });

      // Stop scan after 10 seconds
      await Future.delayed(const Duration(seconds: 10));
      await printerService.stopScan();
      setState(() {
        _isScanning = false;
        _status = 'Scan complete. Found ${_devices.length} device(s)';
      });
    } catch (e) {
      setState(() {
        _isScanning = false;
        _status = 'Error: $e';
      });
    }
  }

  Future<void> _connectToSaved() async {
    setState(() {
      _status = 'Connecting...';
    });

    try {
      final connected = await printerService.connectToSavedPrinter();
      setState(() {
        _status = connected ? 'Connected!' : 'Connection failed';
      });
    } catch (e) {
      setState(() {
        _status = 'Error: $e';
      });
    }
  }

  Future<void> _printTest() async {
    setState(() {
      _status = 'Printing...';
    });

    try {
      await printerService.testPrint();
      setState(() {
        _status = 'Print sent!';
      });
    } catch (e) {
      setState(() {
        _status = 'Print error: $e';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('TEST BLUETOOTH PRINTER'),
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  'Status: $_status',
                  style: const TextStyle(fontSize: 16),
                ),
              ),
            ),
            const SizedBox(height: 16),
            
            // Buttons
            ElevatedButton(
              onPressed: _isScanning ? null : _scanPrinters,
              child: Text(_isScanning ? 'SCANNING...' : 'SCAN PRINTER'),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _connectToSaved,
              child: const Text('CONNECT TO SAVED PRINTER'),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _printTest,
              child: const Text('PRINT TEST'),
            ),
            
            // Device list
            if (_devices.isNotEmpty) ...[
              const SizedBox(height: 24),
              const Text(
                'Found Devices:',
                style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              Expanded(
                child: ListView.builder(
                  itemCount: _devices.length,
                  itemBuilder: (context, index) {
                    final device = _devices[index];
                    return ListTile(
                      title: Text(device.name ?? 'Unknown'),
                      subtitle: Text(device.address),
                      trailing: ElevatedButton(
                        onPressed: () async {
                          setState(() {
                            _status = 'Connecting to ${device.name}...';
                          });
                          try {
                            final connected = await printerService.connectPrinter(device);
                            setState(() {
                              _status = connected ? 'Connected to ${device.name}!' : 'Connection failed';
                            });
                          } catch (e) {
                            setState(() {
                              _status = 'Error: $e';
                            });
                          }
                        },
                        child: const Text('Connect'),
                      ),
                    );
                  },
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}






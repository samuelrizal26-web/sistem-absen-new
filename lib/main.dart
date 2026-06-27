import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:sistem_absen_flutter_v2/core/theme/app_theme.dart';
import 'package:sistem_absen_flutter_v2/screens/crew_selection_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('id_ID', null);
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const CrewSelectionScreen(),
    );
  }
}

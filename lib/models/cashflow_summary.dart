class CashflowSummary {
  final double totalIncome;
  final double totalExpense;
  final double cashIncome;
  final double cashExpense;
  final double transferIncome;
  final double transferExpense;
  final double marginCash;
  final double marginTransfer;

  const CashflowSummary({
    required this.totalIncome,
    required this.totalExpense,
    required this.cashIncome,
    required this.cashExpense,
    required this.transferIncome,
    required this.transferExpense,
    required this.marginCash,
    required this.marginTransfer,
  });
}


class Employee {
  final String employeeId;
  final String name;
  final String? whatsapp;
  final String? pin; // Note: PIN is not sent from server, only for sending
  final String? photoUrl;
  final String? birthplace;
  final String? birthdate;
  final String? position;
  final String? statusCrew;
  final double? monthlySalary;
  final double? workHoursPerDay;
  final double? hourlyRate;
  final String? status;
  final String? createdAt;

  Employee({
    required this.employeeId,
    required this.name,
    this.whatsapp,
    this.pin,
    this.photoUrl,
    this.birthplace,
    this.birthdate,
    this.position,
    this.statusCrew,
    this.monthlySalary,
    this.workHoursPerDay,
    this.hourlyRate,
    this.status,
    this.createdAt,
  });

  factory Employee.fromJson(Map<String, dynamic> json) {
    return Employee(
      employeeId: json['id'] ?? json['employee_id'] ?? '',
      name: json['name'] ?? 'No Name',
      whatsapp: json['whatsapp'],
      photoUrl: json['photo_url'],
      birthplace: json['birthplace'],
      birthdate: json['birthdate'],
      position: json['position'],
      statusCrew: json['status_crew'],
      monthlySalary: (json['monthly_salary'] as num?)?.toDouble(),
      workHoursPerDay: (json['work_hours_per_day'] as num?)?.toDouble(),
      hourlyRate: (json['hourly_rate'] as num?)?.toDouble(),
      status: json['status'],
      createdAt: json['created_at'],
    );
  }
}





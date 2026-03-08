class User {
  final int userId;
  final String username;
  final String email;
  final String role;
  final String? fullName;
  final String? phone;

  User({
    required this.userId,
    required this.username,
    required this.email,
    required this.role,
    this.fullName,
    this.phone,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      userId: _parseInt(json['user_id']),
      username: json['username']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      fullName: json['full_name']?.toString(),
      phone: json['phone']?.toString(),
    );
  }

  static int _parseInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is String) return int.tryParse(value) ?? 0;
    return 0;
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'username': username,
      'email': email,
      'role': role,
      'full_name': fullName,
      'phone': phone,
    };
  }

  @override
  String toString() {
    return 'User(userId: $userId, username: $username, email: $email, role: $role)';
  }
}
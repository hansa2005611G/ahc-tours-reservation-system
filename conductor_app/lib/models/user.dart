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

  // From JSON (backend response)
  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      userId: json['user_id'] ?? json['userId'] ?? 0,
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? '',
      fullName: json['full_name'] ?? json['fullName'],
      phone: json['phone'],
    );
  }

  // To JSON (for storage)
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
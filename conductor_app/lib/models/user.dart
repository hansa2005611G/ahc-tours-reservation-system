class User {
  final int userId;
  final String username;
  final String email;
  final String role;
  final String? fullName;

  User({
    required this.userId,
    required this.username,
    required this.email,
    required this.role,
    this.fullName,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      userId: json['user_id'],
      username: json['username'],
      email: json['email'],
      role: json['role'],
      fullName: json['full_name'],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'user_id': userId,
      'username': username,
      'email': email,
      'role': role,
      'full_name': fullName,
    };
  }
}
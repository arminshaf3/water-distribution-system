class User {
  final int id;
  final String username;
  final String email;
  final String fullName;
  final List<String> roles;

  User({
    required this.id,
    required this.username,
    required this.email,
    required this.fullName,
    required this.roles,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      username: json['username'] ?? '',
      email: json['email'] ?? '',
      fullName: json['fullName'] ?? '',
      roles: List<String>.from(json['roles'] ?? []),
    );
  }
}

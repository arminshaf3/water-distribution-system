import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../config/api_endpoints.dart';
import 'storage_service.dart';

class ApiService {
  final StorageService _storageService = StorageService();
  static const Duration _requestTimeout = Duration(seconds: 15);

  Future<Map<String, String>> _getHeaders() async {
    final token = await _storageService.getToken();
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
  }

  Future<dynamic> post(String url, Map<String, dynamic> body) async {
    try {
      final headers = await _getHeaders();
      final response = await http
          .post(
            Uri.parse(url),
            headers: headers,
            body: jsonEncode(body),
          )
          .timeout(_requestTimeout);

      return _processResponse(response);
    } on TimeoutException {
      throw Exception(_networkErrorMessage);
    } on http.ClientException {
      throw Exception(_networkErrorMessage);
    } on SocketException {
      throw Exception(_networkErrorMessage);
    }
  }

  Future<dynamic> get(String url, {Map<String, String>? params}) async {
    try {
      final headers = await _getHeaders();
      Uri uri = Uri.parse(url);
      if (params != null) {
        uri = uri.replace(queryParameters: params);
      }

      final response =
          await http.get(uri, headers: headers).timeout(_requestTimeout);
      return _processResponse(response);
    } on TimeoutException {
      throw Exception(_networkErrorMessage);
    } on http.ClientException {
      throw Exception(_networkErrorMessage);
    } on SocketException {
      throw Exception(_networkErrorMessage);
    }
  }

  dynamic _processResponse(http.Response response) {
    if (response.body.isEmpty) {
      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {'success': true, 'data': null};
      } else {
        throw Exception('Server returned HTTP ${response.statusCode}');
      }
    }

    final dynamic body;
    try {
      body = jsonDecode(response.body);
    } on FormatException {
      throw Exception('Server returned an invalid response.');
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return body;
    } else {
      String message = 'An error occurred';
      if (body is Map && body.containsKey('message')) {
        message = body['message']?.toString() ?? message;
      } else if (body is String) {
        message = body;
      }
      throw Exception(message);
    }
  }

  String get _networkErrorMessage =>
      'Cannot reach backend at ${ApiEndpoints.baseUrl}. Make sure the phone is on the same Wi-Fi as the server and TCP port 8080 is allowed.';
}

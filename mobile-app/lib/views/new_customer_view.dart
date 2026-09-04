import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/customer_provider.dart';
import '../services/api_service.dart';
import '../config/api_endpoints.dart';

class NewCustomerView extends StatefulWidget {
  const NewCustomerView({Key? key}) : super(key: key);

  @override
  State<NewCustomerView> createState() => _NewCustomerViewState();
}

class _NewCustomerViewState extends State<NewCustomerView> {
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  List<dynamic> _villages = [];
  int? _selectedVillageId;
  bool _loadingVillages = true;

  @override
  void initState() {
    super.initState();
    _fetchVillages();
  }

  void _fetchVillages() async {
    try {
      final apiService = ApiService();
      final res = await apiService.get(ApiEndpoints.villages);
      setState(() {
        _villages = res['data'];
        if (_villages.isNotEmpty) {
          _selectedVillageId = _villages[0]['id'];
        }
        _loadingVillages = false;
      });
    } catch (e) {
      setState(() => _loadingVillages = false);
    }
  }

  void _handleRegister() async {
    if (_formKey.currentState!.validate() && _selectedVillageId != null) {
      final customerProvider = Provider.of<CustomerProvider>(context, listen: false);
      try {
        final customer = await customerProvider.registerCustomer(
          fullName: _fullNameController.text.trim(),
          phoneNumber: _phoneController.text.trim(),
          address: _addressController.text.trim(),
          villageId: _selectedVillageId!,
        );

        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Registered: ${customer?.fullName ?? ''} (${customer?.customerCode ?? ''})')),
          );
          Navigator.pop(context);
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: ${e.toString().replaceAll('Exception: ', '')}')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final customerProvider = Provider.of<CustomerProvider>(context);

    return Scaffold(
      appBar: AppBar(title: const Text('Register New Household')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              TextFormField(
                controller: _fullNameController,
                decoration: const InputDecoration(
                  labelText: 'Full Name',
                  prefixIcon: Icon(Icons.person),
                ),
                validator: (v) => v!.isEmpty ? 'Enter full name' : null,
              ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _phoneController,
                keyboardType: TextInputType.phone,
                decoration: const InputDecoration(
                  labelText: 'Phone Number',
                  prefixIcon: Icon(Icons.phone),
                ),
                validator: (v) => v!.isEmpty ? 'Enter phone number' : null,
              ),
              const SizedBox(height: 16),

              _loadingVillages
                  ? const CircularProgressIndicator()
                  : DropdownButtonFormField<int>(
                      value: _selectedVillageId,
                      decoration: const InputDecoration(
                        labelText: 'Village / Area Sector',
                        prefixIcon: Icon(Icons.map),
                      ),
                      items: _villages
                          .map(
                            (v) => DropdownMenuItem<int>(
                              value: v['id'],
                              child: Text(v['name']),
                            ),
                          )
                          .toList(),
                      onChanged: (val) {
                        setState(() => _selectedVillageId = val);
                      },
                    ),
              const SizedBox(height: 16),

              TextFormField(
                controller: _addressController,
                maxLines: 3,
                decoration: const InputDecoration(
                  labelText: 'Full Address',
                  prefixIcon: Icon(Icons.location_on),
                ),
                validator: (v) => v!.isEmpty ? 'Enter address' : null,
              ),
              const SizedBox(height: 28),

              ElevatedButton(
                onPressed: customerProvider.isLoading ? null : _handleRegister,
                child: customerProvider.isLoading
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Text('Register Household'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

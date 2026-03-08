import 'package:flutter/material.dart';
import 'package:conductor_app/services/api_service.dart';
import 'package:conductor_app/models/booking.dart';
import 'package:conductor_app/screens/ticket_verification_screen.dart';
import 'package:provider/provider.dart';
import 'package:conductor_app/providers/booking_provider.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({Key? key}) : super(key: key);

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _searchController = TextEditingController();
  
  List<dynamic> _searchResults = [];
  bool _isLoading = false;
  String _searchType = 'all';
  String? _error;

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _performSearch() async {
    final query = _searchController.text.trim();
    
    if (query.isEmpty || query.length < 2) {
      setState(() {
        _error = 'Please enter at least 2 characters';
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
      _searchResults = [];
    });

    try {
      final results = await _apiService.searchBookings(query, type: _searchType);
      
      setState(() {
        _searchResults = results;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  void _viewBookingDetails(dynamic bookingData) async {
    try {
      final booking = Booking.fromJson(bookingData);
      final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
      bookingProvider.clearCurrentBooking();
      
      // Set current booking
      final response = {
        'success': true,
        'data': {'booking': bookingData},
        'requires_payment': booking.isPayOnBus,
      };
      
      // Manually set the booking
      await bookingProvider.verifyQR(
        '{"booking_reference": "${booking.bookingReference}"}',
      );
      
      if (mounted) {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => const TicketVerificationScreen(),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error: ${e.toString()}'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Search Passengers'),
      ),
      body: Column(
        children: [
          // Search Box
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.grey[100],
            child: Column(
              children: [
                TextField(
                  controller: _searchController,
                  decoration: InputDecoration(
                    hintText: 'Search by name, reference, seat, or phone...',
                    prefixIcon: const Icon(Icons.search),
                    suffixIcon: _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {
                                _searchResults = [];
                                _error = null;
                              });
                            },
                          )
                        : null,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                    filled: true,
                    fillColor: Colors.white,
                  ),
                  onChanged: (value) {
                    setState(() {});
                  },
                  onSubmitted: (_) => _performSearch(),
                ),
                
                const SizedBox(height: 12),
                
                // Search Type Selector
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildSearchTypeChip('All', 'all'),
                      _buildSearchTypeChip('Reference', 'reference'),
                      _buildSearchTypeChip('Name', 'name'),
                      _buildSearchTypeChip('Seat', 'seat'),
                      _buildSearchTypeChip('Phone', 'phone'),
                    ],
                  ),
                ),
                
                const SizedBox(height: 12),
                
                // Search Button
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: _isLoading ? null : _performSearch,
                    icon: const Icon(Icons.search),
                    label: const Text('Search'),
                    style: ElevatedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
          ),
          
          // Results
          Expanded(
            child: _buildResults(),
          ),
        ],
      ),
    );
  }

  Widget _buildSearchTypeChip(String label, String value) {
    final isSelected = _searchType == value;
    
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _searchType = value;
          });
        },
        backgroundColor: Colors.white,
        selectedColor: Theme.of(context).colorScheme.primary.withOpacity(0.2),
        checkmarkColor: Theme.of(context).colorScheme.primary,
      ),
    );
  }

  Widget _buildResults() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
            const SizedBox(height: 16),
            Text(
              _error!,
              style: const TextStyle(fontSize: 16),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _performSearch,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    if (_searchResults.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.search, size: 64, color: Colors.grey[400]),
            const SizedBox(height: 16),
            Text(
              _searchController.text.isEmpty
                  ? 'Enter search query above'
                  : 'No results found',
              style: TextStyle(fontSize: 16, color: Colors.grey[600]),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: _searchResults.length,
      itemBuilder: (context, index) {
        final booking = _searchResults[index];
        return _buildBookingCard(booking);
      },
    );
  }

  Widget _buildBookingCard(dynamic booking) {
    final paymentStatus = booking['payment_status'];
    final verificationStatus = booking['verification_status'];
    
    Color statusColor;
    if (verificationStatus == 'used') {
      statusColor = Colors.blue;
    } else if (paymentStatus == 'completed') {
      statusColor = Colors.green;
    } else if (paymentStatus == 'pay_on_bus') {
      statusColor = Colors.orange;
    } else {
      statusColor = Colors.grey;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _viewBookingDetails(booking),
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  CircleAvatar(
                    backgroundColor: statusColor.withOpacity(0.2),
                    child: Icon(
                      Icons.person,
                      color: statusColor,
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          booking['passenger_name'] ?? 'N/A',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        Text(
                          'Seat ${booking['seat_number']}',
                          style: TextStyle(
                            color: Colors.grey[600],
                            fontSize: 14,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.2),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      verificationStatus == 'used' ? 'Used' : 'Pending',
                      style: TextStyle(
                        color: statusColor,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
              
              const Divider(height: 24),
              
              Row(
                children: [
                  Icon(Icons.route, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      '${booking['origin']} → ${booking['destination']}',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 4),
              
              Row(
                children: [
                  Icon(Icons.calendar_today, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    '${booking['journey_date']} at ${booking['departure_time']}',
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
              
              const SizedBox(height: 4),
              
              Row(
                children: [
                  Icon(Icons.confirmation_number, size: 16, color: Colors.grey[600]),
                  const SizedBox(width: 4),
                  Text(
                    booking['booking_reference'] ?? 'N/A',
                    style: TextStyle(
                      color: Colors.grey[600],
                      fontFamily: 'monospace',
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
              
              const SizedBox(height: 8),
              
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Rs. ${booking['total_amount']}',
                    style: TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                      color: statusColor,
                    ),
                  ),
                  Text(
                    paymentStatus == 'completed' ? '✅ Paid' : '💰 Pay on Bus',
                    style: TextStyle(
                      color: statusColor,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}
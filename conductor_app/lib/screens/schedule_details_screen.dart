import 'package:flutter/material.dart';
import 'package:conductor_app/services/api_service.dart';
import 'package:conductor_app/models/booking.dart';

class ScheduleDetailsScreen extends StatefulWidget {
  final int scheduleId;
  final String routeName;

  const ScheduleDetailsScreen({
    Key? key,
    required this.scheduleId,
    required this.routeName,
  }) : super(key: key);

  @override
  State<ScheduleDetailsScreen> createState() => _ScheduleDetailsScreenState();
}

class _ScheduleDetailsScreenState extends State<ScheduleDetailsScreen> {
  final ApiService _apiService = ApiService();
  
  Map<String, dynamic>? _scheduleData;
  List<Booking> _bookings = [];
  Map<String, dynamic>? _statistics;
  bool _isLoading = true;
  String? _error;
  
  String _filterPaymentStatus = 'all';
  String _filterVerificationStatus = 'all';

  @override
  void initState() {
    super.initState();
    _loadScheduleDetails();
  }

  Future<void> _loadScheduleDetails() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final data = await _apiService.getScheduleDetails(widget.scheduleId);
      
      setState(() {
        _scheduleData = data['schedule'];
        _statistics = data['statistics'];
        _bookings = (data['bookings'] as List)
            .map((b) => Booking.fromJson(b))
            .toList();
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString().replaceAll('Exception: ', '');
        _isLoading = false;
      });
    }
  }

  List<Booking> get _filteredBookings {
    return _bookings.where((booking) {
      if (_filterPaymentStatus != 'all' && 
          booking.paymentStatus != _filterPaymentStatus) {
        return false;
      }
      if (_filterVerificationStatus != 'all' && 
          booking.verificationStatus != _filterVerificationStatus) {
        return false;
      }
      return true;
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.routeName),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadScheduleDetails,
          ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }

    if (_error != null) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.error_outline, size: 64, color: Colors.red[300]),
            const SizedBox(height: 16),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadScheduleDetails,
              child: const Text('Retry'),
            ),
          ],
        ),
      );
    }

    return RefreshIndicator(
      onRefresh: _loadScheduleDetails,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildScheduleInfo(),
            const SizedBox(height: 16),
            _buildStatistics(),
            const SizedBox(height: 16),
            _buildFilters(),
            const SizedBox(height: 16),
            _buildPassengerList(),
          ],
        ),
      ),
    );
  }

  Widget _buildScheduleInfo() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.directions_bus, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    '${_scheduleData!['bus_number']} - ${_scheduleData!['bus_name']}',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            const Divider(height: 24),
            _buildInfoRow('Route', '${_scheduleData!['origin']} → ${_scheduleData!['destination']}'),
            _buildInfoRow('Date', _scheduleData!['journey_date'].toString().split(' ')[0]),
            _buildInfoRow('Departure', _scheduleData!['departure_time'].toString()),
            _buildInfoRow('Arrival', _scheduleData!['arrival_time'].toString()),
            _buildInfoRow('Bus Type', _scheduleData!['bus_type']),
          ],
        ),
      ),
    );
  }

  Widget _buildStatistics() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Statistics',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    'Total Seats',
                    _statistics!['total_seats'].toString(),
                    Icons.event_seat,
                    Colors.blue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    'Booked',
                    _statistics!['occupied_seats'].toString(),
                    Icons.check_circle,
                    Colors.green,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    'Available',
                    _statistics!['available_seats'].toString(),
                    Icons.event_available,
                    Colors.orange,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    'Paid',
                    _statistics!['paid_count'].toString(),
                    Icons.payment,
                    Colors.green,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    'Pay on Bus',
                    _statistics!['pay_on_bus_count'].toString(),
                    Icons.money,
                    Colors.orange,
                  ),
                ),
              ],
            ),
            
            const SizedBox(height: 12),
            
            Row(
              children: [
                Expanded(
                  child: _buildStatCard(
                    'Used',
                    _statistics!['used_count'].toString(),
                    Icons.done_all,
                    Colors.blue,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: _buildStatCard(
                    'Pending',
                    _statistics!['pending_verification_count'].toString(),
                    Icons.pending,
                    Colors.grey,
                  ),
                ),
              ],
            ),
            
            const Divider(height: 24),
            
            _buildRevenueRow('Total Revenue', _statistics!['total_revenue'], Colors.green),
            _buildRevenueRow('Pending Collection', _statistics!['pending_revenue'], Colors.orange),
          ],
        ),
      ),
    );
  }

  Widget _buildStatCard(String label, String value, IconData icon, Color color) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            label,
            style: TextStyle(
              fontSize: 12,
              color: Colors.grey[600],
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildRevenueRow(String label, dynamic amount, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(fontSize: 14),
          ),
          Text(
            'Rs. ${double.parse(amount.toString()).toStringAsFixed(2)}',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildFilters() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Filters',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            
            // Payment Status Filter
            const Text('Payment Status', style: TextStyle(fontSize: 14)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                _buildFilterChip('All', 'all', _filterPaymentStatus, (value) {
                  setState(() => _filterPaymentStatus = value);
                }),
                _buildFilterChip('Paid', 'completed', _filterPaymentStatus, (value) {
                  setState(() => _filterPaymentStatus = value);
                }),
                _buildFilterChip('Pay on Bus', 'pay_on_bus', _filterPaymentStatus, (value) {
                  setState(() => _filterPaymentStatus = value);
                }),
              ],
            ),
            
            const SizedBox(height: 12),
            
            // Verification Status Filter
            const Text('Verification Status', style: TextStyle(fontSize: 14)),
            const SizedBox(height: 8),
            Wrap(
              spacing: 8,
              children: [
                _buildFilterChip('All', 'all', _filterVerificationStatus, (value) {
                  setState(() => _filterVerificationStatus = value);
                }),
                _buildFilterChip('Used', 'used', _filterVerificationStatus, (value) {
                  setState(() => _filterVerificationStatus = value);
                }),
                _buildFilterChip('Pending', 'pending', _filterVerificationStatus, (value) {
                  setState(() => _filterVerificationStatus = value);
                }),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildFilterChip(String label, String value, String currentValue, Function(String) onSelected) {
    final isSelected = currentValue == value;
    return FilterChip(
      label: Text(label),
      selected: isSelected,
      onSelected: (selected) {
        if (selected) {
          onSelected(value);
        }
      },
      backgroundColor: Colors.white,
      selectedColor: Theme.of(context).colorScheme.primary.withOpacity(0.2),
    );
  }

  Widget _buildPassengerList() {
    final filtered = _filteredBookings;
    
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Passengers (${filtered.length})',
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
          ],
        ),
        const SizedBox(height: 12),
        
        if (filtered.isEmpty)
          const Card(
            child: Padding(
              padding: EdgeInsets.all(32),
              child: Center(
                child: Text('No passengers match the filters'),
              ),
            ),
          )
        else
          ListView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: filtered.length,
            itemBuilder: (context, index) {
              return _buildPassengerCard(filtered[index]);
            },
          ),
      ],
    );
  }

  Widget _buildPassengerCard(Booking booking) {
    Color statusColor;
    if (booking.isUsed) {
      statusColor = Colors.blue;
    } else if (booking.isPaid) {
      statusColor = Colors.green;
    } else {
      statusColor = Colors.orange;
    }

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: statusColor.withOpacity(0.2),
          child: Text(
            booking.seatNumber,
            style: TextStyle(
              color: statusColor,
              fontWeight: FontWeight.bold,
            ),
          ),
        ),
        title: Text(
          booking.passengerName,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Text(
          '${booking.passengerPhone}\n${booking.bookingReference}',
          style: const TextStyle(fontSize: 12),
        ),
        trailing: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            Text(
              'Rs. ${booking.totalAmount}',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                color: statusColor,
              ),
            ),
            Text(
              booking.isUsed ? 'Used' : booking.isPaid ? 'Paid' : 'Pay on Bus',
              style: TextStyle(
                fontSize: 12,
                color: statusColor,
              ),
            ),
          ],
        ),
        isThreeLine: true,
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(color: Colors.grey[600]),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }
}
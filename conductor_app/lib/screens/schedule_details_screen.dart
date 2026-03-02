import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:conductor_app/providers/booking_provider.dart';
import 'package:conductor_app/widgets/booking_card.dart';

class ScheduleDetailsScreen extends StatefulWidget {
  final int scheduleId;
  final Map<String, dynamic> schedule;

  const ScheduleDetailsScreen({
    Key? key,
    required this.scheduleId,
    required this.schedule,
  }) : super(key: key);

  @override
  State<ScheduleDetailsScreen> createState() => _ScheduleDetailsScreenState();
}

class _ScheduleDetailsScreenState extends State<ScheduleDetailsScreen> {
  @override
  void initState() {
    super.initState();
    _loadBookings();
  }

  Future<void> _loadBookings() async {
    await Provider.of<BookingProvider>(context, listen: false)
        .fetchScheduleBookings(widget.scheduleId);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Schedule Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadBookings,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadBookings,
        child: Consumer<BookingProvider>(
          builder: (context, provider, child) {
            return CustomScrollView(
              slivers: [
                // Schedule Info Header
                SliverToBoxAdapter(
                  child: Card(
                    margin: const EdgeInsets.all(16),
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.schedule['route_name'] ?? 'Unknown Route',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 8),
                          _buildInfoRow(
                            Icons.route,
                            '${widget.schedule['origin']} → ${widget.schedule['destination']}',
                          ),
                          _buildInfoRow(
                            Icons.directions_bus,
                            '${widget.schedule['bus_number']} - ${widget.schedule['bus_type']}',
                          ),
                          _buildInfoRow(
                            Icons.access_time,
                            '${widget.schedule['departure_time']} - ${widget.schedule['arrival_time']}',
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                // Bookings List Header
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'Bookings (${provider.bookings.length})',
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (!provider.isLoading)
                          Chip(
                            label: Text(
                              '${provider.bookings.where((b) => b.isUsed).length} verified',
                              style: const TextStyle(fontSize: 12),
                            ),
                            backgroundColor: Colors.green.withOpacity(0.2),
                          ),
                      ],
                    ),
                  ),
                ),

                // Loading or Error State
                if (provider.isLoading)
                  const SliverFillRemaining(
                    child: Center(child: CircularProgressIndicator()),
                  )
                else if (provider.error != null)
                  SliverFillRemaining(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.error_outline, size: 64, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text(
                            provider.error!,
                            style: TextStyle(color: Colors.grey[600]),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _loadBookings,
                            child: const Text('Retry'),
                          ),
                        ],
                      ),
                    ),
                  )
                else if (provider.bookings.isEmpty)
                  SliverFillRemaining(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.inbox, size: 64, color: Colors.grey[400]),
                          const SizedBox(height: 16),
                          Text(
                            'No bookings for this schedule',
                            style: TextStyle(
                              fontSize: 16,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  // Bookings List
                  SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final booking = provider.bookings[index];
                        return BookingCard(booking: booking);
                      },
                      childCount: provider.bookings.length,
                    ),
                  ),
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String text) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Colors.grey[600]),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              text,
              style: TextStyle(
                fontSize: 14,
                color: Colors.grey[800],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
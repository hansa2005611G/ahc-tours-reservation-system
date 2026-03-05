import 'package:flutter/material.dart';
import 'package:conductor_app/models/booking.dart';
// ignore: unused_import
import 'package:intl/intl.dart';

class BookingCard extends StatelessWidget {
  final Booking booking;
  final VoidCallback? onTap;

  const BookingCard({
    Key? key,
    required this.booking,
    this.onTap,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          booking.passengerName,
                          style: const TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          booking.bookingReference,
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey[600],
                          ),
                        ),
                      ],
                    ),
                  ),
                  _buildStatusChip(),
                ],
              ),
              const Divider(height: 24),
              _buildInfoRow(Icons.route, '${booking.origin} → ${booking.destination}'),
              const SizedBox(height: 8),
              _buildInfoRow(Icons.event_seat, 'Seat ${booking.seatNumber}'),
              const SizedBox(height: 8),
              _buildInfoRow(
                Icons.access_time,
                '${booking.departureTime} - ${booking.arrivalTime}',
              ),
              const SizedBox(height: 8),
              _buildInfoRow(
                Icons.directions_bus,
                '${booking.busNumber} (${booking.busType})',
              ),
              const SizedBox(height: 8),
              _buildInfoRow(
                Icons.payments,
                'Rs. ${booking.totalAmount}',
                color: booking.isPayOnBus ? Colors.orange : Colors.green,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatusChip() {
    Color color;
    String label;
    IconData icon;

    if (booking.isUsed) {
      color = Colors.green;
      label = 'Used';
      icon = Icons.check_circle;
    } else if (booking.isCancelled) {
      color = Colors.red;
      label = 'Cancelled';
      icon = Icons.cancel;
    } else if (booking.isPayOnBus) {
      color = Colors.orange;
      label = 'Pay on Bus';
      icon = Icons.monetization_on;
    } else {
      color = Colors.blue;
      label = 'Valid';
      icon = Icons.verified;
    }

    return Chip(
      label: Text(
        label,
        style: const TextStyle(
          color: Colors.white,
          fontSize: 12,
          fontWeight: FontWeight.bold,
        ),
      ),
      avatar: Icon(icon, color: Colors.white, size: 16),
      backgroundColor: color,
      padding: EdgeInsets.zero,
    );
  }

  Widget _buildInfoRow(IconData icon, String text, {Color? color}) {
    return Row(
      children: [
        Icon(icon, size: 16, color: color ?? Colors.grey[600]),
        const SizedBox(width: 8),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 14,
              color: color ?? Colors.grey[800],
              fontWeight: color != null ? FontWeight.bold : FontWeight.normal,
            ),
          ),
        ),
      ],
    );
  }
}
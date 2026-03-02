import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:conductor_app/providers/booking_provider.dart';
import 'package:conductor_app/widgets/custom_button.dart';
import 'package:intl/intl.dart';
import 'package:fluttertoast/fluttertoast.dart';

class TicketVerificationScreen extends StatefulWidget {
  const TicketVerificationScreen({Key? key}) : super(key: key);

  @override
  State<TicketVerificationScreen> createState() => _TicketVerificationScreenState();
}

class _TicketVerificationScreenState extends State<TicketVerificationScreen> {
  bool _paymentReceived = false;

  Future<void> _handleMarkAsUsed() async {
    final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
    final booking = bookingProvider.currentBooking;

    if (booking == null) return;

    // If ticket is pay on bus, confirm payment
    if (booking.isPayOnBus) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Confirm Payment'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Have you received the payment?'),
              const SizedBox(height: 16),
              Text(
                'Amount: Rs. ${booking.totalAmount}',
                style: const TextStyle(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: Colors.green,
                ),
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Payment Received'),
            ),
          ],
        ),
      );

      if (confirmed != true) return;
      _paymentReceived = true;
    }

    // Mark ticket as used
    final success = await bookingProvider.markAsUsed(
      booking.bookingId,
      _paymentReceived,
    );

    if (!mounted) return;

    if (success) {
      Fluttertoast.showToast(
        msg: "✅ Ticket verified successfully!",
        toastLength: Toast.LENGTH_LONG,
        gravity: ToastGravity.TOP,
        backgroundColor: Colors.green,
        textColor: Colors.white,
        fontSize: 16.0,
      );

      Navigator.pop(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(bookingProvider.error ?? 'Failed to mark ticket'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Ticket Verification'),
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
      ),
      body: Consumer<BookingProvider>(
        builder: (context, provider, child) {
          final booking = provider.currentBooking;

          if (booking == null) {
            return const Center(
              child: Text('No booking data'),
            );
          }

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Success Icon
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.verified,
                    size: 80,
                    color: Colors.green,
                  ),
                ),

                const SizedBox(height: 24),

                // Valid Ticket Message
                Text(
                  'Valid Ticket ✓',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: Colors.green,
                      ),
                ),

                const SizedBox(height: 8),

                Text(
                  booking.bookingReference,
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 16,
                    color: Colors.grey[600],
                    fontFamily: 'monospace',
                  ),
                ),

                const SizedBox(height: 32),

                // Passenger Details Card
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Passenger Details',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const Divider(height: 24),
                        _buildDetailRow(Icons.person, 'Name', booking.passengerName),
                        _buildDetailRow(Icons.phone, 'Phone', booking.passengerPhone),
                        _buildDetailRow(Icons.email, 'Email', booking.passengerEmail),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Journey Details Card
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Journey Details',
                          style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                fontWeight: FontWeight.bold,
                              ),
                        ),
                        const Divider(height: 24),
                        _buildDetailRow(
                          Icons.route,
                          'Route',
                          '${booking.origin} → ${booking.destination}',
                        ),
                        _buildDetailRow(
                          Icons.calendar_today,
                          'Date',
                          DateFormat('dd MMM yyyy').format(
                            DateTime.parse(booking.journeyDate),
                          ),
                        ),
                        _buildDetailRow(
                          Icons.access_time,
                          'Time',
                          '${booking.departureTime} - ${booking.arrivalTime}',
                        ),
                        _buildDetailRow(
                          Icons.event_seat,
                          'Seat Number',
                          booking.seatNumber,
                        ),
                        _buildDetailRow(
                          Icons.directions_bus,
                          'Bus',
                          '${booking.busNumber} (${booking.busType})',
                        ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 16),

                // Payment Details Card
                Card(
                  color: booking.isPayOnBus
                      ? Colors.orange.withOpacity(0.1)
                      : Colors.green.withOpacity(0.1),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              booking.isPayOnBus
                                  ? Icons.monetization_on
                                  : Icons.check_circle,
                              color: booking.isPayOnBus ? Colors.orange : Colors.green,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              'Payment Details',
                              style: Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.bold,
                                  ),
                            ),
                          ],
                        ),
                        const Divider(height: 24),
                        _buildDetailRow(
                          Icons.payments,
                          'Amount',
                          'Rs. ${booking.totalAmount}',
                        ),
                        _buildDetailRow(
                          Icons.info,
                          'Status',
                          booking.isPayOnBus ? 'Pay on Bus' : 'Already Paid',
                        ),
                        if (booking.isPayOnBus)
                          Padding(
                            padding: const EdgeInsets.only(top: 12),
                            child: Container(
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                color: Colors.orange.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Row(
                                children: [
                                  const Icon(
                                    Icons.warning_amber,
                                    color: Colors.orange,
                                    size: 20,
                                  ),
                                  const SizedBox(width: 8),
                                  Expanded(
                                    child: Text(
                                      'Collect Rs. ${booking.totalAmount} from passenger',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        color: Colors.orange,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 32),

                // Mark as Used Button
                CustomButton(
                  text: booking.isPayOnBus
                      ? 'Collect Payment & Mark as Used'
                      : 'Mark as Used',
                  icon: Icons.check_circle,
                  onPressed: _handleMarkAsUsed,
                  isLoading: provider.isLoading,
                  color: Colors.green,
                ),

                const SizedBox(height: 16),

                // Cancel Button
                OutlinedButton(
                  onPressed: () {
                    provider.clearCurrentBooking();
                    Navigator.pop(context);
                  },
                  style: OutlinedButton.styleFrom(
                    padding: const EdgeInsets.symmetric(vertical: 16),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: const Text('Cancel'),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildDetailRow(IconData icon, String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 20, color: Colors.grey[600]),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
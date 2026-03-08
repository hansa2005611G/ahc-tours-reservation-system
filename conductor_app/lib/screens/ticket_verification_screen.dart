import 'package:conductor_app/screens/qr_scanner_screen.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:conductor_app/providers/booking_provider.dart';
import 'package:conductor_app/models/booking.dart';

class TicketVerificationScreen extends StatelessWidget {
  const TicketVerificationScreen({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Consumer<BookingProvider>(
      builder: (context, bookingProvider, child) {
        final booking = bookingProvider.currentBooking;

        if (booking == null) {
          return Scaffold(
            appBar: AppBar(title: const Text('Error')),
            body: const Center(
              child: Text('No booking data available'),
            ),
          );
        }

        return Scaffold(
          appBar: AppBar(
            title: const Text('Ticket Verification'),
            backgroundColor: Colors.green,
          ),
          body: SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Success Card
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.green, width: 2),
                  ),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.check_circle,
                        color: Colors.green,
                        size: 56,
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              '✅ Ticket Verified!',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.bold,
                                color: Colors.green,
                              ),
                            ),
                            if (booking.isPayOnBus)
                              const Text(
                                '💰 Payment Required on Bus',
                                style: TextStyle(
                                  fontSize: 16,
                                  color: Colors.orange,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
                
                const SizedBox(height: 24),
                
                // Passenger Info
                _buildSection(
                  title: '👤 Passenger Information',
                  children: [
                    _buildRow('Name', booking.passengerName),
                    _buildRow('Email', booking.passengerEmail),
                    _buildRow('Phone', booking.passengerPhone),
                    _buildRow('Seat', booking.seatNumber),
                  ],
                ),
                
                const SizedBox(height: 16),
                
                // Journey Info
                _buildSection(
                  title: '🚌 Journey Details',
                  children: [
                    _buildRow('From', booking.origin),
                    _buildRow('To', booking.destination),
                    _buildRow('Date', _formatDate(booking.journeyDate)),
                    _buildRow('Departure', booking.departureTime),
                    _buildRow('Arrival', booking.arrivalTime),
                    _buildRow('Bus', '${booking.busNumber} (${booking.busType})'),
                  ],
                ),
                
                const SizedBox(height: 16),
                
                // Payment Info
                _buildSection(
                  title: '💳 Payment Information',
                  children: [
                    _buildRow('Amount', 'Rs. ${booking.totalAmount}'),
                    _buildRow('Status', _getPaymentStatusText(booking.paymentStatus)),
                    _buildRow('Reference', booking.bookingReference),
                  ],
                ),
                
                const SizedBox(height: 32),
                
                // Action Buttons
                if (!booking.isUsed) ...[
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: ElevatedButton.icon(
                      onPressed: () => _markAsUsed(context, booking),
                      icon: const Icon(Icons.check, size: 24),
                      label: Text(
                        booking.isPayOnBus 
                            ? 'Collect Payment & Mark as Used'
                            : 'Mark as Used',
                        style: const TextStyle(fontSize: 18),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.green,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                  
                  const SizedBox(height: 12),
                  
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: OutlinedButton.icon(
                      onPressed: () => Navigator.pop(context),
                      icon: const Icon(Icons.close),
                      label: const Text(
                        'Cancel',
                        style: TextStyle(fontSize: 18),
                      ),
                      style: OutlinedButton.styleFrom(
                        side: const BorderSide(color: Colors.red, width: 2),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                    ),
                  ),
                ] else ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.orange.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.orange),
                    ),
                    child: const Row(
                      children: [
                        Icon(Icons.warning, color: Colors.orange),
                        SizedBox(width: 12),
                        Expanded(
                          child: Text(
                            'This ticket has already been used',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                              color: Colors.orange,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildSection({required String title, required List<Widget> children}) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.grey.withOpacity(0.2),
            spreadRadius: 1,
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black87,
            ),
          ),
          const Divider(height: 20),
          ...children,
        ],
      ),
    );
  }

  Widget _buildRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 14,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.w600,
                color: Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _formatDate(String date) {
    try {
      final DateTime parsed = DateTime.parse(date);
      return '${parsed.year}-${parsed.month.toString().padLeft(2, '0')}-${parsed.day.toString().padLeft(2, '0')}';
    } catch (e) {
      return date;
    }
  }

  String _getPaymentStatusText(String status) {
    switch (status) {
      case 'completed':
        return '✅ Paid';
      case 'pay_on_bus':
        return '💰 Pay on Bus';
      case 'pending':
        return '⏳ Pending';
      default:
        return status;
    }
  }

  void _markAsUsed(BuildContext context, Booking booking) {
  showDialog(
    context: context,
    builder: (context) => AlertDialog(
      title: const Text('Mark as Used'),
      content: Text(
        booking.isPayOnBus
            ? 'Have you collected Rs. ${booking.totalAmount} from the passenger?'
            : 'Mark this ticket as used?',
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: () async {
            Navigator.pop(context); // Close dialog
            
            final bookingProvider = Provider.of<BookingProvider>(context, listen: false);
            
            // Show loading indicator
            showDialog(
              context: context,
              barrierDismissible: false,
              builder: (context) => const Center(
                child: CircularProgressIndicator(),
              ),
            );
            
            final success = await bookingProvider.markTicketAsUsed(
              booking.bookingId,
              booking.isPayOnBus,
            );

            if (context.mounted) {
              Navigator.pop(context); // Close loading dialog
              
              if (success) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('✅ Ticket marked as used successfully!'),
                    backgroundColor: Colors.green,
                    duration: Duration(seconds: 2),
                  ),
                );
                
                // Navigate back to scanner (pop twice to go back to home, then push scanner)
                Navigator.of(context).popUntil((route) => route.isFirst);
                
                // Wait a moment then navigate to scanner
                Future.delayed(const Duration(milliseconds: 500), () {
                  if (context.mounted) {
                    Navigator.push(
                      context,
                      MaterialPageRoute(
                        builder: (context) => const QRScannerScreen(),
                      ),
                    );
                  }
                });
              } else {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(bookingProvider.error ?? '❌ Failed to mark as used'),
                    backgroundColor: Colors.red,
                    duration: const Duration(seconds: 3),
                  ),
                );
              }
            }
          },
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.green,
          ),
          child: const Text('Confirm'),
        ),
      ],
    ),
  );
}
}
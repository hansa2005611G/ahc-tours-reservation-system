class Booking {
  final int bookingId;
  final String bookingReference;
  final String passengerName;
  final String passengerEmail;
  final String passengerPhone;
  final String seatNumber;
  final String totalAmount;
  final String paymentStatus;
  final String verificationStatus;
  final String journeyDate;
  final String departureTime;
  final String arrivalTime;
  final String origin;
  final String destination;
  final String busNumber;
  final String busType;
  final String? qrCode;

  Booking({
    required this.bookingId,
    required this.bookingReference,
    required this.passengerName,
    required this.passengerEmail,
    required this.passengerPhone,
    required this.seatNumber,
    required this.totalAmount,
    required this.paymentStatus,
    required this.verificationStatus,
    required this.journeyDate,
    required this.departureTime,
    required this.arrivalTime,
    required this.origin,
    required this.destination,
    required this.busNumber,
    required this.busType,
    this.qrCode,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      bookingId: _toInt(json['booking_id']),
      bookingReference: json['booking_reference']?.toString() ?? '',
      passengerName: json['passenger_name']?.toString() ?? '',
      passengerEmail: json['passenger_email']?.toString() ?? '',
      passengerPhone: json['passenger_phone']?.toString() ?? '',
      seatNumber: json['seat_number']?.toString() ?? '',
      totalAmount: json['total_amount']?.toString() ?? '0',
      paymentStatus: json['payment_status']?.toString() ?? '',
      verificationStatus: json['verification_status']?.toString() ?? '',
      journeyDate: json['journey_date']?.toString() ?? '',
      departureTime: json['departure_time']?.toString() ?? '',
      arrivalTime: json['arrival_time']?.toString() ?? '',
      origin: json['origin']?.toString() ?? '',
      destination: json['destination']?.toString() ?? '',
      busNumber: json['bus_number']?.toString() ?? '',
      busType: json['bus_type']?.toString() ?? '',
      qrCode: json['qr_code']?.toString(),
    );
  }

  static int _toInt(dynamic value) {
    if (value == null) return 0;
    if (value is int) return value;
    if (value is String) return int.tryParse(value) ?? 0;
    if (value is double) return value.toInt();
    return 0;
  }

  // ✅ Added
  bool get isPaid {
    final p = paymentStatus.trim().toLowerCase();
    return p == 'paid' || p == 'completed' || p == 'success';
  }

  bool get isPayOnBus => paymentStatus.trim().toLowerCase() == 'pay_on_bus';
  bool get isUsed => verificationStatus.trim().toLowerCase() == 'used';
  bool get isCancelled => paymentStatus.trim().toLowerCase() == 'refunded';

  @override
  String toString() {
    return 'Booking(id: $bookingId, ref: $bookingReference, passenger: $passengerName)';
  }
}
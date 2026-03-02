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
      bookingId: json['booking_id'],
      bookingReference: json['booking_reference'],
      passengerName: json['passenger_name'],
      passengerEmail: json['passenger_email'],
      passengerPhone: json['passenger_phone'],
      seatNumber: json['seat_number'],
      totalAmount: json['total_amount'].toString(),
      paymentStatus: json['payment_status'],
      verificationStatus: json['verification_status'],
      journeyDate: json['journey_date'],
      departureTime: json['departure_time'],
      arrivalTime: json['arrival_time'],
      origin: json['origin'],
      destination: json['destination'],
      busNumber: json['bus_number'],
      busType: json['bus_type'],
      qrCode: json['qr_code'],
    );
  }

  bool get isPayOnBus => paymentStatus == 'pay_on_bus';
  bool get isUsed => verificationStatus == 'used';
  bool get isCancelled => paymentStatus == 'refunded';
}
// Validation utility helpers

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^(\+94|0)?[0-9]{9,10}$/;
const SEAT_REGEX = /^[A-Z][0-9]{1,2}$/;
const BOOKING_REF_REGEX = /^AHC-\d+-[A-Z0-9]+$/;

const isValidEmail = (email) => EMAIL_REGEX.test(String(email).trim());

const isValidPhone = (phone) => PHONE_REGEX.test(String(phone).trim());

const isValidSeatNumber = (seat) => SEAT_REGEX.test(String(seat).trim().toUpperCase());

const isValidBookingReference = (ref) => BOOKING_REF_REGEX.test(String(ref).trim());

const isValidPassword = (password) =>
  typeof password === 'string' && password.length >= 8;

module.exports = {
  isValidEmail,
  isValidPhone,
  isValidSeatNumber,
  isValidBookingReference,
  isValidPassword
};

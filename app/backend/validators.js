// Validation rules for a contact. Kept as one module so every route
// (and, if you extend the frontend, the client) applies the same rules.

function isValidName(name) {
  return typeof name === "string" && name.trim().length > 0;
}

function isValidPhone(phone) {
  if (typeof phone !== "string" || !phone.trim()) return false;
  const digitCount = (phone.match(/\d/g) || []).length;
  const onlyAllowedChars = /^[\d+\-() ]+$/.test(phone);
  return onlyAllowedChars && digitCount >= 7 && digitCount <= 15;
}

function isValidEmail(email) {
  if (!email) return true; // optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim());
}

// Returns an array of error strings; empty array means the contact is valid.
function validateContact({ name, phone, email }) {
  const errors = [];
  if (!isValidName(name)) errors.push("Name is required.");
  if (!isValidPhone(phone)) {
    errors.push("Phone must have 7-15 digits (digits, +, -, spaces, parentheses only).");
  }
  if (!isValidEmail(email)) errors.push("Email must look like name@example.com");
  return errors;
}

module.exports = { isValidName, isValidPhone, isValidEmail, validateContact };

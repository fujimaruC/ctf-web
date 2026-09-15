// Input validation utilities

function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function validateUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

function validatePassword(password) {
  return password && password.length >= 8;
}

function validateFlag(flag) {
  return flag && flag.trim().length > 0;
}

function getPasswordStrength(password) {
  let score = 0;
  if (password.length >= 8) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  return score;
}

function getPasswordStrengthLabel(score) {
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return labels[score] || 'Unknown';
}

function validateForm(fields) {
  for (const [name, value] of Object.entries(fields)) {
    if (!value || (typeof value === 'string' && !value.trim())) {
      return { valid: false, field: name, message: `${name} is required` };
    }
  }
  return { valid: true };
}

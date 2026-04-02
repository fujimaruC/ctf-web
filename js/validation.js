// Input validation helpers
const Validators = {
  email: (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  },

  username: (username) => {
    // 3-20 chars, alphanumeric and underscore only
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    return re.test(username);
  },

  password: (password) => {
    // Min 8 chars, at least one letter and one number
    return password.length >= 8 && /[A-Za-z]/.test(password) && /[0-9]/.test(password);
  },

  flag: (flag) => {
    // Must start with FLAG{ and end with }
    return flag.startsWith('FLAG{') && flag.endsWith('}') && flag.length > 6;
  },

  points: (points) => {
    const num = parseInt(points);
    return !isNaN(num) && num >= 1 && num <= 10000;
  },

  challengeTitle: (title) => {
    return title.length >= 3 && title.length <= 100;
  },

  description: (desc) => {
    return desc.length >= 10 && desc.length <= 5000;
  },

  url: (url) => {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  },

  sanitizeInput: (str) => {
    if (!str) return '';
    return str.trim().replace(/[<>]/g, '');
  }
};

// Validation error messages
const ValidationMessages = {
  email: 'Please enter a valid email address.',
  username: 'Username must be 3-20 characters, letters, numbers, and underscores only.',
  password: 'Password must be at least 8 characters with letters and numbers.',
  flag: 'Flag must start with FLAG{ and end with }.',
  points: 'Points must be between 1 and 10,000.',
  challengeTitle: 'Title must be 3-100 characters.',
  description: 'Description must be 10-5,000 characters.',
  url: 'Please enter a valid URL.',
  required: 'This field is required.'
};

// Validate form field
function validateField(fieldId, validatorName) {
  const field = document.getElementById(fieldId);
  const value = field.value.trim();
  const validator = Validators[validatorName];

  if (!validator) return true; // No validator, assume valid

  const isValid = validator(value);
  const errorEl = document.getElementById(`${fieldId}-error`);

  if (!isValid) {
    field.classList.add('error');
    if (errorEl) errorEl.textContent = ValidationMessages[validatorName] || 'Invalid input.';
    return false;
  } else {
    field.classList.remove('error');
    if (errorEl) errorEl.textContent = '';
    return true;
  }
}

// Validate entire form
function validateForm(formId, fields) {
  let isValid = true;
  fields.forEach(field => {
    if (!validateField(field.id, field.validator)) isValid = false;
  });
  return isValid;
}
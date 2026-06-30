type ValidationErrors = Record<string, string>;

export type LoginData = {
  email: string;
  password: string;
};

export type RegistrationData = {
  name: string;
  email: string;
  phone: string;
  password: string;
  university: string;
  studentId: string;
};

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const isValidPhone = (phone: string) => {
  const digits = phone.replace(/\D/g, '');

  return /^\d{11}$/.test(digits);
};

const isValidPassword = (password: string) => Boolean(password && password.length >= 6);

const isValidStudentId = (studentId: string) => Boolean(studentId && studentId.trim().length >= 4);

export const validateRegistration = (data: RegistrationData) => {
  const errors: ValidationErrors = {};

  if (!data.name || data.name.trim().length < 2) {
    errors.name = 'Name must be at least 2 characters';
  }
  if (!isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email';
  }
  if (!isValidPhone(data.phone)) {
    errors.phone = 'Phone number must be exactly 11 digits';
  }
  if (!isValidPassword(data.password)) {
    errors.password = 'Password must be at least 6 characters';
  }
  if (!data.university || data.university.trim().length < 2) {
    errors.university = 'Please select a university';
  }
  if (!isValidStudentId(data.studentId)) {
    errors.studentId = 'Please enter a valid student ID';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

export const validateLogin = (data: LoginData) => {
  const errors: ValidationErrors = {};

  if (!isValidEmail(data.email)) {
    errors.email = 'Please enter a valid email';
  }
  if (!data.password) {
    errors.password = 'Password is required';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
};

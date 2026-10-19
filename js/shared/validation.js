import { storage } from './storage.js';

function labelOrDefault(fieldLabel) {
  return fieldLabel || 'This field';
}

const validators = {
  required(value, fieldLabel = 'This field') {
    const isMissing = value === null || value === undefined ||
      (typeof value === 'string' && value.trim() === '') ||
      (Array.isArray(value) && value.length === 0);
    return isMissing ? `${labelOrDefault(fieldLabel)} is required.` : null;
  },

  minLength(value, minimum, fieldLabel = 'This field') {
    if (value === null || value === undefined || String(value).length < minimum) {
      return `${labelOrDefault(fieldLabel)} must be at least ${minimum} characters.`;
    }
    return null;
  },

  maxLength(value, maximum, fieldLabel = 'This field') {
    if (value !== null && value !== undefined && String(value).length > maximum) {
      return `${labelOrDefault(fieldLabel)} must be at most ${maximum} characters.`;
    }
    return null;
  },

  isEnum(value, allowedValues, fieldLabel = 'This field') {
    if (value === '' || value === null || value === undefined) return null;
    return allowedValues.includes(value)
      ? null
      : `${labelOrDefault(fieldLabel)} must be one of the available options.`;
  },

  isPositiveInt(value, fieldLabel = 'This field') {
    if (value === '' || value === null || value === undefined) return `${labelOrDefault(fieldLabel)} is required.`;
    const numberValue = Number(value);
    return Number.isInteger(numberValue) && numberValue > 0
      ? null
      : `${labelOrDefault(fieldLabel)} must be a positive whole number.`;
  },

  isDate(value, fieldLabel = 'Date') {
    if (!value) return null;
    return !Number.isNaN(Date.parse(value)) ? null : `${labelOrDefault(fieldLabel)} must be a valid date.`;
  },

  isFutureDate(value, fieldLabel = 'Date') {
    if (!value) return null;
    const parsedDate = new Date(value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return !Number.isNaN(parsedDate.getTime()) && parsedDate > today
      ? null
      : `${labelOrDefault(fieldLabel)} must be in the future.`;
  },

  isDateAfter(value, otherDate, fieldLabel = 'Date') {
    if (!value || !otherDate) return null;
    const current = Date.parse(value);
    const comparison = Date.parse(otherDate);
    return Number.isFinite(current) && Number.isFinite(comparison) && current > comparison
      ? null
      : `${labelOrDefault(fieldLabel)} must be after the starting date.`;
  },

  noDuplicate(collection, field, value, excludeId = null) {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const normalisedValue = String(value).trim().toLocaleLowerCase();
    const duplicate = storage.get(collection).some((record) =>
      record.id !== excludeId && String(record[field] ?? '').trim().toLocaleLowerCase() === normalisedValue,
    );
    return duplicate ? `A record with this ${field} already exists.` : null;
  },
};

function validateForm(formData, rules) {
  const errors = {};

  for (const [fieldName, fieldValidators] of Object.entries(rules)) {
    const validatorsForField = Array.isArray(fieldValidators) ? fieldValidators : [fieldValidators];
    for (const validator of validatorsForField) {
      if (typeof validator !== 'function') continue;
      const errorMessage = validator(formData[fieldName], fieldName, formData);
      if (errorMessage) {
        errors[fieldName] = errorMessage;
        break;
      }
    }
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

function clearFormErrors(formElement) {
  if (!formElement) return;
  formElement.querySelectorAll('.form-error').forEach((errorElement) => errorElement.remove());
  formElement.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));
}

function showFormErrors(formElement, errors) {
  if (!formElement || !errors) return;
  clearFormErrors(formElement);

  for (const [fieldName, message] of Object.entries(errors)) {
    const field = formElement.elements.namedItem(fieldName);
    if (!field || !('setAttribute' in field)) continue;

    field.setAttribute('aria-invalid', 'true');
    const errorElement = document.createElement('span');
    errorElement.className = 'form-error';
    errorElement.id = `${fieldName}-error`;
    errorElement.textContent = message;
    field.setAttribute('aria-describedby', errorElement.id);

    const wrapper = field.closest('.form-group');
    if (wrapper) wrapper.append(errorElement);
    else field.insertAdjacentElement('afterend', errorElement);
  }
}

export const validation = Object.freeze({ validators, validateForm, showFormErrors, clearFormErrors });
export { validators, validateForm, showFormErrors, clearFormErrors };

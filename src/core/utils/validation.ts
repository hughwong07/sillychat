/**
 * 校验工具模块
 */

export interface ValidationResult {
  valid: boolean;
  message?: string;
  errors?: string[];
}

export interface ValidationRule<T> {
  validate: (value: T) => boolean;
  message: string;
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isArray<T>(value: unknown): value is T[] {
  return Array.isArray(value);
}

export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isFunction(value: unknown): value is Function {
  return typeof value === 'function';
}

export function isNull(value: unknown): value is null {
  return value === null;
}

export function isUndefined(value: unknown): value is undefined {
  return value === undefined;
}

export function isNullOrUndefined(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' || Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

export function isEmail(email: string): boolean {
  const emailRegex = /^[^s@]+@[^s@]+.[^s@]+$/;
  return emailRegex.test(email);
}

export function isURL(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}

export function isUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

export function isPhoneCN(phone: string): boolean {
  const phoneRegex = /^1[3-9]d{9}$/;
  return phoneRegex.test(phone);
}

export function isIdCardCN(idCard: string): boolean {
  const idCardRegex = /^[1-9]d{5}(18|19|20)d{2}(0[1-9]|1[0-2])(0[1-9]|[12]d|3[01])d{3}[dXx]$/;
  return idCardRegex.test(idCard);
}

export function minLength(value: string, min: number): boolean {
  return value.length >= min;
}

export function maxLength(value: string, max: number): boolean {
  return value.length <= max;
}

export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export function matches(value: string, pattern: RegExp): boolean {
  return pattern.test(value);
}

export function validateAll(rules: Array<() => ValidationResult>): ValidationResult {
  const errors: string[] = [];
  for (const rule of rules) {
    const result = rule();
    if (!result.valid) {
      errors.push(result.message || 'Validation failed');
    }
  }
  return errors.length === 0 ? { valid: true } : { valid: false, errors };
}

export function required(value: unknown, fieldName: string = 'Field'): ValidationResult {
  if (isNullOrUndefined(value) || isEmpty(value)) {
    return { valid: false, message: fieldName + ' is required' };
  }
  return { valid: true };
}

export function createValidator<T>(rules: ValidationRule<T>[]) {
  return (value: T): ValidationResult => {
    const errors: string[] = [];
    for (const rule of rules) {
      if (!rule.validate(value)) {
        errors.push(rule.message);
      }
    }
    return errors.length === 0 ? { valid: true } : { valid: false, errors };
  };
}
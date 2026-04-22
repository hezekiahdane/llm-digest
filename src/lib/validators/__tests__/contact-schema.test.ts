import { describe, expect, it } from 'vitest';
import { contactSchema } from '../contact.schema';

const validPayload = {
  name: 'John Doe',
  company: 'Acme Corp',
  email: 'john@example.com',
  phone: '1234567',
  businessType: 'Bank' as const,
  message: 'This is a test message with enough chars',
};

describe('contactSchema', () => {
  it('accepts a valid payload', () => {
    const result = contactSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('accepts a payload without message (optional)', () => {
    const { message: _message, ...rest } = validPayload;
    const result = contactSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  it('rejects an empty name', () => {
    const result = contactSchema.safeParse({ ...validPayload, name: 'a' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const result = contactSchema.safeParse({
      ...validPayload,
      email: 'not-an-email',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a short phone number', () => {
    const result = contactSchema.safeParse({ ...validPayload, phone: '123' });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid businessType', () => {
    const result = contactSchema.safeParse({
      ...validPayload,
      businessType: 'Unknown',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a message that is too short', () => {
    const result = contactSchema.safeParse({
      ...validPayload,
      message: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a name longer than 100 characters', () => {
    const result = contactSchema.safeParse({
      ...validPayload,
      name: 'a'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a company longer than 200 characters', () => {
    const result = contactSchema.safeParse({
      ...validPayload,
      company: 'a'.repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a phone longer than 20 characters', () => {
    const result = contactSchema.safeParse({
      ...validPayload,
      phone: '1'.repeat(21),
    });
    expect(result.success).toBe(false);
  });

  it('rejects a message longer than 5000 characters', () => {
    const result = contactSchema.safeParse({
      ...validPayload,
      message: 'a'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });

  it('accepts fields at exact max boundary', () => {
    const result = contactSchema.safeParse({
      ...validPayload,
      name: 'a'.repeat(100),
      company: 'a'.repeat(200),
      phone: '1'.repeat(20),
      message: 'a'.repeat(5000),
    });
    expect(result.success).toBe(true);
  });
});

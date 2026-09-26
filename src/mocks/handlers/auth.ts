import type { AuthSession, OtpChallenge, UpdateProfileInput, User } from '@/lib/api/models';

import { db } from '../db';
import { body, HttpError, ok, randomId, requireUser } from '../http';
import { DEMO_OTP, LANGUAGES, OTP_LENGTH, OTP_RESEND_SECONDS } from '../seed';
import type { Route } from './types';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[0-9\s-]{10,15}$/;

function normalizeEmail(email: unknown): string {
  const value = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!EMAIL_PATTERN.test(value)) {
    throw new HttpError(422, 'INVALID_EMAIL', 'Please enter a valid email address.');
  }
  return value;
}

function findOrCreateUser(email: string): User {
  const existingId = db.usersByEmail.get(email);
  const existing = existingId ? db.users.get(existingId) : undefined;
  if (existing) return existing;

  const user: User = {
    id: randomId('drv'),
    email,
    name: '',
    phone: null,
    dob: null,
    city: null,
    isOnboarded: false,
  };
  db.users.set(user.id, user);
  db.usersByEmail.set(email, user.id);
  return user;
}

export const authRoutes: Route[] = [
  {
    method: 'GET',
    path: '/config/languages',
    handler: () => ok(LANGUAGES),
  },
  {
    method: 'POST',
    path: '/auth/otp/send',
    handler: (req) => {
      const email = normalizeEmail(body<{ email: string }>(req).email);
      const challenge: OtpChallenge = {
        otpLength: OTP_LENGTH,
        resendInSeconds: OTP_RESEND_SECONDS,
        expiresInSeconds: 300,
      };
      return ok(challenge, `Code sent to ${email}. Demo code: ${DEMO_OTP}`);
    },
  },
  {
    method: 'POST',
    path: '/auth/otp/verify',
    handler: (req) => {
      const input = body<{ email: string; otp: string }>(req);
      const email = normalizeEmail(input.email);
      if (input.otp !== DEMO_OTP) {
        throw new HttpError(400, 'INVALID_OTP', `Incorrect code. Use ${DEMO_OTP} in the demo.`);
      }
      const user = findOrCreateUser(email);
      const session: AuthSession = {
        accessToken: randomId('at'),
        refreshToken: randomId('rt'),
        user,
      };
      db.sessions.set(session.accessToken, {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
        userId: user.id,
      });
      return ok(session, 'Signed in');
    },
  },
  {
    method: 'GET',
    path: '/me',
    handler: (req) => {
      const user = db.users.get(requireUser(req));
      if (!user) throw new HttpError(404, 'USER_NOT_FOUND', 'Account not found.');
      return ok(user);
    },
  },
  {
    method: 'PATCH',
    path: '/me',
    handler: (req) => {
      const userId = requireUser(req);
      const input = body<UpdateProfileInput>(req);
      const name = input.name?.trim();
      if (name !== undefined && name.length < 2) {
        throw new HttpError(422, 'INVALID_NAME', 'Full name must be at least 2 characters.');
      }
      const phone = input.phone?.trim();
      if (phone !== undefined && !PHONE_PATTERN.test(phone)) {
        throw new HttpError(422, 'INVALID_PHONE', 'Enter a valid 10-digit mobile number.');
      }
      const updated = db.users.update(userId, (user) => {
        const next: User = {
          ...user,
          name: name ?? user.name,
          phone: phone || user.phone,
          dob: input.dob?.trim() || user.dob,
          city: input.city?.trim() || user.city,
        };
        return {
          ...next,
          isOnboarded: next.name.length >= 2 && Boolean(next.phone) && Boolean(next.city),
        };
      });
      if (!updated) throw new HttpError(404, 'USER_NOT_FOUND', 'Account not found.');
      return ok(updated, 'Profile updated');
    },
  },
];

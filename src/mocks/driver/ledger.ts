import type { DriverTransaction, DriverTransactionKind } from '@/lib/api/models';

import { db } from '../db';
import { randomId } from '../http';

export function ledgerFor(userId: string): DriverTransaction[] {
  return db.ledger.get(userId) ?? [];
}

export function balanceOf(userId: string): number {
  const total = ledgerFor(userId).reduce((sum, txn) => sum + txn.amount, 0);
  return Math.round(total * 100) / 100;
}

export function record(
  userId: string,
  kind: DriverTransactionKind,
  title: string,
  amount: number,
  orderNumber: string | null = null,
): DriverTransaction {
  const txn: DriverTransaction = {
    id: randomId('txn'),
    kind,
    title,
    amount,
    createdAt: new Date().toISOString(),
    orderNumber,
  };
  db.ledger.set(userId, [txn, ...ledgerFor(userId)]);
  return txn;
}

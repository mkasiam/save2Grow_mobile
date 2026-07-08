import { useCallback } from 'react';
import { transactionService } from '../services/api';

export interface TransactionPayload {
  amount: number;
  type: 'deposit' | 'withdrawal';
  goalId?: string | null;
  userChallengeId?: string | null;
  paymentMethod?: string;
  transactionId?: string;
  description?: string;
  note?: string;
  descriptionFallback?: string;
}

const normalizeText = (value: string | null | undefined, fallback: string) => {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed || fallback;
};

const normalizeTransactionPayload = (data: TransactionPayload) => {
  const amount = Number(data.amount);
  const resolvedDescriptionFallback = normalizeText(data.descriptionFallback, 'Deposit');
  const resolvedDescription = normalizeText(data.description, resolvedDescriptionFallback);

  return {
    amount: Number.isFinite(amount) ? amount : 0,
    type: data.type,
    goalId: data.goalId || null,
    userChallengeId: data.userChallengeId || null,
    paymentMethod: data.paymentMethod || 'bkash',
    transactionId:
      data.transactionId ||
      `${data.type}-${Date.now()}-${Math.round(Math.random() * 100000)}`,
    description: resolvedDescription,
    note: normalizeText(data.note, 'none'),
  };
};

export const useTransaction = () => {
  const executeTransaction = useCallback(async (data: TransactionPayload) => {
    const cleanPayload = normalizeTransactionPayload(data);
    return transactionService.createTransaction(cleanPayload);
  }, []);

  const startDepositSession = useCallback(async (data: Omit<TransactionPayload, 'type'> & { type?: 'deposit' }) => {
    const cleanPayload = normalizeTransactionPayload({
      ...data,
      type: 'deposit',
    });

    return transactionService.createSslcommerzDepositSession({
      amount: cleanPayload.amount,
      goalId: cleanPayload.goalId,
      userChallengeId: cleanPayload.userChallengeId,
      paymentMethod: cleanPayload.paymentMethod,
      transactionId: cleanPayload.transactionId,
      description: cleanPayload.description,
      note: cleanPayload.note,
    });
  }, []);

  return { executeTransaction, startDepositSession };
};

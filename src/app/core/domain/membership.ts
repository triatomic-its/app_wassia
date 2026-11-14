import { DEFAULT_MEMBERSHIP_FEE } from '../config/payment-types.config';
import { Fcfa, Payment, PaymentType } from '../models';

/** Code of the membership payment type (the fee itself is set by the administration). */
export const MEMBERSHIP_TYPE_CODE = 'MEMBERSHIP';

export function findMembershipType(types: readonly PaymentType[]): PaymentType | undefined {
  return types.find((t) => t.code === MEMBERSHIP_TYPE_CODE);
}

/** Fee currently configured, or the default (1 000 F) when the type has no amount. */
export function membershipFeeOf(types: readonly PaymentType[]): Fcfa {
  return findMembershipType(types)?.defaultAmount ?? DEFAULT_MEMBERSHIP_FEE;
}

/** The membership fee paid at enrollment, among a member's payments. */
export function findMembershipPayment(
  payments: readonly Payment[],
  membershipTypeId: string | undefined,
): Payment | undefined {
  if (!membershipTypeId) return undefined;
  return payments.find((p) => p.typeId === membershipTypeId);
}

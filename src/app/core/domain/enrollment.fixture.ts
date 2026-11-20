import { EnrollmentInput } from './enrollment';

/** Tests only: a complete, valid enrollment (mock back end values). */
export const COMPLETE_ENROLLMENT: EnrollmentInput = {
  lastName: 'TRAORÉ',
  firstNames: 'Mariam',
  fullName: 'Mariam TRAORÉ',
  phone: '07 00 00 00 01',
  market: 'Adjamé',
  stall: 'Allée B, étal 12',
  idType: 'CNI',
  idNumber: 'CI 1234 5678',
  idDocUrl: 'mock-upload://cni',
  photoUrl: 'mock-upload://shop',
  sector: 'commerce',
  trade: 'Import-export et commerce général',
  referentName: 'Fatou TRAORÉ',
  referentLink: 'sœur',
  referentPhone: '05 00 00 00 01',
  referentInformed: true,
  savingsAmount: 2_000,
  savingsFrequency: 'quotidienne',
  savingsGoal: 'Acheter du stock',
  commitmentAccepted: true,
  paymentChannel: 'CASH',
  paymentConfirmed: true,
  consentAccepted: true,
};

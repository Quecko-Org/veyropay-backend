import { HttpStatus } from '@nestjs/common';
import { AppException } from './app.exception';

// Thrown by flows that depend on an architecture decision that hasn't been made yet
// (e.g. Safe vs Turnkey-native recovery - see docs/18_DECISIONS_AND_ASSUMPTIONS.md).
export class PendingArchitectureDecisionException extends AppException {
  constructor(message: string) {
    super(message, HttpStatus.NOT_IMPLEMENTED, 'PENDING_ARCHITECTURE_DECISION');
  }
}

// Decided: Safe's official SocialRecoveryModule (option 2 of the three candidates this
// file used to document), with this backend as a gas-sponsoring relayer for the
// module's multiConfirmRecovery() call (a variant of option 1's "relayed on threshold"
// idea, but the guardian signatures are verified on-chain by the module itself rather
// than by a Safe Transaction Service multisig flow). See
// RecoveryRequestService.executeRecovery() and docs/18_DECISIONS_AND_ASSUMPTIONS.md §2.1
// for the one remaining open item (module deployment coverage on Base).
export interface IRecoveryExecutionResult {
  transactionHash: string;
}

export interface ISafeGuardianRecoveryExecutor {
  execute(recoveryRequestId: string): Promise<IRecoveryExecutionResult>;
}

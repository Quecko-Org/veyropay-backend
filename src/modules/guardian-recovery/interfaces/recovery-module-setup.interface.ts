export interface IRecoveryModuleSetupStep {
  to: string;
  data: string;
  description: string;
}

// Unsigned calldata plan for enabling the SocialRecoveryModule + registering guardians
// on a user's Safe. Each step is submitted separately by the client through the
// existing generic POST /wallet/prepare + Turnkey-sign + submit flow - this backend
// never signs on the user's behalf. See GuardianService.getRecoveryModuleSetupCalldata().
export interface IRecoveryModuleSetupPlan {
  safeAddress: string;
  recoveryModuleAddress: string;
  steps: IRecoveryModuleSetupStep[];
}

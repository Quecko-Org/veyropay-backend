export const PIMLICO_PROVIDER_NAME = 'pimlico';

// EntryPoint v0.7 - see https://docs.pimlico.io
export const DEFAULT_ENTRY_POINT = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';

// Well-formed but non-functional placeholder signature used only when asking the
// bundler to estimate gas for a not-yet-signed UserOperation - the client replaces
// this with a real signature before submission, this value is never broadcast.
export const DUMMY_SIGNATURE = '0x' + '00'.repeat(64) + '1c';

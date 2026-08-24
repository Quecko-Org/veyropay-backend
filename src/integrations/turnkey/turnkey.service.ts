import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ProviderException } from '@common/exceptions';
import { TurnkeyClient } from './turnkey.client';
import { verifyAndDecodeTurnkeySessionJwt } from './turnkey-session.util';
import {
  ITurnkeyCompleteRecoveryParams,
  ITurnkeyCompleteRecoveryResult,
  ITurnkeyCreateSubOrganizationParams,
  ITurnkeyCreateSubOrganizationResult,
  ITurnkeyInitEmailRecoveryParams,
  ITurnkeyInitEmailRecoveryResult,
  ITurnkeyOauthLoginParams,
  ITurnkeyOauthLoginResult,
  ITurnkeySessionPayload,
  ITurnkeyStampedRequest,
  ITurnkeyWalletAccountsResponse,
  ITurnkeyWhoAmIResponse,
} from './types';
import { TURNKEY_PROVIDER_NAME } from './constants';

// Business modules depend on this service, never on TurnkeyClient directly.
@Injectable()
export class TurnkeyService {
  private readonly logger = new Logger(TurnkeyService.name);

  constructor(private readonly client: TurnkeyClient) {}

  // Legacy/alternate verification path (client-signed stamp + whoami round trip).
  // Not used by the login flow anymore - see verifySessionToken(), which validates
  // the session JWT locally per Turnkey's recommended backend-auth pattern. Kept
  // available since it's a real Turnkey capability other flows may still want.
  async verifySession(request: ITurnkeyStampedRequest): Promise<ITurnkeyWhoAmIResponse> {
    try {
      return await this.client.whoAmI(request);
    } catch (error) {
      this.logger.warn({ err: error }, 'Turnkey session verification failed');
      throw new ProviderException(
        TURNKEY_PROVIDER_NAME,
        'Unable to verify Turnkey session',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // Validates a Turnkey session JWT (signature + expiry) entirely locally - no network
  // call to Turnkey. This is the recommended pattern from
  // docs.turnkey.com/authentication/backend-authentication and is what both the
  // passkey-login and post-signup/post-oauth-login flows produce for the client.
  async verifySessionToken(sessionJwt: string): Promise<ITurnkeySessionPayload> {
    try {
      return await verifyAndDecodeTurnkeySessionJwt(sessionJwt);
    } catch (error) {
      this.logger.warn({ err: error }, 'Turnkey session JWT validation failed');
      throw new ProviderException(
        TURNKEY_PROVIDER_NAME,
        'Invalid or expired session',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // Creates a new Turnkey sub-organization for a signing-up user - the backend never
  // creates key material (the passkey/OAuth credential is generated client-side), it
  // only registers those credentials as the sub-org's root user via our backend-held
  // parent-organization API key. Optionally provisions the first wallet+address
  // atomically in the same call.
  async provisionSubOrganization(
    params: ITurnkeyCreateSubOrganizationParams,
  ): Promise<ITurnkeyCreateSubOrganizationResult> {
    try {
      return await this.client.createSubOrganization(params);
    } catch (error) {
      this.logger.warn({ err: error }, 'Turnkey sub-organization creation failed');
      throw new ProviderException(
        TURNKEY_PROVIDER_NAME,
        `Unable to create Turnkey sub-organization ${error}`,
      );
    }
  }

  // Get-or-create lookup for OAuth login: returns the existing sub-organization ID
  // linked to this Google/Apple identity, if any.
  async findSubOrganizationByOidcToken(oidcToken: string): Promise<string | null> {
    try {
      const response = await this.client.getSubOrganizationIdsByOidcToken(oidcToken);
      return response.organizationIds[0] ?? null;
    } catch (error) {
      this.logger.warn({ err: error }, 'Turnkey sub-organization lookup by OIDC token failed');
      throw new ProviderException(
        TURNKEY_PROVIDER_NAME,
        `Unable to look up Turnkey sub-organization${error}`,
      );
    }
  }

  // Verifies a Google/Apple id_token and mints a Turnkey session JWT for the given
  // sub-organization - see docs.turnkey.com/features/authentication/social-logins.
  async loginWithOauth(
    organizationId: string,
    params: ITurnkeyOauthLoginParams,
  ): Promise<ITurnkeyOauthLoginResult> {
    try {
      console.log("p",params)
      return await this.client.oauthLogin(organizationId, params);
    } catch (error) {
      this.logger.warn({ err: error }, 'Turnkey OAuth login failed');
      throw new ProviderException(
        TURNKEY_PROVIDER_NAME,
        'Unable to complete OAuth login',
        HttpStatus.UNAUTHORIZED,
        error
      );
    }
  }

  // Starts email-based identity recovery - Turnkey emails a recovery credential to
  // the user. See docs.turnkey.com/authentication/backend-authentication.
  async initEmailRecovery(
    params: ITurnkeyInitEmailRecoveryParams,
  ): Promise<ITurnkeyInitEmailRecoveryResult> {
    try {
      return await this.client.initEmailRecovery(params);
    } catch (error) {
      this.logger.warn({ err: error }, 'Turnkey email recovery initiation failed');
      throw new ProviderException(TURNKEY_PROVIDER_NAME, 'Unable to initiate email recovery');
    }
  }

  // Completes recovery by relaying the client-stamped recover_user activity - see
  // TurnkeyClient.recoverUser for why this can't be backend-stamped.
  async completeRecovery(
    params: ITurnkeyCompleteRecoveryParams,
  ): Promise<ITurnkeyCompleteRecoveryResult> {
    try {
      return await this.client.recoverUser(params);
    } catch (error) {
      this.logger.warn({ err: error }, 'Turnkey recovery completion failed');
      throw new ProviderException(
        TURNKEY_PROVIDER_NAME,
        'Unable to complete recovery',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  // Returns the first Ethereum address already provisioned for the user's Turnkey
  // sub-organization - this becomes the sole owner of the user's Safe smart account.
  async getPrimarySignerAddress(organizationId: string): Promise<string> {
    let response: ITurnkeyWalletAccountsResponse;

    try {
      response = await this.client.getWalletAccounts(organizationId);
      console.log("getWalletAccounts",response)
    } catch (error) {
      this.logger.warn({ err: error }, 'Turnkey wallet account lookup failed');
      throw new ProviderException(TURNKEY_PROVIDER_NAME, 'Unable to fetch Turnkey wallet accounts');
    }

    const ethereumAccount = response.accounts.find(
      (account) => account.addressFormat === 'ADDRESS_FORMAT_ETHEREUM',
    );
      console.log("ethereumAccount",ethereumAccount)

    if (!ethereumAccount) {
      throw new ProviderException(
        TURNKEY_PROVIDER_NAME,
        'No Ethereum signer has been provisioned for this Turnkey organization yet',
        HttpStatus.CONFLICT,
      );
    }

    return ethereumAccount.address;
  }
}

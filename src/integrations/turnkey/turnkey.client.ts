import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ITurnkeyConfig } from '@core/config/turnkey.config';
import { ApiKeyStamper } from '@turnkey/api-key-stamper';
import {
  ITurnkeyCompleteRecoveryParams,
  ITurnkeyCompleteRecoveryResult,
  ITurnkeyCreateSubOrganizationParams,
  ITurnkeyCreateSubOrganizationResult,
  ITurnkeyGetSubOrgIdsResponse,
  ITurnkeyInitEmailRecoveryParams,
  ITurnkeyInitEmailRecoveryResult,
  ITurnkeyOauthLoginParams,
  ITurnkeyOauthLoginResult,
  ITurnkeyStampedRequest,
  ITurnkeyWalletAccountsResponse,
  ITurnkeyWhoAmIResponse,
} from './types';

interface IActivityResponse<TResult> {
  activity: {
    id: string;
    status: string;
    result: TResult;
  };
}

// Thin HTTP client wrapper around the Turnkey API.
@Injectable()
export class TurnkeyClient {
  private readonly config: ITurnkeyConfig;
  private readonly stamper: ApiKeyStamper;

  constructor(configService: ConfigService) {
    this.config = configService.get<ITurnkeyConfig>('turnkey') as ITurnkeyConfig;
    this.stamper = new ApiKeyStamper({
      apiPublicKey: this.config.apiKey,
      apiPrivateKey: this.config.apiSecret as string,
    });
  }

  private async stamp(body: unknown): Promise<string> {
    const { stampHeaderValue } = await this.stamper.stamp(JSON.stringify(body));
    return stampHeaderValue;
  }

  // Verifies a client-signed request and returns the identity Turnkey resolved it to.
  // See https://docs.turnkey.com - the exact stamp header / body shape should be
  // reconfirmed against Turnkey's current reference before this goes live.
  async whoAmI(request: ITurnkeyStampedRequest): Promise<ITurnkeyWhoAmIResponse> {
    return this.request<ITurnkeyWhoAmIResponse>('/public/v1/query/whoami', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Stamp': request.stamp,
      },
      body: JSON.stringify({ organizationId: request.organizationId }),
    });
  }

  // Lists the wallet accounts (derived addresses) already provisioned for a user's
  // Turnkey sub-organization - this backend never creates key material itself, it
  // only reads the address Turnkey established during the client-side passkey/OAuth
  // onboarding flow, then hands it to Safe as the smart account owner. Authenticated
  // with our own backend-held API key (organization-scoped, not the user's passkey) -
  // endpoint path and request/response shape should be reconfirmed against Turnkey's
  // current reference before this goes live.
  async getWalletAccounts(organizationId: string): Promise<ITurnkeyWalletAccountsResponse> {
    const body = { organizationId };
    const stamp = await this.stamp(body);

    return this.request<ITurnkeyWalletAccountsResponse>('/public/v1/query/list_wallet_accounts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Stamp': stamp,
      },
      body: JSON.stringify(body),
    });
  }

  // Creates a new Turnkey sub-organization for a signing-up user, registering their
  // passkey (and/or OAuth provider, and/or the ephemeral API key their client generated
  // for the signup flow) as root-user credentials, and optionally provisioning the
  // first wallet+address in the same call. Stamped with our own backend-held root
  // organization API key - the sub-org does not exist yet, so nothing else could sign
  // this request. See docs.turnkey.com/authentication/backend-authentication
  // ("Signup flow") and docs.turnkey.com/features/sub-organizations.
  async createSubOrganization(
    params: ITurnkeyCreateSubOrganizationParams,
  ): Promise<ITurnkeyCreateSubOrganizationResult> {
    const response = await this.submitActivity<{createSubOrganizationResultV8:ITurnkeyCreateSubOrganizationResult}>(
      'ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V8',
      '/public/v1/submit/create_sub_organization',
      this.config.organizationId,
      params,
    );
    console.log("ressss", response)
    return response.activity.result.createSubOrganizationResultV8;
  }

  // Finds existing sub-organization(s) linked to an OIDC identity (Google/Apple id
  // token) - used to decide whether OAuth login should create a new sub-organization
  // or log into an existing one. Queried against the parent organization since the
  // sub-org isn't known yet.
  async getSubOrganizationIdsByOidcToken(oidcToken: string): Promise<ITurnkeyGetSubOrgIdsResponse> {
    const body = {
      organizationId: this.config.organizationId,
      filterType: 'OIDC_TOKEN',
      filterValue: oidcToken,
    };
    console.log("dddddd", this.config.apiKey, this.config.apiSecret, body)
    const stamp = await this.stamp(body);

    console.log("stamp created", stamp);
    return this.request<ITurnkeyGetSubOrgIdsResponse>('/public/v1/query/list_suborgs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Stamp': stamp },
      body: JSON.stringify(body),
    });
  }

  // Verifies a Google/Apple id_token and mints a Turnkey session for the sub-org - see
  // docs.turnkey.com/features/authentication/social-logins. Stamped with our backend
  // root key since the client's ephemeral API public key isn't registered on the
  // sub-org until this call succeeds.
  async oauthLogin(
    organizationId: string,
    params: ITurnkeyOauthLoginParams,
  ): Promise<ITurnkeyOauthLoginResult> {
    const response = await this.submitActivity<{oauthLoginResult:ITurnkeyOauthLoginResult}>(
      'ACTIVITY_TYPE_OAUTH_LOGIN',
      '/public/v1/submit/oauth_login',
      organizationId,
      params,
    );
console.log("oauth response",response)
    return response.activity.result.oauthLoginResult;
  }

  // Starts email-based identity recovery for a user: Turnkey emails a recovery
  // credential (encrypted to the client's targetPublicKey) to the given address.
  // Stamped with our backend root key, on the assumption a parent org's elevated
  // access to its sub-orgs (per docs.turnkey.com/features/sessions,
  // "parent organization has read access to all of its sub-organizations' data")
  // extends to initiating recovery for one - reconfirm against Turnkey's current
  // policy model before this goes live; if it doesn't, this call needs to move to
  // being stamped by an existing root user of the sub-org instead.
  async initEmailRecovery(
    params: ITurnkeyInitEmailRecoveryParams,
  ): Promise<ITurnkeyInitEmailRecoveryResult> {
    const response = await this.submitActivity<{initUserEmailRecoveryResult:ITurnkeyInitEmailRecoveryResult}>(
      'ACTIVITY_TYPE_INIT_USER_EMAIL_RECOVERY_V2',
      '/public/v1/submit/init_user_email_recovery',
      params.organizationId,
      {
        email: params.email,
        targetPublicKey: params.targetPublicKey,
        expirationSeconds: params.expirationSeconds,
        emailCustomization: params.emailCustomization,
      },
    );

    return response.activity.result.initUserEmailRecoveryResult;
  }

  // Completes recovery by registering a new authenticator (passkey) for the user.
  // Unlike every other write in this client, this is NOT stamped with our backend
  // key - only the client can produce a valid stamp here, using the recovery
  // credential it decrypted from the email Turnkey sent. We relay the exact body
  // and stamp the client constructed; reconstructing/reserializing it here would
  // risk producing different bytes than what the client signed, invalidating the
  // stamp. See docs.turnkey.com/features/authentication/passkeys/integration
  // ("To Proxy or not to proxy").
  async recoverUser(
    params: ITurnkeyCompleteRecoveryParams,
  ): Promise<ITurnkeyCompleteRecoveryResult> {
    const body = {
      type: 'ACTIVITY_TYPE_RECOVER_USER',
      timestampMs: params.timestampMs,
      organizationId: params.organizationId,
      parameters: {
        userId: params.userId,
        authenticator: params.authenticator,
      },
    };

    const response = await this.request<IActivityResponse<{recoverUserResult:ITurnkeyCompleteRecoveryResult}>>(
      '/public/v1/submit/recover_user',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Stamp': params.stamp },
        body: JSON.stringify(body),
      },
    );

    return response.activity.result.recoverUserResult;
  }

  private async submitActivity<TResult>(
    type: string,
    path: string,
    organizationId: string,
    parameters: unknown,
  ): Promise<IActivityResponse<TResult>> {
    const body = {
      type,
      timestampMs: Date.now().toString(),
      organizationId,
      parameters,
    };
    const stamp = await this.stamp(body);

    return this.request<IActivityResponse<TResult>>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Stamp': stamp },
      body: JSON.stringify(body),
    });
  }

  protected async request<T>(path: string, init?: RequestInit): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}${path}`, {
        ...init,
        signal: controller.signal,
      });


      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Turnkey request failed with status ${response.status}: ${errorBody}`);
      }
      return (await response.json()) as T;
    } finally {
      clearTimeout(timeout);
    }
  }
}

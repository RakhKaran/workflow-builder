import {BindingScope, injectable} from '@loopback/core';
import {HttpErrors} from '@loopback/rest';
import axios from 'axios';

export interface GoogleAuthStartParams {
  agentName?: string;
  origin?: string;
  provider?: string;
  scopes?: string;
  tokenField?: string;
}

export interface GoogleAuthState {
  agentName: string;
  origin: string;
  provider: string;
  tokenField: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  scope?: string;
}

export interface GoogleAuthPayload {
  accountEmail?: string;
  accountName?: string;
  agentName?: string;
  error?: string;
  expiry_date?: string;
  google_access_token?: string;
  google_refresh_token?: string;
  provider?: string;
  token_type?: string;
}

@injectable({scope: BindingScope.TRANSIENT})
export class GoogleAuthService {
  private readonly googleClientId = process.env.GOOGLE_CLIENT_ID ?? '';

  private readonly googleClientSecret = process.env.GOOGLE_CLIENT_SECRET ?? '';

  private readonly callbackPath = '/auth/google/callback';

  private readonly tokenUrl = 'https://oauth2.googleapis.com/token';

  private getAppBaseUrl() {
    return (
      process.env.GOOGLE_REDIRECT_BASE_URL ??
      process.env.API_ENDPOINT ??
      `http://localhost:${process.env.PORT ?? 3058}`
    ).replace(/\/$/, '');
  }

  getCallbackUrl() {
    const explicitRedirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (explicitRedirectUri) {
      return explicitRedirectUri;
    }

    return `${this.getAppBaseUrl()}${this.callbackPath}`;
  }

  normalizeScopes(scopes?: string) {
    if (!scopes) {
      return ['https://www.googleapis.com/auth/userinfo.email'];
    }

    return Array.from(
      new Set(
        scopes
          .split(/[,\s]+/)
          .map(scope => scope.trim())
          .filter(Boolean),
      ),
    );
  }

  buildState(params: GoogleAuthStartParams) {
    const state: GoogleAuthState = {
      agentName: params.agentName ?? '',
      origin: params.origin ?? '',
      provider: params.provider ?? 'google',
      tokenField: params.tokenField ?? 'google_access_token',
    };

    return Buffer.from(JSON.stringify(state)).toString('base64url');
  }

  parseState(state?: string): GoogleAuthState {
    if (!state) {
      throw new HttpErrors.BadRequest('Missing Google auth state');
    }

    try {
      const parsed = JSON.parse(Buffer.from(state, 'base64url').toString('utf8'));

      return {
        agentName: parsed.agentName ?? '',
        origin: parsed.origin ?? '',
        provider: parsed.provider ?? 'google',
        tokenField: parsed.tokenField ?? 'google_access_token',
      };
    } catch (error) {
      throw new HttpErrors.BadRequest('Invalid Google auth state');
    }
  }

  buildAuthorizationUrl(params: GoogleAuthStartParams) {
    if (!this.googleClientId) {
      throw new HttpErrors.InternalServerError(
        'GOOGLE_CLIENT_ID is missing in workflow-builder environment',
      );
    }

    console.log('scopes', this.normalizeScopes(params.scopes).join(' '));

    const searchParams = new URLSearchParams({
      client_id: this.googleClientId,
      redirect_uri: this.getCallbackUrl(),
      response_type: 'code',
      scope: this.normalizeScopes(params.scopes).join(' '),
      access_type: 'offline',
      include_granted_scopes: 'true',
      prompt: 'consent',
      state: this.buildState(params),
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${searchParams.toString()}`;
  }

  async exchangeCodeForTokens(code: string) {
    if (!this.googleClientId || !this.googleClientSecret) {
      throw new HttpErrors.BadRequest(
        'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in workflow-builder environment',
      );
    }

    const params = new URLSearchParams({
      code,
      client_id: this.googleClientId,
      client_secret: this.googleClientSecret,
      redirect_uri: this.getCallbackUrl(),
      grant_type: 'authorization_code',
    });

    const response = await axios.post<GoogleTokenResponse>(this.tokenUrl, params, {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    });

    return response.data;
  }

  async refreshAccessToken(refreshToken: string) {
    console.log('refreshAccessToken called:', refreshToken);
    if (!this.googleClientId || !this.googleClientSecret) {
      throw new HttpErrors.BadRequest(
        'GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing in workflow-builder environment',
      );
    }

    const params = new URLSearchParams({
      client_id: this.googleClientId,
      client_secret: this.googleClientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    });

    const response = await axios.post<GoogleTokenResponse>(this.tokenUrl, params, {
      headers: {'Content-Type': 'application/x-www-form-urlencoded'},
    });

    return response.data;
  }

  async fetchUserProfile(accessToken: string) {
    console.log('fetchUserProfile called:', accessToken);

    const response = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return response.data;
  }

  createGoogleAuthPayload(
    state: GoogleAuthState,
    tokenData: GoogleTokenResponse,
    profile?: any,
  ): GoogleAuthPayload {
    return {
      provider: state.provider,
      agentName: state.agentName,
      google_access_token: tokenData.access_token,
      google_refresh_token: tokenData.refresh_token,
      token_type: tokenData.token_type,
      expiry_date: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : '',
      accountEmail: profile?.email || '',
      accountName: profile?.name || '',
    };
  }

  buildCallbackHtml(targetOrigin: string, payload?: GoogleAuthPayload, error?: string) {
    const safeOrigin = JSON.stringify(targetOrigin || '*');
    const safePayload = JSON.stringify(payload ?? {});
    const safeError = JSON.stringify(error ?? '');

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Google Authentication</title>
    <style>
      body {
        margin: 0;
        font-family: Arial, sans-serif;
        background: #f7f9fc;
        color: #1f2937;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
      }
      .card {
        width: min(420px, calc(100vw - 32px));
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 16px;
        padding: 24px;
        box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 20px;
      }
      p {
        margin: 0;
        line-height: 1.5;
        color: #4b5563;
      }
      .status {
        margin-top: 16px;
        font-weight: 600;
        color: #111827;
      }
      .error {
        color: #b91c1c;
      }
    </style>
  </head>
  <body>
    <div class="card">
      <h1>Completing Google connection</h1>
      <p id="message">Please wait while we finish the authentication flow.</p>
      <p id="status" class="status"></p>
    </div>

    <script>
      (function () {
        const targetOrigin = ${safeOrigin};
        const payload = ${safePayload};
        const authError = ${safeError};
        const statusNode = document.getElementById('status');
        const messageNode = document.getElementById('message');

        const postToOpener = (message) => {
          if (window.opener) {
            window.opener.postMessage(message, targetOrigin || '*');
          }
        };

        const closeWindow = () => {
          window.setTimeout(() => window.close(), 900);
        };

        if (authError) {
          messageNode.textContent = 'Google authentication could not be completed.';
          statusNode.textContent = authError;
          statusNode.className = 'status error';
          postToOpener({
            type: 'workflow-google-auth-error',
            payload: {
              error: authError,
            },
          });
          closeWindow();
          return;
        }

        messageNode.textContent = 'Google account connected successfully.';
        statusNode.textContent = payload.accountEmail
          ? 'Connected as ' + payload.accountEmail
          : 'Returning to workflow...';

        postToOpener({
          type: 'workflow-google-auth-success',
          payload,
        });

        closeWindow();
      })();
    </script>
  </body>
</html>`;
  }
}

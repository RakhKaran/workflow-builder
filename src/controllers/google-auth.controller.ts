import { inject } from '@loopback/core';
import { get, param, post, Response, RestBindings } from '@loopback/rest';
import { GoogleAuthService } from '../services/google-auth.service';
import { google } from "googleapis";

export class GoogleAuthController {
  constructor(
    @inject('services.GoogleAuthService')
    private googleAuthService: GoogleAuthService,
    @inject(RestBindings.Http.RESPONSE)
    private response: Response,
  ) { }

  @get('/auth/google/start')
  async startGoogleAuthentication(
    @param.query.string('provider') provider?: string,
    @param.query.string('scopes') scopes?: string,
    @param.query.string('tokenField') tokenField?: string,
    @param.query.string('origin') origin?: string,
    @param.query.string('agentName') agentName?: string,
  ) {
    const authUrl = this.googleAuthService.buildAuthorizationUrl({
      agentName,
      origin,
      provider,
      scopes,
      tokenField,
    });

    this.response.redirect(authUrl);
    return this.response;
  }

  @get('/auth/google/callback')
  async handleGoogleAuthenticationCallback(
    @param.query.string('code') code?: string,
    @param.query.string('state') state?: string,
    @param.query.string('error') error?: string,
  ) {
    let targetOrigin = '*';
    let html = '';

    try {
      const parsedState = this.googleAuthService.parseState(state);
      targetOrigin = parsedState.origin || '*';

      if (error) {
        html = this.googleAuthService.buildCallbackHtml(targetOrigin, undefined, error);
      } else if (!code) {
        html = this.googleAuthService.buildCallbackHtml(
          targetOrigin,
          undefined,
          'Missing Google authorization code',
        );
      } else {
        const tokenData = await this.googleAuthService.exchangeCodeForTokens(code);
        const profile = await this.googleAuthService.fetchUserProfile(tokenData.access_token);
        const payload = this.googleAuthService.createGoogleAuthPayload(
          parsedState,
          tokenData,
          profile,
        );

        html = this.googleAuthService.buildCallbackHtml(targetOrigin, payload);
      }
    } catch (callbackError: any) {
      html = this.googleAuthService.buildCallbackHtml(
        targetOrigin,
        undefined,
        callbackError?.message || 'Google authentication failed',
      );
    }

    this.response.setHeader('Content-Type', 'text/html; charset=utf-8');
    this.response.send(html);
    return this.response;
  }

  // code committed just made to test access token and scopes
  // @post('send-email')
  // async sendEmail() {
  //   try {
  //     const oauth2Client = new google.auth.OAuth2(
  //       process.env.GOOGLE_CLIENT_ID,
  //       process.env.GOOGLE_CLIENT_SECRET
  //     );

  //     oauth2Client.setCredentials({
  //       access_token: "", 
  //     });

  //     const gmail = google.gmail({
  //       version: "v1",
  //       auth: oauth2Client,
  //     });

  //     const message = [
  //       "From: karanrakh19@gmail.com",
  //       "To: karanrakh7899@gmail.com",
  //       "Subject: Greetings",
  //       "",
  //       "Have a good day!",
  //     ].join("\n");

  //     const encodedMessage = Buffer.from(message)
  //       .toString("base64")
  //       .replace(/\+/g, "-")
  //       .replace(/\//g, "_")
  //       .replace(/=+$/, "");

  //     await gmail.users.messages.send({
  //       userId: "me",
  //       requestBody: {
  //         raw: encodedMessage,
  //       },
  //     });

  //     return {
  //       success: true,
  //       message: "Email sent successfully 🚀",
  //     };

  //   } catch (error: any) {
  //     console.error(error);
  //     throw error;
  //   }
  // }
}

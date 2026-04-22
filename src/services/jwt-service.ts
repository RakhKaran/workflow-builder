import { HttpErrors } from '@loopback/rest';
import { securityId, UserProfile } from '@loopback/security';
import { promisify } from 'util';
const jwt = require('jsonwebtoken');
const signAsync = promisify(jwt.sign);
const verifyAsync = promisify(jwt.verify);
export class JWTService {

  async generateToken(userProfile: UserProfile): Promise<string> {
    if (!userProfile) {
      throw new HttpErrors.NotFound(
        'Error while generating token Userprofile is null',
      );
    }
    let token = '';
    try {
      token = await signAsync(userProfile, 'mushroom', {
        expiresIn: '7h',
      });
    } catch (err) {
      throw new HttpErrors.Unauthorized(`error generating token${err}`);
    }
    return token;
  }

  async generate10MinToken(userProfile: UserProfile): Promise<string> {
    if (!userProfile) {
      throw new HttpErrors.NotFound(
        'Error while generating token Userprofile is null',
      );
    }
    let token = '';
    try {
      token = await signAsync(userProfile, 'mushroom', {
        expiresIn: '10m',
      });
    } catch (err) {
      throw new HttpErrors.Unauthorized(`error generating token${err}`);
    }
    return token;
  }

  async verifyToken(token: string): Promise<UserProfile> {
    if (!token) {
      throw new HttpErrors.Unauthorized(
        "Error verifying token: 'token is null'",
      );
    }

    let userProfile: UserProfile;
    try {
      const decryptedToken = await verifyAsync(token, 'mushroom');
      userProfile = Object.assign(
        {
          id: '',
          email: '',
          name: '',
          [securityId]: '',
          permissions: '',
          userType: '',
        },
        {
          id: decryptedToken.id,
          name: decryptedToken.name,
          email: decryptedToken.email,
          [securityId]: decryptedToken.id,
          permissions: decryptedToken.permissions,
          userType: decryptedToken.userType,
        },
      );
    } catch (error) {
      throw new HttpErrors.Unauthorized(
        `Error verifying token: ${error.message}`,
      );
    }

    return userProfile;
  }


  // IDP process instance token for API channel type 

  // short-lived token
  async generateShortLivedProcessInstanceToken(
    processInstanceProfile: {
      processInstanceId: number,
      processInstanceName: string,
      processInstanceSecretKey: string,
      processId: number
    }
  ): Promise<string> {
    if (!processInstanceProfile) {
      throw new HttpErrors.NotFound(
        'Error while generating token process instance profile is null',
      );
    }
    let token = '';
    try {
      token = await signAsync(processInstanceProfile, 'idp-process-instance', {
        expiresIn: '48h',
      });
    } catch (err) {
      throw new HttpErrors.Unauthorized(`error generating token${err}`);
    }
    return token;
  }

  // long-lived token
  async generateLongLivedProcessInstanceToken(
    processInstanceProfile: {
      processInstanceId: number,
      processInstanceName: string,
      processInstanceSecretKey: string,
      processId: number
    }
  ): Promise<string> {
    if (!processInstanceProfile) {
      throw new HttpErrors.NotFound(
        'Error while generating token process instance profile is null',
      );
    }
    let token = '';
    try {
      token = await signAsync(processInstanceProfile, 'idp-process-instance', {
        expiresIn: '60d',
      });
    } catch (err) {
      throw new HttpErrors.Unauthorized(`error generating token${err}`);
    }
    return token;
  }

}

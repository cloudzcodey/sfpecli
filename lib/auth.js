import { encrypt } from "./appcrypto.js";
import {saveCredentialsToTempFile, getOrgIdFromAccessToken} from './util.js'
import jwt from 'jsonwebtoken'
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const authenticateWithUsernamePassword = async ({ alias, username, password, token, clientId, clientSecret, loginUrl }) => {
  const passwordWithToken = `${password}${token}`;
    
  const requestBody = new URLSearchParams({
    grant_type: 'password',
    client_id: clientId,
    client_secret: clientSecret,
    username,
    password: passwordWithToken,
  }).toString();

  const response = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: requestBody,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Login failed: ${error.error_description}`);
  }

  const data = await response.json();
  //console.log('d-data: ', data);
  saveCredentialsToTempFile(alias, data.instance_url,encrypt(data.access_token));

  // Exporting to environment variables  
  return true;
};


export const authenticateWithClientCredentials = async ({ alias, clientId, clientSecret, loginUrl }) => {
    const requestBody = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
      }).toString();
    
      const response = await fetch(`${loginUrl}/services/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: requestBody,
      });
    
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Authentication failed: ${error.error_description}`);
      }
    
      const data = await response.json();
      //console.log('d-data: ', data);
      saveCredentialsToTempFile(alias, data.instance_url,encrypt(data.access_token)); 
      return true;
}


export const authenticateWithJWT = async ({ alias, clientId, username, keyfilepath, loginUrl }) => {
    // Path to your server.key file
    const privateKeyPath = path.join(__dirname, keyfilepath);
    
    // Read the private key
    const privateKey = fs.readFileSync(privateKeyPath, 'utf8');
    const currentDate = new Date();
    // Add 30 minutes to the current date
    const futureDate = new Date(currentDate.getTime() + 30 * 60000); // 30 minutes * 60 seconds * 1000 milliseconds    
    // Get the Unix timestamp (in seconds) of the future date
    const unixTimestamp = Math.floor(futureDate.getTime() / 1000);
    // Create the JWT token
    const payload = {
      "iss": clientId,  // Client ID (Consumer Key) from the connected app
      "sub": username,  // The username to authenticate as
      "aud": loginUrl,  // The Salesforce login URL
      "exp": unixTimestamp
    };
  const additionalPayload = {
    "scopes" : ["refresh_token", "api"].join(" ")
  }
    const jwtToken = jwt.sign(payload, privateKey, {"algorithm" : "RS256"});
    //console.log('jwtToken-- ', additionalPayload,privateKey, payload);
    const extToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3N1ZXIiOiIzTVZHOXd0NElMNE81d3ZKZjFhWkdLdC51b3dnOEtkN1hLR0Vza1V0RVg1a282YUtFcDI4dW1raVQzZVZTYXNvX3VtcW9ybWU5eEtmWVlwYkU1NzVEIiwic3ViamVjdCI6ImFzaGlzaC5kZXYuYWRlQHNhbGVzZm9yY2UuY29tIiwiYXVkaWVuY2UiOiJodHRwczovL2xvZ2luLnNhbGVzZm9yY2UuY29tIiwiZXhwaXJlc0luIjoiNjAwIiwiYWxnb3JpdGhtIjoiUlMyNTYifQ.blNm6Q_KpmQgdXXQ6_aT2cKN18uZ6GHaVDZTJPV6gYs9xdcXQd3wx6_UmfPKI4Du9NWvIXVcPld6AyHuXG8-4Xw8EJt1YCnFNTbIq0aQ3x2iUDarDoZ6vZMVggumb1fg3H4hqI9JFa0UQr-VkifAiet5dHgFVsbCgScli5o9jVz6WJNCZmIgRru754wN-uJLnvZmdC-J-D1a2OOoBR3YNsUgFB_1Py9K-3wJ3w9qH4puLk-p4fIgoei8jW3CfXtChEQOK76nPzjiADppdB1B7BIyjg57LbV3kXxL-yoQm9fgzX_82fFZCzwDP7qCkWQlNN20_sOxFUtl-CcT1KdPoQ"
    const requestBody = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwtToken
    });
  
    const response = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: requestBody.toString(),
    });
  
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Authentication failed: ${JSON.stringify(error)}`);
    }
  
    const data = await response.json();
    saveCredentialsToTempFile(alias, data.instance_url, encrypt(data.access_token));
  
    // Exporting to environment variables  
    return true;
  };
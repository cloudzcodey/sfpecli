import { decrypt } from "./appcrypto.js";
import path from 'path';
import os from 'os';
import fs from 'fs';

export const prefixPath = 'sfpeclidir_'

export const getOrgIdFromAccessToken = async (accessToken) => {
    const parts = accessToken.split('!');
    if (parts.length !== 2) {
      throw new Error('Invalid access token format');
    }
    return parts[0];
}

export const saveCredentialsToTempFile = async (alias, instanceUrl, encryptedAccessToken) => {
    //console.log('alias in auth: ', alias);
    const tempDir = path.join(os.tmpdir(), prefixPath + alias);
  
    // Create directory if it doesn't exist
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
  
    const credentialsFilePath = path.join(tempDir, 'credentials.json');
    const currentDateTime = getCurrentDateTimeInISOFormat();
    let orgId;
    try{
        const accessTkn = await decrypt(encryptedAccessToken);
        //console.log('accessTkn= ', accessTkn);
        orgId = await getOrgIdFromAccessToken(accessTkn);
    }
    catch(error){
        console.info('OrgId not found in access_token');
        orgId = 'Not Found'
    }
    //console.log('orgIdorgId= ', orgId);
    const credentials = {
      instanceUrl,
      encryptedAccessToken,
      currentDateTime,
      orgId
    };
  
    fs.writeFileSync(credentialsFilePath, JSON.stringify(credentials));
    //console.log(`Credentials saved to ${credentialsFilePath}`);
};

const getCredentialsFromTempFile = (alias) => {
    const tempDir = path.join(os.tmpdir(), prefixPath + alias);
    const credentialsFilePath = path.join(tempDir, 'credentials.json');
  
    if (!fs.existsSync(credentialsFilePath)) {
      throw new Error(`Credentials file not found for alias ${alias}`);
    }
  
    const credentials = JSON.parse(fs.readFileSync(credentialsFilePath, 'utf8'));
    return credentials;
  };
  
export const getAccessToken = (alias) => {
    const { encryptedAccessToken } = getCredentialsFromTempFile(alias);
    return decrypt(encryptedAccessToken);
};
  
export const getInstanceUrl = (alias) => {
    const { instanceUrl } = getCredentialsFromTempFile(alias);
    return instanceUrl;
};


  export const listAliases = () => {
    // Read the contents of the directory
    fs.readdir(os.tmpdir(), { withFileTypes: true }, (err, files) => {
      if (err) {
        console.error('Error reading directory:', err);
        return;
      }
  
      // Filter out the directories that match the prefix
      const matchingDirs = files.filter(file => file.isDirectory() && file.name.startsWith(prefixPath));
  
      // Extract the trailing part of the directory names and read currentDateTime from credentials.json
      const trailingParts = matchingDirs.map(dir => {
        const dirPath = path.join(os.tmpdir(), dir.name);
        const credentialsPath = path.join(dirPath, 'credentials.json');
        let currentDateTime = 'Not Found';
        let orgId = 'Not Found';
  
        // Read the credentials.json file
        try {
          if (fs.existsSync(credentialsPath)) {
            const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
            currentDateTime = credentials.currentDateTime || 'Not Found';
            orgId = credentials.orgId || 'Not Found';
          }
        } catch (error) {
          console.error(`Error reading credentials.json in ${dirPath}:`, error);
        }
  
        return {
          'Available Aliases': dir.name.slice(prefixPath.length),
          "Org Id" : orgId,
          'Last Authenticated': currentDateTime
        };
      });
  
      // Print the trailing parts and currentDateTime in a table format
      if (trailingParts.length === 0) {
        console.log('No Alias records found');
      } else {
          // Print the trailing parts and currentDateTime in a table format
          console.table(trailingParts);
      }
    });
  };

export const findAlias = (alias) => {
    return new Promise((resolve, reject) => {
        // Read the contents of the directory
        fs.readdir(os.tmpdir(), { withFileTypes: true }, (err, files) => {
            if (err) {
                reject(new Error('Error reading directory:', err));
                return;
            }

            // Filter out the directories that match the prefix
            const matchingDirs = files.filter(file => file.isDirectory() && file.name.startsWith(prefixPath));

            // Extract the trailing part of the directory names
            const trailingParts = matchingDirs.map(dir => {
                return dir.name.slice(prefixPath.length);
            });

            // Check if the alias is in the list
            if (trailingParts.includes(alias)) {
                resolve(true);
            } else {
                reject(new Error(`No Alias records found with alias ${alias}`));
            }
        });
    });
};

  export const getCurrentDateTimeInISOFormat = () => {
    const now = new Date();
    return now.toISOString().replace(/\.\d{3}Z$/, 'Z');
  }
  
export const removeAlias = (alias) => {
    const aliasDirectory = path.join(os.tmpdir(), prefixPath + alias);
    
    // Check if the directory exists
    if (fs.existsSync(aliasDirectory)) {
      try {
        // Remove the directory
        fs.rmdirSync(aliasDirectory, { recursive: true });
        console.log(`Alias '${alias}' removed successfully.`);
      } catch (error) {
        console.error(`Error removing alias '${alias}':`, error);
      }
    } else {
      console.log(`Alias '${alias}' does not exist.`);
    }
};

// Function to retrieve user ID
export const getUserId = async (alias) => {
    try {
        // Set up the headers for the request
        const accessToken = getAccessToken(alias);
        const instanceUrl = getInstanceUrl(alias);
        const headers = {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
        };

        // Make a request to the Identity service to get the current user's information
        const response = await fetch(`${instanceUrl}/services/oauth2/userinfo`, { headers });

        if (!response.ok) {
            throw new Error(`Error fetching user info: ${response.statusText}`);
        }

        // Parse the JSON response
        const data = await response.json();

        // Extract user ID from the response
        const userId = data.user_id;
        //console.log('User ID:', userId);
        return userId;
    } catch (err) {
        console.error('Error retrieving user ID:', err.response ? err.response.data : err.message);
    }
}
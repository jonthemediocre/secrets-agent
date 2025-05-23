import AuthAgent from './AuthAgent'; // Adjust path as needed
import { createLogger } from './src/utils/logger';

const logger = createLogger('APIManagerAgent');

interface RequestOptions extends RequestInit {
  // We can add custom options here if needed in the future
}

interface RetryConfig {
  attempts: number; // Max number of retries *after* the initial attempt
  delayMs: number;
  shouldRetry?: (error: Error | unknown, attempt: number, response?: Response) => boolean;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  attempts: 1, // For 401, effectively 1 retry *after* refresh. For network, this means 1 retry.
  delayMs: 100,
};

export class APIManagerAgent {
  private authAgent: AuthAgent;

  constructor(authAgent: AuthAgent) {
    this.authAgent = authAgent;
  }

  public async fetchWithAuth(
    url: string,
    options: RequestOptions = {},
    retryConfig: RetryConfig = { ...DEFAULT_RETRY_CONFIG } // Ensure default is a copy
  ): Promise<Response> {
    let attempt = 0;
    let lastError: Error | unknown = new Error('APIManagerAgent: Unknown error before request initiation.');

    // The loop runs for initial attempt (0) + retryConfig.attempts
    while (attempt <= retryConfig.attempts) {
      const session = this.authAgent.getSession();
      let accessToken = session.tokens?.accessToken;

      if (!accessToken) {
        lastError = new Error('No access token available. User might not be authenticated.');
        if (attempt === 0 && session.tokens?.refreshToken) {
          try {
            logger.info('Access token missing, attempting proactive refresh');
            const refreshed = await this.authAgent.refreshAccessToken();
            if (refreshed) {
              // Refresh successful, token will be picked up in the next iteration's getSession()
              accessToken = this.authAgent.getSession().tokens?.accessToken; // Get new token immediately
              if (!accessToken) { // Should not happen if refresh was successful
                 lastError = new Error('Token still missing after proactive refresh.');
                 break;
              }
              // Effectively, the proactive refresh counts towards an "attempt" implicitly
              // by allowing the loop to continue with a now valid token.
              // We don't increment `attempt` here as this path is about getting a token *before* the first real fetch attempt.
            } else {
              lastError = new Error('Proactive token refresh failed.');
              break; 
            }
          } catch (refreshError) {
            const errorMessage = refreshError instanceof Error ? refreshError.message : 'Token refresh failed';
            logger.error('Proactive token refresh failed', { error: errorMessage });
            lastError = refreshError;
            break; 
          }
        } else {
          // No token and no refresh token, or already tried proactive refresh / not first attempt
          // If accessToken is still null here, we can't proceed with auth header
          if(!accessToken) break;
        }
      }
      
      const headers = new Headers(options.headers || {});
      if (accessToken) { 
        headers.append('Authorization', `Bearer ${accessToken}`);
      }
      
      const requestOptions: RequestInit = {
        ...options,
        headers,
      };

      try {
        logger.info('Making API request attempt', {
          attempt: attempt + 1,
          url,
          method: options.method || 'GET'
        });
        const response = await fetch(url, requestOptions);

        if (response.status === 401 && attempt < retryConfig.attempts) { // Only attempt refresh if we have retries left
          logger.info('Received 401 response, attempting token refresh', {
            url,
            attempt: attempt + 1
          });
          lastError = new Error(`Unauthorized: Status 401 for ${url}`); 
          try {
            const refreshedSuccessfully = await this.authAgent.refreshAccessToken();
            if (refreshedSuccessfully) {
              logger.info('Token refreshed successfully, will retry on next loop iteration');
              // Token is refreshed, loop will continue, and next iteration will use the new token.
              // Increment attempt before continuing to ensure we don't loop indefinitely on 401s if refresh works but new token is also bad.
              attempt++;
              await new Promise(resolve => setTimeout(resolve, retryConfig.delayMs * attempt)); 
              continue; 
            } else {
              logger.warn('Token refresh attempt failed, not retrying the 401');
              return response; // Return the 401 response
            }
          } catch (refreshError) {
            const errorMessage = refreshError instanceof Error ? refreshError.message : 'Token refresh error';
            logger.error('Error during token refresh', { error: errorMessage });
            throw refreshError; 
          }
        }
        return response; 
      } catch (networkError) {
        const errorMessage = networkError instanceof Error ? networkError.message : 'Network error';
        logger.error('Fetch error during API request', {
          url,
          attempt: attempt + 1,
          error: errorMessage
        });
        lastError = networkError;
        
        // Standard retry logic for network errors (not 401s, which are handled above)
        if (attempt < retryConfig.attempts) {
          const shouldRetryUserLogic = retryConfig.shouldRetry?.(networkError, attempt, undefined);
          if (shouldRetryUserLogic === false) { // Explicit false from user logic means don't retry
            throw lastError;
          }
          // If shouldRetry is undefined or true, proceed with attempt increment and delay
          attempt++;
          logger.info('Retrying network request', {
            url,
            attempt,
            maxAttempts: retryConfig.attempts
          });
          await new Promise(resolve => setTimeout(resolve, retryConfig.delayMs * attempt));
          // Continue to next iteration of the while loop for the retry
        } else {
          // Max attempts for network errors reached
          throw lastError; 
        }
      }
    } // End of while loop

    // If loop finishes, it means all attempts failed or a break occurred.
    const lastErrorMessage = lastError instanceof Error ? lastError.message : 'Unknown error';
    logger.error('Max retries reached or unrecoverable error', { 
      url,
      lastError: lastErrorMessage
    });
    throw lastError; // Throw the last encountered error
  }
}

// Example Usage (conceptual):
// Assuming authAgent is an instance of AuthAgent
// const apiManager = new APIManagerAgent(authAgent);
//
// async function fetchSomeData() {
//   try {
//     const response = await apiManager.fetchWithAuth('https://api.example.com/data');
//     if (!response.ok) {
//       // Handle non-2xx responses that weren't 401 or network errors
//       logger.error('API Error', { status: response.status, statusText: response.statusText });
//       return;
//     }
//     const data = await response.json();
//     // Data fetched successfully
//   } catch (error) {
//     logger.error('Failed to fetch data with auth', { error });
//     // Here, error could be due to network issues, or failed refresh, or max retries exceeded.
//     // The AuthAgent should have emitted an event if authentication fundamentally failed.
//   }
// } 
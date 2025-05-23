// components/LoginScreen.tsx
import React, { useEffect } from 'react';
import { View, Text, Button, StyleSheet, ActivityIndicator, Alert, Platform, Image } from 'react-native';
import { useAuthAgent } from '../hooks/useAuthAgent'; // Import useAuthAgent
import { useUserAgent } from '../hooks/useUserAgent'; // Import useUserAgent
import { createLogger } from '../src/utils/logger';

const logger = createLogger('LoginScreen');

// Config can be moved to a central place or passed via context if needed
// const authConfig: GoogleAuthConfig = {
//   clientId: "YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com", // REPLACE THIS
//   scopes: ['profile', 'email', 'openid'],
// };

// const authAgent = new AuthAgent(authConfig); // No longer instantiating directly

const LoginScreen: React.FC = () => {
  // Use hooks for auth and user state
  const { authAgent, session, isLoading: isAuthLoading, signInWithGoogleExpo, signInWithGoogleWeb, signOut } = useAuthAgent();
  const { userRecord, loadUser, isLoadingUser, clearUser } = useUserAgent();

  // Combined loading state
  const isLoadingCombined = isAuthLoading || isLoadingUser;

  // Load user data when authenticated
  useEffect(() => {
    if (session.isAuthenticated && authAgent) { // ensure authAgent is available from the hook
      loadUser();
    } else if (!session.isAuthenticated) {
      clearUser(); // Clear userRecord if not authenticated
    }
  }, [session.isAuthenticated, authAgent, loadUser, clearUser]);

  const handleSignIn = async () => {
    try {
      const resultSession = Platform.OS === 'web'
        ? await signInWithGoogleWeb()
        : await signInWithGoogleExpo();
      
      logger.info('Sign-in successful');

      if (resultSession?.isAuthenticated) {
        Alert.alert("Sign-in Success", `Welcome ${resultSession.user?.name || 'User'}!`);
        // userRecord will be loaded by the useEffect above
      } else if (resultSession === null || (resultSession && !resultSession.isAuthenticated && !resultSession.error)) {
        // User cancelled or process didn't complete successfully without an explicit error
        Alert.alert("Sign-in Process", "Sign-in was cancelled or did not complete.");
      } else if (resultSession?.error) {
        Alert.alert("Sign-in Error", resultSession.error.message || "Failed to sign in.");
      }

    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      logger.error('Sign-in failed', { error: errorMessage });
      Alert.alert("Sign-in Error", errorMessage || "Failed to sign in.");
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      Alert.alert("Signed Out", "You have been signed out successfully.");
      clearUser(); // Clear userRecord on sign out
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error occurred';
      logger.error('Sign-out failed', { error: errorMessage });
      Alert.alert("Sign-out Error", errorMessage || "Failed to sign out.");
    }
  };

  if (isLoadingCombined) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Auth & User Demo</Text>
      
      {session.isAuthenticated && userRecord ? (
        <View style={styles.authContainer}>
          <Text style={styles.statusText}>Welcome, {userRecord.name || 'User'}!</Text>
          {userRecord.avatarUrl && (
            <Image source={{ uri: userRecord.avatarUrl }} style={styles.avatar} />
          )}
          <Text>ID: {userRecord.id}</Text>
          <Text>Email: {userRecord.email}</Text>
          <Text>Roles: {userRecord.roles?.join(', ') || 'No roles assigned'}</Text>
          <Text>Preferences: {JSON.stringify(userRecord.preferences) || 'No preferences set'}</Text>
          <View style={styles.buttonSpacer} />
          <Button title="Sign Out" onPress={handleSignOut} color="#ff6347" />
        </View>
      ) : session.isAuthenticated && !userRecord ? (
        // Authenticated, but userRecord still loading or failed to load
        <View style={styles.authContainer}>
          <Text style={styles.statusText}>Signed In!</Text>
          <ActivityIndicator />
          <Text>Loading user profile...</Text>
           <View style={styles.buttonSpacer} />
          <Button title="Sign Out" onPress={handleSignOut} color="#ff6347" />
        </View>
      ) : (
        // Not authenticated
        <View style={styles.authContainer}>
          <Text style={styles.statusText}>Please Sign In</Text>
          <View style={styles.buttonSpacer} />
          <Button title="Sign in with Google" onPress={handleSignIn} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  authContainer: {
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3, // For Android
  },
  statusText: {
    fontSize: 18,
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    marginBottom: 10,
  },
  buttonSpacer: {
    height: 15,
  },
  avatar: { // Added avatar style
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 10,
  }
});

export default LoginScreen;

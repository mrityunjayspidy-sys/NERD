import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { PillButton } from '../components/common/PillButton';
import { NerdLogo } from '../components/common/NerdLogo';
import { Ionicons } from '@expo/vector-icons';

type AuthMode = 'login' | 'signup' | 'forgot';

export const AuthScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { login, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [infoMessage, setInfoMessage] = useState('');

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setErrorMessage('');
    setInfoMessage('');
  };

  const handleSubmit = async () => {
    setErrorMessage('');
    setInfoMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    if (mode === 'signup') {
      if (!name.trim()) {
        setErrorMessage('Please enter your name / username.');
        return;
      }
      if (!password.trim()) {
        setErrorMessage('Please enter a password.');
        return;
      }
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter your password.');
        return;
      }
    }

    if (mode === 'login' && !password.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const res = await login(email.trim(), password);
        if (res.error) setErrorMessage(res.error);
      } else if (mode === 'signup') {
        const res = await signUp(email.trim(), password, name.trim());
        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.message) {
          setInfoMessage(res.message);
        }
      } else if (mode === 'forgot') {
        const res = await resetPassword(email.trim());
        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.message) {
          setInfoMessage(res.message);
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Emblem */}
        <View style={styles.brandContainer}>
          <View
            style={[
              styles.companionIconOrb,
              {
                backgroundColor: theme.colors.surfaceElevated,
                borderColor: theme.colors.borderActive,
              },
            ]}
          >
            <NerdLogo size={42} color={theme.colors.textPrimary} bgColor="transparent" />
          </View>
          <Text style={[styles.brandTitle, { color: theme.colors.textPrimary }]}>Nerd</Text>
          <Text style={[styles.brandTagline, { color: theme.colors.textSecondary }]}>
            Focus in Motion • Tasks, Space & Real-time Chat
          </Text>
        </View>

        {/* Auth Glass Card */}
        <View
          style={[
            styles.card,
            {
              backgroundColor: theme.colors.surfaceElevated,
              borderColor: theme.colors.border,
              borderRadius: theme.radii.xl,
            },
          ]}
        >
          {/* Mode Switcher Tabs */}
          {mode !== 'forgot' ? (
            <View
              style={[
                styles.tabRow,
                {
                  backgroundColor: theme.colors.surfaceInput,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              <Pressable
                onPress={() => switchMode('login')}
                style={[
                  styles.tabBtn,
                  mode === 'login' && {
                    backgroundColor: theme.colors.accent,
                    borderRadius: theme.radii.full,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: mode === 'login' ? theme.colors.textInverse : theme.colors.textSecondary },
                  ]}
                >
                  Sign In
                </Text>
              </Pressable>

              <Pressable
                onPress={() => switchMode('signup')}
                style={[
                  styles.tabBtn,
                  mode === 'signup' && {
                    backgroundColor: theme.colors.accent,
                    borderRadius: theme.radii.full,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: mode === 'signup' ? theme.colors.textInverse : theme.colors.textSecondary },
                  ]}
                >
                  Register
                </Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.forgotHeader}>
              <Pressable onPress={() => switchMode('login')} style={styles.backButton}>
                <Ionicons name="arrow-back" size={18} color={theme.colors.textPrimary} />
                <Text style={[styles.backButtonText, { color: theme.colors.textPrimary }]}>
                  Back to Sign In
                </Text>
              </Pressable>
              <Text style={[styles.forgotTitle, { color: theme.colors.textPrimary }]}>
                Reset Password
              </Text>
              <Text style={[styles.forgotSub, { color: theme.colors.textMuted }]}>
                Enter your email address to receive password reset instructions.
              </Text>
            </View>
          )}

          {/* Feedback Messages */}
          {errorMessage ? (
            <View style={[styles.messageBanner, { backgroundColor: 'rgba(217, 83, 79, 0.12)' }]}>
              <Ionicons name="alert-circle" size={16} color={theme.colors.priorityHigh} />
              <Text style={[styles.messageText, { color: theme.colors.priorityHigh }]}>
                {errorMessage}
              </Text>
            </View>
          ) : null}

          {infoMessage ? (
            <View style={[styles.messageBanner, { backgroundColor: 'rgba(78, 159, 118, 0.15)' }]}>
              <Ionicons name="checkmark-circle" size={16} color={theme.colors.donePill} />
              <Text style={[styles.messageText, { color: theme.colors.donePill }]}>
                {infoMessage}
              </Text>
            </View>
          ) : null}

          {/* Registration Name Field */}
          {mode === 'signup' && (
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Full Name / Username
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.colors.surfaceInput,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.full,
                  },
                ]}
              >
                <Ionicons name="person-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.colors.textPrimary }]}
                  placeholder="e.g. Alex Rivera"
                  placeholderTextColor={theme.colors.textMuted}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* Email Field */}
          <View style={styles.formGroup}>
            <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
              Email Address
            </Text>
            <View
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors.surfaceInput,
                  borderColor: theme.colors.border,
                  borderRadius: theme.radii.full,
                },
              ]}
            >
              <Ionicons name="mail-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary }]}
                placeholder="name@domain.com"
                placeholderTextColor={theme.colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Password Field */}
          {mode !== 'forgot' && (
            <View style={styles.formGroup}>
              <View style={styles.passwordLabelRow}>
                <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                  Password
                </Text>
                {mode === 'login' && (
                  <Pressable onPress={() => switchMode('forgot')}>
                    <Text style={[styles.forgotLink, { color: theme.colors.accent }]}>
                      Forgot password?
                    </Text>
                  </Pressable>
                )}
              </View>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.colors.surfaceInput,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.full,
                  },
                ]}
              >
                <Ionicons name="lock-closed-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.colors.textPrimary }]}
                  placeholder="At least 6 characters"
                  placeholderTextColor={theme.colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>
          )}

          {/* Confirm Password Field for Registration */}
          {mode === 'signup' && (
            <View style={styles.formGroup}>
              <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                Confirm Password
              </Text>
              <View
                style={[
                  styles.inputWrapper,
                  {
                    backgroundColor: theme.colors.surfaceInput,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.full,
                  },
                ]}
              >
                <Ionicons name="shield-checkmark-outline" size={18} color={theme.colors.textMuted} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, { color: theme.colors.textPrimary }]}
                  placeholder="Re-enter your password"
                  placeholderTextColor={theme.colors.textMuted}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                />
              </View>
            </View>
          )}

          {/* Submit Button */}
          <PillButton
            label={
              loading
                ? ''
                : mode === 'login'
                ? 'Sign In to Nerd'
                : mode === 'signup'
                ? 'Create Nerd Account'
                : 'Send Reset Link'
            }
            icon={loading ? <ActivityIndicator color={theme.colors.textInverse} /> : undefined}
            variant="accent"
            size="lg"
            onPress={handleSubmit}
            disabled={loading}
            style={styles.submitBtn}
          />

          {/* Bottom Switch Link */}
          <View style={styles.bottomSwitchRow}>
            {mode === 'login' && (
              <Pressable onPress={() => switchMode('signup')}>
                <Text style={[styles.switchText, { color: theme.colors.textSecondary }]}>
                  Don't have an account?{' '}
                  <Text style={[styles.switchLink, { color: theme.colors.textPrimary }]}>
                    Register
                  </Text>
                </Text>
              </Pressable>
            )}

            {mode === 'signup' && (
              <Pressable onPress={() => switchMode('login')}>
                <Text style={[styles.switchText, { color: theme.colors.textSecondary }]}>
                  Already have an account?{' '}
                  <Text style={[styles.switchLink, { color: theme.colors.textPrimary }]}>
                    Sign In
                  </Text>
                </Text>
              </Pressable>
            )}

            {mode === 'forgot' && (
              <Pressable onPress={() => switchMode('login')}>
                <Text style={[styles.switchText, { color: theme.colors.textSecondary }]}>
                  Remember your password?{' '}
                  <Text style={[styles.switchLink, { color: theme.colors.textPrimary }]}>
                    Sign In
                  </Text>
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  companionIconOrb: {
    width: 76,
    height: 76,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 14,
    elevation: 4,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  brandTagline: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
    maxWidth: 280,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 6,
  },
  tabRow: {
    flexDirection: 'row',
    padding: 4,
    borderWidth: 1,
    marginBottom: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  forgotHeader: {
    marginBottom: 18,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  backButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  forgotTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  forgotSub: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  messageBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 16,
    gap: 8,
  },
  messageText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  formGroup: {
    marginBottom: 14,
  },
  passwordLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  forgotLink: {
    fontSize: 11,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    borderWidth: 0,
  },
  submitBtn: {
    marginTop: 10,
  },
  bottomSwitchRow: {
    marginTop: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: {
    fontSize: 13,
    fontWeight: '500',
  },
  switchLink: {
    fontWeight: '800',
    textDecorationLine: 'underline',
  },
});

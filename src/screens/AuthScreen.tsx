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

type AuthMode = 'welcome' | 'login' | 'signup' | 'forgot';

export const AuthScreen: React.FC = () => {
  const { theme, isDark } = useTheme();
  const { login, signUp, resetPassword } = useAuth();

  const [mode, setMode] = useState<AuthMode>('welcome');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
        setErrorMessage('Passwords do not match.');
        return;
      }

      setLoading(true);
      const res = await signUp(email.trim(), password, name.trim());
      setLoading(false);

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setInfoMessage(
          'Account created successfully! Please check your email to confirm your account, or sign in.'
        );
        setTimeout(() => switchMode('login'), 2000);
      }
    } else if (mode === 'login') {
      if (!password.trim()) {
        setErrorMessage('Please enter your password.');
        return;
      }

      setLoading(true);
      const res = await login(email.trim(), password);
      setLoading(false);

      if (res.error) {
        setErrorMessage(res.error);
      }
    } else if (mode === 'forgot') {
      setLoading(true);
      const res = await resetPassword(email.trim());
      setLoading(false);

      if (res.error) {
        setErrorMessage(res.error);
      } else {
        setInfoMessage('Password reset link sent to your email address.');
        setTimeout(() => switchMode('login'), 3000);
      }
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
        {/* ================= WELCOME HERO VIEW ================= */}
        {mode === 'welcome' ? (
          <View style={styles.welcomeContainer}>
            {/* Logo Orb */}
            <View
              style={[
                styles.welcomeLogoOrb,
                {
                  backgroundColor: theme.colors.surfaceElevated,
                  borderColor: theme.colors.borderActive,
                },
              ]}
            >
              <NerdLogo size={68} color={theme.colors.textPrimary} bgColor="transparent" />
            </View>

            <Text style={[styles.welcomeTitle, { color: theme.colors.textPrimary }]}>
              Welcome to Nerd
            </Text>
            <Text style={[styles.welcomeSubtitle, { color: theme.colors.textSecondary }]}>
              Make your task and schedule more easy
            </Text>

            {/* Feature Highlights Grid */}
            <View style={styles.welcomeFeaturesGrid}>
              <View
                style={[
                  styles.welcomeFeatureCard,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.lg,
                  },
                ]}
              >
                <View style={[styles.featureIconWrap, { backgroundColor: theme.colors.surfaceInput }]}>
                  <Ionicons name="planet" size={20} color={theme.colors.accent} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>
                    2D Moving Space
                  </Text>
                  <Text style={[styles.featureDesc, { color: theme.colors.textMuted }]}>
                    Orbital gravity canvas with intuitive drag-and-drop
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.welcomeFeatureCard,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.lg,
                  },
                ]}
              >
                <View style={[styles.featureIconWrap, { backgroundColor: theme.colors.surfaceInput }]}>
                  <Ionicons name="git-network" size={20} color={theme.colors.accent} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>
                    Flexible Cable Wiring
                  </Text>
                  <Text style={[styles.featureDesc, { color: theme.colors.textMuted }]}>
                    Link milestones with dynamic hanging wires
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.welcomeFeatureCard,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.lg,
                  },
                ]}
              >
                <View style={[styles.featureIconWrap, { backgroundColor: theme.colors.surfaceInput }]}>
                  <Ionicons name="chatbubbles" size={20} color={theme.colors.accent} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>
                    Real-time Chat Space
                  </Text>
                  <Text style={[styles.featureDesc, { color: theme.colors.textMuted }]}>
                    Connect with friends instantly via Unique Nerd Codes
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.welcomeFeatureCard,
                  {
                    backgroundColor: theme.colors.surfaceElevated,
                    borderColor: theme.colors.border,
                    borderRadius: theme.radii.lg,
                  },
                ]}
              >
                <View style={[styles.featureIconWrap, { backgroundColor: theme.colors.surfaceInput }]}>
                  <Ionicons name="calendar" size={20} color={theme.colors.accent} />
                </View>
                <View style={styles.featureTextWrap}>
                  <Text style={[styles.featureTitle, { color: theme.colors.textPrimary }]}>
                    Calendar Sync & Agenda
                  </Text>
                  <Text style={[styles.featureDesc, { color: theme.colors.textMuted }]}>
                    Real-time daily schedule timeline & reminders
                  </Text>
                </View>
              </View>
            </View>

            {/* CTAs */}
            <View style={styles.welcomeActions}>
              <PillButton
                label="Get Started"
                variant="accent"
                size="lg"
                onPress={() => switchMode('signup')}
                style={{ width: '100%' }}
              />
              <PillButton
                label="Sign In to Existing Account"
                variant="secondary"
                size="md"
                onPress={() => switchMode('login')}
                style={{ width: '100%' }}
              />
            </View>
          </View>
        ) : (
          /* ================= LOGIN / SIGNUP / FORGOT FORM ================= */
          <View style={styles.formContainer}>
            {/* Back to Welcome Link */}
            <Pressable onPress={() => switchMode('welcome')} style={styles.backToWelcomeBtn}>
              <Ionicons name="arrow-back" size={16} color={theme.colors.textSecondary} />
              <Text style={[styles.backToWelcomeText, { color: theme.colors.textSecondary }]}>
                Back to Welcome
              </Text>
            </Pressable>

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
                      Create Account
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.forgotHeader}>
                  <Pressable onPress={() => switchMode('login')} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={18} color={theme.colors.textPrimary} />
                  </Pressable>
                  <Text style={[styles.forgotTitle, { color: theme.colors.textPrimary }]}>
                    Reset Password
                  </Text>
                  <View style={{ width: 18 }} />
                </View>
              )}

              {/* Feedback Banners */}
              {errorMessage ? (
                <View
                  style={[
                    styles.messageBanner,
                    {
                      backgroundColor: 'rgba(217, 83, 79, 0.12)',
                      borderColor: theme.colors.priorityHigh,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Ionicons name="alert-circle" size={16} color={theme.colors.priorityHigh} />
                  <Text style={[styles.messageText, { color: theme.colors.priorityHigh }]}>
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              {infoMessage ? (
                <View
                  style={[
                    styles.messageBanner,
                    {
                      backgroundColor: 'rgba(78, 159, 118, 0.12)',
                      borderColor: theme.colors.donePill,
                      borderWidth: 1,
                    },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={16} color={theme.colors.donePill} />
                  <Text style={[styles.messageText, { color: theme.colors.donePill }]}>
                    {infoMessage}
                  </Text>
                </View>
              ) : null}

              {/* Sign Up: Name Input */}
              {mode === 'signup' && (
                <View style={styles.formGroup}>
                  <Text style={[styles.inputLabel, { color: theme.colors.textSecondary }]}>
                    Display Name / Username
                  </Text>
                  <View
                    style={[
                      styles.inputWrapper,
                      {
                        backgroundColor: theme.colors.surfaceInput,
                        borderColor: theme.colors.border,
                        borderRadius: theme.radii.lg,
                      },
                    ]}
                  >
                    <Ionicons
                      name="person-outline"
                      size={18}
                      color={theme.colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.colors.textPrimary }]}
                      placeholder="e.g. Alex"
                      placeholderTextColor={theme.colors.textMuted}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              {/* Email Input */}
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
                      borderRadius: theme.radii.lg,
                    },
                  ]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={18}
                    color={theme.colors.textMuted}
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={[styles.input, { color: theme.colors.textPrimary }]}
                    placeholder="you@domain.com"
                    placeholderTextColor={theme.colors.textMuted}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              </View>

              {/* Password Input */}
              {mode !== 'forgot' && (
                <View style={styles.formGroup}>
                  <View style={styles.passwordLabelRow}>
                    <Text style={[styles.inputLabel, { color: theme.colors.textSecondary, marginBottom: 0 }]}>
                      Password
                    </Text>
                    {mode === 'login' && (
                      <Pressable onPress={() => switchMode('forgot')}>
                        <Text style={[styles.forgotLink, { color: theme.colors.textSecondary }]}>
                          Forgot Password?
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
                        borderRadius: theme.radii.lg,
                        marginTop: 6,
                      },
                    ]}
                  >
                    <Ionicons
                      name="lock-closed-outline"
                      size={18}
                      color={theme.colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.colors.textPrimary }]}
                      placeholder="••••••••"
                      placeholderTextColor={theme.colors.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <Pressable
                      onPress={() => setShowPassword((prev) => !prev)}
                      style={styles.eyeToggleBtn}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={theme.colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Confirm Password (Sign Up only) */}
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
                        borderRadius: theme.radii.lg,
                      },
                    ]}
                  >
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color={theme.colors.textMuted}
                      style={styles.inputIcon}
                    />
                    <TextInput
                      style={[styles.input, { color: theme.colors.textPrimary }]}
                      placeholder="••••••••"
                      placeholderTextColor={theme.colors.textMuted}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      autoCapitalize="none"
                    />
                    <Pressable
                      onPress={() => setShowConfirmPassword((prev) => !prev)}
                      style={styles.eyeToggleBtn}
                      hitSlop={8}
                    >
                      <Ionicons
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={theme.colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </View>
              )}

              {/* Submit Button */}
              <PillButton
                label={
                  loading ? (
                    <ActivityIndicator color={theme.colors.textInverse} size="small" />
                  ) : mode === 'login' ? (
                    'Sign In to Nerd'
                  ) : mode === 'signup' ? (
                    'Create My Account'
                  ) : (
                    'Send Reset Link'
                  )
                }
                variant="accent"
                size="lg"
                onPress={handleSubmit}
                disabled={loading}
                style={styles.submitBtn}
              />

              {/* Bottom Quick Switch */}
              <View style={styles.bottomSwitchRow}>
                {mode === 'login' ? (
                  <Text style={[styles.switchText, { color: theme.colors.textMuted }]}>
                    Don't have an account?{' '}
                    <Text
                      onPress={() => switchMode('signup')}
                      style={[styles.switchLink, { color: theme.colors.textPrimary }]}
                    >
                      Sign Up
                    </Text>
                  </Text>
                ) : mode === 'signup' ? (
                  <Text style={[styles.switchText, { color: theme.colors.textMuted }]}>
                    Already have an account?{' '}
                    <Text
                      onPress={() => switchMode('login')}
                      style={[styles.switchLink, { color: theme.colors.textPrimary }]}
                    >
                      Sign In
                    </Text>
                  </Text>
                ) : (
                  <Text style={[styles.switchText, { color: theme.colors.textMuted }]}>
                    Remember your password?{' '}
                    <Text
                      onPress={() => switchMode('login')}
                      style={[styles.switchLink, { color: theme.colors.textPrimary }]}
                    >
                      Back to Sign In
                    </Text>
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}
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
    paddingHorizontal: 20,
    paddingVertical: 36,
  },
  /* Welcome Hero Styles */
  welcomeContainer: {
    alignItems: 'center',
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  welcomeLogoOrb: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 6,
  },
  welcomeSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 26,
  },
  welcomeFeaturesGrid: {
    width: '100%',
    gap: 10,
    marginBottom: 28,
  },
  welcomeFeatureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    gap: 14,
  },
  featureIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureTextWrap: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  featureDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  welcomeActions: {
    width: '100%',
    gap: 10,
  },
  /* Form Styles */
  formContainer: {
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  backToWelcomeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    alignSelf: 'flex-start',
  },
  backToWelcomeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  companionIconOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginBottom: 12,
  },
  brandTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandTagline: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    padding: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backBtn: {
    padding: 4,
  },
  forgotTitle: {
    fontSize: 16,
    fontWeight: '800',
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
  eyeToggleBtn: {
    padding: 6,
    marginLeft: 6,
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

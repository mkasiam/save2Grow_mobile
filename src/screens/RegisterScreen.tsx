import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useAuth } from "../hooks/useAuth";
import { validateRegistration } from "../utils/validators";
import { getStoredAppSettings } from "../utils/appSettings";
import { getCopy } from "../utils/copy";

const UNIVERSITIES = [
  "RU",
  "BUET",
  "DU",
  "RUET",
  "CUET",
  "NSU",
  "BRAC University",
  "Other",
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function RegisterScreen({ navigation }: { navigation: any }) {
  const { register, loading } = useAuth();
  const [language, setLanguage] = useState<"en" | "bn">("en");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageAnimation] = useState(new Animated.Value(1));

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    university: "BUET",
    studentId: "",
  });

  const [page1Errors, setPage1Errors] = useState<Record<string, string>>({});
  const [page2Errors, setPage2Errors] = useState<Record<string, string>>({});

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    const errors = currentPage === 1 ? page1Errors : page2Errors;
    const setErrors = currentPage === 1 ? setPage1Errors : setPage2Errors;

    if (errors[field]) {
      setErrors((prev: any) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handlePhoneChange = (text: string) => {
    const digitsOnly = text.replace(/\D/g, "").slice(0, 11);
    updateField("phone", digitsOnly);
  };

  const transitionToPage = (nextPage: 1 | 2) => {
    Animated.timing(pageAnimation, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setCurrentPage(nextPage);
      pageAnimation.setValue(0);

      Animated.timing(pageAnimation, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  };

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getStoredAppSettings();
      setLanguage(settings.language);
    };

    loadSettings();
  }, []);

  const text = getCopy(language);

  const validatePage1 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = text.fullName + " is required";
    } else if (formData.name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    if (!formData.phone.trim()) {
      errors.phone = text.phoneNumber + " is required";
    } else if (formData.phone.length !== 11) {
      errors.phone = "Phone must be 11 digits";
    }

    if (!formData.university || formData.university === "Select University") {
      errors.university = text.university + " is required";
    }

    if (!formData.studentId.trim()) {
      errors.studentId = text.studentId + " is required";
    }

    setPage1Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePage2 = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.email.trim()) {
      errors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = "Please enter a valid email";
    }

    if (!formData.password) {
      errors.password = text.password + " is required";
    } else if (formData.password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = text.confirmPassword + " is required";
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = text.passwordsDoNotMatch;
    }

    setPage2Errors(errors);
    return Object.keys(errors).length === 0;
  };

  const goToNextPage = () => {
    if (validatePage1()) {
      transitionToPage(2);
    }
  };

  const goToPreviousPage = () => {
    transitionToPage(1);
  };

  const handleRegister = async () => {
    if (!validatePage2()) {
      return;
    }

    try {
      await register(formData);
      Alert.alert(text.successTitle, text.registrationSuccess);
    } catch (error: any) {
      Alert.alert(
        text.registrationErrorTitle,
        error?.response?.data?.error || error?.message || text.failedToRegister,
      );
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View
          style={[
            styles.progressBar,
            currentPage === 2 && styles.progressBarFull,
          ]}
        />
      </View>

      {/* Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.title}>
          {currentPage === 1 ? text.createAccount : "Secure your account"}
        </Text>
        <Text style={styles.subtitle}>
          {currentPage === 1 ? text.joinToday : "Create a strong password"}
        </Text>
        <Text style={styles.pageIndicator}>{currentPage} / 2</Text>
      </View>

      {/* Page Content */}
      <Animated.View
        style={[
          styles.pageCard,
          {
            opacity: pageAnimation,
            transform: [
              {
                translateY: pageAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.pageScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pageWrapper}>
            {currentPage === 1 ? (
              <>
                <Text style={styles.sectionTitle}>Personal Information</Text>

                <Text style={styles.label}>{text.fullName}</Text>
                <TextInput
                  style={[styles.input, page1Errors.name && styles.inputError]}
                  placeholder={text.yourFullName}
                  value={formData.name}
                  onChangeText={(text) => updateField("name", text)}
                  editable={!loading}
                  placeholderTextColor="#999"
                />
                {page1Errors.name && (
                  <Text style={styles.errorText}>{page1Errors.name}</Text>
                )}

                <Text style={styles.label}>{text.phoneNumber}</Text>
                <TextInput
                  style={[styles.input, page1Errors.phone && styles.inputError]}
                  placeholder={text.elevenDigitPhone}
                  value={formData.phone}
                  onChangeText={handlePhoneChange}
                  keyboardType="phone-pad"
                  maxLength={11}
                  editable={!loading}
                  placeholderTextColor="#999"
                />
                {page1Errors.phone && (
                  <Text style={styles.errorText}>{page1Errors.phone}</Text>
                )}

                <Text style={styles.label}>{text.university}</Text>
                <View
                  style={[
                    styles.pickerContainer,
                    page1Errors.university && styles.pickerContainerError,
                  ]}
                >
                  <Picker
                    selectedValue={formData.university}
                    onValueChange={(value) => updateField("university", value)}
                    enabled={!loading}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                  >
                    {UNIVERSITIES.map((uni) => (
                      <Picker.Item key={uni} label={uni} value={uni} />
                    ))}
                  </Picker>
                </View>
                {page1Errors.university && (
                  <Text style={styles.errorText}>{page1Errors.university}</Text>
                )}

                <Text style={styles.label}>{text.studentId}</Text>
                <TextInput
                  style={[
                    styles.input,
                    page1Errors.studentId && styles.inputError,
                  ]}
                  placeholder={text.studentId}
                  value={formData.studentId}
                  onChangeText={(text) => updateField("studentId", text)}
                  editable={!loading}
                  placeholderTextColor="#999"
                />
                {page1Errors.studentId && (
                  <Text style={styles.errorText}>{page1Errors.studentId}</Text>
                )}
              </>
            ) : (
              <>
                <Text style={styles.sectionTitle}>Account Credentials</Text>

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, page2Errors.email && styles.inputError]}
                  placeholder="email@example.com"
                  value={formData.email}
                  onChangeText={(text) => updateField("email", text)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                  placeholderTextColor="#999"
                />
                {page2Errors.email && (
                  <Text style={styles.errorText}>{page2Errors.email}</Text>
                )}

                <Text style={styles.label}>{text.password}</Text>
                <TextInput
                  style={[
                    styles.input,
                    page2Errors.password && styles.inputError,
                  ]}
                  placeholder={text.password}
                  value={formData.password}
                  onChangeText={(text) => updateField("password", text)}
                  secureTextEntry
                  editable={!loading}
                  placeholderTextColor="#999"
                />
                {page2Errors.password && (
                  <Text style={styles.errorText}>{page2Errors.password}</Text>
                )}

                <Text style={styles.label}>{text.confirmPassword}</Text>
                <TextInput
                  style={[
                    styles.input,
                    page2Errors.confirmPassword && styles.inputError,
                  ]}
                  placeholder={text.confirmPassword}
                  value={formData.confirmPassword}
                  onChangeText={(text) => updateField("confirmPassword", text)}
                  secureTextEntry
                  editable={!loading}
                  placeholderTextColor="#999"
                />
                {page2Errors.confirmPassword && (
                  <Text style={styles.errorText}>
                    {page2Errors.confirmPassword}
                  </Text>
                )}
              </>
            )}
          </View>
        </ScrollView>
      </Animated.View>

      {/* Navigation Buttons */}
      <View style={styles.buttonContainer}>
        {currentPage === 2 && (
          <TouchableOpacity
            style={[styles.buttonSecondary, loading && styles.buttonDisabled]}
            onPress={goToPreviousPage}
            disabled={loading}
          >
            <Text style={styles.buttonSecondaryText}>← Back</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[
            styles.button,
            currentPage === 1 ? styles.buttonFull : styles.buttonNext,
            loading && styles.buttonDisabled,
          ]}
          onPress={currentPage === 1 ? goToNextPage : handleRegister}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? "Processing..." : currentPage === 1 ? "Continue" : text.register}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Login Link */}
      <TouchableOpacity
        onPress={() => navigation.navigate("Login")}
        disabled={loading}
        style={styles.loginLinkContainer}
      >
        <Text style={styles.linkText}>
          {text.alreadyHaveAccount}{" "}
          <Text style={styles.linkBold}>{text.login}</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F7F4",
  },
  pageCard: {
    flex: 1,
    backgroundColor: "transparent",
  },
  pageScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 28,
  },
  progressContainer: {
    height: 5,
    backgroundColor: "#DFEBE4",
  },
  progressBar: {
    height: "100%",
    backgroundColor: "#1E8E5A",
    width: "50%",
  },
  progressBarFull: {
    width: "100%",
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  title: {
    fontSize: 25,
    fontWeight: "800",
    marginBottom: 8,
    color: "#0E2018",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: "#5E776C",
    marginBottom: 12,
    lineHeight: 22,
  },
  pageIndicator: {
    fontSize: 12,
    color: "#999",
    fontWeight: "500",
    marginTop: 8,
  },
  pageWrapper: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
    marginTop: 2,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#10201A",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2ECE7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    fontSize: 15,
    backgroundColor: "#FFF",
    color: "#10201A",
  },
  inputError: {
    borderColor: "#D94C3D",
    backgroundColor: "#FDF0EE",
  },
  errorText: {
    color: "#D94C3D",
    fontSize: 12,
    marginTop: -12,
    marginBottom: 12,
    fontWeight: "500",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#E2ECE7",
    borderRadius: 12,
    backgroundColor: "#FFF",
    marginBottom: 16,
    overflow: "hidden",
  },
  pickerContainerError: {
    borderColor: "#D94C3D",
    backgroundColor: "#FDF0EE",
  },
  picker: {
    height: 50,
    color: "#10201A",
  },
  pickerItem: {
    fontSize: 15,
    color: "#10201A",
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#1E8E5A",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    flex: 1,
  },
  buttonFull: {
    flex: 1,
  },
  buttonNext: {
    flex: 1,
  },
  buttonSecondary: {
    borderWidth: 1,
    borderColor: "#1E8E5A",
    backgroundColor: "#FFF",
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  buttonSecondaryText: {
    color: "#1E8E5A",
    fontSize: 16,
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  loginLinkContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
  },
  linkText: {
    textAlign: "center",
    color: "#5E776C",
    fontSize: 14,
  },
  linkBold: {
    color: "#1E8E5A",
    fontWeight: "700",
  },
  spacer: {
    height: 10,
  },
});

import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
} from "react-native";
import { useAuth } from "../hooks/useAuth";
import { validateLogin } from "../utils/validators";
import { getStoredAppSettings } from "../utils/appSettings";
import { getCopy } from "../utils/copy";
import { Ionicons } from "@expo/vector-icons";

export default function LoginScreen({ navigation }: { navigation: any }) {
  const { login, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [language, setLanguage] = useState<"en" | "bn">("en");

  useEffect(() => {
    const loadSettings = async () => {
      const settings = await getStoredAppSettings();
      setLanguage(settings.language);
    };

    loadSettings();
  }, []);

  const text = getCopy(language);

  const handleLogin = async () => {
    const validation = validateLogin({ email, password });

    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      await login(email, password);
    } catch (error) {
      Alert.alert(
        text.loginErrorTitle,
        error instanceof Error ? error.message : text.failedToRegister,
      );
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerHero}>
        <View style={styles.iconShell}>
          <Ionicons name="leaf" size={20} color="#F6FFF9" />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.save}>Save</Text>
          <Text style={styles.grow}>2Grow</Text>
        </View>
        <Text style={styles.subtitle}>{text.loginToAccount}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, errors.email && styles.inputError]}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={[styles.input, errors.password && styles.inputError]}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          editable={!loading}
        />
        {errors.password && (
          <Text style={styles.errorText}>{errors.password}</Text>
        )}

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.buttonText}>{loading ? 'Logging in...' : text.login}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.linkText}>
            {text.noAccountYet}{" "}
            <Text style={styles.linkBold}>{text.register}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F7F4",
  },
  headerHero: {
    backgroundColor: '#E8F4EE',
    paddingVertical: 70,
    alignItems: 'center',
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    borderBottomWidth: 1,
    borderBottomColor: '#D6E8DE',
  },
  iconShell: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E8E5A',
    shadowColor: '#173629',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
    elevation: 3,
  },
  textWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  save: {
    fontSize: 30,
    fontWeight: '800',
    color: '#173629',
    letterSpacing: 0.5,
  },
  grow: {
    fontSize: 30,
    fontWeight: '800',
    color: '#2D8C62',
    letterSpacing: 0.5,
  },
  logoIcon: {
    fontSize: 36,
  },
  content: {
    padding: 24,
    paddingTop: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#0E2018",
  },
  subtitle: {
    fontSize: 14,
    color: "#5E776C",
    marginTop: 6,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#000",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E2ECE7",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    fontSize: 15,
    backgroundColor: "#FFF",
    color: "#10201A",
  },
  inputError: {
    borderColor: "#D94C3D",
  },
  errorText: {
    color: "#D94C3D",
    fontSize: 12,
    marginTop: -16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: "#1E8E5A",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 14,
    marginBottom: 24,
  },
  buttonDisabled: {
    backgroundColor: "#7BB89A",
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  linkText: {
    textAlign: "center",
    color: "#5E776C",
    fontSize: 14,
    marginBottom: 30,
  },
  linkBold: {
    color: "#1E8E5A",
    fontWeight: "700",
  },
});

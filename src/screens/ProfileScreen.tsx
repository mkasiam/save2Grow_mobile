import React, { useCallback, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useAuth } from "../hooks/useAuth";
import { transactionService, userService } from "../services/api";
import {
  getStoredAppSettings,
  updateStoredAppSettings,
} from "../utils/appSettings";
import { getCopy } from "../utils/copy";
import { SavingsChart, Toast } from "../components";

const buildMonthlySeries = (transactions: any[]) => {
  const monthLabels = ["Jan", "Feb", "Mar", "Apr"];
  const monthTotals = monthLabels.map((label) => ({ label, value: 0 }));

  transactions.forEach((item: any) => {
    const monthIndex = new Date(item.createdAt || item.date).getMonth();
    if (
      monthIndex >= 0 &&
      monthIndex < monthTotals.length &&
      item.type === "deposit"
    ) {
      monthTotals[monthIndex].value += Number(item.amount);
    }
  });

  return monthTotals;
};

const normalizeUser = (value: any) => {
  if (!value) {
    return null;
  }

  return {
    ...value,
    id: value.id || value._id,
  };
};

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { user, logout, refreshUser } = useAuth();
  const { width } = useWindowDimensions();
  const [profileUser, setProfileUser] = useState<any>(user);
  const [stats, setStats] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [language, setLanguage] = useState<"en" | "bn">("en");
  const [toast, setToast] = useState({
    visible: false,
    message: "",
    variant: "success",
  });
  const [editor, setEditor] = useState<null | "name" | "phone">(null);
  const [draftValue, setDraftValue] = useState("");

  const loadProfile = useCallback(async () => {
    try {
      if (!user?.id) {
        setProfileUser(user);
        return;
      }

      const [profileResponse, statsResponse, transactionResponse, settings] =
        await Promise.all([
          userService.getProfile(user.id),
          userService.getStats(user.id),
          transactionService.getTransactions(),
          getStoredAppSettings(),
        ]);

      setProfileUser(normalizeUser(profileResponse.data));
      setStats(statsResponse.data);
      setTransactions(transactionResponse.data || []);
      setLanguage(settings.language);
      await refreshUser();
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }, [refreshUser, user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile]),
  );

  const text = getCopy(language);
  const horizontalPadding = 40;
  const interCardGap = 20;
  const statCardSize = Math.max(
    92,
    Math.floor((width - horizontalPadding - interCardGap) / 3),
  );

  const showToast = (
    message: string,
    variant: "success" | "error" = "success",
  ) => {
    setToast({ visible: true, message, variant });
  };

  const handleLogout = () => {
    Alert.alert(text.logoutTitle, text.logoutConfirm, [
      { text: text.cancel, onPress: () => {} },
      { text: text.logoutTitle, onPress: () => logout(), style: "destructive" },
    ]);
  };

  const handleLanguageChange = async (nextLanguage: "en" | "bn") => {
    try {
      const settings = await updateStoredAppSettings({
        language: nextLanguage,
      });
      setLanguage(settings.language);
      showToast(
        nextLanguage === "bn" ? "ভাষা আপডেট হয়েছে" : text.languageUpdated,
      );
    } catch (error) {
      console.error("Error updating language:", error);
      showToast(text.languageUpdateFailed, "error");
    }
  };

  const openEditor = (field: "name" | "phone") => {
    setEditor(field);
    setDraftValue(profileUser?.[field] || "");
  };

  const closeEditor = () => {
    setEditor(null);
    setDraftValue("");
  };

  const handleSaveEditor = async () => {
    if (!editor) {
      return;
    }

    const value = draftValue.trim();
    if (!value) {
      showToast(text.fieldCannotBeEmpty, "error");
      return;
    }

    try {
      const updatedUser = await userService.updateProfile(user.id, {
        [editor]: value,
      });
      setProfileUser(normalizeUser(updatedUser.data));
      await refreshUser();
      showToast(editor === "name" ? text.profileUpdated : text.phoneUpdated);
      closeEditor();
    } catch (error) {
      console.error("Error updating profile field:", error);
      showToast(text.profileUpdateFailed, "error");
    }
  };

  const handleHelpFaq = () => {
    Alert.alert(text.helpFaq, text.helpFaqBody);
  };

  const handleAboutSave2Grow = () => {
    Alert.alert(text.aboutSave2Grow, text.aboutSave2GrowBody);
  };

  const renderSettingItem = (
    icon: any,
    title: string,
    onPress: () => void,
    badgeText?: string | null,
  ) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <Ionicons name={icon} size={24} color="#1E8E5A" />
      <Text style={styles.settingTitle}>{title}</Text>
      {badgeText ? (
        <View style={styles.settingBadge}>
          <Text style={styles.settingBadgeText}>{badgeText}</Text>
        </View>
      ) : null}
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.wrapper}>
      <ScrollView style={styles.container}>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person-circle" size={82} color="#1E8E5A" />
          </View>
          <Text style={styles.profileName}>
            {profileUser?.name || user?.name}
          </Text>
          <Text style={styles.profileEmail}>
            {profileUser?.email || user?.email}
          </Text>
          <View style={styles.universityBadge}>
            <Ionicons name="school" size={14} color="#FFF" />
            <Text style={styles.universityText}>
              {profileUser?.university || user?.university}
            </Text>
          </View>
        </View>

        <View style={styles.statsSection}>
          <View
            style={[styles.stat, { width: statCardSize, height: statCardSize }]}
          >
            <Text style={styles.statIcon}>💰</Text>
            <Text style={styles.statLabel}>{text.totalSavings}</Text>
            <Text style={styles.statValue}>
              Tk{" "}
              {(
                profileUser?.totalSavings ||
                user?.totalSavings ||
                0
              ).toLocaleString()}
            </Text>
          </View>
          <View
            style={[styles.stat, { width: statCardSize, height: statCardSize }]}
          >
            <Text style={styles.statIcon}>📊</Text>
            <Text style={styles.statLabel}>{text.activeGoals}</Text>
            <Text style={styles.statValue}>{stats?.activeGoals || 0}</Text>
          </View>
          <View
            style={[styles.stat, { width: statCardSize, height: statCardSize }]}
          >
            <Text style={styles.statIcon}>💸</Text>
            <Text style={styles.statLabel}>{text.totalWithdrawn}</Text>
            <Text style={styles.statValue}>
              Tk{" "}
              {(
                profileUser?.totalWithdrawn ||
                user?.totalWithdrawn ||
                0
              ).toLocaleString()}
            </Text>
          </View>
        </View>

        <View style={styles.chartWrap}>
          <SavingsChart
            title={text.transactionHistory}
            subtitle={text.monthlyDepositsOverview}
            data={buildMonthlySeries(transactions)}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{text.language}</Text>
          <View style={styles.languageRow}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                language === "en" && styles.languageButtonActive,
              ]}
              onPress={() => handleLanguageChange("en")}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  language === "en" && styles.languageButtonTextActive,
                ]}
              >
                {text.english}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.languageButton,
                language === "bn" && styles.languageButtonActive,
              ]}
              onPress={() => handleLanguageChange("bn")}
            >
              <Text
                style={[
                  styles.languageButtonText,
                  language === "bn" && styles.languageButtonTextActive,
                ]}
              >
                {text.bangla}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate("TransactionHistory")}
            >
              <View>
                <Text style={styles.quickActionTitle}>
                  {text.transactionHistory}
                </Text>
                <Text style={styles.quickActionText}>
                  {text.historyCaption}
                </Text>
              </View>
              <Ionicons name="time" size={24} color="#1E8E5A" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate("MonthlyReport")}
            >
              <View>
                <Text style={styles.quickActionTitle}>
                  {text.monthlyReport}
                </Text>
                <Text style={styles.quickActionText}>
                  View deposits, withdrawals, and net savings summary.
                </Text>
              </View>
              <Ionicons name="analytics" size={24} color="#5C61F1" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate("Achievements")}
            >
              <View>
                <Text style={styles.quickActionTitle}>{text.achievements}</Text>
                <Text style={styles.quickActionText}>
                  View unlocked badges from savings, goals, and challenges.
                </Text>
              </View>
              <Ionicons name="ribbon" size={24} color="#E39B16" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickActionCard}
              onPress={() => navigation.navigate("ReminderSettings")}
            >
              <View>
                <Text style={styles.quickActionTitle}>
                  {text.reminderSettings}
                </Text>
                <Text style={styles.quickActionText}>
                  {text.chooseReminderCaption}
                </Text>
              </View>
              <Ionicons name="alarm" size={24} color="#2D8C62" />
            </TouchableOpacity>
          </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{text.account}</Text>
          {renderSettingItem("person", text.editProfile, () =>
            openEditor("name"),
          )}
          {renderSettingItem(
            "mail",
            text.emailSettings,
            () => {
              Alert.alert(
                text.emailSettings,
                "Email is read-only in production and is managed by your login account.",
              );
            },
            "Read only",
          )}
          {renderSettingItem("phone-portrait", text.phoneNumber, () =>
            openEditor("phone"),
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{text.support}</Text>
          {renderSettingItem("notifications", text.notifications, () =>
            navigation.navigate("Notifications"),
          )}
          {renderSettingItem("help-circle", text.helpFaq, () =>
            handleHelpFaq(),
          )}
          {renderSettingItem("document-text", text.aboutSave2Grow, () =>
            handleAboutSave2Grow(),
          )}
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out" size={20} color="#FF3B30" />
          <Text style={styles.logoutText}>{text.logoutTitle}</Text>
        </TouchableOpacity>

        <Text style={styles.versionText}>Save2Grow v1.0.0</Text>
      </ScrollView>

      <Modal visible={Boolean(editor)} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {editor === "name" ? "Edit Profile" : "Edit Phone Number"}
                </Text>
                <Text style={styles.modalSubtitle}>
                  Update your account details.
                </Text>
              </View>
              <TouchableOpacity onPress={closeEditor}>
                <Ionicons name="close" size={24} color="#10201A" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>
              {editor === "name" ? "Full Name" : "Phone Number"}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={draftValue}
              onChangeText={setDraftValue}
              autoCapitalize="words"
              keyboardType={editor === "phone" ? "phone-pad" : "default"}
              placeholder={
                editor === "name" ? "Enter full name" : "Enter phone number"
              }
            />

            <TouchableOpacity
              style={styles.primaryAction}
              onPress={handleSaveEditor}
            >
              <Text style={styles.primaryActionText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Toast
        visible={toast.visible}
        message={toast.message}
        variant={toast.variant}
        onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  container: {
    flex: 1,
  },
  profileHeader: {
    alignItems: "center",
    paddingVertical: 24,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  avatar: {
    marginTop: 12,
    marginBottom: 12,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#10201A",
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: "#5F6D66",
    marginBottom: 12,
  },
  universityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#173629",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  universityText: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 12,
  },
  statsSection: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "#FFF",
    marginTop: 12,
    gap: 10,
  },
  stat: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFDF8",
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: "#E9E2D2",
    shadowColor: "#1A2E24",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  statIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 10,
    color: "#64756D",
    marginBottom: 3,
    textAlign: "center",
    paddingHorizontal: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#10201A",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  chartWrap: {
    paddingHorizontal: 20,
  },
  section: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 12,
    marginHorizontal: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ECE8DC",
    shadowColor: "#1A2E24",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#10201A",
    marginBottom: 10,
  },
  languageRow: {
    flexDirection: "row",
    gap: 10,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFFDF8",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E8E0CF",
  },
  languageButtonActive: {
    backgroundColor: "#173629",
    borderColor: "#173629",
  },
  languageButtonText: {
    color: "#3A4E43",
    fontWeight: "700",
  },
  languageButtonTextActive: {
    color: "#FFF",
  },
  quickActionCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#DCE9E1",
    borderRadius: 14,
    backgroundColor: "#F7FBF8",
    padding: 14,
    marginBottom: 10,
  },
  quickActionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#10201A",
  },
  quickActionText: {
    fontSize: 12,
    color: "#64756D",
    marginTop: 4,
    maxWidth: 260,
  },
  resetCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    backgroundColor: "#FFF1EF",
    borderWidth: 1,
    borderColor: "#F4CCC7",
    padding: 14,
  },
  resetTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  resetTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#8F3126",
  },
  resetText: {
    fontSize: 12,
    color: "#A04A40",
    marginTop: 4,
  },
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#10201A",
    marginLeft: 12,
    flex: 1,
  },
  settingBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#D94C3D",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    marginRight: 10,
  },
  settingBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFF",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  logoutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF3B30",
    marginLeft: 8,
  },
  versionText: {
    textAlign: "center",
    fontSize: 12,
    color: "#999",
    paddingBottom: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(10, 18, 14, 0.45)",
    justifyContent: "flex-end",
  },
  modalCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#10201A",
  },
  modalSubtitle: {
    fontSize: 13,
    color: "#64756D",
    marginTop: 4,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#25453A",
    marginBottom: 8,
  },
  modalInput: {
    backgroundColor: "#F7FBF8",
    borderWidth: 1,
    borderColor: "#DCE9E1",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 15,
  },
  primaryAction: {
    backgroundColor: "#1E8E5A",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  primaryActionText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryAction: {
    marginTop: 10,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#FFF1EF",
  },
  secondaryActionText: {
    color: "#A23F35",
    fontSize: 14,
    fontWeight: "700",
  },
});

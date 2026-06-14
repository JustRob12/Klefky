import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import CircularProgress from '../components/CircularProgress';
import { loadVault, saveVault, CredentialItem } from '../utils/storage';
import { generatePassword } from '../utils/security';

interface VaultScreenProps {
  masterKey: string;
}

export default function VaultScreen({ masterKey }: VaultScreenProps) {
  const [vault, setVault] = useState<CredentialItem[]>([]);
  const [filteredVault, setFilteredVault] = useState<CredentialItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchFocused, setSearchFocused] = useState(false);
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<CredentialItem | null>(null);

  // Form state
  const [formService, setFormService] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formCategory, setFormCategory] = useState<string>('Login');
  const [formNotes, setFormNotes] = useState('');
  const [formColor, setFormColor] = useState('#8E8E93');
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [showDetailPassword, setShowDetailPassword] = useState(false);
  const [hueSliderWidth, setHueSliderWidth] = useState(1);

  // Feedback overlay state
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [statusType, setStatusType] = useState<'success' | 'delete'>('success');
  const [statusMessage, setStatusMessage] = useState('');
  const statusAnim = useState(new Animated.Value(0))[0];

  // Audit state
  const [securityScore, setSecurityScore] = useState(100);
  const [weakCount, setWeakCount] = useState(0);
  const [reusedCount, setReusedCount] = useState(0);

  useEffect(() => {
    fetchVault();
  }, []);

  useEffect(() => {
    filterAndSearchVault();
    calculateSecurityMetrics();
  }, [vault, searchQuery, selectedCategory]);

  const fetchVault = async () => {
    try {
      const data = await loadVault(masterKey);
      setVault(data);
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to load credentials vault.');
    }
  };

  const filterAndSearchVault = () => {
    let result = [...vault];

    // Filter by Category
    if (selectedCategory !== 'All') {
      result = result.filter(item => item.category === selectedCategory);
    }

    // Filter by Search Query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          item.service.toLowerCase().includes(query) ||
          item.username.toLowerCase().includes(query) ||
          (item.url && item.url.toLowerCase().includes(query))
      );
    }

    setFilteredVault(result);
  };

  const calculateSecurityMetrics = () => {
    if (vault.length === 0) {
      setSecurityScore(100);
      setWeakCount(0);
      setReusedCount(0);
      return;
    }

    let totalScore = 0;
    let weak = 0;
    let reused = 0;

    const passwordCounts: { [key: string]: number } = {};
    vault.forEach(item => {
      passwordCounts[item.password] = (passwordCounts[item.password] || 0) + 1;
    });

    vault.forEach(item => {
      let itemScore = 100;
      const pwd = item.password;

      // 1. Length check
      if (pwd.length < 8) {
        itemScore -= 40;
      } else if (pwd.length < 12) {
        itemScore -= 15;
      }

      // 2. Complexity checks
      const hasNumbers = /\d/.test(pwd);
      const hasSymbols = /[^A-Za-z0-9]/.test(pwd);
      const hasUpper = /[A-Z]/.test(pwd);

      if (!hasNumbers) itemScore -= 15;
      if (!hasSymbols) itemScore -= 15;
      if (!hasUpper) itemScore -= 10;

      // Clamp item score
      itemScore = Math.max(0, itemScore);

      // Weak count
      if (itemScore < 70) {
        weak++;
      }

      // Reused check
      if (passwordCounts[pwd] > 1) {
        reused++;
        itemScore -= 20;
        itemScore = Math.max(0, itemScore);
      }

      totalScore += itemScore;
    });

    const averageScore = Math.round(totalScore / vault.length);
    setSecurityScore(averageScore);
    setWeakCount(weak);
    setReusedCount(reused);
  };

  const handleCopy = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  const handleGeneratePasswordForForm = () => {
    const generated = generatePassword(16, {
      lowercase: true,
      uppercase: true,
      numbers: true,
      symbols: true,
    });
    setFormPassword(generated);
  };

  const showStatusFeedback = (type: 'success' | 'delete', message: string) => {
    setStatusType(type);
    setStatusMessage(message);
    setIsStatusModalOpen(true);
    statusAnim.setValue(0);

    Animated.sequence([
      Animated.spring(statusAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 80,
        friction: 8,
      }),
      Animated.delay(1200),
      Animated.timing(statusAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      })
    ]).start(() => {
      setIsStatusModalOpen(false);
    });
  };

  const handleAddCredential = async () => {
    if (!formService.trim() || !formPassword.trim()) {
      Alert.alert('Required Fields', 'Please fill out Service Name and Password.');
      return;
    }

    const newItem: CredentialItem = {
      id: Math.random().toString(36).substring(2, 9),
      service: formService,
      username: formUsername,
      password: formPassword,
      url: formUrl,
      category: formCategory,
      notes: formNotes,
      createdAt: Date.now(),
      color: formColor,
    };

    const updatedVault = [newItem, ...vault];
    try {
      await saveVault(updatedVault, masterKey);
      setVault(updatedVault);
      closeAddModal();
      showStatusFeedback('success', 'Account Saved');
    } catch (e) {
      Alert.alert('Error', 'Failed to save account.');
    }
  };

  const handleUpdateCredential = async () => {
    if (!selectedItem) return;
    if (!formService.trim() || !formPassword.trim()) {
      Alert.alert('Required Fields', 'Please fill out Service Name and Password.');
      return;
    }

    const updatedVault = vault.map(item => {
      if (item.id === selectedItem.id) {
        return {
          ...item,
          service: formService,
          username: formUsername,
          password: formPassword,
          url: formUrl,
          category: formCategory,
          notes: formNotes,
          color: formColor,
        };
      }
      return item;
    });

    try {
      await saveVault(updatedVault, masterKey);
      setVault(updatedVault);
      setIsDetailModalOpen(false);
      setSelectedItem(null);
      showStatusFeedback('success', 'Changes Saved');
    } catch (e) {
      Alert.alert('Error', 'Failed to update account.');
    }
  };

  const handleDeleteCredential = async (itemId: string) => {
    Alert.alert('Delete Account', 'Are you sure you want to delete this credential?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const updatedVault = vault.filter(item => item.id !== itemId);
          try {
            await saveVault(updatedVault, masterKey);
            setVault(updatedVault);
            setIsDetailModalOpen(false);
            setSelectedItem(null);
            showStatusFeedback('delete', 'Account Deleted');
          } catch (e) {
            Alert.alert('Error', 'Failed to delete account.');
          }
        },
      },
    ]);
  };

  const openAddModal = () => {
    setFormService('');
    setFormUsername('');
    setFormPassword('');
    setFormUrl('');
    setFormCategory('Login');
    setFormNotes('');
    setFormColor('#8E8E93');
    setShowFormPassword(false);
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
  };

  const openViewModal = (item: CredentialItem) => {
    setSelectedItem(item);
    setFormService(item.service);
    setFormUsername(item.username);
    setFormPassword(item.password);
    setFormUrl(item.url || '');
    setFormCategory(item.category);
    setFormNotes(item.notes || '');
    setFormColor(item.color || '#8E8E93');
    setShowDetailPassword(false);
    setIsViewModalOpen(true);
  };

  const openDetailModal = (item: CredentialItem) => {
    setSelectedItem(item);
    setFormService(item.service);
    setFormUsername(item.username);
    setFormPassword(item.password);
    setFormUrl(item.url || '');
    setFormCategory(item.category);
    setFormNotes(item.notes || '');
    setFormColor(item.color || '#8E8E93');
    setShowDetailPassword(false);
    setIsDetailModalOpen(true);
  };

  const PRESET_COLORS = ['#000000', '#1C1C1E', '#3E3E42', '#5A5A5E', '#78787C', '#96969A', '#B4B4B8', '#D2D2D6'];

  const isValidHex = (hex: string) => /^#[0-9A-Fa-f]{3}$|^#[0-9A-Fa-f]{6}$/.test(hex);

  const hslToHex = (h: number, s: number, l: number) => {
    const lNorm = l / 100;
    const a = (s * Math.min(lNorm, 1 - lNorm)) / 100;
    const f = (n: number) => {
      const k = (n + h / 30) % 12;
      const color = lNorm - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
  };

  const hexToHsl = (hex: string) => {
    try {
      let c = hex.replace('#', '');
      if (c.length === 3) {
        c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
      }
      if (c.length !== 6) {
        return { h: 0, s: 0, l: 50 };
      }
      const r = parseInt(c.substring(0, 2), 16) / 255;
      const g = parseInt(c.substring(2, 4), 16) / 255;
      const b = parseInt(c.substring(4, 6), 16) / 255;
      if (isNaN(r) || isNaN(g) || isNaN(b)) {
        return { h: 0, s: 0, l: 50 };
      }
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0;
      let s = 0;
      const l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r:
            h = (g - b) / d + (g < b ? 6 : 0);
            break;
          case g:
            h = (b - r) / d + 2;
            break;
          case b:
            h = (r - g) / d + 4;
            break;
        }
        h /= 6;
      }
      return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
      };
    } catch (e) {
      return { h: 0, s: 0, l: 50 };
    }
  };

  const handleHueTouch = (event: any) => {
    if (hueSliderWidth <= 0) return;
    const x = event.nativeEvent.locationX;
    const pct = Math.max(0, Math.min(1, x / hueSliderWidth));
    const hue = Math.round(pct * 360);
    const hex = hslToHex(hue, 80, 50);
    setFormColor(hex);
  };

  const getCardStartColor = (colorHex?: string) => {
    let base = colorHex || '#8E8E93';
    if (!base.startsWith('#')) {
      base = '#' + base;
    }
    // Normalize 3-digit hex to 6-digit hex
    if (base.length === 4) {
      base = '#' + base[1] + base[1] + base[2] + base[2] + base[3] + base[3];
    }
    // Check if it is a valid hex color and append '12' for ~7% opacity
    if (base.length === 7) {
      return base + '15'; // Soft 8% opacity tint
    }
    return base;
  };

  const getServiceIcon = (service: string, category: string) => {
    if (category === 'E-Wallet') return 'wallet-outline';
    if (category === 'Card') return 'card-outline';
    if (category === 'Note') return 'document-text-outline';
    if (category === 'PIN') return 'keypad-outline';

    const sName = service.toLowerCase();
    if (sName.includes('google')) return 'logo-google';
    if (sName.includes('steam')) return 'game-controller-outline';
    if (sName.includes('apple')) return 'logo-apple';
    if (sName.includes('spotify')) return 'musical-notes-outline';
    if (sName.includes('netflix') || sName.includes('disney')) return 'film-outline';
    if (sName.includes('card') || sName.includes('bank') || sName.includes('paypal')) return 'card-outline';
    return 'key-outline';
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Dynamic Header */}
      <View style={styles.header}>
        <View>
          <View style={styles.headerTitleRow}>
            <Text style={styles.headerTitle}>KLEFKY</Text>
            <View style={styles.secureBadge}>
              <View style={styles.secureDot} />
              <Text style={styles.secureBadgeText}>SECURE DB</Text>
            </View>
          </View>
          <Text style={styles.headerSubtitle}>Offline Cryptographic Vault</Text>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={openAddModal}>
          <LinearGradient
            colors={['#000000', '#2D2D2D']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.addButtonGradient}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Main Content Layout */}
      <FlatList
        data={filteredVault}
        keyExtractor={item => item.id}
        ListHeaderComponent={
          <>
            {/* Audit Dashboard Card */}
            <View style={styles.dashboardCard}>
              <View style={styles.dashboardScore}>
                <CircularProgress score={securityScore} size={90} strokeWidth={6} />
              </View>
              <View style={styles.dashboardMetrics}>
                <Text style={styles.dashboardMetricsTitle}>SYSTEM DIAGNOSTIC</Text>
                <Text style={styles.dashboardScoreText}>{securityScore}% COMPLIANT</Text>
                <Text style={styles.dashboardDetailsMonospace}>
                  {`DATABASE STATUS: ENCRYPTED\n`}
                  {`ITEMS STAMPED  : ${vault.length}\n`}
                  {`WEAK/REUSED    : ${weakCount}/${reusedCount}`}
                </Text>
              </View>
            </View>

            {/* Search Input */}
            <View style={[styles.searchContainer, searchFocused && styles.searchContainerFocused]}>
              <Ionicons
                name="search-outline"
                size={18}
                color={searchFocused ? '#000000' : '#64748B'}
                style={styles.searchIcon}
              />
              <TextInput
                style={styles.searchInput}
                placeholder="Query credentials..."
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                clearButtonMode="while-editing"
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
            </View>

            {/* Category Filter Pills */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.categoryContainer}
              contentContainerStyle={styles.categoryScroll}
            >
              {['All', 'Login', 'Card', 'E-Wallet', 'PIN'].map(cat => {
                const isActive = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.categoryPill,
                      isActive && styles.categoryPillActive,
                    ]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.categoryText,
                        isActive && styles.categoryTextActive,
                      ]}
                    >
                      {cat.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => openViewModal(item)} activeOpacity={0.85}>
            <LinearGradient
              colors={[getCardStartColor(item.color), '#FFFFFF']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.vaultCard}
            >
              <View style={styles.vaultCardLeft}>
                <View style={[styles.avatar, { borderColor: item.color || '#000000' }]}>
                  <Ionicons name={getServiceIcon(item.service, item.category)} size={18} color="#000000" />
                </View>
                <View style={styles.vaultCardInfo}>
                  <Text style={styles.vaultCardService} numberOfLines={1}>
                    {item.service}
                  </Text>
                  <Text style={styles.vaultCardUser} numberOfLines={1}>
                    {item.username || 'NO USERNAME SPECIFIED'}
                  </Text>
                </View>
              </View>
              
              <View style={styles.vaultCardRight}>
                <TouchableOpacity
                  style={styles.actionIconButton}
                  onPress={() => openDetailModal(item)}
                >
                  <Ionicons name="create-outline" size={18} color="#000000" />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="shield-outline" size={48} color="rgba(0, 0, 0, 0.1)" />
            <Text style={styles.emptyText}>
              {searchQuery || selectedCategory !== 'All'
                ? 'No matching diagnostics found.'
                : 'Local secure vault is empty.'}
            </Text>
          </View>
        }
        contentContainerStyle={styles.scrollContainer}
      />

      {/* Modal: Add Credential */}
      <Modal visible={isAddModalOpen} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ADD CREDENTIAL</Text>
              <TouchableOpacity onPress={closeAddModal}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              {/* Category selector */}
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.formCategoryGroup}>
                {['Login', 'Card', 'E-Wallet', 'PIN'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.formCategoryButton,
                      formCategory === cat && styles.formCategoryButtonActive,
                    ]}
                    onPress={() => setFormCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.formCategoryButtonText,
                        formCategory === cat && styles.formCategoryButtonTextActive,
                      ]}
                    >
                      {cat.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Theme Color Selector */}
              <Text style={styles.inputLabel}>Theme Color</Text>
              <View style={styles.colorPickerContainer}>
                <View style={styles.swatchesRow}>
                  {PRESET_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.swatch,
                        { backgroundColor: color },
                        formColor === color && styles.swatchSelected,
                      ]}
                      onPress={() => setFormColor(color)}
                    />
                  ))}
                </View>

                {/* Hue continuous slider */}
                <View
                  style={styles.hueSliderContainer}
                  onTouchStart={handleHueTouch}
                  onTouchMove={handleHueTouch}
                  onLayout={(e) => {
                    const { width } = e.nativeEvent.layout;
                    setHueSliderWidth(width);
                  }}
                >
                  <LinearGradient
                    colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.hueGradientBar, { pointerEvents: 'none' } as any]}
                  />
                  <View
                    style={[
                      styles.hueThumb,
                      {
                        left: Math.max(0, Math.min(hueSliderWidth - 20, (hexToHsl(formColor).h / 360) * hueSliderWidth - 10)),
                        pointerEvents: 'none',
                      } as any,
                    ]}
                  />
                </View>

                {/* HEX Custom input */}
                <View style={styles.hexInputWrapper}>
                  <Text style={styles.hexInputLabel}>HEX:</Text>
                  <TextInput
                    style={styles.hexInput}
                    value={formColor}
                    onChangeText={(val) => {
                      let formatted = val;
                      if (formatted && !formatted.startsWith('#')) {
                        formatted = '#' + formatted;
                      }
                      setFormColor(formatted);
                    }}
                    placeholder="#64748B"
                    placeholderTextColor="#64748B"
                    autoCapitalize="characters"
                    maxLength={7}
                  />
                  <View style={[styles.colorPreview, { backgroundColor: isValidHex(formColor) ? formColor : '#64748B' }]} />
                </View>
              </View>

              <Text style={styles.inputLabel}>{formCategory === 'PIN' ? 'App, ATM Card, or Thing' : 'Service / Application'}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={formCategory === 'PIN' ? 'e.g. Chase ATM, Netflix PIN, Office Door' : 'Steam, Google, Netflix...'}
                placeholderTextColor="#94A3B8"
                value={formService}
                onChangeText={setFormService}
              />

              {formCategory !== 'PIN' && (
                <>
                  <Text style={styles.inputLabel}>Username / Email (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="email@example.com"
                    placeholderTextColor="#94A3B8"
                    value={formUsername}
                    onChangeText={setFormUsername}
                    autoCapitalize="none"
                  />
                </>
              )}

              <Text style={styles.inputLabel}>{formCategory === 'PIN' ? 'PIN' : 'Password'}</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.modalPasswordInput}
                  placeholder={formCategory === 'PIN' ? 'PIN' : 'Password'}
                  placeholderTextColor="#94A3B8"
                  secureTextEntry={!showFormPassword}
                  value={formPassword}
                  onChangeText={setFormPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.pwIcon}
                  onPress={() => setShowFormPassword(!showFormPassword)}
                >
                  <Ionicons
                    name={showFormPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.generateBtn}
                  onPress={handleGeneratePasswordForForm}
                >
                  <Text style={styles.generateBtnText}>Gen</Text>
                </TouchableOpacity>
              </View>

              {formCategory !== 'PIN' && (
                <>
                  <Text style={styles.inputLabel}>Website URL (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="https://steamcommunity.com"
                    placeholderTextColor="#94A3B8"
                    value={formUrl}
                    onChangeText={setFormUrl}
                    autoCapitalize="none"
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalNotesInput]}
                placeholder={formCategory === 'PIN' ? 'Backup codes, location, description...' : 'Recovery codes, backup notes...'}
                placeholderTextColor="#94A3B8"
                value={formNotes}
                onChangeText={setFormNotes}
                multiline
                numberOfLines={3}
              />

              <TouchableOpacity style={styles.saveButton} onPress={handleAddCredential}>
                <LinearGradient
                  colors={['#000000', '#2D2D2D']}
                  style={styles.gradientButton}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.saveButtonText}>SAVE CREDENTIAL</Text>
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: View Credential */}
      <Modal visible={isViewModalOpen} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={[styles.avatar, { borderColor: formColor, marginRight: 10 }]}>
                  <Ionicons name={getServiceIcon(formService, formCategory)} size={18} color="#000000" />
                </View>
                <View>
                  <Text style={styles.modalTitle}>{formService.toUpperCase()}</Text>
                  <Text style={{ fontSize: 10, color: '#64748B', fontWeight: 'bold', letterSpacing: 1, marginTop: 2 }}>{formCategory.toUpperCase()}</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIsViewModalOpen(false)}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              {/* Username field */}
              {formCategory !== 'PIN' && (
                <>
                  <Text style={styles.inputLabel}>Username / Email</Text>
                  <View style={styles.viewFieldContainer}>
                    <Text style={styles.viewFieldValue} numberOfLines={2}>
                      {formUsername || 'No username specified'}
                    </Text>
                  </View>
                  {formUsername ? (
                    <TouchableOpacity
                      style={styles.viewCopyBtn}
                      onPress={() => handleCopy(formUsername, 'Username')}
                    >
                      <Ionicons name="copy-outline" size={16} color="#000000" style={{ marginRight: 6 }} />
                      <Text style={[styles.viewCopyBtnText, { color: '#000000' }]}>Copy Username</Text>
                    </TouchableOpacity>
                  ) : null}
                </>
              )}

              {/* Password field */}
              <Text style={styles.inputLabel}>{formCategory === 'PIN' ? 'PIN' : 'Password'}</Text>
              <View style={styles.viewPasswordContainer}>
                <Text style={styles.viewPasswordValue} numberOfLines={1}>
                  {showDetailPassword ? formPassword : '••••••••••••'}
                </Text>
                <TouchableOpacity
                  style={styles.viewEyeBtn}
                  onPress={() => setShowDetailPassword(!showDetailPassword)}
                >
                  <Ionicons
                    name={showDetailPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.viewCopyBtn}
                onPress={() => handleCopy(formPassword, 'Password')}
              >
                <Ionicons name="copy-outline" size={16} color="#000000" style={{ marginRight: 6 }} />
                <Text style={[styles.viewCopyBtnText, { color: '#000000' }]}>
                  {formCategory === 'PIN' ? 'Copy PIN' : 'Copy Password'}
                </Text>
              </TouchableOpacity>

              {/* Optional URL */}
              {formCategory !== 'PIN' && formUrl ? (
                <>
                  <Text style={styles.inputLabel}>Website URL</Text>
                  <View style={styles.viewFieldContainer}>
                    <Text style={styles.viewFieldValue} numberOfLines={2}>
                      {formUrl}
                    </Text>
                  </View>
                </>
              ) : null}

              {/* Optional Notes */}
              {formNotes ? (
                <>
                  <Text style={styles.inputLabel}>Notes</Text>
                  <View style={[styles.viewFieldContainer, { minHeight: 60 }]}>
                    <Text style={[styles.viewFieldValue, { fontFamily: 'System' }]}>
                      {formNotes}
                    </Text>
                  </View>
                </>
              ) : null}

              {/* Edit Button in view modal */}
              <TouchableOpacity
                style={styles.viewEditBtn}
                onPress={() => {
                  setIsViewModalOpen(false);
                  if (selectedItem) {
                    openDetailModal(selectedItem);
                  }
                }}
              >
                <Text style={styles.viewEditBtnText}>EDIT CREDENTIAL</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Detail / Edit */}
      <Modal visible={isDetailModalOpen} animationType="fade" transparent>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CREDENTIAL DETAILS</Text>
              <TouchableOpacity onPress={() => setIsDetailModalOpen(false)}>
                <Ionicons name="close" size={24} color="#000000" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalForm}>
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.formCategoryGroup}>
                {['Login', 'Card', 'E-Wallet', 'PIN'].map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.formCategoryButton,
                      formCategory === cat && styles.formCategoryButtonActive,
                    ]}
                    onPress={() => setFormCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.formCategoryButtonText,
                        formCategory === cat && styles.formCategoryButtonTextActive,
                      ]}
                    >
                      {cat.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Theme Color Selector */}
              <Text style={styles.inputLabel}>Theme Color</Text>
              <View style={styles.colorPickerContainer}>
                <View style={styles.swatchesRow}>
                  {PRESET_COLORS.map(color => (
                    <TouchableOpacity
                      key={color}
                      style={[
                        styles.swatch,
                        { backgroundColor: color },
                        formColor === color && styles.swatchSelected,
                      ]}
                      onPress={() => setFormColor(color)}
                    />
                  ))}
                </View>

                {/* Hue continuous slider */}
                <View
                  style={styles.hueSliderContainer}
                  onTouchStart={handleHueTouch}
                  onTouchMove={handleHueTouch}
                  onLayout={(e) => {
                    const { width } = e.nativeEvent.layout;
                    setHueSliderWidth(width);
                  }}
                >
                  <LinearGradient
                    colors={['#FF0000', '#FFFF00', '#00FF00', '#00FFFF', '#0000FF', '#FF00FF', '#FF0000']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.hueGradientBar, { pointerEvents: 'none' } as any]}
                  />
                  <View
                    style={[
                      styles.hueThumb,
                      {
                        left: Math.max(0, Math.min(hueSliderWidth - 20, (hexToHsl(formColor).h / 360) * hueSliderWidth - 10)),
                        pointerEvents: 'none',
                      } as any,
                    ]}
                  />
                </View>

                {/* HEX Custom input */}
                <View style={styles.hexInputWrapper}>
                  <Text style={styles.hexInputLabel}>HEX:</Text>
                  <TextInput
                    style={styles.hexInput}
                    value={formColor}
                    onChangeText={(val) => {
                      let formatted = val;
                      if (formatted && !formatted.startsWith('#')) {
                        formatted = '#' + formatted;
                      }
                      setFormColor(formatted);
                    }}
                    placeholder="#64748B"
                    placeholderTextColor="#64748B"
                    autoCapitalize="characters"
                    maxLength={7}
                  />
                  <View style={[styles.colorPreview, { backgroundColor: isValidHex(formColor) ? formColor : '#64748B' }]} />
                </View>
              </View>

              <Text style={styles.inputLabel}>{formCategory === 'PIN' ? 'App, ATM Card, or Thing' : 'Service / Application'}</Text>
              <TextInput
                style={styles.modalInput}
                value={formService}
                onChangeText={setFormService}
              />

              {formCategory !== 'PIN' && (
                <>
                  <Text style={styles.inputLabel}>Username / Email (Optional)</Text>
                  <View style={styles.detailInputWrapper}>
                    <TextInput
                      style={[styles.modalInput, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
                      value={formUsername}
                      onChangeText={setFormUsername}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity
                      style={styles.detailCopyBtn}
                      onPress={() => handleCopy(formUsername, 'Username')}
                    >
                      <Ionicons name="copy-outline" size={20} color="#000000" />
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <Text style={styles.inputLabel}>{formCategory === 'PIN' ? 'PIN' : 'Password'}</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.modalPasswordInput}
                  secureTextEntry={!showDetailPassword}
                  value={formPassword}
                  onChangeText={setFormPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  style={styles.pwIcon}
                  onPress={() => setShowDetailPassword(!showDetailPassword)}
                >
                  <Ionicons
                    name={showDetailPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#64748B"
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.detailCopyBtn}
                  onPress={() => handleCopy(formPassword, 'Password')}
                >
                  <Ionicons name="copy-outline" size={20} color="#000000" />
                </TouchableOpacity>
              </View>

              {formCategory !== 'PIN' && (
                <>
                  <Text style={styles.inputLabel}>Website URL (Optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={formUrl}
                    onChangeText={setFormUrl}
                    autoCapitalize="none"
                  />
                </>
              )}

              <Text style={styles.inputLabel}>Notes (Optional)</Text>
              <TextInput
                style={[styles.modalInput, styles.modalNotesInput]}
                value={formNotes}
                onChangeText={setFormNotes}
                multiline
                numberOfLines={3}
              />

              <View style={styles.detailActionRow}>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => selectedItem && handleDeleteCredential(selectedItem.id)}
                >
                  <Text style={styles.deleteButtonText}>DELETE</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.updateButton} onPress={handleUpdateCredential}>
                  <LinearGradient
                    colors={['#000000', '#2D2D2D']}
                    style={styles.gradientButton}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Text style={styles.updateButtonText}>SAVE CHANGES</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal: Animated Feedback Status */}
      <Modal visible={isStatusModalOpen} transparent animationType="fade">
        <View style={styles.statusOverlay}>
          <Animated.View
            style={[
              styles.statusContent,
              {
                opacity: statusAnim,
                transform: [
                  {
                    scale: statusAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.7, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View
              style={[
                styles.statusIconCircle,
                styles.statusIconCircleMonochrome,
              ]}
            >
              <Ionicons
                name={statusType === 'delete' ? 'trash-outline' : 'checkmark'}
                size={44}
                color="#000000"
              />
            </View>
            <Text style={styles.statusFeedbackText}>{statusMessage.toUpperCase()}</Text>
          </Animated.View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '200',
    color: '#000000',
    letterSpacing: 4,
    fontFamily: 'System',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 10,
  },
  secureDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#000000',
    marginRight: 5,
  },
  secureBadgeText: {
    fontSize: 8,
    color: '#000000',
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  headerSubtitle: {
    fontSize: 10,
    color: '#64748B',
    fontFamily: 'System',
    marginTop: 3,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  addButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    overflow: 'hidden',
  },
  addButtonGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  colorPickerContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.01)',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  swatchesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  swatch: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
  },
  swatchSelected: {
    borderWidth: 2,
    borderColor: '#000000',
    transform: [{ scale: 1.15 }],
  },
  hexInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 6,
    paddingHorizontal: 10,
    height: 38,
  },
  hexInputLabel: {
    fontSize: 12,
    color: '#64748B',
    marginRight: 6,
    fontWeight: '500',
  },
  hexInput: {
    flex: 1,
    color: '#000000',
    fontSize: 14,
    fontFamily: 'System',
    padding: 0,
    fontWeight: '600',
  },
  colorPreview: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.1)',
    marginLeft: 6,
  },
  hueSliderContainer: {
    height: 30,
    position: 'relative',
    justifyContent: 'center',
    marginBottom: 12,
  },
  hueGradientBar: {
    height: 12,
    borderRadius: 6,
  },
  hueThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
    top: 5,
  },
  dashboardCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 15,
  },
  dashboardScore: {
    marginRight: 20,
  },
  dashboardMetrics: {
    flex: 1,
  },
  dashboardMetricsTitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    marginBottom: 4,
    letterSpacing: 2,
  },
  dashboardScoreText: {
    fontSize: 18,
    fontWeight: '300',
    color: '#000000',
    marginBottom: 6,
    fontFamily: 'System',
    letterSpacing: 1,
  },
  dashboardDetailsMonospace: {
    fontSize: 11,
    color: '#64748B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    lineHeight: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 15,
  },
  searchContainerFocused: {
    borderColor: '#000000',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#000000',
    fontSize: 14,
    fontFamily: 'System',
  },
  categoryContainer: {
    marginBottom: 20,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.04)',
    marginRight: 8,
  },
  categoryPillActive: {
    borderColor: '#000000',
    backgroundColor: '#000000',
  },
  categoryText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  categoryTextActive: {
    color: '#FFFFFF',
  },
  vaultCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#FFFFFF',
  },
  vaultCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1.5,
    backgroundColor: 'rgba(0, 0, 0, 0.01)',
  },
  vaultCardInfo: {
    flex: 1,
  },
  vaultCardService: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '600',
  },
  vaultCardUser: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 3,
    letterSpacing: 0.5,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  vaultCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionIconButton: {
    padding: 8,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.01)',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
  },
  modalTitle: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 2,
  },
  modalForm: {
    padding: 20,
  },
  inputLabel: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: 8,
    marginTop: 14,
  },
  modalInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 8,
    color: '#000000',
    paddingHorizontal: 12,
    height: 46,
    fontSize: 14,
    marginBottom: 10,
  },
  modalNotesInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  formCategoryGroup: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  formCategoryButton: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    alignItems: 'center',
    marginRight: 6,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  formCategoryButtonActive: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  formCategoryButtonText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  formCategoryButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  passwordInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 8,
    marginBottom: 10,
  },
  modalPasswordInput: {
    flex: 1,
    color: '#000000',
    paddingHorizontal: 12,
    height: 46,
    fontSize: 14,
  },
  pwIcon: {
    paddingHorizontal: 10,
  },
  generateBtn: {
    backgroundColor: 'rgba(0, 0, 0, 0.04)',
    paddingHorizontal: 14,
    height: 34,
    justifyContent: 'center',
    borderRadius: 6,
    marginRight: 6,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  generateBtnText: {
    color: '#000000',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  saveButton: {
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 25,
    marginBottom: 30,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 15,
    letterSpacing: 1.5,
  },
  gradientButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 8,
    marginBottom: 10,
  },
  detailCopyBtn: {
    paddingHorizontal: 14,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: 'rgba(0, 0, 0, 0.08)',
  },
  detailActionRow: {
    flexDirection: 'row',
    marginTop: 30,
    marginBottom: 30,
  },
  deleteButton: {
    flex: 1,
    height: 50,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  deleteButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  updateButton: {
    flex: 2,
    height: 50,
    borderRadius: 8,
    overflow: 'hidden',
  },
  updateButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  viewFieldContainer: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    minHeight: 44,
    justifyContent: 'center',
  },
  viewFieldValue: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '500',
  },
  viewCopyBtn: {
    flexDirection: 'row',
    borderRadius: 8,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  viewCopyBtnText: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  viewPasswordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 8,
  },
  viewPasswordValue: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '500',
    fontFamily: 'System',
    flex: 1,
    letterSpacing: 1,
  },
  viewEyeBtn: {
    padding: 4,
  },
  viewEditBtn: {
    borderWidth: 1,
    borderColor: '#000000',
    borderRadius: 8,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.02)',
  },
  viewEditBtnText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statusOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: 180,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
  },
  statusIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusIconCircleMonochrome: {
    borderColor: '#000000',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  statusFeedbackText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    fontFamily: 'System',
    letterSpacing: 0.5,
  },
});

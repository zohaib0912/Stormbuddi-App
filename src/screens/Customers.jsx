/**
 * Customers Management Component
 * 
 * This component displays all customers fetched from the API
 * and provides functionality to create new customers via a modal.
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';

// Import reusable components
import Header from '../components/Header';
import CustomerCard from '../components/CustomerCard';
import FloatingActionButton from '../components/FloatingActionButton';
import PageLoader from '../components/PageLoader';
import ErrorMessage from '../components/ErrorMessage';
import CreateCustomerModal from '../components/CreateCustomerModal';
import CustomerDetailsModal from '../components/CustomerDetailsModal';
import NotificationListModal from '../components/NotificationListModal';
import SearchBar from '../components/SearchBar';
import { getToken } from '../utils/tokenStorage';
import usePageLoader from '../hooks/usePageLoader';
import { useToast } from '../contexts/ToastContext';
import { colors } from '../theme/colors';
import { dedupeById } from '../utils/dedupeById';

const CUSTOMERS_PER_PAGE = 20;
const CLIENTS_API = 'https://app.stormbuddi.com/api/mobile/clients';

function normalizeClientsPayload(data) {
  if (Array.isArray(data)) {
    return { rows: data, meta: {} };
  }
  if (!data?.success) {
    return { rows: [], meta: {} };
  }
  const metaRoot = typeof data.meta === 'object' && data.meta ? data.meta : {};
  const raw = data.data;
  if (Array.isArray(raw)) {
    return { rows: raw, meta: metaRoot };
  }
  if (raw && typeof raw === 'object' && Array.isArray(raw.data)) {
    return {
      rows: raw.data,
      meta: { ...metaRoot, ...(raw.meta || {}) },
    };
  }
  if (Array.isArray(data.clients)) {
    return { rows: data.clients, meta: metaRoot };
  }
  if (Array.isArray(data.customers)) {
    return { rows: data.customers, meta: metaRoot };
  }
  return { rows: [], meta: metaRoot };
}

function sortCustomersByCreatedDesc(list) {
  return [...list].sort((a, b) => {
    const dateA = new Date(a.created_at || a.createdAt || a.CreatedAt || 0);
    const dateB = new Date(b.created_at || b.createdAt || b.CreatedAt || 0);
    return dateB.getTime() - dateA.getTime();
  });
}

const Customers = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const { showSuccess, showError } = useToast();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  // Track which customers have credentials generated (one-time use)
  const [credentialsGenerated, setCredentialsGenerated] = useState(new Set());
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreCustomers, setHasMoreCustomers] = useState(true);

  const customersPageRef = useRef(1);
  const loadMoreLockRef = useRef(false);
  const initialLoadDoneRef = useRef(false);
  const hasMoreCustomersRef = useRef(true);

  // Use the page loader hook - start with false, only show when screen is focused
  const { shouldShowLoader, startLoading, stopLoading, resetLoader } = usePageLoader(true);

  useEffect(() => {
    hasMoreCustomersRef.current = hasMoreCustomers;
  }, [hasMoreCustomers]);

  const fetchCustomersPage = async (page, { append }) => {
    const token = await getToken();
    if (!token) {
      throw new Error('No authentication token found. Please login again.');
    }

    const url = `${CLIENTS_API}?page=${page}&per_page=${CUSTOMERS_PER_PAGE}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (!data.success && !Array.isArray(data)) {
      throw new Error(data.message || 'Failed to fetch customers - invalid response format');
    }

    const { rows, meta } = normalizeClientsPayload(data);

    const hasMore =
      meta.has_more === true
        ? true
        : meta.has_more === false
          ? false
          : rows.length >= CUSTOMERS_PER_PAGE;

    const sortedRows = sortCustomersByCreatedDesc(dedupeById(rows));

    if (append) {
      setCustomers((prev) => {
        const seen = new Set(prev.map((c) => String(c.id)));
        const merged = [...prev];
        for (const c of sortedRows) {
          const key = String(c.id);
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(c);
          }
        }
        return sortCustomersByCreatedDesc(merged);
      });
    } else {
      setCustomers(sortedRows);
    }

    customersPageRef.current = page;
    setHasMoreCustomers(hasMore);
    hasMoreCustomersRef.current = hasMore;
  };

  const fetchCustomers = async () => {
    initialLoadDoneRef.current = false;
    loadMoreLockRef.current = false;
    customersPageRef.current = 1;
    setHasMoreCustomers(true);
    hasMoreCustomersRef.current = true;
    startLoading();
    setError(null);

    try {
      await fetchCustomersPage(1, { append: false });
      initialLoadDoneRef.current = true;
    } catch (err) {
      console.error('Customers fetch error:', err);
      setError('Failed to load customers. Please try again.');
      setCustomers([]);
      setHasMoreCustomers(false);
      hasMoreCustomersRef.current = false;
    } finally {
      stopLoading();
    }
  };

  const loadMoreCustomers = async () => {
    if (
      !initialLoadDoneRef.current ||
      loadMoreLockRef.current ||
      !hasMoreCustomersRef.current ||
      loadingMore
    ) {
      return;
    }
    loadMoreLockRef.current = true;
    setLoadingMore(true);
    const nextPage = customersPageRef.current + 1;
    try {
      await fetchCustomersPage(nextPage, { append: true });
    } catch (err) {
      console.error('Customers load more error:', err);
      setHasMoreCustomers(false);
      hasMoreCustomersRef.current = false;
    } finally {
      loadMoreLockRef.current = false;
      setLoadingMore(false);
    }
  };

  // Only fetch data and show loader when Customers screen is focused
  useFocusEffect(
    React.useCallback(() => {
      fetchCustomers();
      
      // Cleanup: stop loader when screen loses focus
      return () => {
        resetLoader();
      };
    }, [])
  );

  // Filter customers based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = customers.filter(customer => {
        const name = customer.full_name || 
                     customer.name || 
                     `${customer.first_name || ''} ${customer.last_name || ''}`.trim();
        const email = customer.email || customer.email_address || '';
        const phone = customer.phone || customer.phone_number || '';
        const address = customer.address || customer.street_address || '';
        
        return (
          name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          email.toLowerCase().includes(searchQuery.toLowerCase()) ||
          phone.includes(searchQuery) ||
          address.toLowerCase().includes(searchQuery.toLowerCase())
        );
      });
      setFilteredCustomers(filtered);
    } else {
      setFilteredCustomers(customers);
    }
  }, [customers, searchQuery]);

  const handleNotificationPress = () => {
    setShowNotificationModal(true);
  };

  const handleCustomerCreated = (newCustomer) => {
    // Refresh the customers list
    fetchCustomers();
  };

  const handleCustomerPress = (customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetailsModal(true);
  };

  const handleCustomerUpdated = () => {
    // Refresh the customers list after update
    fetchCustomers();
  };

  const handleGenerateCredentials = async (customer) => {
    try {
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      const response = await fetch('https://app.stormbuddi.com/api/mobile/clients/generate-credentials', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          client_id: customer.id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to generate credentials. Status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success !== false) {
        // Mark this customer as having credentials generated (one-time use)
        setCredentialsGenerated(prev => new Set(prev).add(customer.id));
        showSuccess('User credentials have been sent successfully!');
      } else {
        throw new Error(data.message || 'Failed to generate credentials');
      }
    } catch (err) {
      console.error('Generate credentials error:', err);
      showError(err.message || 'Failed to generate credentials. Please try again.');
    }
  };

  const renderCustomerCard = useCallback(({ item }) => (
    <CustomerCard
      customer={item}
      onPress={() => handleCustomerPress(item)}
      onGenerateCredentials={handleGenerateCredentials}
      hasCredentialsGenerated={credentialsGenerated.has(item.id)}
    />
  ), [credentialsGenerated]);

  const listHeaderComponent = useMemo(() => (
    <View style={styles.listHeader}>
      {/* Screen Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.screenTitle}>Customers</Text>
        {/* Total Customer Count */}
        <Text style={styles.customerCount}>
          {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'}
          {searchQuery.trim() && ` found`}
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <SearchBar
          placeholder="Search customers..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />
      </View>
    </View>
  ), [filteredCustomers.length, searchQuery]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {/* Global Page Loader */}
      <PageLoader 
        visible={shouldShowLoader}
        message="Loading customers..."
      />

      {/* Only show content when not loading */}
      {!shouldShowLoader && (
        <View style={styles.contentContainer}>
          {/* Header - Fixed at top */}
          <Header
            title="Maddock"
            onNotificationPress={handleNotificationPress}
            showBackButton={false}
          />

          {/* Customers List with Header */}
          <FlatList
            data={filteredCustomers}
            renderItem={renderCustomerCard}
            keyExtractor={(item, index) =>
              item.id != null ? String(item.id) : `customer-${index}`
            }
            contentContainerStyle={[styles.customersContainer, { paddingBottom: 100 }]}
            showsVerticalScrollIndicator={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            ListHeaderComponent={listHeaderComponent}
            ListEmptyComponent={
              error ? (
                <ErrorMessage 
                  message={error}
                  onRetry={fetchCustomers}
                />
              ) : (
                <View style={styles.emptyContainer}>
                  <Icon name="people-outline" size={64} color={colors.textLight} />
                  <Text style={styles.emptyText}>
                    {searchQuery.trim() ? 'No customers found matching your search' : 'No customers yet'}
                  </Text>
                  <Text style={styles.emptySubtext}>
                    {searchQuery.trim() ? 'Try adjusting your search' : 'Tap the + button to create your first customer'}
                  </Text>
                </View>
              )
            }
            onEndReached={() => {
              if (hasMoreCustomers && !loadingMore) {
                loadMoreCustomers();
              }
            }}
            onEndReachedThreshold={0.35}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.listFooterLoader}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null
            }
          />
        </View>
      )}

      {/* Floating Action Button */}
      <FloatingActionButton
        onPress={() => setShowCreateCustomerModal(true)}
        icon="+"
      />

      {/* Create Customer Modal */}
      <CreateCustomerModal
        visible={showCreateCustomerModal}
        onClose={() => setShowCreateCustomerModal(false)}
        onSubmit={handleCustomerCreated}
      />

      {/* Customer Details/Edit Modal */}
      <CustomerDetailsModal
        visible={showCustomerDetailsModal}
        onClose={() => {
          setShowCustomerDetailsModal(false);
          setSelectedCustomer(null);
        }}
        customer={selectedCustomer}
        onUpdate={handleCustomerUpdated}
      />

      {/* Notification Modal */}
      <NotificationListModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
  },
  listHeader: {
    paddingBottom: 20,
  },
  listFooterLoader: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    marginHorizontal: 0,
    marginTop: 20,
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  customerCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 4,
  },
  searchContainer: {
    marginHorizontal: 0,
    marginBottom: 16,
  },
  customersContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default Customers;


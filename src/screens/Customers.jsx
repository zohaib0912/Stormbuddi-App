/**
 * Customers Management Component
 * 
 * This component displays all customers fetched from the API
 * and provides functionality to create new customers via a modal.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  FlatList,
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
import { colors } from '../theme/colors';

const Customers = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showCustomerDetailsModal, setShowCustomerDetailsModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
  // Use the page loader hook
  const { shouldShowLoader, startLoading, stopLoading } = usePageLoader(true);

  // Fetch customers from backend API
  const fetchCustomers = async () => {
    startLoading();
    setError(null);
    
    try {
      // Get stored token
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }
      
      const response = await fetch('https://app.stormbuddi.com/api/mobile/clients', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      // Try different possible response structures (same as ClientSelectionModal)
      let customersList = [];
      
      if (data.success) {
        if (data.data) {
          customersList = data.data;
        } else if (data.clients) {
          customersList = data.clients;
        } else if (data.customers) {
          customersList = data.customers;
        } else if (Array.isArray(data)) {
          customersList = data;
        }
      } else if (Array.isArray(data)) {
        customersList = data;
      }
      
      if (Array.isArray(customersList)) {
        console.log('Customers fetched successfully:', customersList);
        
        // Sort customers by creation date (newest first)
        const sortedCustomers = customersList.sort((a, b) => {
          const dateA = new Date(a.created_at || a.createdAt || a.CreatedAt || 0);
          const dateB = new Date(b.created_at || b.createdAt || b.CreatedAt || 0);
          return dateB - dateA; // Newest first (descending order)
        });
        
        setCustomers(sortedCustomers);
      } else {
        throw new Error(data.message || 'Failed to fetch customers - invalid response format');
      }
    } catch (err) {
      console.error('Customers fetch error:', err);
      setError('Failed to load customers. Please try again.');
      setCustomers([]);
    } finally {
      stopLoading();
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

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

  const renderCustomerCard = useCallback(({ item }) => (
    <CustomerCard
      customer={item}
      onPress={() => handleCustomerPress(item)}
    />
  ), []);

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
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      
      {/* Global Page Loader */}
      <PageLoader 
        visible={shouldShowLoader}
        message="Loading customers..."
      />

      {/* Only show content when not loading */}
      {!shouldShowLoader && (
        <View style={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
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
            keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
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
    </SafeAreaView>
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


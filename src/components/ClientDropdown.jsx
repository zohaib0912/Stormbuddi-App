import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getToken } from '../utils/tokenStorage';
import { colors } from '../theme/colors';
import { useToast } from '../contexts/ToastContext';

// In-memory cache for instant access (fastest)
let clientsCache = [];
let cacheTimestamp = null;
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const STORAGE_KEY = 'cached_clients';
const STORAGE_TIMESTAMP_KEY = 'clients_cache_timestamp';

const ClientDropdown = ({ 
  value = '',
  onSelectClient,
  selectedClient = null,
  error = false,
  placeholder = 'Type to search clients...',
  label = 'Client'
}) => {
  const { showError } = useToast();
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const scrollViewRef = useRef(null);

  // Load clients on mount
  useEffect(() => {
    loadClients();
  }, []);

  // Update search query when value prop changes
  useEffect(() => {
    if (value !== searchQuery) {
      setSearchQuery(value || '');
    }
  }, [value]);

  // Load clients with smart caching
  const loadClients = async () => {
    const now = Date.now();
    
    // 1. Check in-memory cache first (fastest - instant)
    const isMemoryCacheValid = clientsCache.length > 0 && 
                                cacheTimestamp && 
                                (now - cacheTimestamp) < CACHE_DURATION;
    
    if (isMemoryCacheValid) {
      setClients(clientsCache);
      setLoading(false);
      // Refresh in background (silent update)
      fetchClients();
      return;
    }
    
    // 2. Check AsyncStorage (fast - ~10-50ms)
    try {
      const [cachedData, cachedTimestamp] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY),
        AsyncStorage.getItem(STORAGE_TIMESTAMP_KEY)
      ]);
      
      if (cachedData && cachedTimestamp) {
        const cachedTime = parseInt(cachedTimestamp, 10);
        const isStorageCacheValid = (now - cachedTime) < CACHE_DURATION;
        
        if (isStorageCacheValid) {
          const clientsList = JSON.parse(cachedData);
          setClients(clientsList);
          setLoading(false);
          // Update memory cache for next time
          clientsCache = clientsList;
          cacheTimestamp = cachedTime;
          // Refresh in background
          fetchClients();
          return;
        }
      }
    } catch (error) {
      console.log('Error reading cache from storage:', error);
    }
    
    // 3. No valid cache - fetch from API
    fetchClients();
  };

  // Filter clients based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = clients.filter(client => {
        const clientName = getClientName(client);
        const email = client.email || '';
        const address = client.address || '';
        
        const searchLower = searchQuery.toLowerCase();
        return (
          clientName.toLowerCase().includes(searchLower) ||
          email.toLowerCase().includes(searchLower) ||
          address.toLowerCase().includes(searchLower)
        );
      });
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
  }, [clients, searchQuery]);

  const fetchClients = async () => {
    setLoading(true);
    try {
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
      
      // Try different possible response structures
      let clientsList = [];
      
      if (data.success) {
        if (data.data) {
          clientsList = data.data;
        } else if (data.clients) {
          clientsList = data.clients;
        } else if (data.customers) {
          clientsList = data.customers;
        } else if (Array.isArray(data)) {
          clientsList = data;
        }
      } else if (Array.isArray(data)) {
        clientsList = data;
      }
      
      if (Array.isArray(clientsList)) {
        setClients(clientsList);
        setLoading(false);
        
        // Update both caches
        const timestamp = Date.now();
        clientsCache = clientsList;
        cacheTimestamp = timestamp;
        
        // Save to AsyncStorage (async, doesn't block)
        AsyncStorage.multiSet([
          [STORAGE_KEY, JSON.stringify(clientsList)],
          [STORAGE_TIMESTAMP_KEY, timestamp.toString()]
        ]).catch(err => console.log('Error saving cache:', err));
      } else {
        throw new Error(data.message || 'Failed to fetch clients - invalid response format');
      }
    } catch (err) {
      console.error('Error fetching clients:', err);
      setLoading(false);
      showError(err.message || 'Failed to fetch clients. Please try again.');
    }
  };

  const getClientName = (client) => {
    return client.name || 
           client.company_name || 
           client.client_name || 
           (client.first_name && client.last_name ? `${client.first_name} ${client.last_name}` : null) ||
           client.title ||
           (typeof client === 'string' ? client : 'Unknown Client');
  };

  const handleInputChange = (text) => {
    setSearchQuery(text);
    setIsOpen(true);
    
    // If text is cleared, clear selection
    if (!text.trim() && onSelectClient) {
      onSelectClient('', null);
    }
  };

  const handleClientSelect = (client) => {
    const clientName = getClientName(client);
    setSearchQuery(clientName);
    setIsOpen(false);
    
    if (onSelectClient) {
      onSelectClient(clientName, client);
    }
    
    // Blur input
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleInputBlur = () => {
    // Delay to allow clicking on dropdown items
    setTimeout(() => {
      setIsOpen(false);
    }, 200);
  };

  const handleClear = () => {
    setSearchQuery('');
    setIsOpen(false);
    if (onSelectClient) {
      onSelectClient('', null);
    }
  };

  const renderClientItem = (client, index) => {
    const clientName = getClientName(client);
    const isSelected = selectedClient && selectedClient.id === client.id;
    
    return (
      <TouchableOpacity
        key={client.id || index}
        style={[
          styles.dropdownItem,
          isSelected && styles.dropdownItemSelected
        ]}
        onPress={() => handleClientSelect(client)}
      >
        <View style={styles.clientInfo}>
          <Text style={[
            styles.clientName,
            isSelected && styles.clientNameSelected
          ]}>
            {clientName}
          </Text>
          {client.email && (
            <Text style={styles.clientEmail}>{client.email}</Text>
          )}
          {client.address && (
            <Text style={styles.clientAddress}>{client.address}</Text>
          )}
        </View>
        {isSelected && (
          <Icon name="check" size={20} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  const displayClients = searchQuery.trim() ? filteredClients : clients;
  const showDropdown = isOpen && displayClients.length > 0;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrapper}>
        <Icon name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
        <TextInput
          ref={inputRef}
          style={[
            styles.textInput,
            error && styles.inputError
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textLight}
          value={searchQuery}
          onChangeText={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.clearButton}
          >
            <Icon name="close" size={18} color={colors.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {showDropdown && (
        <View style={styles.dropdownList}>
          <ScrollView 
            ref={scrollViewRef}
            style={styles.dropdownScrollView}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            keyboardShouldPersistTaps="handled"
          >
            {displayClients.map((client, index) => renderClientItem(client, index))}
          </ScrollView>
        </View>
      )}

      {isOpen && displayClients.length === 0 && !loading && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {searchQuery.trim() 
              ? 'No clients found matching your search'
              : 'No clients available'}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    position: 'relative',
    zIndex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
    fontWeight: '500',
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#fff5f5',
  },
  dropdownList: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    maxHeight: 280,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  dropdownScrollView: {
    maxHeight: 280,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  dropdownItemSelected: {
    backgroundColor: colors.primaryBackground,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  clientNameSelected: {
    color: colors.primary,
  },
  clientEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 2,
  },
  clientAddress: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  emptyState: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    padding: 16,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 1000,
  },
  emptyStateText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});

export default ClientDropdown;


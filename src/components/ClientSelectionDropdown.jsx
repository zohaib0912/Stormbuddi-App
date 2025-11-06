import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Dimensions,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Frontend pagination constants
const ITEMS_PER_PAGE = 30; // Show 30 clients at a time

const ClientSelectionDropdown = ({
  value = '',
  onSelectClient,
  selectedClient = null,
  error = false,
  placeholder = 'Select client...',
  label = 'Client',
  disabled = false,
  clients = [], // Accept clients as prop
  loading = false, // Accept loading state as prop
  onOpenModal, // Callback when modal opens
}) => {
  const [filteredClients, setFilteredClients] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [displayedItemsCount, setDisplayedItemsCount] = useState(ITEMS_PER_PAGE);
  const [loadingMore, setLoadingMore] = useState(false);

  // Helper function to get client name
  const getClientName = (client) => {
    return client.name || 
           client.company_name || 
           client.client_name || 
           (client.first_name && client.last_name ? `${client.first_name} ${client.last_name}` : null) ||
           client.title ||
           'Unknown Client';
  };

  // Filter clients when search query or clients prop changes
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = clients.filter(client => {
        const clientName = getClientName(client).toLowerCase();
        const email = (client.email || '').toLowerCase();
        const address = (client.address || '').toLowerCase();
        
        const searchLower = searchQuery.toLowerCase();
        return (
          clientName.includes(searchLower) ||
          email.includes(searchLower) ||
          address.includes(searchLower)
        );
      });
      setFilteredClients(filtered);
    } else {
      setFilteredClients(clients);
    }
    // Reset pagination when clients or search changes
    setDisplayedItemsCount(ITEMS_PER_PAGE);
  }, [clients, searchQuery]);

  // Get the clients to display (paginated) with selected client at top
  const getDisplayedClients = () => {
    // Find selected client index
    const selectedIndex = selectedClient 
      ? filteredClients.findIndex(client => client.id === selectedClient.id)
      : -1;
    
    if (selectedIndex === -1 || selectedIndex === 0) {
      // No selected client or already at top, normal pagination
      return filteredClients.slice(0, displayedItemsCount);
    }
    
    // Move selected client to top
    const selectedClientItem = filteredClients[selectedIndex];
    const withoutSelected = [
      ...filteredClients.slice(0, selectedIndex),
      ...filteredClients.slice(selectedIndex + 1)
    ];
    
    // Put selected at top, then add remaining items up to displayedItemsCount
    const clientsWithSelectedFirst = [selectedClientItem, ...withoutSelected];
    return clientsWithSelectedFirst.slice(0, displayedItemsCount);
  };
  
  const displayedClients = getDisplayedClients();
  const hasMore = displayedItemsCount < filteredClients.length;

  // Load more items when scrolling near bottom
  const handleScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToBottom = 300; // Load more when 300px from bottom
    const isNearBottom = 
      layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom;
    
    if (isNearBottom && hasMore && !loading && !loadingMore) {
      // Show loading indicator
      setLoadingMore(true);
      
      // Simulate small delay for smooth loading experience
      setTimeout(() => {
        setDisplayedItemsCount(prev => {
          const newCount = prev + ITEMS_PER_PAGE;
          console.log(`Loading more: Showing ${newCount} of ${filteredClients.length} clients`);
          setLoadingMore(false);
          return newCount;
        });
      }, 100); // Small delay to show loading indicator
    }
  };

  const handleClientSelect = (client) => {
    const clientName = getClientName(client);
    setSearchQuery(''); // Clear search when selecting
    setIsOpen(false);
    
    if (onSelectClient) {
      onSelectClient(clientName, client);
    }
  };

  const handleModalOpen = () => {
    setIsOpen(true);
    setSearchQuery(''); // Reset search when opening modal
    setDisplayedItemsCount(ITEMS_PER_PAGE); // Reset pagination
    // Trigger fetch when modal opens (if callback provided)
    if (onOpenModal && typeof onOpenModal === 'function') {
      onOpenModal();
    }
  };

  const displayValue = value || placeholder;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity
        style={[
          styles.dropdownButton,
          error && styles.inputError,
          disabled && styles.disabledButton
        ]}
        onPress={() => !disabled && handleModalOpen()}
        disabled={disabled}
      >
        <Text style={[
          styles.dropdownText,
          !value && styles.placeholderText
        ]}>
          {displayValue}
        </Text>
        <Icon 
          name={isOpen ? "keyboard-arrow-up" : "keyboard-arrow-down"} 
          size={20} 
          color={colors.textSecondary} 
        />
      </TouchableOpacity>
      
      <Modal
        visible={isOpen && !disabled}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setSearchQuery('');
          setIsOpen(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setSearchQuery('');
              setIsOpen(false);
            }}
          />
          <View style={styles.modalContainer}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{label}</Text>
              <TouchableOpacity 
                style={styles.closeButton}
                onPress={() => {
                  setSearchQuery('');
                  setIsOpen(false);
                }}
              >
                <Icon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Search Bar */}
            <View style={styles.searchContainer}>
              <Icon name="search" size={20} color={colors.textLight} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search clients..."
                placeholderTextColor={colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoFocus={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <Icon name="close" size={18} color={colors.textLight} />
                </TouchableOpacity>
              )}
            </View>

            {/* Clients List */}
            <ScrollView 
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              onScroll={handleScroll}
              scrollEventThrottle={400}
            >
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.primary} />
                  <Text style={styles.loadingText}>Loading clients...</Text>
                </View>
              ) : displayedClients.length > 0 ? (
                <>
                  {/* Only rendering displayedClients (paginated) - NOT all filteredClients */}
                  {displayedClients.map((client, index) => {
                  const clientName = getClientName(client);
                  const isSelected = selectedClient && selectedClient.id === client.id;
                  
                  return (
                    <TouchableOpacity
                      key={client.id || index}
                      style={[
                        styles.modalItem,
                        isSelected && styles.modalItemSelected
                      ]}
                      onPress={() => handleClientSelect(client)}
                      activeOpacity={0.7}
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
                        <Icon name="check" size={24} color={colors.primary} />
                      )}
                    </TouchableOpacity>
                  );
                  })}
                  
                  {/* Load More Indicator */}
                  {hasMore && !loading && (
                    <View style={styles.loadMoreContainer}>
                      {loadingMore ? (
                        <>
                          <ActivityIndicator size="small" color={colors.primary} />
                          <Text style={styles.loadMoreText}>Loading more clients...</Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.loadMoreText}>
                            Showing {displayedClients.length} of {filteredClients.length} clients
                          </Text>
                          <Text style={styles.loadMoreSubtext}>Scroll down to see more</Text>
                        </>
                      )}
                    </View>
                  )}
                  
                  {!hasMore && filteredClients.length > 0 && (
                    <View style={styles.loadMoreContainer}>
                      <Text style={styles.loadMoreText}>
                        Showing all {filteredClients.length} clients
                      </Text>
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.modalItem}>
                  <Text style={styles.modalItemText}>
                    {searchQuery.trim() 
                      ? 'No clients found matching your search'
                      : 'No clients available'}
                  </Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  dropdownButton: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  disabledButton: {
    backgroundColor: colors.borderLight,
    opacity: 0.6,
  },
  dropdownText: {
    fontSize: 16,
    color: colors.text,
    flex: 1,
  },
  placeholderText: {
    color: colors.textLight,
  },
  inputError: {
    borderColor: colors.error,
    backgroundColor: '#fff5f5',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: SCREEN_HEIGHT * 0.9,
    shadowColor: colors.shadowColor,
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    marginHorizontal: 24,
    marginVertical: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
    padding: 0,
  },
  clearButton: {
    padding: 4,
    marginLeft: 8,
  },
  modalScrollView: {
    flex: 1,
    paddingBottom: 20,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  modalItemSelected: {
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
  dropdownItemText: {
    fontSize: 16,
    color: colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: colors.textSecondary,
  },
  loadMoreContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 24,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.background,
  },
  loadMoreText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 4,
  },
  loadMoreSubtext: {
    fontSize: 12,
    color: colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalItemText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

export default ClientSelectionDropdown;


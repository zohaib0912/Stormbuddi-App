/**
 * Invoice & Payments Component
 * 
 * This component is structured for easy API integration:
 * 1. Mock data structure matches expected API response format
 * 2. fetchInvoices() function ready for API calls
 * 3. Loading and error states implemented
 * 4. Data is mapped dynamically from state
 * 5. Uses reusable components for consistent UI
 * 
 * To connect to backend:
 * - Replace mockData with actual API calls in fetchInvoices()
 * - Update API endpoints in the TODO comments
 * - Data structure is already compatible with typical REST API responses
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  StatusBar,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/FontAwesome';

// Import reusable components
import Header from '../components/Header';
import Card from '../components/Card';
import PaymentModal from '../components/PaymentModal';
import PageLoader from '../components/PageLoader';
import ErrorMessage from '../components/ErrorMessage';
import NotificationListModal from '../components/NotificationListModal';
import { getToken } from '../utils/tokenStorage';
import { downloadInvoice, shareInvoice } from '../utils/invoiceDownload';
import usePageLoader from '../hooks/usePageLoader';
import { colors } from '../theme/colors';


// Mock data structure - this will be replaced with API calls
const mockInvoices = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    clientName: 'John Doe',
    clientEmail: 'john.doe@example.com',
    invoiceDate: '2024-04-30',
    dueDate: '2024-05-15',
    status: 'pending',
    totalAmount: 3650.00,
    items: [
      { description: 'Roof Inspection', quantity: 1, rate: 150.00, amount: 150.00 },
      { description: 'Hail Damage Assessment', quantity: 1, rate: 200.00, amount: 200.00 },
      { description: 'Repair Materials', quantity: 1, rate: 2000.00, amount: 2000.00 },
      { description: 'Labor Costs', quantity: 40, rate: 32.50, amount: 1300.00 },
    ],
    notes: 'Payment due within 15 days of invoice date.',
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-002',
    clientName: 'Jane Smith',
    clientEmail: 'jane.smith@example.com',
    invoiceDate: '2024-05-01',
    dueDate: '2024-05-16',
    status: 'paid',
    totalAmount: 2800.00,
    items: [
      { description: 'Window Replacement', quantity: 8, rate: 250.00, amount: 2000.00 },
      { description: 'Installation Labor', quantity: 16, rate: 50.00, amount: 800.00 },
    ],
    notes: 'Thank you for your business!',
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-003',
    clientName: 'Bob Johnson',
    clientEmail: 'bob.johnson@example.com',
    invoiceDate: '2024-05-02',
    dueDate: '2024-05-17',
    status: 'overdue',
    totalAmount: 4200.00,
    items: [
      { description: 'Siding Repair', quantity: 1, rate: 3000.00, amount: 3000.00 },
      { description: 'Paint and Materials', quantity: 1, rate: 600.00, amount: 600.00 },
      { description: 'Labor', quantity: 20, rate: 30.00, amount: 600.00 },
    ],
    notes: 'Please contact us if you have any questions about this invoice.',
  },
];

const Invoice = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  
  // Use the new page loader hook
  const { shouldShowLoader, startLoading, stopLoading } = usePageLoader(true);

  // Fetch invoices from backend API
  const fetchInvoices = async () => {
    startLoading();
    setError(null);
    
    try {
      // Get stored token
      const token = await getToken();
      
      if (!token) {
        throw new Error('No authentication token found. Please login again.');
      }

      const response = await fetch('https://app.stormbuddi.com/api/mobile/invoices', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.data) {
        console.log('Invoices fetched successfully:', data.data);
        
        // Map API response to match Invoice component expected format
        const mappedInvoices = data.data.map(invoice => {
          const paidStatus = (invoice.paid_status || '').toString().toLowerCase();
          const rawStatus = (invoice.status || '').toString().toLowerCase();
          const daysOverdue = Number(invoice.days_overdue || 0);
          const status = paidStatus === 'paid'
            ? 'paid'
            : rawStatus === 'sent'
              ? (daysOverdue > 0 ? 'overdue' : 'pending')
              : (rawStatus || 'pending');

          // Debug logging for invoice data from API
          console.log('Invoice API data:', {
            id: invoice.id,
            amount: invoice.amount,
            paid_amount: invoice.paid_amount,
            amount_paid: invoice.amount_paid,
            paid: invoice.paid,
            status: invoice.status,
            paid_status: invoice.paid_status
          });

          return ({
          id: invoice.id,
          invoiceNumber: `INV-${invoice.id}`, // Generate invoice number from ID
          clientName: invoice.client_name,
          clientEmail: invoice.client_email,
          invoiceDate: invoice.created_at.split(' ')[0], // Extract date part (YYYY-MM-DD)
          dueDate: invoice.due_date ? invoice.due_date.split(' ')[0] : null, // Extract date part if exists
          status,
          totalAmount: Number(invoice.amount || 0),
          // Try multiple possible backend fields for paid amount
          paidAmount: Number(
            invoice.paid_amount ??
            invoice.amount_paid ??
            invoice.paid ??
            0
          ),
          formattedAmount: invoice.formatted_amount,
          // Additional fields from API that might be useful
          address: invoice.address,
          client_phone: invoice.client_phone,
          project_id: invoice.project_id,
          project_title: invoice.project_title,
          claim_reference: invoice.claim_reference,
          insurance_claim: invoice.insurance_claim,
          days_overdue: daysOverdue,
          estimate_id: invoice.estimate_id,
          updated_at: invoice.updated_at,
          // Mock items array for display (you might want to fetch this separately)
          items: [
            { 
              description: invoice.project_title || 'Service', 
              quantity: 1, 
              rate: invoice.amount, 
              amount: invoice.amount 
            }
          ],
          notes: invoice.claim_reference ? `Claim Reference: ${invoice.claim_reference}` : 'Thank you for your business!',
          });
        });
        
        setInvoices(mappedInvoices);
      } else {
        // Fallback to mock data if API structure is different
        console.log('API response structure different, using mock data');
        setInvoices(mockInvoices);
      }
    } catch (err) {
      console.error('Invoices fetch error:', err);
      setError('Failed to load invoices. Using offline data.');
      // Fallback to mock data on error
      setInvoices(mockInvoices);
    } finally {
      stopLoading();
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);



  const handleNotificationPress = () => {
    setShowNotificationModal(true);
  };

  const handlePaymentPress = (invoice) => {
    console.log('Opening Payment Modal for invoice:', invoice?.id);
    setSelectedInvoice(invoice);
    setShowPaymentModal(true);
  };

  const handlePaymentModalClose = () => {
    console.log('Closing Payment Modal');
    setShowPaymentModal(false);
    setSelectedInvoice(null);
  };

  const handlePaymentSuccess = (updatedInvoice) => {
    console.log('Payment success - updating invoice:', updatedInvoice);
    
    // Update the invoice with the new data from API response
    setInvoices(prevInvoices => 
      prevInvoices.map(inv => 
        inv.id === updatedInvoice.id 
          ? { 
              ...inv, 
              status: updatedInvoice.status,
              paidAmount: updatedInvoice.paidAmount,
              totalAmount: updatedInvoice.totalAmount
            }
          : inv
      )
    );
    
    // Refresh the invoices list to get latest data
    fetchInvoices();
  };

  const handleDownloadPress = (invoice) => {
    downloadInvoice(
      invoice,
      (downloadPath) => {
        console.log('Invoice downloaded to:', downloadPath);
      },
      (error) => {
        console.error('Download failed:', error);
      }
    );
  };

  const handleSharePress = (invoice) => {
    shareInvoice(invoice);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'overdue':
        return '#F44336';
      default:
        return '#666';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount, formattedAmount) => {
    if (formattedAmount) return formattedAmount;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount ?? 0);
  };

  // Decide which amount to show on the card headline.
  // If invoice is partially paid, show remaining balance; otherwise show total.

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      
      {/* Global Page Loader */}
      <PageLoader 
        visible={shouldShowLoader}
        message="Loading invoices..."
      />
      
      {/* Only show content when not loading */}
      {!shouldShowLoader && (
        <View style={[styles.contentContainer, { paddingBottom: insets.bottom }]}>
          {/* Header */}
          <Header
            title="Maddock"
            onNotificationPress={handleNotificationPress}
          />

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Screen Title */}
        <View style={styles.titleContainer}>
          <Text style={styles.screenTitle}>Invoice & Payments</Text>
        </View>

        {/* Error State */}
        {error && (
          <ErrorMessage
            message={error}
            onRetry={fetchInvoices}
            retryText="Retry"
          />
        )}

        {/* Invoices List */}
        {!shouldShowLoader && !error && (
          <View style={styles.invoicesContainer}>
            {invoices.map((invoice) => (
              <Card
                key={invoice.id}
                onPress={undefined}
                showHeader={true}
                headerTitle={invoice.clientName}
                headerSubtitle={invoice.invoiceNumber}
                style={styles.invoiceCard}
              >
                <View style={styles.invoiceDetails}>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Invoice Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(invoice.invoiceDate)}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Due Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(invoice.dueDate)}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Invoice #:</Text>
                    <Text style={styles.detailValue}>{invoice.invoiceNumber}</Text>
                  </View>
                  
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={styles.statusContainer}>
                      <View 
                        style={[
                          styles.statusDot, 
                          { backgroundColor: getStatusColor(invoice.status) }
                        ]} 
                      />
                      <Text 
                        style={[
                          styles.statusText, 
                          { color: getStatusColor(invoice.status) }
                        ]}
                      >
                        {invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.totalContainer}>
                    <View style={styles.amountContainer}>
                      <Text style={styles.totalAmount}>{formatCurrency(invoice.totalAmount, invoice.formattedAmount)}</Text>
                      {/* Show payment info if there's a paid amount */}
                      {invoice.paidAmount > 0 && (
                        <View style={styles.partialPaymentContainer}>
                          <Text style={styles.paidAmountText}>
                            Paid: {formatCurrency(invoice.paidAmount)}
                          </Text>
                          <Text style={styles.remainingAmountText}>
                            Remaining: {formatCurrency(invoice.totalAmount - invoice.paidAmount)}
                          </Text>
                        </View>
                      )}
                    </View>
                    {/* Right-side compact icons */}
                    <View style={styles.rightIconRow}>
                      {invoice.status !== 'paid' && (
                        <TouchableOpacity 
                          style={styles.viewButton}
                          onPress={() => handlePaymentPress(invoice)}
                          accessibilityLabel="Pay"
                        >
                          <Icon name="credit-card" size={16} color={colors.primary} />
                        </TouchableOpacity>
                      )}
                      {/* Download button disabled for now */}
                      {/* <TouchableOpacity 
                        style={[styles.viewButton, { marginLeft: 8 }]}
                        onPress={() => handleDownloadPress(invoice)}
                        accessibilityLabel="Download"
                      >
                        <Icon name="download" size={16} color="#7CFC00" />
                      </TouchableOpacity> */}
                    </View>
                  </View>

                  {/* Compact icons replace large action buttons below */}
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Empty State */}
        {!shouldShowLoader && !error && invoices.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No invoices found</Text>
            <Text style={styles.emptyStateSubtext}>
              Invoices will appear here once they are available.
            </Text>
          </View>
        )}
      </ScrollView>

      <PaymentModal
        visible={showPaymentModal}
        onClose={handlePaymentModalClose}
        invoice={selectedInvoice}
        onPaymentSuccess={handlePaymentSuccess}
      />

      {/* Notification List Modal */}
      <NotificationListModal
        visible={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
        </View>
      )}

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
  scrollView: {
    flex: 1,
  },
  titleContainer: {
    marginHorizontal: 16,
    marginTop: 20,
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  invoicesContainer: {
    paddingBottom: 100, // Space for bottom action bar
  },
  invoiceCard: {
    marginVertical: 8,
  },
  invoiceDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '400',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  totalContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  amountContainer: {
    flex: 1,
  },
  partialPaymentContainer: {
    marginTop: 4,
  },
  paidAmountText: {
    fontSize: 14,
    color: '#28a745',
    fontWeight: '500',
  },
  remainingAmountText: {
    fontSize: 14,
    color: '#dc3545',
    fontWeight: '500',
  },
  viewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',

  },
  rightIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32, // Extra padding for safe area
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  createButton: {
    flex: 1,
    marginRight: 16,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    marginHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: '500',
  },
});

export default Invoice;


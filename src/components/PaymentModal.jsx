import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { getToken } from '../utils/tokenStorage';
import { colors } from '../theme/colors';
import { useToast } from '../contexts/ToastContext';

const PaymentModal = ({ visible, onClose, invoice, onPaymentSuccess }) => {
  const { showSuccess, showError } = useToast();
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: '',
    errors: {}
  });
  const [loading, setLoading] = useState(false);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount || 0);
  };

  const getPaidStatusBadgeClass = (status) => {
    switch (status) {
      case 'paid':
        return styles.badgePaid;
      case 'pending':
        return styles.badgePending;
      case 'overdue':
        return styles.badgeOverdue;
      default:
        return styles.badgeDefault;
    }
  };

  const getRemainingBalance = () => {
    const invoiceAmount = invoice?.totalAmount || 0;
    const paidAmount = invoice?.paidAmount || 0;
    const paymentAmount = parseFloat(paymentForm.amount) || 0;
    // Remaining balance = Total - Already Paid - Current Payment
    return invoiceAmount - paidAmount - paymentAmount;
  };

  const getMaxPaymentAmount = () => {
    const invoiceAmount = invoice?.totalAmount || 0;
    const paidAmount = invoice?.paidAmount || 0;
    // Maximum payment = Total - Already Paid
    return invoiceAmount - paidAmount;
  };

  const getRemainingBalanceClass = () => {
    const remaining = getRemainingBalance();
    if (remaining <= 0) return styles.textSuccess;
    if (remaining < invoice?.totalAmount * 0.1) return styles.textWarning;
    return styles.textPrimary;
  };

  const getPaymentType = () => {
    const remaining = getRemainingBalance();
    if (remaining <= 0) return 'Full Payment';
    if (remaining < invoice?.totalAmount * 0.1) return 'Partial Payment';
    return 'Partial Payment';
  };

  const getPaymentTypeBadgeClass = () => {
    const remaining = getRemainingBalance();
    if (remaining <= 0) return styles.badgeSuccess;
    return styles.badgeInfo;
  };

  // Calculated fields to reflect the state if this payment is applied
  const getInvoiceAmount = () => invoice?.totalAmount || 0;
  const getAlreadyPaidAmount = () => invoice?.paidAmount || 0;
  
  // Debug logging to verify database values
  console.log('PaymentModal - Invoice data:', {
    id: invoice?.id,
    totalAmount: invoice?.totalAmount,
    paidAmount: invoice?.paidAmount,
    status: invoice?.status
  });
  const getEnteredPaymentAmount = () => parseFloat(paymentForm.amount) || 0;
  const getUpdatedPaidAmount = () => {
    const updated = getAlreadyPaidAmount() + getEnteredPaymentAmount();
    return Math.min(updated, getInvoiceAmount());
  };
  const getUpdatedRemainingAmount = () => {
    const remaining = getInvoiceAmount() - getUpdatedPaidAmount();
    return remaining < 0 ? 0 : remaining;
  };

  const setFullAmount = () => {
    const invoiceAmount = invoice?.totalAmount || 0;
    const paidAmount = invoice?.paidAmount || 0;
    const maxAmount = invoiceAmount - paidAmount;
    
    setPaymentForm(prev => ({
      ...prev,
      amount: maxAmount.toString(),
      errors: { ...prev.errors, amount: null }
    }));
  };

  const validatePaymentAmount = (amount) => {
    const numAmount = parseFloat(amount);
    const invoiceAmount = invoice?.totalAmount || 0;
    const paidAmount = invoice?.paidAmount || 0;
    const maxAmount = invoiceAmount - paidAmount;

    if (!amount || numAmount <= 0) {
      setPaymentForm(prev => ({
        ...prev,
        errors: { ...prev.errors, amount: 'Payment amount is required' }
      }));
      return false;
    }

    if (numAmount > maxAmount) {
      setPaymentForm(prev => ({
        ...prev,
        errors: { ...prev.errors, amount: 'Payment amount cannot exceed remaining balance' }
      }));
      return false;
    }

    setPaymentForm(prev => ({
      ...prev,
      errors: { ...prev.errors, amount: null }
    }));
    return true;
  };

  const validateForm = () => {
    const amountValid = validatePaymentAmount(paymentForm.amount);
    const methodValid = paymentForm.method !== '';

    if (!methodValid) {
      setPaymentForm(prev => ({
        ...prev,
        errors: { ...prev.errors, method: 'Payment method is required' }
      }));
    }

    return amountValid && methodValid;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    setLoading(true);
    
    try {
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Prepare payment data
      const paymentData = {
        invoice_id: invoice?.id,
        amount: parseFloat(paymentForm.amount),
        payment_method: paymentForm.method,
        // Add any additional fields that might be required by the backend
        invoice_number: invoice?.invoiceNumber,
        client_name: invoice?.clientName,
        client_email: invoice?.clientEmail,
        payment_date: new Date().toISOString(),
      };

      console.log('Processing payment:', paymentData);

      // Make API call to process payment (confirmed endpoint)
      const endpoint = 'https://app.stormbuddi.com/api/mobile/invoices/process-payment';
      console.log('Calling payment endpoint:', endpoint);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
      });

      if (!response.ok) {
        const status = response.status;
        let errorBody;
        try {
          errorBody = await response.text();
        } catch (_) {
          errorBody = '';
        }
        console.error('Payment API Error Response:', status, errorBody);
        throw new Error(`Payment failed: ${status}`);
      }

      let result;
      try {
        result = await response.json();
        console.log('Payment API Success Response:', result);
      } catch (jsonError) {
        console.error('Error parsing response JSON:', jsonError);
        throw new Error('Invalid response format from server');
      }

      if (result.success) {
        // Update the invoice with the new data from API response
        const updatedInvoice = {
          ...invoice,
          paidAmount: result.data.paid_amount,
          status: result.data.paid_status.toLowerCase(),
          totalAmount: result.data.total_amount
        };
        
        showSuccess(`Payment of ${formatCurrency(paymentForm.amount)} has been processed successfully using ${paymentForm.method}.`);
        onPaymentSuccess(updatedInvoice);
        handleClose();
      } else {
        throw new Error(result.message || 'Payment processing failed');
      }
    } catch (error) {
      console.error('Payment processing error:', error);
      
      // Check if it's a network error
      if (error.message === 'Network request failed') {
        showError('Unable to connect to server. Please check your internet connection and try again.');
      } else {
        showError(`Failed to process payment: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPaymentForm({
      amount: '',
      method: '',
      errors: {}
    });
    onClose();
  };

  const updatePaymentForm = (field, value) => {
    setPaymentForm(prev => ({
      ...prev,
      [field]: value,
      errors: { ...prev.errors, [field]: null }
    }));
  };

  const paymentMethods = [
    { value: '', label: 'Select Payment Method' },
    { value: 'cash', label: 'Cash' },
    { value: 'check', label: 'Check' },
    { value: 'credit_card', label: 'Credit Card' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'paypal', label: 'PayPal' },
    { value: 'other', label: 'Other' }
  ];

  const invoiceAmount = invoice?.totalAmount || 0;
  const paidAmount = invoice?.paidAmount || 0;
  const maxPaymentAmount = invoiceAmount - paidAmount;

  return (
    <Modal
      visible={!!invoice && !!visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Process Payment</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {invoice && (
            <>
              {/* Invoice Details */}
              <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            
            <View style={styles.detailRow}>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Invoice #:</Text>
                <Text style={styles.detailValue}>INV_{invoice.id}</Text>
              </View>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Customer:</Text>
                <Text style={styles.detailValue}>{invoice.clientName}</Text>
              </View>
            </View>

            <View style={styles.detailRow}>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Invoice Amount:</Text>
                <Text style={styles.invoiceAmount}>{formatCurrency(invoiceAmount)}</Text>
              </View>
              <View style={styles.detailColumn}>
                <Text style={styles.detailLabel}>Current Status:</Text>
                <View style={[styles.badge, getPaidStatusBadgeClass(invoice.status)]}>
                  <Text style={styles.badgeText}>{invoice.status}</Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Payment Form */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Information</Text>
            
            {/* Payment Amount */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Payment Amount <Text style={styles.required}>*</Text>
              </Text>
              <View style={styles.inputGroupContainer}>
                <View style={styles.inputWithPrefix}>
                  <Text style={styles.inputPrefix}>$</Text>
                  <TextInput
                    style={[
                      styles.input,
                      paymentForm.errors.amount && styles.inputError
                    ]}
                    value={paymentForm.amount}
                    onChangeText={(value) => {
                      updatePaymentForm('amount', value);
                      validatePaymentAmount(value);
                    }}
                    placeholder="0.00"
                    keyboardType="numeric"
                    maxLength={10}
                  />
                </View>
                <TouchableOpacity 
                  style={styles.fullAmountButton}
                  onPress={setFullAmount}
                >
                  <Text style={styles.fullAmountButtonText}>Full Amount</Text>
                </TouchableOpacity>
              </View>
              {paymentForm.errors.amount && (
                <Text style={styles.errorText}>{paymentForm.errors.amount}</Text>
              )}
              <Text style={styles.helpText}>
                Maximum: {formatCurrency(getMaxPaymentAmount())}
              </Text>
            </View>

            {/* Payment Method */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Payment Method</Text>
              <View style={styles.pickerContainer}>
                {paymentMethods.map((method, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.pickerOption,
                      paymentForm.method === method.value && styles.pickerOptionSelected
                    ]}
                    onPress={() => updatePaymentForm('method', method.value)}
                  >
                    <Text style={[
                      styles.pickerOptionText,
                      paymentForm.method === method.value && styles.pickerOptionTextSelected
                    ]}>
                      {method.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {paymentForm.errors.method && (
                <Text style={styles.errorText}>{paymentForm.errors.method}</Text>
              )}
            </View>
          </View>

          {/* Payment Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Payment Summary</Text>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Invoice Amount:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(invoiceAmount)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Paid Amount:</Text>
              <Text style={styles.summaryValue}>{formatCurrency(paidAmount)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Remaining Balance:</Text>
              <Text style={[styles.summaryValue, styles.textPrimary]}>
                {formatCurrency(getMaxPaymentAmount())}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Amount:</Text>
              <Text style={styles.summaryValue}>
                {formatCurrency(parseFloat(paymentForm.amount) || 0)}
              </Text>
            </View>
            
            <View style={styles.summaryDivider} />
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Remaining Balance:</Text>
              <Text style={[styles.summaryValue, getRemainingBalanceClass()]}>
                {formatCurrency(getRemainingBalance())}
              </Text>
            </View>
            
            <View style={styles.badgeContainer}>
              <View style={[styles.badge, getPaymentTypeBadgeClass()]}>
                <Text style={styles.badgeText}>{getPaymentType()}</Text>
              </View>
            </View>
          </View>
            </>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerButtons}>
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={handleClose}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.processButton,
                (!paymentForm.amount || !paymentForm.method || loading) && styles.processButtonDisabled
              ]}
              onPress={handlePayment}
              disabled={!paymentForm.amount || !paymentForm.method || loading}
            >
              {loading && <Text style={styles.spinner}>⟳</Text>}
              <Text style={styles.processButtonText}>
                {loading ? 'Processing...' : 'Process Payment'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    color: '#6c757d',
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailColumn: {
    flex: 1,
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
  invoiceAmount: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  badgePaid: {
    backgroundColor: '#d4edda',
  },
  badgePending: {
    backgroundColor: '#fff3cd',
  },
  badgeOverdue: {
    backgroundColor: '#f8d7da',
  },
  badgeDefault: {
    backgroundColor: '#e2e3e5',
  },
  badgeSuccess: {
    backgroundColor: '#d1ecf1',
  },
  badgeInfo: {
    backgroundColor: '#d1ecf1',
  },
  divider: {
    height: 1,
    backgroundColor: '#e9ecef',
    marginVertical: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
    marginBottom: 8,
  },
  required: {
    color: '#dc3545',
  },
  inputGroupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputWithPrefix: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    backgroundColor: colors.white,
    marginRight: 8,
  },
  inputPrefix: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#6c757d',
    backgroundColor: '#e9ecef',
    borderTopLeftRadius: 4,
    borderBottomLeftRadius: 4,
  },
  input: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: colors.text,
  },
  inputError: {
    borderColor: '#dc3545',
  },
  fullAmountButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 4,
  },
  fullAmountButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    color: '#dc3545',
    marginTop: 4,
  },
  helpText: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 4,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ced4da',
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  pickerOption: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  pickerOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  pickerOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  pickerOptionTextSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  summaryCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '400',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#dee2e6',
    marginVertical: 8,
  },
  textPrimary: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  textSuccess: {
    color: '#28a745',
    fontWeight: 'bold',
  },
  textWarning: {
    color: '#ffc107',
    fontWeight: 'bold',
  },
  badgeContainer: {
    marginTop: 8,
  },
  partialPaymentInfo: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginVertical: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#ffc107',
  },
  badgePartial: {
    backgroundColor: '#ffc107',
  },
  footer: {
    padding: 16,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  footerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: '#6c757d',
    marginRight: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  processButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginLeft: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  processButtonDisabled: {
    backgroundColor: '#6c757d',
  },
  processButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
  spinner: {
    color: '#ffffff',
    fontSize: 16,
    marginRight: 8,
  },
});

export default PaymentModal;
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme/colors';

const HelpFAQModal = ({ visible, onClose }) => {
  const handlePhoneCall = () => {
    Linking.openURL('tel:+18009887435');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:info@stormbuddi.com');
  };

  const handleWebsite = () => {
    Linking.openURL('https://stormbuddi.com/');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>Help & FAQ</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.contentContainer}>
            {/* Main Title */}
            <Text style={styles.mainTitle}>Frequently Asked Questions (FAQ)</Text>

            {/* FAQ Items */}
            <View style={styles.faqSection}>
              <View style={styles.faqItem}>
                <Text style={styles.questionNumber}>1.</Text>
                <View style={styles.questionContent}>
                  <Text style={styles.question}>What does StormBuddi do?</Text>
                  <Text style={styles.answer}>
                    StormBuddi provides professional roofing services, including roof installation, repair, maintenance, and inspection for both residential and commercial properties.
                  </Text>
                </View>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.questionNumber}>2.</Text>
                <View style={styles.questionContent}>
                  <Text style={styles.question}>How can I get a quote?</Text>
                  <Text style={styles.answer}>
                    You can request a free quote by filling out the contact form on our website or calling our customer service team. We'll get back to you with an estimate based on your needs.
                  </Text>
                </View>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.questionNumber}>3.</Text>
                <View style={styles.questionContent}>
                  <Text style={styles.question}>Do you handle all types of roofing?</Text>
                  <Text style={styles.answer}>
                    Yes, we work with a variety of roofing materials including shingles, metal, tile, slate, and flat roofing systems.
                  </Text>
                </View>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.questionNumber}>4.</Text>
                <View style={styles.questionContent}>
                  <Text style={styles.question}>Is StormBuddi a licensed and insured company?</Text>
                  <Text style={styles.answer}>
                    Yes, StormBuddi is fully licensed and insured to ensure your peace of mind and the highest level of safety and professionalism.
                  </Text>
                </View>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.questionNumber}>5.</Text>
                <View style={styles.questionContent}>
                  <Text style={styles.question}>Can you help with storm damage repairs?</Text>
                  <Text style={styles.answer}>
                    Absolutely. StormBuddi specializes in storm damage repair and restoration. We can inspect your roof, identify issues, and make the necessary repairs quickly.
                  </Text>
                </View>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.questionNumber}>6.</Text>
                <View style={styles.questionContent}>
                  <Text style={styles.question}>Do you provide warranty on your work?</Text>
                  <Text style={styles.answer}>
                    Yes, we stand behind the quality of our work and materials. Warranty details are discussed during your consultation.
                  </Text>
                </View>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.questionNumber}>7.</Text>
                <View style={styles.questionContent}>
                  <Text style={styles.question}>How can I schedule a service?</Text>
                  <Text style={styles.answer}>
                    You can schedule a service by calling us, sending us an email, or submitting your request through our website's contact form.
                  </Text>
                </View>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.questionNumber}>9.</Text>
                <View style={styles.questionContent}>
                  <Text style={styles.question}>Can I contact you for general roofing advice?</Text>
                  <Text style={styles.answer}>
                    Of course! Our team is happy to answer any roofing-related questions and provide honest, professional advice.
                  </Text>
                </View>
              </View>

              <View style={styles.faqItem}>
                <Text style={styles.questionNumber}>10.</Text>
                <View style={styles.questionContent}>
                  <Text style={styles.question}>How can I reach StormBuddi?</Text>
                  <Text style={styles.answer}>
                    You can contact us through:
                  </Text>
                </View>
              </View>
            </View>

            {/* Contact Information */}
            <View style={styles.contactSection}>
              <Text style={styles.contactTitle}>Contact Information</Text>
              
              <TouchableOpacity style={styles.contactItem} onPress={handlePhoneCall}>
                <Icon name="phone" size={20} color="#007AFF" style={styles.contactIcon} />
                <Text style={styles.contactText}>+1 800-988-7435</Text>
                <Icon name="chevron-right" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactItem} onPress={handleEmail}>
                <Icon name="email" size={20} color="#007AFF" style={styles.contactIcon} />
                <Text style={styles.contactText}>info@stormbuddi.com</Text>
                <Icon name="chevron-right" size={20} color="#666" />
              </TouchableOpacity>

              <TouchableOpacity style={styles.contactItem} onPress={handleWebsite}>
                <Icon name="language" size={20} color="#007AFF" style={styles.contactIcon} />
                <Text style={styles.contactText}>https://stormbuddi.com/</Text>
                <Icon name="chevron-right" size={20} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Additional Help */}
            <View style={styles.helpSection}>
              <Text style={styles.helpTitle}>Need More Help?</Text>
              <Text style={styles.helpText}>
                If you have any other questions or need assistance, please don't hesitate to contact our customer service team. We're here to help!
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  faqSection: {
    marginBottom: 24,
  },
  faqItem: {
    flexDirection: 'row',
    marginBottom: 20,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
    marginRight: 6,
    minWidth: 20,
  },
  questionContent: {
    flex: 1,
  },
  question: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
    lineHeight: 22,
  },
  answer: {
    fontSize: 15,
    color: '#666',
    lineHeight: 22,
    textAlign: 'justify',
  },
  contactSection: {
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  contactIcon: {
    marginRight: 16,
  },
  contactText: {
    flex: 1,
    fontSize: 16,
    color: colors.text,
  },
  helpSection: {
    backgroundColor: '#E3F2FD',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1976D2',
    marginBottom: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#1976D2',
    lineHeight: 20,
    textAlign: 'justify',
  },
});

export default HelpFAQModal;

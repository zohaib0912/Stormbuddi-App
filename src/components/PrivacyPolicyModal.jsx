import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { colors } from '../theme/colors';

const PrivacyPolicyModal = ({ visible, onClose }) => {
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
            <Icon name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Privacy Policy</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.contentContainer}>
            {/* Last Updated */}
            <Text style={styles.lastUpdated}>Last Updated: October 2025</Text>

            {/* Introduction */}
            <Text style={styles.introText}>
              At StormBuddi, your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your personal information when you visit our website, contact us, or use our roofing services.
            </Text>

            {/* Section 1 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Information We Collect</Text>
              <Text style={styles.sectionText}>
                We may collect the following types of information:
              </Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bullet}>• </Text>
                <Text style={styles.bold}>Personal Details:</Text> Name, phone number, email address, and home address when you contact us or request a quote.
              </Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bullet}>• </Text>
                <Text style={styles.bold}>Service Information:</Text> Property details, roofing requirements, and project preferences.
              </Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bullet}>• </Text>
                <Text style={styles.bold}>Technical Information:</Text> IP address, browser type, device information, and cookies to improve our website performance and user experience.
              </Text>
            </View>

            {/* Section 2 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
              <Text style={styles.sectionText}>
                We use your information to:
              </Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bullet}>• </Text>
                Provide and manage our roofing services.
              </Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bullet}>• </Text>
                Respond to your inquiries and provide estimates or quotations.
              </Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bullet}>• </Text>
                Send important updates related to your service or project.
              </Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bullet}>• </Text>
                Improve our website, services, and customer communication.
              </Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bullet}>• </Text>
                Comply with legal obligations and resolve disputes if necessary.
              </Text>
              <Text style={styles.importantText}>
                We do not sell, rent, or trade your personal information to third parties.
              </Text>
            </View>

            {/* Section 3 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. Data Security</Text>
              <Text style={styles.sectionText}>
                We take reasonable and appropriate measures to protect your personal data from unauthorized access, loss, or misuse. Access to personal data is restricted to authorized personnel who require it for legitimate business purposes.
              </Text>
            </View>

            {/* Section 4 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Cookies</Text>
              <Text style={styles.sectionText}>
                Our website may use cookies or similar technologies to enhance your browsing experience. You can choose to disable cookies in your browser settings, though some parts of our website may not function properly as a result.
              </Text>
            </View>

            {/* Section 5 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Sharing Your Information</Text>
              <Text style={styles.sectionText}>
                We may share limited information with:
              </Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bullet}>• </Text>
                Trusted service providers (such as delivery partners or IT support) who assist us in operating our business — under confidentiality agreements.
              </Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bullet}>• </Text>
                Legal authorities, if required by law or to protect our rights.
              </Text>
            </View>

            {/* Section 6 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Your Rights</Text>
              <Text style={styles.sectionText}>
                You have the right to:
              </Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bullet}>• </Text>
                Access and request a copy of the personal data we hold about you.
              </Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bullet}>• </Text>
                Request corrections or deletion of inaccurate or outdated information.
              </Text>
              <Text style={styles.bulletText}>
                <Text style={styles.bullet}>• </Text>
                Withdraw consent for marketing communications at any time.
              </Text>
              <Text style={styles.sectionText}>
                To exercise these rights, please contact us using the details below.
              </Text>
            </View>

            {/* Section 7 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. External Links</Text>
              <Text style={styles.sectionText}>
                Our website may include links to other websites. We are not responsible for the privacy practices or content of external sites.
              </Text>
            </View>

            {/* Section 8 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. Changes to This Policy</Text>
              <Text style={styles.sectionText}>
                StormBuddi may update this Privacy Policy periodically. Any changes will be posted on this page with a new "Last Updated" date.
              </Text>
            </View>

            {/* Section 9 */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. Contact Us</Text>
              <Text style={styles.sectionText}>
                If you have questions or concerns about this Privacy Policy or your data, please contact us:
              </Text>
              
              <View style={styles.contactInfo}>
                <Text style={styles.companyName}>StormBuddi Roofing Company</Text>
                <Text style={styles.contactItem}>
                  <Icon name="location-on" size={16} color="#007AFF" style={styles.contactIcon} />
                  2785 Rockbrook Dr Suite 104 Lewisville, Texas
                </Text>
                <Text style={styles.contactItem}>
                  <Icon name="email" size={16} color="#007AFF" style={styles.contactIcon} />
                  info@stormbuddi.com
                </Text>
                <Text style={styles.contactItem}>
                  <Icon name="phone" size={16} color="#007AFF" style={styles.contactIcon} />
                  +1 800-988-7435
                </Text>
              </View>
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
  lastUpdated: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
    textAlign: 'center',
  },
  introText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 24,
    textAlign: 'justify',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 12,
    textAlign: 'justify',
  },
  bulletText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 8,
    paddingLeft: 8,
  },
  bullet: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  bold: {
    fontWeight: 'bold',
    color: colors.text,
  },
  importantText: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginTop: 12,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  contactInfo: {
    backgroundColor: colors.white,
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  companyName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  contactItem: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  contactIcon: {
    marginRight: 16,
  },
});

export default PrivacyPolicyModal;

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
import { colors } from '../theme/colors';

const TypeableDropdown = ({ 
  value = '',
  options = [],
  onSelect,
  error = false,
  placeholder = 'Type to search...',
  label = '',
  getOptionLabel = (option) => option.name || option || '',
  getOptionValue = (option) => option.id || option || '',
  renderOption = null, // Custom render function
}) => {
  const [searchQuery, setSearchQuery] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const scrollViewRef = useRef(null);

  // Update search query when value prop changes
  useEffect(() => {
    if (value !== searchQuery) {
      const selectedOption = options.find(opt => getOptionValue(opt) === value || getOptionLabel(opt) === value);
      setSearchQuery(selectedOption ? getOptionLabel(selectedOption) : value || '');
    }
  }, [value, options]);

  // Filter options based on search query
  const filteredOptions = searchQuery.trim()
    ? options.filter(option => {
        const label = getOptionLabel(option);
        return label.toLowerCase().includes(searchQuery.toLowerCase());
      })
    : options;

  const handleInputChange = (text) => {
    setSearchQuery(text);
    setIsOpen(true);
    
    // If text is cleared, clear selection
    if (!text.trim() && onSelect) {
      onSelect('');
    }
  };

  const handleOptionSelect = (option) => {
    const label = getOptionLabel(option);
    const value = getOptionValue(option);
    setSearchQuery(label);
    setIsOpen(false);
    
    if (onSelect) {
      onSelect(value, option);
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
    if (onSelect) {
      onSelect('');
    }
  };

  const renderOptionItem = (option, index) => {
    const optionLabel = getOptionLabel(option);
    const isSelected = value && (getOptionValue(option) === value || optionLabel === value);
    
    if (renderOption) {
      return renderOption(option, index, isSelected, () => handleOptionSelect(option));
    }
    
    return (
      <TouchableOpacity
        key={getOptionValue(option) || index}
        style={[
          styles.dropdownItem,
          isSelected && styles.dropdownItemSelected
        ]}
        onPress={() => handleOptionSelect(option)}
      >
        <Text style={[
          styles.dropdownItemText,
          isSelected && styles.dropdownItemTextSelected
        ]}>
          {optionLabel}
        </Text>
        {isSelected && (
          <Icon name="check" size={20} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  const showDropdown = isOpen && filteredOptions.length > 0;

  return (
    <View style={styles.container}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
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
            {filteredOptions.map((option, index) => renderOptionItem(option, index))}
          </ScrollView>
        </View>
      )}

      {isOpen && filteredOptions.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>
            {searchQuery.trim() 
              ? 'No options found matching your search'
              : 'No options available'}
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
  dropdownItemText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
  },
  dropdownItemTextSelected: {
    color: colors.primary,
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

export default TypeableDropdown;


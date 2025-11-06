import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';

const { width } = Dimensions.get('window');

const CalendarStrip = forwardRef(({ 
  selectedDate, 
  onDateSelect,
  appointments = [] 
}, ref) => {
  const scrollViewRef = useRef(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [visibleMonth, setVisibleMonth] = useState(new Date());

  // Generate dates for multiple months with ability to scroll
  const generateCalendarDates = () => {
    const today = new Date();
    
    // Generate dates starting from today going forward
    const calendarDates = [];
    
    // Start from today and generate 90 days forward (about 3 months)
    for (let i = 0; i < 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      calendarDates.push(date);
    }
    return calendarDates;
  };

  const calendarDates = generateCalendarDates();
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const getAppointmentCount = (date) => {
    return appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      return aptDate.toDateString() === date.toDateString();
    }).length;
  };

  const isSelected = (date) => {
    if (!selectedDate) return false;
    return date.toDateString() === selectedDate.toDateString();
  };

  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date) => {
    const today = new Date();
    return date.getMonth() === today.getMonth() && date.getFullYear() === today.getFullYear();
  };

  const getMonthName = (date) => {
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  const getYear = (date) => {
    return date.getFullYear();
  };

  const handleScrollEnd = (event) => {
    const scrollX = event.nativeEvent.contentOffset.x;
    const dayWidth = width / 7;
    
    // Get the date that's currently at the center of the screen
    const centerIndex = Math.round(scrollX / dayWidth);
    
    if (centerIndex >= 0 && centerIndex < calendarDates.length) {
      const centerDate = calendarDates[centerIndex];
      console.log(`Scrolled to date: ${centerDate.toDateString()}, Month: ${centerDate.getMonth() + 1}`);
      setVisibleMonth(centerDate);
    }
  };

  const scrollToToday = () => {
    const today = new Date();
    const todayIndex = calendarDates.findIndex(date => 
      date.toDateString() === today.toDateString()
    );
    if (todayIndex !== -1) {
      const scrollPosition = todayIndex * (width / 7); // Scroll to exact day position
      scrollViewRef.current?.scrollTo({ x: scrollPosition, animated: true });
    }
  };

  const scrollToDate = (targetDate) => {
    const targetIndex = calendarDates.findIndex(date => 
      date.toDateString() === targetDate.toDateString()
    );
    if (targetIndex !== -1) {
      const scrollPosition = targetIndex * (width / 7);
      scrollViewRef.current?.scrollTo({ x: scrollPosition, animated: true });
      setVisibleMonth(targetDate);
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    scrollToDate,
    scrollToToday,
  }));

  // Scroll to today's date on component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      // Since we start from today, today will always be at index 0
      scrollViewRef.current?.scrollTo({ x: 0, animated: false });
      // Set the visible month to today's month
      setVisibleMonth(new Date());
    }, 100); // Small delay to ensure component is mounted
    
    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.monthHeader}>
        <Text style={styles.monthText}>
          {getMonthName(visibleMonth)} {getYear(visibleMonth)}
        </Text>
      </View>
      
      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
        onScroll={handleScrollEnd}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={8}
      >
        {calendarDates.map((date, index) => {
          const dayName = dayNames[date.getDay()]; // Use actual day of week
          const dayNumber = date.getDate();
          const appointmentCount = getAppointmentCount(date);
          const isSelectedDate = isSelected(date);
          const isTodayDate = isToday(date);
          const isCurrentMonthDate = isCurrentMonth(date);
          
          return (
            <TouchableOpacity
              key={index}
              style={[
                styles.dateContainer,
                isSelectedDate && styles.selectedDateContainer,
                isTodayDate && !isSelectedDate && styles.todayContainer,
                !isCurrentMonthDate && styles.otherMonthContainer
              ]}
              onPress={() => onDateSelect(date)}
            >
              <Text style={[
                styles.dayName,
                isSelectedDate && styles.selectedText,
                !isCurrentMonthDate && styles.otherMonthText
              ]}>
                {dayName}
              </Text>
              <Text style={[
                styles.dayNumber,
                isSelectedDate && styles.selectedText,
                isTodayDate && !isSelectedDate && styles.todayText,
                !isCurrentMonthDate && styles.otherMonthText
              ]}>
                {dayNumber}
              </Text>
              {appointmentCount > 0 && (
                <View style={[
                  styles.appointmentDot,
                  isSelectedDate && styles.selectedAppointmentDot
                ]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  monthHeader: {
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  monthText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 0,
  },
  dateContainer: {
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 4,
    width: width / 7, // Each date takes 1/7 of screen width
    minHeight: 50,
    justifyContent: 'center',
    marginHorizontal: 1,
  },
  selectedDateContainer: {
    backgroundColor: '#007AFF',
    borderRadius: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
    marginHorizontal: 1,
  },
  todayContainer: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
    marginHorizontal: 1,
  },
  otherMonthContainer: {
    opacity: 0.3,
  },
  dayName: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
    fontWeight: '500',
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  selectedText: {
    color: '#ffffff',
  },
  todayText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  otherMonthText: {
    color: '#999',
  },
  appointmentDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FF9500',
    marginTop: 2,
  },
  selectedAppointmentDot: {
    backgroundColor: '#ffffff',
  },
});

export default CalendarStrip;

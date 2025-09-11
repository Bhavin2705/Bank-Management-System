import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

const CustomCalendar = ({ 
    value, 
    onChange, 
    placeholder = "Select date", 
    disabled = false,
    minDate = null,
    maxDate = null,
    className = "",
    showTime = false,
    allowManualInput = true 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState({ hours: '12', minutes: '00', period: 'AM' });
    const [inputValue, setInputValue] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const calendarRef = useRef(null);
    const inputRef = useRef(null);

    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target) &&
                inputRef.current && !inputRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (value && !isTyping) {
            const date = new Date(value);
            setCurrentMonth(new Date(date.getFullYear(), date.getMonth()));
            setInputValue(formatDisplayValue(date));
            if (showTime) {
                const hours = date.getHours();
                const minutes = date.getMinutes();
                const period = hours >= 12 ? 'PM' : 'AM';
                const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                setSelectedTime({
                    hours: displayHours.toString().padStart(2, '0'),
                    minutes: minutes.toString().padStart(2, '0'),
                    period
                });
            }
        } else if (!value && !isTyping) {
            setInputValue('');
        }
    }, [value, showTime, isTyping]);

    const getDaysInMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (date) => {
        return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    };

    const isDateDisabled = (date) => {
        if (disabled) return true;
        if (minDate && date < new Date(minDate)) return true;
        if (maxDate && date > new Date(maxDate)) return true;
        return false;
    };

    const isDateSelected = (date) => {
        if (!value) return false;
        const selectedDate = new Date(value);
        return date.getFullYear() === selectedDate.getFullYear() &&
               date.getMonth() === selectedDate.getMonth() &&
               date.getDate() === selectedDate.getDate();
    };

    const isToday = (date) => {
        const today = new Date();
        return date.getFullYear() === today.getFullYear() &&
               date.getMonth() === today.getMonth() &&
               date.getDate() === today.getDate();
    };

    const handleDateSelect = (date) => {
        if (isDateDisabled(date)) return;
        
        // Create a new date at noon to avoid timezone issues
        let finalDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
        
        if (showTime) {
            const hours24 = selectedTime.period === 'PM' && selectedTime.hours !== '12' 
                ? parseInt(selectedTime.hours) + 12 
                : selectedTime.period === 'AM' && selectedTime.hours === '12' 
                ? 0 
                : parseInt(selectedTime.hours);
            
            finalDate.setHours(hours24, parseInt(selectedTime.minutes), 0, 0);
        }
        
        onChange(finalDate); // Pass Date object
        setIsTyping(false);
        setInputValue(formatDisplayValue(finalDate));
        if (!showTime) {
            setIsOpen(false);
        }
    };

    const handleTimeChange = (type, value) => {
        const newTime = { ...selectedTime, [type]: value };
        setSelectedTime(newTime);
        
        if (value && onChange && this.value) {
            const currentDate = new Date(this.value);
            const hours24 = newTime.period === 'PM' && newTime.hours !== '12' 
                ? parseInt(newTime.hours) + 12 
                : newTime.period === 'AM' && newTime.hours === '12' 
                ? 0 
                : parseInt(newTime.hours);
            
            currentDate.setHours(hours24, parseInt(newTime.minutes));
            onChange(currentDate);
        }
    };

    const navigateMonth = (direction) => {
        setCurrentMonth(prev => {
            const newMonth = new Date(prev);
            newMonth.setMonth(prev.getMonth() + direction);
            return newMonth;
        });
    };

    const navigateToToday = () => {
        const today = new Date();
        setCurrentMonth(new Date(today.getFullYear(), today.getMonth()));
        handleDateSelect(today);
    };

    const formatDisplayValue = (dateValue = null) => {
        const dateToFormat = dateValue || (value ? new Date(value) : null);
        if (!dateToFormat) return '';
        
        if (showTime) {
            return dateToFormat.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
        
        return dateToFormat.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const parseInputValue = (input) => {
        // Try different date formats
        const formats = [
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, // MM/DD/YYYY or M/D/YYYY
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/, // MM-DD-YYYY or M-D-YYYY
            /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/, // YYYY/MM/DD or YYYY/M/D
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/, // YYYY-MM-DD or YYYY-M-D
        ];

        for (let i = 0; i < formats.length; i++) {
            const match = input.match(formats[i]);
            if (match) {
                let year, month, day;
                if (i < 2) {
                    // MM/DD/YYYY or MM-DD-YYYY format
                    month = parseInt(match[1], 10) - 1; // JavaScript months are 0-based
                    day = parseInt(match[2], 10);
                    year = parseInt(match[3], 10);
                } else {
                    // YYYY/MM/DD or YYYY-MM-DD format
                    year = parseInt(match[1], 10);
                    month = parseInt(match[2], 10) - 1; // JavaScript months are 0-based
                    day = parseInt(match[3], 10);
                }

                // Create date at noon to avoid timezone issues
                const date = new Date(year, month, day, 12, 0, 0, 0);
                // Validate the date
                if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                    return date;
                }
            }
        }

        // Try parsing with Date constructor as fallback
        const date = new Date(input);
        if (!isNaN(date.getTime())) {
            // Adjust to noon to avoid timezone issues
            return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
        }
        return null;
    };

    const combineDateTime = (date) => {
        if (!showTime) return date;
        
        const hours = selectedTime.period === 'PM' && selectedTime.hours !== '12' 
            ? parseInt(selectedTime.hours, 10) + 12 
            : selectedTime.period === 'AM' && selectedTime.hours === '12'
            ? 0 
            : parseInt(selectedTime.hours, 10);
        
        const minutes = parseInt(selectedTime.minutes, 10);
        
        const newDate = new Date(date);
        newDate.setHours(hours, minutes, 0, 0);
        return newDate;
    };

    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        setIsTyping(true);

        // Try to parse the date as user types (only when input looks complete)
        if (newValue.trim()) {
            // Only attempt parsing when we have enough characters for a complete date
            if (newValue.length >= 8 && newValue.match(/^\d{1,2}[-\/]\d{1,2}[-\/]\d{4}$|^\d{4}[-\/]\d{1,2}[-\/]\d{1,2}$/)) {
                const parsedDate = parseInputValue(newValue.trim());
                if (parsedDate && !isDateDisabled(parsedDate)) {
                    // Valid date, update the value - pass Date object
                    const finalDate = showTime ? combineDateTime(parsedDate) : parsedDate;
                    onChange(finalDate);
                    setCurrentMonth(new Date(parsedDate.getFullYear(), parsedDate.getMonth()));
                }
            }
        } else {
            // Empty input, clear the value
            onChange(null);
        }
    };

    const handleInputBlur = () => {
        setIsTyping(false);
        
        // Try to parse and validate the final input
        if (inputValue.trim()) {
            const parsedDate = parseInputValue(inputValue.trim());
            if (parsedDate && !isDateDisabled(parsedDate)) {
                // Valid date, make sure it's properly set
                const finalDate = showTime ? combineDateTime(parsedDate) : parsedDate;
                onChange(finalDate); // Pass Date object
                setCurrentMonth(new Date(parsedDate.getFullYear(), parsedDate.getMonth()));
                setInputValue(formatDisplayValue(finalDate));
            } else {
                // Invalid date, revert to previous value or clear
                if (value) {
                    setInputValue(formatDisplayValue());
                } else {
                    setInputValue('');
                    onChange(null);
                }
            }
        } else {
            // Empty input
            onChange(null);
        }
    };

    const handleInputKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setIsOpen(false);
            setIsTyping(false);
            
            // Validate and set the final value
            if (inputValue.trim()) {
                const parsedDate = parseInputValue(inputValue.trim());
                if (parsedDate && !isDateDisabled(parsedDate)) {
                    // Valid date, make sure it's properly set
                    const finalDate = showTime ? combineDateTime(parsedDate) : parsedDate;
                    onChange(finalDate); // Pass Date object
                    setCurrentMonth(new Date(parsedDate.getFullYear(), parsedDate.getMonth()));
                    setInputValue(formatDisplayValue(finalDate));
                } else {
                    // Invalid date, revert to previous value or clear
                    if (value) {
                        setInputValue(formatDisplayValue());
                    } else {
                        setInputValue('');
                        onChange(null);
                    }
                }
            } else {
                // Empty input
                onChange(null);
            }
        } else if (e.key === 'Escape') {
            e.preventDefault();
            setIsOpen(false);
            if (value) {
                setInputValue(formatDisplayValue());
            } else {
                setInputValue('');
            }
            setIsTyping(false);
        }
    };

    const renderCalendarDays = () => {
        const daysInMonth = getDaysInMonth(currentMonth);
        const firstDay = getFirstDayOfMonth(currentMonth);
        const days = [];

        // Previous month's trailing days
        const prevMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1);
        const daysInPrevMonth = getDaysInMonth(prevMonth);
        
        for (let i = firstDay - 1; i >= 0; i--) {
            const date = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), daysInPrevMonth - i);
            days.push(
                <button
                    key={`prev-${daysInPrevMonth - i}`}
                    onClick={() => handleDateSelect(date)}
                    disabled={isDateDisabled(date)}
                    className="calendar-day calendar-day-other-month"
                >
                    {daysInPrevMonth - i}
                </button>
            );
        }

        // Current month's days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
            const isSelected = isDateSelected(date);
            const isTodayDate = isToday(date);
            const isDisabled = isDateDisabled(date);

            days.push(
                <button
                    key={`current-${day}`}
                    onClick={() => handleDateSelect(date)}
                    disabled={isDisabled}
                    className={`calendar-day ${isSelected ? 'calendar-day-selected' : ''} ${isTodayDate ? 'calendar-day-today' : ''} ${isDisabled ? 'calendar-day-disabled' : ''}`}
                >
                    {day}
                </button>
            );
        }

        // Next month's leading days
        const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
        const remainingCells = totalCells - (firstDay + daysInMonth);
        const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1);

        for (let day = 1; day <= remainingCells; day++) {
            const date = new Date(nextMonth.getFullYear(), nextMonth.getMonth(), day);
            days.push(
                <button
                    key={`next-${day}`}
                    onClick={() => handleDateSelect(date)}
                    disabled={isDateDisabled(date)}
                    className="calendar-day calendar-day-other-month"
                >
                    {day}
                </button>
            );
        }

        return days;
    };

    return (
        <div className={`custom-calendar-container ${className}`}>
            <div className={`custom-calendar-input ${isOpen ? 'calendar-input-focused' : ''} ${disabled ? 'calendar-input-disabled' : ''}`}>
                {allowManualInput ? (
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={handleInputKeyDown}
                        onFocus={() => setIsTyping(true)}
                        placeholder={placeholder}
                        disabled={disabled}
                        className="calendar-text-input"
                    />
                ) : (
                    <div 
                        ref={inputRef}
                        onClick={() => !disabled && setIsOpen(!isOpen)}
                        className="calendar-display-input"
                    >
                        <span className={value ? 'calendar-input-value' : 'calendar-input-placeholder'}>
                            {value ? formatDisplayValue() : placeholder}
                        </span>
                    </div>
                )}
                <button
                    type="button"
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className="calendar-toggle-button"
                    disabled={disabled}
                >
                    <CalendarIcon size={18} className="calendar-input-icon" />
                </button>
            </div>

            {isOpen && (
                <div ref={calendarRef} className="custom-calendar-dropdown">
                    {/* Calendar Header */}
                    <div className="calendar-header">
                        <button 
                            onClick={() => navigateMonth(-1)}
                            className="calendar-nav-button"
                            type="button"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        
                        <div className="calendar-month-year">
                            <h3>{months[currentMonth.getMonth()]} {currentMonth.getFullYear()}</h3>
                        </div>
                        
                        <button 
                            onClick={() => navigateMonth(1)}
                            className="calendar-nav-button"
                            type="button"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Quick Actions */}
                    <div className="calendar-quick-actions">
                        <button 
                            onClick={navigateToToday}
                            className="calendar-today-button"
                            type="button"
                        >
                            Today
                        </button>
                    </div>

                    {/* Weekday Headers */}
                    <div className="calendar-weekdays">
                        {weekdays.map(day => (
                            <div key={day} className="calendar-weekday">
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="calendar-days">
                        {renderCalendarDays()}
                    </div>

                    {/* Time Picker */}
                    {showTime && (
                        <div className="calendar-time-picker">
                            <div className="time-picker-label">Time:</div>
                            <div className="time-picker-controls">
                                <select 
                                    value={selectedTime.hours}
                                    onChange={(e) => handleTimeChange('hours', e.target.value)}
                                    className="time-picker-select"
                                >
                                    {Array.from({ length: 12 }, (_, i) => {
                                        const hour = (i + 1).toString().padStart(2, '0');
                                        return <option key={hour} value={hour}>{hour}</option>;
                                    })}
                                </select>
                                <span className="time-separator">:</span>
                                <select 
                                    value={selectedTime.minutes}
                                    onChange={(e) => handleTimeChange('minutes', e.target.value)}
                                    className="time-picker-select"
                                >
                                    {Array.from({ length: 60 }, (_, i) => {
                                        const minute = i.toString().padStart(2, '0');
                                        return <option key={minute} value={minute}>{minute}</option>;
                                    })}
                                </select>
                                <select 
                                    value={selectedTime.period}
                                    onChange={(e) => handleTimeChange('period', e.target.value)}
                                    className="time-picker-select"
                                >
                                    <option value="AM">AM</option>
                                    <option value="PM">PM</option>
                                </select>
                            </div>
                            
                            {showTime && value && (
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="calendar-done-button"
                                    type="button"
                                >
                                    Done
                                </button>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomCalendar;

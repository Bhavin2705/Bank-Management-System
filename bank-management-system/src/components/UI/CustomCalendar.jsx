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
    showTime = false 
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedTime, setSelectedTime] = useState({ hours: '12', minutes: '00', period: 'AM' });
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
        if (value) {
            const date = new Date(value);
            setCurrentMonth(new Date(date.getFullYear(), date.getMonth()));
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
        }
    }, [value, showTime]);

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
        
        let finalDate = new Date(date);
        
        if (showTime) {
            const hours24 = selectedTime.period === 'PM' && selectedTime.hours !== '12' 
                ? parseInt(selectedTime.hours) + 12 
                : selectedTime.period === 'AM' && selectedTime.hours === '12' 
                ? 0 
                : parseInt(selectedTime.hours);
            
            finalDate.setHours(hours24, parseInt(selectedTime.minutes));
        }
        
        onChange(finalDate);
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

    const formatDisplayValue = () => {
        if (!value) return '';
        const date = new Date(value);
        
        if (showTime) {
            return date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });
        }
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
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
            <div 
                ref={inputRef}
                className={`custom-calendar-input ${isOpen ? 'calendar-input-focused' : ''} ${disabled ? 'calendar-input-disabled' : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <span className={value ? 'calendar-input-value' : 'calendar-input-placeholder'}>
                    {value ? formatDisplayValue() : placeholder}
                </span>
                <CalendarIcon size={18} className="calendar-input-icon" />
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

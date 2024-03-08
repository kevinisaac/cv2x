import React, { useState, useEffect, useContext } from 'react';

import { LanguageContext, trl } from 'src';
import { Icon, Modal } from 'src/components';
import { useModal, useToggle } from 'src/hooks';
import moment from 'moment';


export default function Calendar(props) {
    const [ currentDate ] = useState(moment()); //TODO: Before deployment
    // const [ selectedDate, setSelectedDate ] = useState(null);
    // + 1 to be compatible with moment JS
    // const [ displayMonth, setDisplayMonth ] = useState(getCurrentMonth('M'));
    // const [ displayYear, setDisplayYear ] = useState(moment(props.value).year());

    let disMonth, disYear;
    if (props.value) {
        disMonth = moment(props.value).month() + 1;
        disYear = moment(props.value).year();
    } else {
        disMonth = getCurrentMonth('M');
        disYear = getCurrentYear();
    }

    const [ displayMonth, setDisplayMonth ] = useState(disMonth);
    const [ displayYear, setDisplayYear ] = useState(disYear);

    function getFirstDayOfDisplayMonth() {
        let yearMonth = `${displayMonth}-${displayYear}`;
        let firstDay = moment(yearMonth, 'M-Y').startOf('month').format('d');

        return firstDay;
    }

    function getDaysOfDisplayMonth() {
        let yearMonth = `${displayMonth}-${displayYear}`;
        let days = moment(yearMonth, 'M-Y').daysInMonth();

        return days;
    }

    // function getCurrentDay() {
    //     return parseInt(currentDate.format('D'));
    // }

    function getCurrentMonth(format='MMMM') {
        if (format === 'M') {
            return parseInt(currentDate.format('M'))
        }

        return currentDate.format(format);
    }

    function getCurrentYear() {
        return parseInt(currentDate.format('YYYY'));
    }

    function goToNextMonth() {
        // console.log('Going to next month..');
        if (displayMonth === 12) {
            // Increment year
            setDisplayYear(displayYear => displayYear + 1);

            // Reset to the first month
            setDisplayMonth(1);
        } else {
            setDisplayMonth(displayMonth => displayMonth + 1);
        }
    }

    function goToPreviousMonth() {
        // console.log('Going to previous month..');
        if (displayMonth === 1) {
            // Decrement year
            setDisplayYear(displayYear => displayYear - 1);

            // Set to the last month
            setDisplayMonth(12);
        } else {
            setDisplayMonth(displayMonth => displayMonth - 1);
        }
    }

    function goToNextYear() {
        console.log('Going to next year..');
        setDisplayYear(displayYear => displayYear + 1);
    }

    function goToPreviousYear() {
        console.log('Going to previous year..');
        setDisplayYear(displayYear => displayYear - 1);
    }

    function goToCurrentMonth() {
        // console.log('Going to current month..');
    }

    function getLastDayOfPreviousMonth() {
        let month, year;
        if (displayMonth === 1) {
            // Decrement year
            year = displayYear - 1;

            // Set to the last month
            month = 12;
        } else {
            year = displayYear;
            month = displayMonth - 1;
        }

        let yearMonth = `${month}-${year}`;
        return moment(yearMonth, 'M-Y').endOf('month');
    }

    function onYearClick(year) {
        setDisplayYear(year);

        console.log('Typeof', typeof props.selectedDate);
        let selectedDate;
        if (typeof props.selectedDate === 'string') {
            selectedDate = moment(props.selectedDate, 'YYYY-MM-DD').year(year);
        } else {
            selectedDate = props.selectedDate.clone().year(year);
        }

        props.setEnteredDate(moment(props.readableDate, 'DD/MM/YYYY').year(year));
        props.setSelectedDate(selectedDate);
    }

    function onMonthClick(month) {
        setDisplayMonth(month + 1);

        let selectedDate;
        if (typeof props.selectedDate === 'string') {
            selectedDate = moment(props.selectedDate, 'YYYY-MM-DD').month(month);
        } else {
            selectedDate = props.selectedDate.clone().month(month);
        }

        props.setEnteredDate(moment(props.readableDate, 'DD/MM/YYYY').month(month));
        props.setSelectedDate(selectedDate);
    }

    function onDateClick(e) {
        console.log('Date click..');

        let dateString;
        if (e.target.classList.contains('calendar-day')) {
            dateString = e.target.dataset.datestring;
        } else if (e.target.closest('.calendar-day')) {
            dateString = e.target.closest('.calendar-day').dataset.datestring;
        }
        let clickedDate = moment(dateString, 'YYYY-MM-DD');

        let readableDate = moment(dateString, 'YYYY-MM-DD').format('DD/MM/YYYY');
        props.setEnteredDate(readableDate);
        props.setSelectedDate(clickedDate);
        console.log('Set selected date..', readableDate, clickedDate);
        if (e.target.classList.contains('calendar-day')) {
            e.target.classList.add('selected-day')
        } else if (e.target.closest('.calendar-day')) {
            e.target.closest('.calendar-day').classList.add('selected-day')
        }
        // console.log(clickedDate, props.selectedDate);
        // if (clickedDate.isSame(props.selectedDate, 'date')) {
            // console.log('Toggling selection..');
            // e.target.classList.remove('selected-day')
            // props.setSelectedDate(null);
        // }

        // props.onChange(e);
    }

    function onDateUpdate(e) {
        console.log('New value is', e.target.value);
        props.setEnteredDate(e.target.value);
    }

    function onTimeUpdate(e) {
        console.log('New value is', e.target.value);
        props.setEnteredTime(e.target.value);
    }

    // console.log(dateObject);
    // console.log(this.firstDayOfMonth());

    // Store blank days in array
    let blanks = [];
    for (let i = 0; i < getFirstDayOfDisplayMonth(); i++) {
        blanks.push(
            <td className='calendar-body-data calendar-day empty'
                key={`blank${i}`}   // To remove the annoying warning
            ></td>
        );
    }

    // Store actual days in array
    let daysInMonth = [];
    for (var d = 1; d <= getDaysOfDisplayMonth(); d++) {
        // console.log(getCurrentMonth(), getCurrentMonth('MMMM'), displayYear, getCurrentDay(), d);
        // console.log(d, displayMonth, displayYear);

        let displayingDate = moment({
            date: d,
            month: displayMonth - 1,  // Since it is zero-indexed
            year: displayYear,
        });
        let currentDay = '';
        if (displayingDate.isSame(currentDate, 'day')) {
            // To highlight the current day
            // currentDay = 'today';
        }

        let selectedDay = '';
        if (displayingDate.isSame(props.selectedDate, 'day')) {
            // To highlight the selected day
            selectedDay = 'selected-day';
        }

        let disabled = '';
        if (props.disableBefore && displayingDate.isBefore(props.disableBefore, 'day')) {
            disabled = 'disabled';
        }
        if (props.disableAfter && displayingDate.isAfter(props.disableAfter, 'day')) {
            disabled = 'disabled';
        }

        const dateString = displayingDate.format('YYYY-MM-DD');

        daysInMonth.push(
            <td key={d}
                data-datestring={dateString}
                // Removing ${currentDay} from the classname
                className={`calendar-body-data calendar-day ${selectedDay} ${disabled}`}
                onClick={e => {
                    //Initially onDateClick function was used in conjunction with 'Set' button
                    //Commention out below code to enable single click save
                    onDateClick(e);

                    //Below code optional so that it will be executed only for DateField
                    //and not for DateFilter. DateFilter need enteredInput update
                    //
                    //TODO: We could remove dependency on DateFilter by passing the actions
                    //inside useEffect of DateFilter as an onChange function
                    if (props.onChange) {
                        props.onChange(e);
                        props.setCalendarVisible(false);
                    }
                }}
                // No need to go all the way down to set the value
                onDoubleClick={e => {
                    props.onChange(e);
                    props.setCalendarVisible(false);
                }}
                // onClick={props.onDayClick}
            >
                <div className='day-wrapper'>
                    {d}
                </div>
                {/* <div className='day-number'>{d}</div> */}
            </td>
        );
    }

    // Constructing array of arrays
    let totalSlots = [...blanks, ...daysInMonth];
    let rows = [];
    let cells = [];
    totalSlots.forEach((slot, i) => {
        if (i % 7 !== 0) {
            cells.push(slot);
        } else {
            // Clear out row and start from day 1
            if (cells.length !== 0) {
                rows.push(cells);
            }
            cells = [];
            cells.push(slot);
        }

        // If last item, add the remaining cells as a row
        if (i === totalSlots.length - 1) {
            rows.push(cells);
        }
    });

    // console.log(rows);
    daysInMonth = rows.map((row, i) => {
        return (<tr key={i} className='calendar-body-row'>
            {row}
        </tr>);
    });

    return <div className={`calendar${' ' + props.className}`} style={props.style}>
        <div className='date-header'>
            {/* Date field */}
            <input type='text'
                style={{display: 'none'}}
                className='date-input'
                placeholder='dd/mm/yyyy'
                value={props.enteredDate}
                onChange={onDateUpdate}
            />

            {/* Time field */}
            {props.datetime && <input type='text'
                className='time-input'
                placeholder='Eg: 10:30 AM'
                value={props.enteredTime}
                onChange={onTimeUpdate}
            />}
        </div>

        <table className='calendar-table'>
            <thead className='calendar-header'>
                <MonthYearHeader
                    // month={getCurrentMonth()}
                    month={moment.months(displayMonth - 1)} // Moment uses zero index
                    monthIndex={displayMonth - 1}
                    // year={getCurrentYear()}
                    year={displayYear}
                    goToNextMonth={goToNextMonth}
                    goToPreviousMonth={goToPreviousMonth}
                    goToNextYear={goToNextYear}
                    goToPreviousYear={goToPreviousYear}
                    disableBefore={props.disableBefore}
                    getLastDayOfPreviousMonth={getLastDayOfPreviousMonth}
                    onYearClick={onYearClick}
                    onMonthClick={onMonthClick}
                    onChange={props.onChange}
                />
                <WeeksRow />
            </thead>
            <tbody className='calendar-body'>
                {daysInMonth}
            </tbody>
        </table>

        <div className='date-footer'>
            <input type='button'
                className='calendar-control-button clear-button'
                value='Clear'
                onClick={(e) => {
                    props.onChange(e);
                    props.setCalendarVisible(false);
                }}
            />
            {/* <input type='button' */}
            {/*     className='calendar-control-button set-button' */}
            {/*     value='Set' */}
            {/*     onClick={(e) => { */}
            {/*         props.onChange(e); */}
            {/*         props.setCalendarVisible(false); */}
            {/*     }} */}
            {/* /> */}
        </div>
    </div>
}

function WeeksRow() {
    const stringWeekDays = moment.weekdaysMin();

    const weekDays = stringWeekDays.map(stringWeekDay => <th
        key={stringWeekDay}
        className='week-day calendar-header-data'
    >
        {stringWeekDay[0]}
    </th>);

    return <tr className='calendar-header-row weeks-row'>
        {weekDays}
    </tr>
}

function MonthYearHeader(props) {
    const [ displayMonths, toggleDisplayMonths, setDisplayMonths ] = useToggle(false);
    const [ displayYears, toggleDisplayYears, setDisplayYears ] = useToggle(false);

    // console.log(moment.months());
    const months = moment.months().map((month, index)=> <li
        key={month}
        value={index}
        className='calendar-month-item'
        onClick={e => {
            props.onMonthClick(index);
            toggleDisplayMonths();
            if (props.onChange) {
                props.onChange(e);
            }
        }}
    >
            {month}
        </li>
    );


    const startYear = 1920;
    const endYear = moment().year();
    const yearList = Array(endYear - startYear + 1).fill().map((_, idx) => startYear + idx);
    const years = yearList.map(year => <li
        key={year}
        value={year}
        className='calendar-year-item'
        onClick={e => {
            props.onYearClick(year);
            toggleDisplayYears();
            if (props.onChange) {
                props.onChange(e);
            }
        }}
    >
        {year}
    </li>);

    return <tr className='calendar-header-row controls-row'>
        <td className={`calendar-header-data arrow-cell ${props.disableBefore && props.year == moment(props.disableBefore).year() ? 'disabled' : ''}`}
            onClick={props.goToPreviousYear}
        >
            <div className='control-data arrow'>
                <Icon path='year-left-arrow.svg'
                    className='control-data arrow-icon'
                    width={14}
                    height={12}
                />
            </div>
        </td>
        <td className={`calendar-header-data arrow-cell ${props.disableBefore && props.getLastDayOfPreviousMonth().isBefore(props.disableBefore, 'day') ? 'disabled' : ''}`}
            onClick={props.goToPreviousMonth}
        >
            <div className='control-data arrow'>
                {/* <Icon path='month-left-arrow.svg' className='control-data arrow-icon' size={8} /> */}
                <Icon path='month-left-arrow.svg'
                    className='control-data arrow-icon'
                    width={7}
                    height={12}
                />
            </div>
        </td>
        <td colSpan='3' className='calendar-header-data month-year-cell'>
            <div className='control-data month-year'>
                <span className='month-wrapper'>
                    <span className='selected-month' onClick={toggleDisplayMonths}>
                        {props.month}
                    </span>
                    {displayMonths && <ul className='calendar-months-list'>
                        {months}
                    </ul>}
                </span>
                <span className='year-wrapper'>
                    <span className='selected-year' onClick={toggleDisplayYears}>
                        {props.year}
                    </span>
                    {displayYears && <ul className='calendar-years-list'>
                        {years}
                    </ul>}
                </span>
            </div>
        </td>
        <td onClick={props.goToNextMonth} className='calendar-header-data arrow-cell'>
            <div className='control-data arrow'>
                {/* <Icon path='month-right-arrow.svg' className='control-data arrow-icon' size={8} /> */}
                <Icon path='month-right-arrow.svg'
                    className='control-data arrow-icon'
                    width={7}
                    height={12}
                />
            </div>
        </td>
        <td onClick={props.goToNextYear} className='calendar-header-data arrow-cell'>
            <div className='control-data arrow'>
                <Icon path='year-right-arrow.svg'
                    className='control-data arrow-icon'
                    width={14}
                    height={12}
                />
            </div>
        </td>
    </tr>
}


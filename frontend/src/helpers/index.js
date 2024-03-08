import React, { useState, useEffect } from 'react';
import { lang } from 'src';

import request from './request';
import { getDetailsPageBarChartWidth } from './sunassist';

import escapeHtml from 'escape-html';
import moment from 'moment';
// import { getFullName } from './application';


// const request = new Service();
// const request = Service;

// Without language header - used if all fields from db are returned
// as they are, without language modification. Mostly used in retrieving
// for update forms where all fields are required to be updated by user
// const requestNoLang = new Service(null);
// const requestNoLang = Service;

// Access property of objects by string path
// optionally containing dots to denote nested paths
//
// If the third argument is present, assign it to the key
// and return the object
const byString = function (object, string, value, forceUseValue=false) {
    // console.log('ByString called..');
    // Return `undefined` if not a string
    try {
        string = string.replace(/\[(\w+)\]/g, '.$1'); // convert indexes to properties
        string = string.replace(/^\./, '');           // strip a leading dot
    } catch (TypeError) {
        return undefined;
    }

    var nestedKeys = string.split('.');
    // console.log(nestedKeys);
    for (var i = 0, n = nestedKeys.length; i < n; ++i) {
        var key = nestedKeys[i].replace(/\%/, '.');  // To allow for keys with dots in them

        string = string.replace(/^\./, '');           // strip a leading dot

        // If the key represents an array index
        if (!isNaN(key)) {
            key = parseInt(key);
        }

        if (
            (object !== null && key in object) ||
            (Array.isArray(object) && key <= object.length  // To allow assignment of index `0` to empty array
            )
        ) {
            if (value !== undefined && i + 1 === nestedKeys.length) {
                object[key] = value;
            } else if (forceUseValue && i + 1 === nestedKeys.length) {
                object[key] = value;
            } else {
                object = object[key];
            }
        } else {
            return undefined;
        }
    }

    return object;
}

//To find value inside object when a string passed, returns null if no value exists
const getNestedValue = function (object, string) {
    // Convert array index references to property references and remove leading dots.
    // If the string is not valid, return null.
    try {
        string = string.replace(/\[(\w+)\]/g, '.$1');
        string = string.replace(/^\./, '');
    } catch (TypeError) {
        return null;
    }

    // Split the string into an array of nested keys.
    const nestedKeys = string.split('.');
    // Initialize currentValue to the input object.
    let currentValue = object;

    // Iterate through the nested keys.
    for (let i = 0, n = nestedKeys.length; i < n; ++i) {
        // Replace '%' with '.' to allow for keys with dots in them.
        let key = nestedKeys[i].replace(/\%/, '.');

        // Convert the key to an integer if it represents an array index.
        if (!isNaN(key)) {
            key = parseInt(key);
        }

        // Check if the key exists in currentValue or if currentValue is an array and the key is within its range.
        // If so, update currentValue to the value of the current key.
        // Otherwise, return null.
        if (
            (currentValue !== null && key in currentValue) ||
            (Array.isArray(currentValue) && key <= currentValue.length)
        ) {
            currentValue = currentValue[key];
        } else {
            return null;
        }
    }

    // Return the value of the nested property.
    return currentValue;
}

const isEmptyObject = function (obj) {
    if (Object.keys(obj).length === 0 && obj.constructor === Object) {
        return true;
    }
    return false;
}

function isEmpty(str) {
    return (!str || str.length === 0 );
}


// This function converts a list into a map ie. an object with
// the property specified as the key of each object.
const getMap = function(list, property, asArray=false, modifyKey=key => key, valueProperty=null) {
    /* If `asArray` is set to `true`, each property has an array */
    /* If `valueProperty` is set, only that property's value is considered, instead
     * of the whole object. */

    let map = {};
    let key;
    list.map((item) => {
        key = modifyKey(item[property]);


        if (asArray) {
            if (!map.hasOwnProperty(key)) {
                map[key] = [];
            }

            if (valueProperty !== null) {
                map[key].push(item[valueProperty]);
            } else {
                map[key].push(item);
            }
        } else {
            if (valueProperty !== null) {
                // console.log(map, key);
                map[key] = item[valueProperty];
            } else {
                map[key] = item;
            }
        }
    });

    return map;
}


// This function converts an object into a query string
// Mostly used by the useFilter hook
const getQueryString = function(obj) {
    let queryString = '';
    for (var key in obj) {
        if (obj.hasOwnProperty(key)) {
            queryString += `${key}=${obj[key]}`;
        }

        queryString = queryString + '&';
    }

    if (queryString.length > 0) {
        queryString = queryString.slice(0, -1)
    }

    return queryString;
}


const toLower = function(str) {
    return str ? str.toLowerCase() : str;
}


const toUpper = function(str) {
    return str ? str.toUpperCase() : str;
}


// Gets object key value, by starts with wild card. This is usually used
// to dispay error messages in a form field, represented by a dictionary
// instead of a primitive value, but the error message sent
// by the server refers to a value inside that dictionary - used in
// createFunnelForm
const getByStartsWithKey = function(object, startsWith) {
    for (var key in object) {
        if (key.indexOf(startsWith) == 0) {
            return object[key];
        }
    }

    return undefined;
}


// Converts a list of items into Select suitable options
const getOptions = function(list, label='name', value='value',labelKey='name', idKey='value') {
    var options = list.map(item => {
        return {
            [labelKey]: item[label],
            [idKey]: item[value],
        }
    });

    return options;
}


// Converts a map (object) to a list
const getList = function(object, property1, property2) {
    var list = [];
    for (var fieldName in object) {
        if (object.hasOwnProperty(fieldName)) {
            list.push({
                [property1]: fieldName,
                [property2]: object[fieldName],
            });
        }
    }

    return list;
}


// Doesn't consider functions. Not sure if the order is also
// checked
const equal = function(object1, object2) {
    /*
     * Added while implenting infinite scroll.
     *To replace circular objects(Removes TypeError: cyclic object value)
     */
    const getCircularReplacer = () => {
      const seen = new WeakSet();
      return (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (seen.has(value)) {
            return;
          }
          seen.add(value);
        }
        return value;
      };
    };

    return JSON.stringify(object1, getCircularReplacer()) === JSON.stringify(object2, getCircularReplacer());
}


// Generates JSON object copy - doesn't copy functions
const copy = function(obj) {
    return JSON.parse(JSON.stringify( obj, (key, value) => typeof(value) === 'bigint'
        ? value.toString() : value)
    );
}


const format = function(string, ...args) {
    var i = 0;
    return string.replace(/{}/g, function () {
        return args[i] != null ? args[i++] : '';
        // return typeof args[i] != 'undefined' ? args[i++] : '';
    });
};


const getTime = function(originalTimeString) {
    let timeString;
    // Default hour and minute values
    let defaultHour = 10;
    let hour = defaultHour;
    let defaultMinute = 0;
    let minute = defaultMinute;
    let prefixUsed = '';    // 'AM' or 'PM' or ''

    // Trim out whitespace
    timeString = originalTimeString.trim();

    // Capitalize string
    timeString = timeString.toUpperCase();

    // Get rid of the am/pm prefixes and determine if a 12 hour offset is required
    let addOffset = false;
    if (timeString.includes('AM')) {
        prefixUsed = 'AM';
        let amPosition = timeString.indexOf('AM');
        timeString = timeString.substring(0, amPosition - 1);
    } else if (timeString.includes('PM')) {
        prefixUsed = 'PM';
        let pmPosition = timeString.indexOf('PM');
        timeString = timeString.substring(0, pmPosition - 1);
        addOffset = true;
    }

    // Get the hour and the minute from the string only if the string format is right
    if (timeString.includes(':')) {
        let hourStr = timeString.split(':')[0].trim();
        let minuteStr = timeString.split(':')[1].trim();

        if (/^\d+$/.test(hourStr) && /^\d+$/.test(minuteStr)) {
            hour = parseInt(hourStr);
            minute = parseInt(minuteStr);
        }
    } else {
        let hourStr = timeString.split(':')[0].trim();

        if (/^\d+$/.test(hourStr)) {
            hour = parseInt(hourStr);
        }
    }

    // Edge cases of 12 AM and 12 PM which translate to 00:00 and 12:00 respectively
    if (prefixUsed === 'AM' && hour === 12) {
        hour = 0;
    } else if (prefixUsed === 'PM' && hour === 12) {
        hour = 12;
    } else if (addOffset) {
        hour += 12;
    }

    if (hour > 24 || hour < 0 || minute > 60 || minute < 0) {
        hour = defaultHour;
        minute = defaultMinute;
    }

    // To prepend with `0` for single digit integers
    // https://stackoverflow.com/questions/8043026/how-to-format-numbers-by-prepending-0
    let doubleDigitHourString = ('0' + hour).slice(-2);
    let doubleDigitMinuteString = ('0' + minute).slice(-2);;

    return `${doubleDigitHourString}:${doubleDigitMinuteString}`;
}


// Function to remove null values
// Uses recursion
const removeEmptyKeys = function(obj, emptyValues=[null], ignoreKeysList=[]) {
    obj = copy(obj);

    const shouldRemoveEmptyObjects = emptyValues.some(val => JSON.stringify(val) === '{}');
    const shouldRemoveEmptyArrays = emptyValues.some(val => JSON.stringify(val) === '[]');

    for (var key in obj) {
        if (ignoreKeysList.includes(key)) {
            continue;
        }

        if (emptyValues.includes(obj[key])) {
            delete obj[key];
        } else if (typeof obj[key] === 'object') {
            // console.log('Object loop START', key);
            obj[key] = removeEmptyKeys(obj[key], emptyValues, ignoreKeysList);

            // console.log('Object loop', key, obj[key]);

            if ((shouldRemoveEmptyArrays && Array.isArray(obj[key])) && obj[key].length === 0) {
                // console.log('InsideArrayRemove', key, obj[key]);
                delete obj[key];
            } else if (shouldRemoveEmptyObjects && Object.keys(obj[key]).length === 0) {
                // console.log('InsideObjectRemove',key, obj[key]);
                delete obj[key];
            }
            // console.log('Object loop :: END', key, obj[key]);
        }
    }

    return obj;
}


const getRandomString = function() {
    return Math.random().toString(36).substring(7);
}


const numFormat = function(number, currency, decimalPlaces=2, language, locale) {
    if (!language) {
        language = lang;
    }

    if (!locale) {
        switch (language) {
            case 'it':
                locale = 'it-IT';
                break;
            default:
                locale = 'en-US';
        }
    }

    return new Intl.NumberFormat(
        locale,
        {
            style: currency ? 'currency' : undefined,
            currency: currency,
            // maximumSignificantDigits: 1,
            minimumFractionDigits: decimalPlaces,
        }
    ).format(number);
}


// The cookie functions are shamelessly copied from w3schools
const setCookie = function (cname, cvalue, exdays) {
    let d = new Date();
    d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));

    let expires = "expires="+d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
}


const getCookie = function (cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            return c.substring(name.length, c.length);
        }
    }
    return "";
}


// Copied from StackOverflow
const ancestorHasClass = function(element, classname) {
    if (!element.parentNode) {
        return false;
    }

    // If the current node has the class return true, otherwise we will search
    // it in the parent node
    if (element.className.split(' ').indexOf(classname)>=0) {
        return true;
    }

    return ancestorHasClass(element.parentNode, classname);
}


const ancestorHasID = function(element, id) {
    if (!element.parentNode) {
        return false;
    }

    // If the current node has the class return true, otherwise we will search
    // it in the parent node
    if (element.id === id) {
        return true;
    }

    return ancestorHasID(element.parentNode, id);
}


const getFullName = function(firstName, lastName) {
    let fullName;

    if (firstName && lastName) {
        fullName = `${firstName} ${lastName}`;
    } else if (firstName) {
        fullName = firstName;
    } else if (lastName) {
        fullName = lastName;
    } else {
        fullName = '';
    }

    return fullName;
}

const isJson = (str) => {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

const getRandomInt = (min, max) => {
    // min and max are inclusive
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random

    min = Math.ceil(min);
    max = Math.floor(max) + 1;

    return Math.floor(Math.random() * (max - min) + min);
}

const getRandomBool = (trueProbability=0.5) => {
    // trueProbability is a decimal between 0 and 1
    return Math.random() < trueProbability;
}

function copyToClipboard(text, successMessage='Copied to clipboard') {
    try {
        navigator.clipboard.writeText(text);
        console.log(successMessage);
    } catch (e) {
        console.error('Unable to copy to clipboard');
    }
}

function isElementHidden(element) {
    /*
        This function tests whether the element is visible.
        This might have problems with position: fixed.
    */
    return (element.offsetParent === null)
}

function getDayLabel(date,
    requiredDateFormat='DD-MM-YYYY',
    currentDateFormat='YYYY-MM-DD',
    exceptionLabel='Not Available',
    showOnlyDate=false
) {
    /*
        Function expects a moment date object in the format
        example: requiredDateFormat = 'DD - MMM - YYYY'
    */
    let dayLabel = '';

    if (requiredDateFormat === null || requiredDateFormat === undefined) {
        console.warn(`requiredDateForm is '${requiredDateFormat}' in getDayLabel()`)
        requiredDateFormat = 'DD-MM-YYYY';
    }

    //Convert to moment if in string
    date = date instanceof moment
        ? date
        : typeof date === 'string'
            ? moment(date, currentDateFormat)
            : 'Invalid Date Format'
    ;

    if (date === 'Invalid Date Format') {
        return <span className='data-not-available'>{exceptionLabel}</span>;
    }

    //TODO: Temporary code. Should improve code
    if (!showOnlyDate) {
        if (date.isSame(moment(), 'day')) {
            dayLabel = 'Today';
        } else if (moment().subtract(1, 'days').isSame(date, 'day')) {
            dayLabel = 'Yesterday';
        }  else if (moment().add(1, 'days').isSame(date, 'day')) {
            dayLabel = 'Tomorrow';
        } else  {
            dayLabel = date.format(requiredDateFormat);
        }
    } else {
        dayLabel = date.format(requiredDateFormat);
    }

    return dayLabel;
}

function isBetweenTime(pStartTime, pEndTime, checkTime) {
    /*
        Note: Since this is between function the result
        is true only if the passed time is between startTime and endTime.
        Will return false in case if the checkTime is equal to either startTime or endTime
    */
    // checkTime can be passed or not passed. Will work either way
    let cTime = !checkTime ? moment() : moment(checkTime, "HH:mm a");
    let startTime = moment(pStartTime, "HH:mm a");
    let endTime = moment(pEndTime, "HH:mm a");

    if (startTime.hour() >=12 && endTime.hour() <=12 )
    {
        endTime.add(1, "days");       // handle spanning days
    }

    let isBetween = cTime.isBetween(startTime, endTime);

    return isBetween;
}

function getGenderLabel(gender) {
    if (gender === 'male') {
        return 'Male';
    } else if (gender === 'female') {
        return 'Female';
    } else if (gender === 'other' ) {
        return 'Other';
    }
}

function getAge(dob) {
    //Convert to moment if in string
    dob = dob instanceof moment
        ? dob
        : typeof dob === 'string'
            ? moment(dob, 'YYYY-MM-DD')
            : 'Invalid Date Format'
    ;

    return moment().diff(dob, 'years');
}

/*
 * This function checks if only a single attribute has changed between two URLSearchParams.
 */
function isSingleURLParamChanged(urlParams1, urlParams2) {
    const keys1 = Array.from(urlParams1.keys());
    const keys2 = Array.from(urlParams2.keys());

    const diffKeysCount = Math.abs(keys1.length - keys2.length);

    if (diffKeysCount > 1) {
        return false;
    }

    let changedParamsCount = 0;

    for (const key of keys1) {
        if (!keys2.includes(key)) {
            changedParamsCount += 1;
        } else if (urlParams1.get(key) !== urlParams2.get(key)) {
            changedParamsCount += 1;
        }

        if (changedParamsCount > 1) {
            return false;
        }
    }

    for (const key of keys2) {
        if (!keys1.includes(key)) {
            changedParamsCount += 1;
        }

        if (changedParamsCount > 1) {
            return false;
        }
    }

    return changedParamsCount === 1;
}

function hhmmToDuration(hhmm) {
    // Split the input string into hours and minutes
    const [hours, minutes] = hhmm.split(':').map(Number);

    // Create a Moment.js duration object from the hours and minutes
    const duration = moment.duration({
        hours: hours,
        minutes: minutes
    });

    return duration;
}

function minutesToHHMM(minutes) {
    // Create a Moment.js duration object from the given minutes
    const duration = moment.duration(minutes, 'minutes');

    // Get hours and minutes from the duration object
    const hours = Math.floor(duration.asHours());
    const remainingMinutes = duration.minutes();

    // Format the hours and minutes as HH:MM
    const hhmm = `${hours.toString().padStart(2, '0')}:${remainingMinutes.toString().padStart(2, '0')}`;

    return hhmm;
}

function sortListByTime(inputList, name) {
    // Sort the input list based on the given parameter 'name'
    inputList.sort((a, b) => {
        if (a[name] < b[name]) {
            return -1;
        }
        if (a[name] > b[name]) {
            return 1;
        }
        return 0;
    });

    return inputList;
}
const typeOf = o => Object.prototype.toString.call(o);

const isObject = o => o !== null && !Array.isArray(o) && typeOf(o).split(" ")[1].slice(0, -1) === "Object";

const isPrimitive = o => {
    switch (typeof o) {
        case "object": {
            if (o === null || o === undefined) {
                return true;
            }
            return false;
        }
        case "function": {
            return false;
        }
        default: {
            return true;
        }
    }
}

const getChanges = (previous, current) => {
    // console.log('$$ \n GETCHANGE :: START\n', previous, current);
    // https://stackoverflow.com/a/38277505/4667164

    if (isPrimitive(previous) && isPrimitive(current)) {
        if (previous === current) {
            return 'no-change';
        }

        return current;
    }

    // console.log('$$ Object', previous, current, isObject(previous), isObject(current));
    if (isObject(previous) && isObject(current)) {
        // console.log('$$Inside Object', previous, current);
        let keys = Object.keys(current);

        let diff = {};
        for (let key of keys) {
            //Check if the values is Array and then ignore
            //TODO: Current expectancy is value of key in both previous and current will be same
            //need to handle the same in the future.

            //If key is not existing in the previous object, add it as a difference
            if (previous[key] === undefined) {
                diff[key] = current[key];
                continue;
            }

            //TODO: For arrays temporarily returning the value. Should add better comparison logic
            if (Array.isArray(current[key])) {
                diff[key] =  current[key];
            } else {
                let value = getChanges(previous[key], current[key]);

                if (value !== 'no-change') {
                    //To delete value if it's a empty array
                    //TODO: How to handle empty objects
                    if (!(JSON.stringify(value) === '{}')) {
                        diff[key] = value;
                    }
                }
            }
        }

        return diff;
    }
}

function getQuadrant(element) {
    // Get viewport dimensions and center of the screen
    let viewportWidth = window.innerWidth;
    let viewportHeight = window.innerHeight;
    let centerX = viewportWidth / 2;
    let centerY = viewportHeight / 2;

    // Get element's bounding rectangle and center of element
    let rect = element.getBoundingClientRect();
    // Get scrollable parent's scrollTop and scrollLeft
    var scrollableParent = element.closest('.journey-calendar');
    var scrollTop = scrollableParent ? scrollableParent.scrollTop : 0;
    var scrollLeft = scrollableParent ? scrollableParent.scrollLeft : 0;

    // Get center of element (accounting for scroll offset if element is inside a scrollable element)
    var elementCenterX = rect.left + scrollLeft + rect.width / 2;
    var elementCenterY = rect.top + scrollTop + rect.height / 2;

    // Determine in which quadrant the center of the element lies
    if (elementCenterY < centerY) {
        // Upper half - Right half: Quadrant 1, Left half: Quadrant 2
        return elementCenterX > centerX ? 1 : 2;
    } else {
        // Lower half -  Right half: Quadrant 4, Left half: Quadrant 3
        return elementCenterX > centerX ? 4 : 3;
    }
}

function formatTime(value, timeFormat='HH:mm') {
    timeFormat = timeFormat ?? 'HH:mm';

    return moment(value, 'HH:mm').isValid()
        ? moment(value, 'HH:mm').format(timeFormat)
        : 'Invalid Time'
}

function openURLInNewTab(e, url, addHTTPS=true) {
    e.stopPropagation();
    let urlFinal = url;
    if (addHTTPS) {
        urlFinal = 'https://' + url;
    }
    window.open(urlFinal, '_blank', 'noopener,noreferrer');
}

function archiveRecord(id, recordURLRouteName, name='record', alert_, navigate,) {
    // const alert_ = useAlert();

    let requestPayload = {
        data: {
            'status': 'archived',
        }
    }
    request.patch(`${recordURLRouteName}/${id}`, requestPayload)
        .then(([status_, response]) => {
            navigate(`/${recordURLRouteName}`);
            if (response.message) {
                alert_.success(response.message);
            } else {
                alert_.success(`${name.charAt(0).toUpperCase() + str.slice(1)} archived`);
            }
        })
        .catch(([errorStatus, response]) => {
            if (response.message) {
                alert_.error(response.message);
            } else {
                alert_.error(`Unable to archive ${name}. Contact administrator.`);
            }
        })
    ;
}

function unArchiveRecord(id, recordURLRouteName, name='record', alert_) {
    // const alert_ = useAlert();

    let requestPayload = {
        data: {
            'status': 'active',
        }
    }
    request.patch(`${recordURLRouteName}/${id}`, requestPayload)
        .then(([status_, response]) => {
            navigate(`/${recordURLRouteName}`);
            if (response.message) {
                alert_.success(response.message);
            } else {
                alert_.success(`${name.charAt(0).toUpperCase() + name.slice(1)} unarchived`);
            }
        })
        .catch(([errorStatus, response]) => {
            if (response.message) {
                alert_.error(response.message);
            } else {
                alert_.error('Unable to unarchive. Contact administrator.');
            }
        })
    ;
}

function deleteRecord(id, recordURLRouteName, name='record', alert_, navigate,) {
    // const alert_ = useAlert();

    request.delete(`${recordURLRouteName}/${id}`)
        .then(([status_, response]) => {
            navigate(`/${recordURLRouteName}`);
            if (response.message) {
                alert_.success(response.message);
            } else {
                alert_.success(`${name.charAt(0).toUpperCase() + name.slice(1)} deleted`);
            }
        })
        .catch(([errorStatus, response]) => {
            if (response.message) {
                alert_.error(response.message);
            } else {
                alert_.error('Unable to delete. Please try again');
            }
        })
    ;
}

function formatAmount(amount) {
    function format(value, divisor, suffix) {
        let formattedNumber = value / divisor;
        // Check if the decimal part is non-zero, then format accordingly
        return formattedNumber % 1 !== 0
          ? formattedNumber.toFixed(1) + suffix
          : Math.floor(formattedNumber) + suffix;
    }

    if (amount < 1e3) {
        return amount.toString(); // Less than a thousand
    } else if (amount < 1e6) {
        return format(amount, 1e3, 'K'); // Thousands
    } else if (amount < 1e9) {
        return format(amount, 1e6, 'M'); // Millions
    } else {
        return format(amount, 1e9, 'B'); // Billions
    }
}

export {
    getAge,
    getMap,
    getList,
    getTime,
    getChanges,
    getOptions,
    getFullName,
    getDayLabel,
    getRandomInt,
    getRandomBool,
    hhmmToDuration,
    minutesToHHMM,
    getQueryString,
    getGenderLabel,
    getRandomString,
    getByStartsWithKey,

    copy,
    equal,
    format,
    formatTime,
    formatAmount,
    byString,
    isEmpty,
    isEmptyObject,
    getNestedValue,
    removeEmptyKeys,
    isSingleURLParamChanged,

    toLower,
    toUpper,
    numFormat,
    isJson,
    isBetweenTime,

    // Re-exports
    request,
    // requestNoLang,
    getDetailsPageBarChartWidth,

    // getFullName,
    setCookie,
    getCookie,
    ancestorHasID,
    ancestorHasClass,

    getQuadrant,
    copyToClipboard,
    isElementHidden,
    openURLInNewTab,

    deleteRecord,
    archiveRecord,
    unArchiveRecord,
}

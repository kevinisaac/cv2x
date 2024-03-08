import React, { useState, useEffect } from 'react';

import { byString, copy, getQueryString, removeEmptyKeys } from 'src/helpers';

import { useForm } from './';


export default function useFilter(initialData, updateCollection) {
    const [ filterData, setFilterData, onFilterInputChange ] = useForm(copy(initialData));
    const [ filterEnabled, setFilterEnabled ] = useState(true);

    function getFilterQueryString(filterData) {
        let data = copy(filterData);

        // Convert all composite filters to flat filters
        for (let key in data) {
            // Ugly way to check if type is dictionary (aka. key/value object)
            if (data.hasOwnProperty(key) && typeof data[key]==='object' && data[key]!==null) {
                // Quick way to detect if object is representing composite field
                if ('operator' in data[key]) {
                    if (data[key].operator === 'equals') {
                        // 1. Create flat key
                        let newKey = key;

                        // For some reason, the value is a list instead of a string
                        data[newKey] = data[key].value ? data[key].value[0] : null;
                    } else {
                        // 1. Create flat key
                        let newKey = `__${data[key].operator}__${key}`;
                        data[newKey] = data[key].value ? data[key].value[0] : null;

                        // 2. Delete original nested object
                        delete data[key];
                    }
                }
            }
        }

        // console.log('Original', removeEmptyKeys(data));
        // console.log('New', removeEmptyKeys(data, [null, '']));
        return getQueryString(removeEmptyKeys(data, [null, '']));
    }

    function applyFilter() {
        // console.log('Applying filters..');
        // Disable filter
        setFilterEnabled(false);

        // 1. Convert to query string
        let queryString = getFilterQueryString(filterData);
        // console.log('Query string:', queryString);

        // 2. Update collection
        updateCollection({queryString: queryString});

        // Enable filter
        setFilterEnabled(true);
    }

    function clearFilter() {
        console.log('Clear filters..:', initialData);
        // Disable filter
        setFilterEnabled(false);

        // 1. Reset query string
        let queryString = '';

        // 2. Update collection
        updateCollection({queryString: queryString});

        setFilterData(copy(initialData));

        // Enable filter
        setFilterEnabled(true);
    }

    // console.log('Use filter is called..');

    return [
        filterData,
        filterEnabled,
        getFilterQueryString,
        onFilterInputChange,
        applyFilter,
        clearFilter,
        setFilterData,
    ];
}


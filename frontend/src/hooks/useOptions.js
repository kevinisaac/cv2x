import React, { useState, useEffect, useContext } from 'react';

import { request } from 'src/helpers';


export default function useOptions(url, label='name', value='id', initialValue=[]) {
    // Can be used for
    //
    //
    const [ options, setOptions ] = useState(initialValue);

    useEffect(() => {
        request.get(url, (status_, data) => {
            let items = [];

            // Stacking the countries
            data.data.map(item => {
                items.push({
                    label: item[label],
                    value: item[value],
                });
            });

            // Setting the state
            setOptions(items);
        });
    }, []);

    return [ options, setOptions ];
}


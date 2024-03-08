import React, { useState, useEffect } from 'react';

import { request } from 'src/helpers';

export default function useRequestData(initialUrl, initialUrlParams={}) {
    const [ data, setData ] = useState();
    const [ url, setUrl ] = useState(initialUrl);
    const [ version, setVersion ] = useState(0);
    // const [ urlParams, setUrlParams ] = useState(initialUrlParams);

    useEffect(() => {
        if (url) {
            // if (urlParams) {
            //     let queryString = new URLSearchParams();
            // }

            request.get(url).then(
                ([status_, data]) => {
                    setData(data.data);
                }
            );
        } else {
            // Clear state when url is cleared
            setData(undefined);
        }
    }, [ url, version ]);

    function reload() {
        setVersion(Math.random());
    }


    return [ data, setUrl, reload ];
}

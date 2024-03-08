import React, { useState, useEffect } from 'react';

import { useElementVisibility } from 'src/hooks';
import { request, copy, getChanges, isSingleURLParamChanged} from 'src/helpers';



export default function useCollection(
    url,
    defaultQueryString='',
    addFakeColumns,
    postData=null,
    callback=null,
    infiniteScroll=true
) {
    //Setting infinte scroll to true for Sunassist(No tables with pageination)
    const [ collection, setCollection ] = useState({
        items: [],
        loaded: false,
        pagination: {
            current_page: null,
            standard_page_size: null,
            total_pages: null,
        },
        summary: {
            active_count: null,
        },
        url: url,
        queryString: defaultQueryString,
        searchParams: new URLSearchParams(defaultQueryString),
        postData: postData,
        version: 0.0,       // Used to force reload collection - Used Math.random()
    });

    const [ ref, isVisible ] = useElementVisibility();
    const [ lazyLoad, setLazyLoad ] = useState(false);
    // const [ resetPage, setResetPage ] = useState(false);

    let urlWithQueryString = collection.url;
    if (collection.queryString) {
        urlWithQueryString = `${collection.url}?${collection.queryString}`;
    }

    useEffect(() => {
        if (urlWithQueryString !== null) {
            if (collection.postData === null) {     // GET request

                request.get(urlWithQueryString)
                    .then(([status_, data]) => {
                        // console.log('Success..', status_, data);

                        //Code altered to add infinite scrolling
                        if (!infiniteScroll || lazyLoad === false) {

                            updateCollection({
                                items: addFakeColumns ? addFakeColumns(data.data) : data.data,
                                loaded: true,
                                // pagination: data.pagination || collection.pagination,
                                pagination: data.pagination || collection.pagination,
                                summary: data.summary || collection.summary,
                            })
                        } else {
                            setLazyLoad(false);
                            updateCollection(old => {
                                let items;
                                if (addFakeColumns) {
                                    items = addFakeColumns(data.data);
                                } else if (data.data) {
                                    items = [...old.items, ...data.data];
                                }

                                return {
                                    items: items,
                                    loaded: true,
                                    pagination: data.pagination || collection.pagination,
                                    summary: data.summary || collection.summary,
                                }
                            });
                        }

                        return data;
                    })
                    .catch(eData => {
                        console.log('Error..', eData);
                        // console.log('Error:', error);
                    })
                    .finally((a) => {
                        // console.log('Finally..', a);
                    })
            } else {
                //TODO: Update the postData code with new request object
                // POST request
                request.post(urlWithQueryString, collection.postData, (status_, data) => {
                    updateCollection({
                        items: addFakeColumns ? addFakeColumns(data.data) : data.data,
                        loaded: true,
                        pagination: data.pagination || collection.pagination,
                        summary: data.summary || collection.summary,
                    });

                    if (callback) {
                        callback(data.data);
                    }
                });
            }
        }

        return () => {
            // console.log('Running cleanup..');
        }
    }, [collection.url, collection.queryString, collection.postData, collection.version]);

    //Added for infinite scrolling
    useEffect(() => {
        // console.log('useCollection iVisible = ', isVisible, collection.pagination);
        if (infiniteScroll && isVisible) {
            let urlSearchParams = new URLSearchParams(collection.queryString);

            let currentPage =  collection.pagination.current_page;
            if (currentPage < collection.pagination.total_pages) {
                let nextPage = currentPage + 1;
                urlSearchParams.set('page', nextPage);

                setLazyLoad(true);
            }
            updateCollection({
                queryString: urlSearchParams.toString(),
            });
        }
    }, [isVisible]);

    function updateCollection(dictOrFunction) {
        setCollection(old => {
            let dict;
            if (typeof dictOrFunction === 'function') {
                dict = dictOrFunction(old);
            } else {
                dict = dictOrFunction;
            }

            // Set loaded state as false
            let loaded;
            if (typeof dict.loaded === 'boolean') {
                loaded = dict.loaded;
            } else if ((dict.url !== undefined && dict.url !== old.url)
                    || (dict.queryString !== undefined && dict.queryString !== old.queryString)
                    || (dict.postData !== undefined && !equal(dict.postData, old.postData))
                    || dict.reload) {
                loaded = false;
            } else {
                loaded = true;
            }

            let queryString = dict.queryString !== undefined
                ? dict.queryString
                : old.queryString;
            let searchParams = new URLSearchParams(queryString);

            let changes = getChanges(old.queryString, dict.queryString);
            // console.log('##changes', changes);

            let oldSearchParams = new URLSearchParams(old.queryString);
            let newSearchParams = new URLSearchParams(dict.queryString);
            let diffKey = findDifferingKeys(oldSearchParams, newSearchParams);
            // console.log('##diffKey', diffKey);

            if ( infiniteScroll
                && ((diffKey.length > 1)
                    || (diffKey.length === 1 && !diffKey.includes('page'))
                )
            ) {
                // console.log('Inside page reset');
                // setResetPage(true);
                let urlSearchParams = new URLSearchParams(queryString);
                let page = urlSearchParams.get('page');
                if (page) {
                    urlSearchParams.set('page', 1);
                }

                queryString = urlSearchParams.toString();
            } else if (infiniteScroll && (diffKey.length === 1 && diffKey.includes('page'))) {
                //New condition added to disable loading for infinite scrolling
                //Added here as lazyLoad was not getting updated in time
                loaded = true;
            }

            return {
                url: dict.url || old.url,
                items: dict.items || old.items,
                // items: items,
                loaded: loaded,
                pagination: dict.pagination || old.pagination,
                summary: dict.summary || old.summary,
                queryString: queryString,
                searchParams: searchParams,
                postData: dict.postData !== undefined ? dict.postData : old.postData,
                version: dict.reload ? Math.random() : old.version,
            };
        });
    }

    return [ collection, updateCollection, ref, isVisible ];
}

function findDifferingKeys(urlSearchParams1, urlSearchParams2) {
    // console.log('##Old', urlSearchParams1.toString(),'\n New:: ', urlSearchParams2.toString());
    const keys1 = [...urlSearchParams1.keys()];
    const keys2 = [...urlSearchParams2.keys()];

    // Find unique keys in each set of keys
    // const uniqueKeys1 = keys1.filter(key => !keys2.includes(key));
    const uniqueKeys2 = keys2.filter(key => !keys1.includes(key));

    // Find keys that have different values in both sets of keys
    const differingValueKeys = keys1
        .filter(key => keys2.includes(key))
        .filter(key => urlSearchParams1.get(key) !== urlSearchParams2.get(key));

    // Combine unique keys and differing value keys
    const differingKeys = [ ...uniqueKeys2, ...differingValueKeys];

    return differingKeys;
}


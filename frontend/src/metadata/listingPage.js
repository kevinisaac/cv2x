import React, { useState, useEffect, useRef, useContext} from 'react';
import { useNavigate } from 'react-router-dom';

import { MeContext } from 'src/contexts';
import {
    Icon,
    Table,
    Header,
    Sidebar,
    ContactCTA,
} from 'src/components';
import {
    PageTopRow,
} from 'src/components/outreachComponents';
import {
    useCollection,
    useRequestData,
} from 'src/hooks';
import {
    getDayLabel,
} from 'src/helpers';


export default function ListingView(props) {
    let navigate = useNavigate();
    const { me, setMe } = useContext(MeContext);
    const [ pageType, setPageType] = useState('active-listing');
    const [ columns, setColumns ]  = useState([
        // {
        //     name: 'Contract Date',
        //     id: 'contract_date',
        //     visible: true,
        //     sortable: 'backend',
        //     render: (row) => {
        //         return <div className='contract-date'>
        //            {getDayLabel(row.contract_expiry_date, me.preferred_date_format)}
        //         </div>
        //     }
        // },
    ]);

    // Download object type metadata
    const [ objectType ] = useRequestData(`/metadata_object_types/${props.metadata.metadata_object_type_details.id}`)
    useEffect(() => {
        if (objectType) {
            setColumns(objectType.metadata_fields_details.map(field => {
                return {
                    name: field.name,
                    id: field.field_token,
                    visible: true,
                }
            }))
        }
    }, [objectType])

    const [
        objectC,
        updateObjectC,
        objectRef,
        isObjectRefVisible
    ] = useCollection(
        props.metadata.metadata_object_type_details.plural_token,
        'status=active&page=1',
    );

    function onRowClick(e, index) {
        e.preventDefault();
        console.log('Inside Row  Click');
        // TODO
        navigate(`/offices/${objectC.items[index].id}`)
    }

    if (!objectType) {
        return <></>
    }

    console.log('^^^^', objectType);
    return <div id='main-grid'>
        <Header />
        <Sidebar />
        {/* TODO */}
        <div id='vehicles-view' className='app-content listing-view'>
            <PageTopRow
                title={pageType === 'archive-listing'
                    ? `Archived ${objectType.name}`
                    : `${objectType.name}`
                }
                buttonText={me.permissions_map?.create_vehicle ? `Add ${objectType.name}`: false}
                onButtonClick={() => {
                    navigate('/offices/create');
                }}
                type={pageType}
                setType={setPageType}
                moreOptions={[
                    {
                        icon: 'archived-record.svg',
                        label: `View Archived ${objectType.name}`,
                        onClick: () => {
                            setPageType('archive-listing');
                            // Function to load archived objects
                            let urlSearchParams
                                = new URLSearchParams(objectC.queryString);
                            urlSearchParams.set('status', 'archived');
                            updateObjectC({
                                queryString: urlSearchParams.toString(),
                            });
                        },
                    }
                ]}
                onBackClick={() => {
                    let urlSearchParams
                        = new URLSearchParams(objectC.queryString);
                    urlSearchParams.set('status', 'active');
                    updateObjectC({
                        queryString: urlSearchParams.toString(),
                    });
                }}
                searchAttributes={{
                    suggestionsURL: 'offices',
                    suggestionsParams: pageType === 'active-listing'
                        ? 'status=active' : 'status=archived',
                    suggestionData: {
                        topLeft: {
                            values: [
                                {
                                    name: 'name',
                                },
                            ],
                        },
                        topRight: {
                            disableHighlight: true,
                            valuesSeperator: ', ',
                            values: [
                                {
                                    name: 'inauguration_date',
                                    type: 'date',
                                    dateFormat: 'MMM DD, YYYY',
                                    disableHighlight: true,
                                },
                            ]
                        },
                        bottomLeft: {
                            disableHighlight: true,
                            values: [
                                {
                                    name: 'capacity',
                                },
                            ],
                        }
                    },
                    onSuggestionClick: (officeId) => {
                        navigate(`/offices/${officeId}`);
                    },
                    onMoreButtonClick: (qParam) => {
                        let urlSearchParams = new URLSearchParams(objectC.queryString);
                        console.log('On More Button Query String', objectC.queryString);
                        urlSearchParams.set('q', qParam);
                        updateOfficeC({
                            queryString: urlSearchParams.toString(),
                        });
                    },
                }}
                collection={objectC}
                updateCollection={updateObjectC}
            />
            <div className='page-content'>
                {me.permissions_map?.read_vehicles && <Table
                    className='vehicle-table row-link'
                    items={objectC.items}
                    columns={columns}
                    queryString={objectC.queryString}
                    controlColumns={[]}
                    loaded={objectC.loaded}
                    onRowClick={onRowClick}
                    tableEmptyText={pageType === 'archive-listing'
                        ? 'No archived offices'
                        : 'No offices added'
                    }
                    addNewRecordButtonText={pageType === 'archive-listing' ? undefined : 'Add Office'}
                    addNewRecordButtonURL='/offices/create'

                    collection={objectC}
                    updateCollection={updateObjectC}
                    reference={objectRef}

                    name='office'
                    setColumns={setColumns}
                    enableColumnPreference
                />}
            </div>
        </div>
    </div>
}


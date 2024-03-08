import React, { useState, useEffect, useContext } from 'react';
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
} from 'src/components/outreachComponents'

import {
    useCollection,
} from 'src/hooks';

import {
    getAge,
    getDayLabel,
    getGenderLabel,
} from 'src/helpers';
import moment from 'moment';

export default function DomainsView(props) {
    const params =  new URL(window.location).searchParams;
    let navigate = useNavigate();
    const { me, setMe } = useContext(MeContext);
    const [ pageType, setPageType] = useState(params.get('status') === 'archived'
        ? 'archive-listing'
        : 'active-listing'
    );
    const [ columns, setColumns ]  = useState([
        {
            name: 'Batch',
            id: 'id_batch',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='batch-details'>
                    {row.id_batch || <div className='data-not-available'>
                        Not available
                    </div>}
                </div>
            }
        },
        {
            name: 'Domain Name',
            id: 'name',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='domain-name'>
                    {row.name || <div className='data-not-available'>
                        Not available
                    </div>}
                </div>
            }
        },
        {
            name: 'HTTPS Enabled',
            id: 'is_https_enabled',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='is-https-enabled'>
                    {row.is_https_enabled
                        ? 'Yes'
                        : <div className='data-not-available'>No</div>
                    }
                </div>
            }
        },
        {
            name: 'Redirect To Main Domain',
            id: 'is_redirect',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='is-redirect'>
                    {row.is_redirected_to_main_domain
                        ? 'Yes'
                        : <div className='data-not-available'>No</div>
                    }
                </div>
            }
        },
        {
            name: 'SFP Setup',
            id: 'is_sfp_setup',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='is-sfp-setup'>
                    {row.is_spf_set_up
                        ? 'Yes'
                        : <div className='data-not-available'>No</div>
                    }
                </div>
            }
        },
        {
            name: 'DMARC Setup',
            id: 'is_dmarc_setup',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='is-dmarc-setup'>
                    {row.is_dmarc_set_up
                        ? 'Yes'
                        : <div className='data-not-available'>No</div>
                    }
                </div>
            }
        },
        {
            name: 'MX Setup',
            id: 'is_mx_setup',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='is-mx-setup'>
                    {row.is_mx_set_up
                        ? 'Yes'
                        : <div className='data-not-available'>No</div>
                    }
                </div>
            }
        },
        {
            name: 'MTA-STS DNS Setup',
            id: 'is_mta_sts_dns_setup',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='is-dns-setup'>
                    {row.is_mta_sts_dns_set_up
                        ? 'Yes'
                        : <div className='data-not-available'>No</div>
                    }
                </div>
            }
        },
        {
            name: 'Domain Score',
            id: 'domain_score',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='domain-score'>
                    {row.score || <div className='data-not-available'>
                        -
                    </div>}
                </div>
            }
        },
        {
            name: 'Bought On',
            id: 'bought_on',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='domain-bought-on'>
                    {row.bought_on
                        ? getDayLabel(row.bought_on, 'MMM DD, YYYY')
                        : <div className='data-not-available'>
                            Not available
                        </div>
                    }
                </div>
            }
        }
    ]);

    const [ domainC,
        updateDomainC,
        domainRef,
        isDomainRefVisible
    ] = useCollection(
        'domains',
        `status=${params.get('status')
            ? params.get('status')
            : 'active'}&page=1`
    );
    const [ mainClassName, setMainClassName] = useState(
        JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
        ? 'expanded-view'
        : ''
    );

    function onRowClick(e, index) {
        e.preventDefault();
        navigate(`/domains/${domainC.items[index].id}`)
    }

    useEffect(() => {
        console.log('@@Inside storage change useEffect');
        const handleStorageChange = (e) => {
            // if (e.key === 'preferences.sidebarCollapsed' && e.newValue !== e.oldValue) {
            if (e.key === 'preferences.sidebarCollapsed') {
                setMainClassName(JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
                    ? ' expanded-view'
                    : ''
                )
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    return <div id='main-grid' className={`${mainClassName}`}>
        <Header />
        <Sidebar />
        <div id='domains-view' className='app-content listing-view'>
            <PageTopRow
                title={pageType === 'archive-listing'
                    ? 'Archived Domains'
                    : 'Domains'
                }
                buttonText='Add Domain'
                onButtonClick={() => {
                    navigate('/domains/create');
                }}
                type={pageType}
                setType={setPageType}
                searchAttributes={{
                    suggestionsURL: 'domains',
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
                                    name: 'registration_date',
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
                                name: 'id',
                            },
                            ],
                        }
                    },
                    onSuggestionClick: (domainId) => {
                        navigate(`/domains/${domainId}`);
                    },
                }}
                collection={domainC}
                updateCollection={updateDomainC}
            />
            <div className='page-content'>
                <Table
                    className='domains-table row-link'
                    data-test='domains-table'
                    items={domainC.items}
                    columns={columns}
                    controlColumns={[]}
                    loaded={domainC.loaded}
                    onRowClick={onRowClick}
                    tableEmptyText={pageType === 'archive-listing'
                        ? 'No archived domains'
                        : 'No domains added'
                    }
                    addNewRecordButtonText={pageType === 'archive-listing'
                        ? undefined
                        : 'Add Domain'
                    }
                    addNewRecordButtonURL='/domains/create'
                    collection={domainC}
                    updateCollection={updateDomainC}
                    reference={domainRef}
                    queryString={domainC.queryString}

                    name='domain'
                    setColumns={setColumns}
                    enableColumnPreference
                />
            </div>
        </div>
    </div>
}


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
    formatAmount,
    getDayLabel,
    openURLInNewTab,
} from 'src/helpers';
import moment from 'moment';

export default function CompaniesView(props) {
    const params =  new URL(window.location).searchParams;
    let navigate = useNavigate();
    const { me, setMe } = useContext(MeContext);
    const [ pageType, setPageType] = useState(params.get('status') === 'archived'
        ? 'archive-listing'
        : 'active-listing'
    );
    const [ columns, setColumns ]  = useState([
        {
            name: 'Name',
            id: 'name',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                let companyWebsite = 'www.ciphersyncsaas.com';
                return <div className='company-name-website'>
                    <div className='company-name'>
                    {row.name}
                    </div>
                    {row.website_url
                        ? <div className='company-website'
                            onClick={e => openURLInNewTab(e, companyWebsite)}
                        >
                            {row.website_url}
                        </div>
                        : <span className='data-not-available'>Not available</span>
                    }
                </div>
            }
        },
        {
            name: 'Short Name',
            id: 'short_name',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                return <div className='company-short-name'>
                    {row.short_name}
                </div>
            }
        },
        {
            name: 'Ultra Short Name',
            id: 'ultra_short_name',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                return <div className='company-ultra-short-name'>
                    {row.ultra_short_name}
                </div>
            }
        },
        {
            name: 'Industry',
            id: 'industry_details',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='industry-details'>
                    {row?.industry_details?.name ?? <span
                        className='data-not-available'
                    >
                        Not available
                    </span>}
                </div>
            }
        },
        {
            name: 'Specialization',
            id: 'specialization',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                let specializationDetails = null;
                if (row?.specializations_details?.length > 0) {
                    specializationDetails = row.specializations_details
                        .map(specialization => specialization.name).join(', ');
                }

                return <div className='specialization-details'>
                    {specializationDetails ?? <span
                        className='data-not-available'
                    >
                        Not available
                    </span>}
                </div>
            }
        },
        {
            name: 'Country',
            id: 'country',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='company-country'>
                    Need address info in API
                </div>
            }
        },
        {
            name: 'Company Type',
            id: 'id_type',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='company-type'>
                    {row?.company_type_details?.name ?? <span
                        className='data-not-available'
                    >
                        Not available
                    </span>}
                </div>
            }
        },
        {
            name: 'Founded',
            id: 'founded_on',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                let columnData;
                if(moment(row?.founded_date ?? null).isValid()) {
                     columnData = moment(row.founded_date).format('YYYY');
                } else {
                     columnData = <span className='data-not-available'>
                        Not available
                    </span>
                }

                return <div className='company-founded-on'>
                    {columnData}
                </div>
            }
        },
        {
            name: 'Annual Revenue',
            id: 'annual-revenue',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='company-revenue'>
                    {row?.annual_revenue
                        ? formatAmount(row.annual_revenue)
                        : <span className='data-not-available'>
                            Not available
                        </span>
                    }
                </div>
            }
        },
    ]);

    const [ companyC,
        updateCompanyC,
        companyRef,
        isCompanyRefVisible
    ] = useCollection(
        'companies',
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
        console.log('Inside Row  Click');
        navigate(`/companies/${companyC.items[index].id}`)
    }

    useEffect(() => {
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
        <div id='companies-view' className='app-content listing-view'>
            <PageTopRow
                title={pageType === 'archive-listing'
                    ? 'Archived Companies'
                    : 'Companies'
                }
                buttonText='Add Company'
                onButtonClick={() => {
                    navigate('/companies/create');
                }}
                type={pageType}
                setType={setPageType}
                collection={companyC}
                updateCollection={updateCompanyC}
            />
            <div className='page-content'>
                <Table
                    className='companies-table row-link'
                    data-test='companies-table'
                    items={companyC.items}
                    columns={columns}
                    controlColumns={[]}
                    loaded={companyC.loaded}
                    onRowClick={onRowClick}
                    tableEmptyText={pageType === 'archive-listing'
                        ? 'No archived companies'
                        : 'No companies added'
                    }
                    addNewRecordButtonText={pageType === 'archive-listing'
                        ? undefined
                        : 'Add Company'
                    }
                    addNewRecordButtonURL='/companies/create'
                    collection={companyC}
                    updateCollection={updateCompanyC}
                    reference={companyRef}
                    queryString={companyC.queryString}

                    name='company'
                    setColumns={setColumns}
                    enableColumnPreference
                />
            </div>
        </div>
    </div>
}


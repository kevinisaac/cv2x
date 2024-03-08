import React, { useState, useEffect, useContext } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAlert } from 'react-alert';

import { CommonValueContext, UserPreferenceContext, MeContext } from 'src/contexts';
import {
    Icon,
    Table,
    Header,
    Sidebar,
    ContactCTA,
    DemoPictureUpload,
    CompanyPictureUpload,
} from 'src/components';
import {
    Input,
    Checkbox,
    DateField,
    FileField,
    SelectField,
    RadioField,
    CheckboxGroup,
    DropDownMultiSelect,
} from 'src/components/form';
import {
    useCollection,
} from 'src/hooks';
import {
    PageTopRow,
    FormActions,
    Sections,
    DangerZone,
    ContactDetails,
    NavigationPanel,
} from 'src/components/outreachComponents'
import moment from 'moment';
import jsonData from '/data/json_data/input_data';



export default function SubscribersView(props) {
    const params =  new URL(window.location).searchParams;
    const { me, setMe } = useContext(MeContext);
    const [ pageType, setPageType] = useState(params.get('status') === 'archived'
        ? 'archive-listing'
        : 'active-listing'
    );

    const [ columns, setColumns ]  = useState([
        {
            name: 'First Name',
            id: 'first_name',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='subscriber-first-name'>
                    {row.first_name}
                </div>
            }
        },
        {
            name: 'Last Name',
            id: 'last_name',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='subscriber-last-name'>
                    {row.last_name}
                </div>
            }
        },
        {
            name: 'Name',
            id: 'name',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='subscriber-name'>
                    {row.name}
                </div>
            }
        },
        {
            name: 'Email',
            id: 'email',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='subscriber-email'>
                    {row.email}
                </div>
            }
        },
        {
            name: 'Subscribed On',
            id: 'subscribed_on',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='subscribed-on'>
                    {moment(row.subscribed_on).format('DD MMM, YYYY')}
                </div>
            }
        },
        {
            name: 'Source',
            id: 'source',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='subscribed-source'>
                    {row.source}
                </div>
            }
        },
        {
            name: 'Newsletter Details',
            id: 'newsletter-type',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='newsletter-type'>
                    {row?.email_newsletter_details?.name}
                </div>
            }
        },
        {
            name: 'IP Address',
            id: 'ip_address',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='subscriber-ip-address'>
                    {row.ip_address}
                </div>
            }
        },
        {
            name: 'Status',
            id: 'status',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='subscriber-status'>
                    {row.status}
                </div>
            }
        },
    ]);

    const [ subscribersC,
        updateSubscribersC,
        subscribersRef,
        isSubscribersRefVisible
    ] = useCollection(
        'email-subscribers',
    );

    const [ mainClassName, setMainClassName] = useState(
        JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
        ? 'expanded-view'
        : ''
    );

    return <div id='main-grid' className={`${mainClassName}`}>
        <Header />
        <Sidebar />
        <div id='subscribers-view' className='app-content listing-view'>
            <PageTopRow
                title={pageType === 'archive-listing'
                    ? 'Archived Subscribers'
                    : 'Subscribers'
                }
                type={pageType}
                setType={setPageType}
                // searchAttributes={{
                //     suggestionsURL: 'domains',
                //     suggestionsParams: pageType === 'active-listing'
                //         ? 'status=active' : 'status=archived',
                //     suggestionData: {
                //         topLeft: {
                //             values: [
                //                 {
                //                     name: 'name',
                //                 },
                //             ],
                //         },
                //         topRight: {
                //             disableHighlight: true,
                //             valuesSeperator: ', ',
                //             values: [
                //                 {
                //                     name: 'registration_date',
                //                     type: 'date',
                //                     dateFormat: 'MMM DD, YYYY',
                //                     disableHighlight: true,
                //                 },
                //             ]
                //         },
                //         bottomLeft: {
                //             disableHighlight: true,
                //             values: [
                //             {
                //                 name: 'id',
                //             },
                //             ],
                //         }
                //     }
                //     onSuggestionClick: (domainId) => {
                //         navigate(`/domains/${domainId}`);
                //     },
                // }}
                collection={subscribersC}
                updateCollection={updateSubscribersC}
            />
            <div className='page-content'>
                <Table
                    className='subscribers-table row-link'
                    items={subscribersC.items}
                    columns={columns}
                    controlColumns={[]}
                    loaded={subscribersC.loaded}
                    tableEmptyText={pageType === 'archive-listing'
                        ? 'No archived subscribers'
                        : 'No subscribers'
                    }
                    collection={subscribersC}
                    updateCollection={updateSubscribersC}
                    reference={subscribersRef}
                />
            </div>
        </div>
    </div>
}
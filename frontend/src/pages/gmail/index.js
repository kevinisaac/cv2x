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

export default function GmailView(props) {
    const params =  new URL(window.location).searchParams;
    let navigate = useNavigate();
    const { me, setMe } = useContext(MeContext);
    const [ pageType, setPageType] = useState(params.get('status') === 'archived'
        ? 'archive-listing'
        : 'active-listing'
    );
    const [ columns, setColumns ]  = useState([
        {
            name: 'Client',
            id: 'name',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                let name;
                if (row.name) {
                    name = row.name.length <= 20
                        ? row.name
                        : row.name.slice(0, 20) + '...'
                } else {
                    name = <span className='data-not-available'>Not available</span>
                }
                return <div className='client-details'>
                    <div className='client-name' data-test='client-name'>{name}</div>
                    <div className='client-contact-no'>
                        {row.phones_details[0]?.phone_number ?? <span className='data-not-available'>Number not available</span>}
                    </div>
                </div>
            }
        },
        {
            name: 'Age',
            id: 'dob',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                return <div className='age-gender'>
                    <div className='client-age'>{getAge(row.dob) || <span className='data-not-available'>NA</span>}</div>
                    <div className='client-gender'>{getGenderLabel(row.gender) ?? <span className='data-not-available'>NA</span>}</div>
                </div>
            }
        },
        {
            name: 'Client ID',
            id: 'id_',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='id'>
                    {row.id}
                </div>
            }
        },
        {
            name: 'UR Number',
            id: 'ur_no',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='ur_no'>
                    {row.ur_no}
                </div>
            }
        },
        {
            name: 'Address',
            id: 'address_basic_info',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                let address;
                if (row.current_address_details?.basic_info) {
                    address = row.current_address_details.basic_info.length <= 37
                        ? row.current_address_details.basic_info
                        : row.current_address_details.basic_info
                            .slice(0, 37) + '...'
                } else {
                    address = <span className='data-not-available'>Address not available</span>;
                }

                return <div className='client-address'>
                    {address}
                </div>
            }
        },
        {
            name: 'Review',
            id: 'review_date',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                let className = 'review-date';
                if (moment().isSameOrAfter(moment(row.review_date))) {
                    className = 'review-date overdue-notification';
                }
                return <div className={className}>
                    {getDayLabel(row.review_date, me.preferred_date_format)}
                </div>
            }
        },
        {
            name: 'Emergency',
            id: 'contacts_details',
            visible: true,
            render: (row) => {
                return <div className='emergency-contact'>
                    {row.contacts_details.length > 0
                        ? <>
                            <div className='emergency-contact-name'>
                                {row.contacts_details[0]?.name ?? 'Not available'}
                            </div>
                            <div className='emergency-contact-no'>
                                {row.contacts_details[0]?.phones_details[0]?.phone_number ?? 'Phone not avialable'}
                            </div>
                        </>
                        : <div className='no-contact'>
                            <span className='data-not-available'>No emergency contact</span>
                        </div>
                    }
                </div>
            }
        },
    ]);

    const [ clientC,
        updateClientC,
        clientRef,
        isClientRefVisible
    ] = useCollection(
        'clients',
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
        navigate(`/clients/${clientC.items[index].id}`)
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

    
    const [ activeEmailList, setActiveEmailList ] = useState('scheduled');

    const emailListToggle = (tab) => {
        setActiveEmailList(tab);
    }

    return <div id='main-grid' className={`${mainClassName}`}>
        <Header />
        <Sidebar />
        <div id='gmail-view' className='app-content listing-view'>
            <PageTopRow
                title={pageType === 'archive-listing'
                    ? 'Archived Clients'
                    : 'Clients'
                }
                buttonText={me?.permissions_map?.create_client ? 'Add Clients' : false}
                onButtonClick={() => {
                    navigate('/clients/create');
                }}
                type={pageType}
                setType={setPageType}
                moreOptions={[
                    {
                        icon: 'archived-record.svg',
                            label: 'View Archived Clients',
                            onClick: () => {
                                //Function to load archived clients
                                setPageType('archive-listing');
                                let urlSearchParams
                                    = new URLSearchParams(clientC.queryString);
                                urlSearchParams.set('status', 'archived');
                                updateClientC({
                                    queryString: urlSearchParams.toString(),
                                });
                            },
                    }
                ]}
                onBackClick={() => {
                    let urlSearchParams
                        = new URLSearchParams(clientC.queryString);
                    urlSearchParams.set('status', 'active');
                    updateClientC({
                        queryString: urlSearchParams.toString(),
                    });
                }}
                searchAttributes={{
                    suggestionsURL: 'clients',
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
                    onSuggestionClick: (clientId) => {
                        navigate(`/clients/${clientId}`);
                    },
                    onMoreButtonClick: (qParam) => {
                        let urlSearchParams = new URLSearchParams(clientC.queryString);
                        console.log('On More Button Query String', clientC.queryString);
                        urlSearchParams.set('q', qParam);
                        // navigate(`/vehicles${}`)
                        updateClientC({
                            queryString: urlSearchParams.toString(),
                        });
                    },
                }}
                collection={clientC}
                updateCollection={updateClientC}
            />
            <div className='page-content'>
                <div className='content-wrapper'>
                    <div className='left-content'>
                        <div className='email-list-wrapper'>
                            <div className='email-list-toggle'>
                                <a onClick={() => emailListToggle('scheduled')}>
                                    <div className={`scheduled-email-list ${activeEmailList === 'scheduled' ? 'active-tab' : ''}`}>
                                        Scheduled Emails
                                    </div>
                                </a>
                                    <div className='dot-seperator'></div>
                                <a onClick={() => emailListToggle('sent')}>
                                <div className={`sent-email-list ${activeEmailList === 'sent' ? 'active-tab' : ''}`}>
                                        Sent Emails
                                    </div>
                                </a>
                            </div>
                            <div className='emails'>
                                {activeEmailList === 'scheduled' && (
                                    <div className='scheduled-list active-tab'>
                                        <div className='sender-recipient-info-wrapper'>
                                            <div className='recipient-info'>
                                                To: elonmusk@tesla.com
                                            </div>
                                            <div className='sender-info'>
                                                From: kevin@zephony.in
                                            </div>
                                        </div>
                                        <div className='subject-info'>
                                            Subject:(firstName) - Out CTO would like
                                            to talk with you
                                        </div>
                                        <div className='campaign-and-email-schedule-info'>
                                            <div className='campaign-detail'>
                                                Campaign 1
                                            </div>
                                            <div className='email-date-time-info'>
                                                Sent on 25 Oct, 2023, 9:00AM (UTC - 5:00)
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {activeEmailList === 'sent' && (
                                    <div className='se-lisntt active-tab'>
                                        Sent
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className='right-content'>
                        <div className='email-preview'>
                            <div className='preview-title'>
                                Preview
                            </div>
                            <div className='email-basic-details'>
                                <div className='sender-recipient-info'>
                                    <div className='recipient-info'>
                                        To: elonmusk@tesla.com
                                    </div>
                                    <div className='sender-info'>
                                        From: kevin@zephony.com
                                    </div>
                                </div>
                                <div className='campaign-email-info'>
                                    <div className='campaign-name'>
                                        Campaign 1
                                    </div>
                                    <div className='date'>
                                        25 Oct, 2023
                                    </div>
                                    <div className='email-date-time'>
                                        Sent on 25 Oct, 2023, 9:00AM 
                                        (Eastern Time (US & Canada) UTC - 5:00) 
                                    </div>
                                </div>
                            </div>
                            <hr />
                            <div className='email-subject-details'>
                                <div className='email-subject'>
                                Subject:(firstName) - Out CTO would like 
                                to talk with you
                                </div>
                            </div>
                            <hr />
                            <div className='email-content-details'>
                                <div className='email-content'>
                                Hi (firstName), I just spoke to our CTO 
                                about (companyName) and we wanted to 
                                discuss the possibility of working together. 
                                We’re in the process of finding agencies 
                                similar to (companyName) for potential 
                                partnerships and strategic alliances. We are 
                                looking for strategic partners to work with 
                                on many fronts: Since we are singularly 
                                focused as a production company, we 
                                occasionally have clients that have needs that
                                are beyond what we offer and it is great to 
                                have the right partners already in place to 
                                refer them to. Let me know if you're available 
                                for an exploratory call this week or next. 
                                <br /><br />
                                Thanks, YOUR NAME
                                </div>
                            </div>
                            <hr />
                            <div className='follow-up-details'>
                                <div className='follow-up-title'>
                                    Follow up after 1 day
                                </div>
                                <div className='email-basic-details'>
                                <div className='sender-recipient-info'>
                                    <div className='recipient-info'>
                                        To: elonmusk@tesla.com
                                    </div>
                                    <div className='sender-info'>
                                        From: kevin@zephony.com
                                    </div>
                                </div>
                                <div className='campaign-email-info'>
                                    <div className='campaign-name'>
                                        Campaign 1
                                    </div>
                                    <div className='date'>
                                        25 Oct, 2023
                                    </div>
                                    <div className='email-date-time-scheduled'>
                                        Schedule at 26 Oct, 2023, 9:00AM 
                                        (Eastern Time (US & Canada) UTC - 5:00) 
                                    </div>
                                </div>
                            </div>
                            <hr />
                            <div className='email-subject-details'>
                                <div className='email-subject'>
                                Subject:(firstName) - Out CTO would like 
                                to talk with you
                                </div>
                            </div>
                            <hr />
                            <div className='email-content-details'>
                                <div className='email-content'>
                                Hi (firstName), I just spoke to our CTO 
                                about (companyName) and we wanted to 
                                discuss the possibility of working together. 
                                We’re in the process of finding agencies 
                                similar to (companyName) for potential 
                                partnerships and strategic alliances. We are 
                                looking for strategic partners to work with 
                                on many fronts: Since we are singularly 
                                focused as a production company, we 
                                occasionally have clients that have needs that
                                are beyond what we offer and it is great to 
                                have the right partners already in place to 
                                refer them to. Let me know if you're available 
                                for an exploratory call this week or next. 
                                <br /><br />
                                Thanks, YOUR NAME
                                </div>
                            </div>
                            <hr />
                            </div>
                        </div>
                    </div>
                </div>
                {me?.permissions_map?.read_clients && <Table
                    className='clients-table row-link'
                    data-test='clients-table'
                    items={clientC.items}
                    columns={columns}
                    controlColumns={[]}
                    loaded={clientC.loaded}
                    onRowClick={onRowClick}
                    tableEmptyText={pageType === 'archive-listing'
                        ? 'No archived clients'
                        : 'No clients added'
                    }
                    addNewRecordButtonText={pageType === 'archive-listing' ? undefined : 'Add Client'}
                    addNewRecordButtonURL='/clients/create'
                    collection={clientC}
                    updateCollection={updateClientC}
                    reference={clientRef}
                    queryString={clientC.queryString}

                    name='client'
                    setColumns={setColumns}
                    enableColumnPreference
                />}
            </div>
        </div>
    </div>
}


import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAlert } from 'react-alert';

import { CommonValueContext, UserPreferenceContext, MeContext } from 'src/contexts';
import {
    Icon,
    Table,
    Header,
    Sidebar,
    ContactCTA,
    Tooltip,
    KeyValueTooltip,
} from 'src/components';

import {
    Input,
    Checkbox,
    DateField,
    TimeInput,
    FileField,
    SelectField,
    RadioField,
    CheckboxGroup,
    DropDownMultiSelect,
} from 'src/components/form';

import {
    useForm,
    useToggle,
    useCollection,
} from 'src/hooks';

import {
    FormModal,
    FormActions,
    PageTopRow,
    NavigationPanel,
    Sections,
    DangerZone,
    AMPMToggle,
    ComingSoon,
    YearFilter,
    UnsavedDataBanner,
} from 'src/components/outreachComponents';

import {
    copy,
    equal,
    request,
    byString,
    getOptions,
    getDayLabel,
    getRandomInt,
    getGenderLabel,
    removeEmptyKeys,
    getRandomString,
    getDetailsPageBarChartWidth,
} from 'src/helpers';

import moment from 'moment';


const initCampaignForm = {
    data: {
        id: null,
        token: null,
        created_at: null,
        last_updated_at: null,
        name: null,
        notes: null,
        instantly_id: null,
        last_synced_on: null,
        id_industry: null,
        accepts_leads: null,
        summary: null,
        required_fields: null,
        industry_details: {
            name: null,
        }
    }
}


export default function InstantlyCampaignsView(props) {
    let { id } = useParams();
    const alert_ = useAlert();
    const params = new URL(window.location).searchParams;
    let navigate = useNavigate();
    const { me, setMe } = useContext(MeContext);
    const [pageType, setPageType] = useState(params.get('status') === 'archived'
        ? 'archive-listing'
        : 'active-listing'
    );

    const [originalForm, setOriginalForm] = useState(initCampaignForm);
    const [campaignDetails, setCampaignDetails] = useState(null); //To show any other records


    const [columns, setColumns] = useState([
        {
            name: 'Name',
            id: 'name',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='campaign-name'>
                    {/* Campaign 1 */}
                    {row.name}
                </div>
            }
        },
        {
            name: 'Accepts New Leads',
            id: 'accepts_leads',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='accepts-leads'>
                    {/* Campaign 1 */}
                    {row.accepts_leads ? 'Yes' : <div className='data-not-available'>No</div>}
                </div>
            }
        },
        {
            name: 'Industry',
            id: 'industry_details',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='industry-name'>
                        {row?.industry_details?.name}
                    </div>
            }

        },
        {
            name: 'Email Accounts',
            id: 'email-accounts',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                // let emailAccounts = [
                //     {
                //         email: 'pauljoy06@gmail.com',
                //     },
                //     {
                //         email: 'kevin@zephony.in',
                //     },
                //     {
                //         email: 'kevin@zephonyapps.in',
                //     },
                //     {
                //         email: 'andrid@zephony.in',
                //     },
                // ]
                // return <div className='email-accounts-connected'>
                //     {emailAccounts.length > 0
                //         ? emailAccounts.map(emailAccount => emailAccount.email).join(', ')
                //         : <span className='data-not-available'>Not added yet</span>
                //     }
                // </div>
            }
        },
        {
            name: 'Leads',
            id: 'leads-details',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                const tooltipItems = [
                    {
                        key: [
                            { label: 'In progress' },
                        ],
                        value: [
                            { label: 53 }
                        ]
                    },
                    {
                        key: [
                            { label: 'To be emailed' },
                        ],
                        value: [
                            { label: '127' },
                        ]
                    },
                    {
                        key: [
                            { label: 'First email sent' },
                        ],
                        value: [
                            { label: '27' },
                        ]
                    },
                    {
                        key: [
                            { label: 'Total leads' },
                        ],
                        value: [
                            { label: '207' },
                        ]
                    },
                ]

                return <div className='campaign-leads-details'>
                    <div className='lead-total-count'>
                        20/301
                    </div>
                    <Tooltip>
                        <KeyValueTooltip items={tooltipItems} />
                    </Tooltip>
                </div>
            }
        },
        {
            name: 'Total Emails Sent',
            id: 'emails-sent',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                return <div className='emails-sent'>
                    {30 || '-'}
                </div>
            }
        },
        {
            name: 'Status',
            id: 'status',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                return <div className='campaign-status-details'>
                    <div className='campaign-status'>
                        {/* Running */}
                        {row.status}
                    </div>
                    <div className='campaign-status-last-activity'>
                        {/* Started on {moment().format('DD MMM, YYYY')} */}
                        {moment(row.start_date).format('DD MMM, YYYY')}
                    </div>
                </div>
            }
        },
        {
            name: 'Responded',
            id: 'status',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                return <div className='campaign-respone-details'>
                    30 (12%)
                </div>
            }
        },
    ]);

    const [
        campaignForm,
        setCampaignForm,
        onCampaignChange,
        campaignError,
        setCampaignError,
    ] = useForm(initCampaignForm);
    const [loaded, toggleLoaded] = useToggle(false);

    const [campaignVersionsC, updateCampaignVersionsC] = useCollection(null);

    const [campaignC,
        updateCampaignC,
        campaignRef,
        isCampaignRefVisible
    ] = useCollection(
        'instantly-campaigns',
        `status=${params.get('status')
            ? params.get('status')
            : 'active'}&page=1`
    );
    const [mainClassName, setMainClassName] = useState(
        JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
            ? 'expanded-view'
            : ''
    );

    const [campaignDetailsFormModal, campaignDetailsFormModalToggle]
        = useToggle(false);

    function syncCampaignsFromInstantly() {
        request.post(`sync-campaigns-from-instantly`, {})
            .then(([status_, response]) => {
                // Reload leads
                updateCampaignC({ reload: true });

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Campaigns are synced successfully!');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while syncing campaigns.');
                }
            })
            .finally(() => {
            });
    }

    // function onRowClick(e, index) {
    //     e.preventDefault();
    //     // navigate(`/campaigns/${campaignC.items[index].id}`)
    //     campaignDetailsFormModalToggle();
    //     setCampaignForm({
    //         data:campaignC.items[index],
    //     });

    //     setSelectedCampaignId(campaignC.items[index]?.id);
    // }

    const [ selectedCampaignId, setSelectedCampaignId ] = useState(null);

    function convertFullDataToFormData(fullData) {
        const convertBooleanToString = (value) => {
            if (value !== undefined && value !== null) {
                return value ? 'true' : 'false'
            }

            return value;
        };
        return {
            data: {
                name: fullData?.name ?? null,
                id_industry: fullData?.id_industry ?? null,
                notes: fullData?.notes ?? null,
                accepts_leads: convertBooleanToString(fullData?.accepts_leads || false),
            }
        }
    }

    const [ editCampaignId, setEditCampaignId ] = useState();

    function onRowClick(e, index) {
        e.preventDefault();

        const selectedCampaignId_ = campaignC.items[index]?.id;
        setEditCampaignId(selectedCampaignId_);

        campaignDetailsFormModalToggle();

        let newFormData = convertFullDataToFormData(campaignC.items[index]);
        setCampaignForm(newFormData);

        setSelectedCampaignId(selectedCampaignId_);
    }

    let sections = [
        {
            name: 'Basic Details',
            icon: null,
            navigation: 'basic-details',
            subSections: [
                {
                    name: null,
                    content: <BasicDetailsPrimary
                        id={id}
                        data={campaignForm.data}
                        onChange={onCampaignChange}
                        error={campaignError}
                        // viewMode={viewMode}
                    />
                },
            ]
        },
        // {
        //     name: 'Leads',
        //     icon: null,
        //     navigation: 'basic-details',
        //     subSections: [
        //         {
        //             name: null,
        //             content: <CampaignLeads
        //                 id={id}
        //                 data={campaignForm.data}
        //                 onChange={onCampaignChange}
        //                 error={campaignError}
        //                 // viewMode={viewMode}
        //             />
        //         },
        //     ]
        // },
        // {
        //     name: 'Sequences',
        //     icon: null,
        //     navigation: 'sequences',
        //     subSections: [
        //         {
        //             name: null,
        //             content: <SequencesPrimary
        //                 id={id}
        //                 data={campaignForm.data}
        //                 onChange={onCampaignChange}
        //                 error={campaignError}
        //                 // viewMode={viewMode}
        //             />
        //         },
        //     ]
        // },
        // {
        //     name: 'Schedule',
        //     icon: null,
        //     navigation: 'schedules',
        //     subSections: [
        //         {
        //             name: null,
        //             content: <WeekdaySchedules
        //                 id={id}
        //                 data={campaignForm.data}
        //                 onChange={onCampaignChange}
        //                 error={campaignError}
        //                 // viewMode={viewMode}
        //             />
        //         },
        //     ]
        // },
    ];

    //Used to convert response from API to form data
    function convertResponseToFormData(response) {
        console.log('Response', response.data);
        const convertBooleanToString = (value) => {
            if (value !== undefined && value !== null) {
                return value ? 'true' : 'false'
            }

            return value;
        };

        return {
            'data': {
                'notes': response.data.notes,
                'id_industry': response.data.id_industry,
                'accepts_leads': convertBooleanToString(response.data.accept_leads),
            }
        }
    }

    function convertFormDataToRequest(formData) {
        const convertStringToBoolean = (value) => {
            // console.log('value', value, typeof value);
            if (value !== undefined && value !== null) {
                // console.log('Inside')
                return value === 'true';
            }
            // console.log('Outside');
            return value;
        };

        let requestData = copy(formData);
        // let test = convertStringToBoolean(formData?.data?.accepts_leads);
        // console.log('test', test, typeof test)

        requestData.data.accepts_leads
            = convertStringToBoolean(formData?.data?.accepts_leads);

        // console.log('rq', requestData)
        // requestData = removeEmptyKeys(formData,
        //     ['', null, undefined, {}, []],
        // );
        if(!requestData.data.id_industry) {
            delete requestData.data.id_industry
        }

        // console.log('convert return', requestData);
        return requestData;
    }

    function createCampaign() {
        let requestData = convertFormDataToRequest(campaignForm);

        request.post(`instantly-campaigns`, requestData)
            .then(([status_, response]) => {
                // let formData = convertResponseToFormData(response);
                // setCampaignForm(formData);
                // toggleLoaded();
                setCampaignError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('New campaign added');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while submitting. Please resolve error and try again');
                }
                if (response.errors) {
                    console.log('Inside error setter');
                    setCampaignError(response.errors);
                }
            });
    }

    function updateCampaign() {
        // e.preventDefault();
        let requestData = convertFormDataToRequest(campaignForm);
        // toggleLoaded();

        request.patch(`instantly-campaigns/${selectedCampaignId}`, requestData)
        .then(([status_, response]) => {
            let formData = convertResponseToFormData(response);
            setCampaignForm(response);
            setCampaignError([]);
            setEditCampaignId(null);
            campaignDetailsFormModalToggle();
            updateCampaignC({
                reload:true
            })
            if (response.message) {
                alert_.success(response.meassage);
            } else {
                alert_.success('Campaign Updated');
            }
        })
        .catch(([errorStatus, response]) => {
            if (response.message) {
                alert_.error(response.message);
            } else {
                alert_.error('Error while updating. Please try again.');
            }
            if (response.error) {
                setCampaignError(response.error);
            }
        })
        .finally(() => {
            toggleLoaded();
        });
    }

    function onCancelClick() {
        // setViewMode('read');
        setCampaignForm(originalForm);
        campaignDetailsFormModalToggle();
    }

    function onSameAsCheckboxClick(addressName) {
        setCampaignForm(old => {
            let new_ = copy(old);

            // To maintain the id of the exisiting record
            let address;
            let id = byString(new_, addressName + '.id');
            address = copy(campaignForm.data.current_address);
            address.id = id;

            byString(new_, addressName, address);

            return new_;
        });
    }

    function onVersionClick(versionId) {
        // setViewMode('read');
        request.get(`campaigns/${id}/versions/${versionId}`)
            .then(([status_, response]) => {
                let formData = convertResponseToFormData(response);
                setCampaignForm(formData);
            })
            .catch(([errorStatus, response]) => {
                console.log('Error Response', response);
            })
            ;
        setSelectedVersion(versionId);
        setPageType('version-detail-page');
    }

    function onVersionBackClick() {
        setSelectedVersion(null);
        setCampaignForm(originalForm);
    }

    useEffect(() => {
        // console.log('Inside useEffect');
        if (id === 'create') {
            // console.log('Inside useEffect option 1');
            setCampaignForm(initCampaignForm);
            // setViewMode('edit');

            //Setting loaded to true, as we are not making API calls for create
            updateCampaignVersionsC({ loaded: true, });
        } else {
            // console.log('Inside useEffect option 2');
            request.get(`instantly-campaigns/${id}`)
                .then(([status_, response]) => {
                    // console.log('Inside useEffect option 2 :: SUCCESS');
                    let formData = convertResponseToFormData(response);
                    setCampaignForm(formData);
                    setOriginalForm(formData);
                    setCampaignDetails({ data: response.data });
                    toggleLoaded();

                    if (response?.data?.status
                        && response?.data?.status === 'archived'
                    ) {
                        // setViewMode('no-edit');
                    }
                })
                .catch(([errorStatus, response]) => {
                    if (errorStatus === 404) {
                        setNotFound(true);
                    }
                })
                ;
            //To load version details if any
            updateCampaignVersionsC({
                url: `instantly-campaigns/${id}/versions`,
            });
        }
    }, []);

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
        <div id='campaigns-view' className='app-content listing-view'>
            <PageTopRow
                title={pageType === 'archive-listing'
                    ? 'Archived Instantly Campaigns'
                    : 'Instantly Campaigns'
                }
                buttonText={'Sync Instantly Campaigns'}
                onButtonClick={() => {
                    syncCampaignsFromInstantly();
                }}
                type={pageType}
                setType={setPageType}
                onBackClick={() => {
                    let urlSearchParams
                        = new URLSearchParams(campaignC.queryString);
                    urlSearchParams.set('status', 'active');
                    updateCampaignC({
                        queryString: urlSearchParams.toString(),
                    });
                }}
                searchAttributes={{
                    suggestionsURL: 'campaigns',
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
                    },
                    onSuggestionClick: (campaignId) => {
                        navigate(`/campaigns/${campaignId}`);
                    },
                    onMoreButtonClick: (qParam) => {
                        let urlSearchParams = new URLSearchParams(campaignC.queryString);
                        urlSearchParams.set('q', qParam);
                        updateCampaignC({
                            queryString: urlSearchParams.toString(),
                        });
                    },
                }}
                collection={campaignC}
                updateCollection={updateCampaignC}
            />
            <div className='page-content'>
                <Table
                    className='campaigns-table row-link'
                    data-test='campaigns-table'
                    items={campaignC.items}
                    columns={columns}
                    controlColumns={[]}
                    loaded={campaignC.loaded}
                    onRowClick={onRowClick}
                    tableEmptyText={pageType === 'archive-listing'
                        ? 'No archived campaigns'
                        : 'No campaigns added'
                    }
                    addNewRecordButtonText={
                        pageType === 'archive-listing'
                            ? undefined
                            : 'Add Campaigns'
                    }
                    addNewRecordButtonURL='/campaigns/create'
                    collection={campaignC}
                    updateCollection={updateCampaignC}
                    reference={campaignRef}
                    queryString={campaignC.queryString}

                    name='campaign'
                    setColumns={setColumns}
                    enableColumnPreference
                />
            </div>
            {campaignDetailsFormModal && (
                <FormModal className='campaign-details-modal'
                    toggleModal={() => {
                        campaignDetailsFormModalToggle();
                    }}
                >
                    <div className='page-content'>
                        <div className='right-page-content' data-test='right-page-content'>
                            <Sections sections={sections} />
                            <div className='save-cancel-button'>
                                <button className='button primary-button' onClick={updateCampaign}>Save</button>
                                <button className='button secondary-button cancel-action-button' onClick={onCancelClick}>Cancel</button>
                            </div>
                        </div>
                    </div>
                </FormModal>
            )}
        </div>
    </div>
}

function BasicDetailsPrimary(props) {
    let { commonData } = useContext(CommonValueContext);
    let [industryC] = useCollection('industries');

    return <div className='basic-details-primary'>
        <div className='campaign-name'>
            <Input label='Campaign Name'
                name='data.name'
                value={props.data.name}
                onChange={props.onChange}
                error={props.error['data.name']}
            />
        </div>
        <div className='campaign-industry'>
            <SelectField label='Industry'
                options={getOptions(industryC?.items, 'name', 'id') ?? []}
                name='data.id_industry'
                value={props.data?.id_industry}
                onChange={props.onChange}
                error={props.error['data.id_industry']}
            />
        </div>
        <div className='accept-leads'>
                <RadioField label = 'Accepts Leads?'
                    options={[
                        { value: 'true', label: 'Yes' },
                        { value: 'false', label: 'No' },
                    ]}
                    name='data.accepts_leads'
                    value={props.data?.accepts_leads}
                    onChange={props.onChange}
                    error={props.error['data.accepts_leads']}
                />
        </div>
    </div>
}

// function CampaignLeads(props) {
//     const [leadC,
//         updateLeadC,
//         leadRef,
//         isLeadRefVisible
//     ] = useCollection(
//         'leads',
//     );

//     const [columns, setColumns] = useState([
//         {
//             name: 'Lead',
//             id: 'name',
//             visible: true,
//             sortable: 'backend',
//             render: (row) => {
//                 return <div className='lead-details'>
//                     <div className='lead-name'>
//                         Robert Dawson
//                     </div>
//                     <div className='lead-email'>
//                         robertdawson@example.com
//                     </div>
//                 </div>
//             }
//         },
//         {
//             name: 'Lead Detail',
//             id: 'role',
//             visible: true,
//             sortable: 'backend',
//             render: (row) => {
//                 let linkedIn = 'https://sg.linkedin.com/in/random-user-1665b11aa?trk=people-guest_people_search-card';
//                 let linkedInDisplay;
//                 if (linkedIn) {
//                     linkedInDisplay = linkedIn.length <= 20
//                         ? linkedIn
//                         : linkedIn.slice(0, 20) + '...'
//                 } else {
//                     linkedInDisplay = <span className='data-not-available'>Not available</span>
//                 }
//                 return <div className='lead-role-linkedin'>
//                     <div className='lead-role'>
//                         CEO
//                     </div>
//                     <div className='lead-linkedin'
//                         onClick={e => openURLInNewTab(e, linkedIn, false)}
//                     >
//                         {linkedInDisplay}
//                     </div>
//                 </div>
//             }
//         },
//         {
//             name: 'Country',
//             id: 'country',
//             sortable: 'backend',
//             visible: true,
//             render: (row) => {
//                 return <div className='lead-country'>
//                     France
//                 </div>
//             }
//         },
//         {
//             name: 'Connected With',
//             id: 'linkedin-connection',
//             sortable: 'backend',
//             visible: true,
//             render: (row) => {
//                 let connectedWith = [
//                     {
//                         name: 'Paul',
//                     },
//                     {
//                         name: 'Kevin',
//                     }
//                 ]
//                 return <div className='linkedin-connected-with'>
//                     {connectedWith.map(connectedWith => connectedWith.name).join(', ')}
//                 </div>
//             }
//         },
//         {
//             name: 'Step',
//             id: 'step',
//             sortable: 'backend',
//             visible: true,
//             render: (row) => {
//                 let options = [
//                     {
//                         label: 'To be emailed',
//                         value: 'to-be-emailed'
//                     },
//                     {
//                         label: 'Got Response',
//                         value: 'got-response'
//                     }
//                 ]
//                 return <div className='linkedin-connected-with'>
//                     <SelectField
//                         options={options}
//                     />
//                 </div>
//             }
//         },
//         {
//             name: 'Company',
//             id: 'company',
//             sortable: 'backend',
//             visible: true,
//             render: (row) => {
//                 let companyWebsite = 'www.marvinandsons.com';
//                 let companyWebsiteDisplay;
//                 if (companyWebsite) {
//                     companyWebsiteDisplay = companyWebsite.length <= 20
//                         ? companyWebsite
//                         : companyWebsite.slice(0, 20) + '...'
//                 } else {
//                     companyWebsiteDisplay = <span className='data-not-available'>Not available</span>
//                 }

//                 return <div className='company-details'>
//                     <div className='company-name'>
//                         Marvin and Sons
//                     </div>
//                     <div className='company-website'
//                         onClick={e => openURLInNewTab(e, companyWebsite)}
//                     >
//                         {companyWebsiteDisplay}
//                     </div>
//                 </div>
//             }
//         },
//     ]);

//     function onRowClick(e, index) {
//         e.preventDefault();
//         // navigate(`/leads/${clientC.items[index].id}`)
//     }

//     return <div className='company-leads'>
//         <Table
//             className='company-leads-table row-link'
//             data-test='company-leads-table'
//             items={[{ id: 1 }]}
//             columns={columns}
//             controlColumns={[]}
//             loaded={leadC.loaded}
//             onRowClick={onRowClick}
//             tableEmptyText='No leads added'
//             collection={leadC}
//             updateCollection={updateLeadC}
//             reference={leadRef}
//             queryString={leadC.queryString}

//             name='company-leads'
//             setColumns={setColumns}
//             enableColumnPreference
//         />
//     </div>
// }

// function SequencesPrimary(props) {
//     return <div className='sequences-primary'>
//         <div className='sequence-primary-left'>
//             <SequenceEmailSchedule />
//         </div>
//         <div className='sequence-primary-right'>
//             <SequnceEmailTemplates />
//         </div>
//     </div>
// }

// function SequenceEmailSchedule(props) {
//     return <div className='sequence-email-schedule'>
//         {[1, 2].map((sequenceEmail, index) => <SequenceEmail index={index} />)}
//         <div className='add-sequence-email'>
//             <button className='button secondary-button add-sequnce-email-button'>
//                 + Follow-up
//             </button>
//         </div>
//     </div>
// }

// function SequenceEmail(props) {
//     return <div className='sequence-email'>
//         <div className='sequence-header'>
//             <div className='sequence-title'>First Email</div>
//             <div className='sequence-subtitle'></div>
//         </div>
//         {props.index != 0 && <div className='sequence-followup'>
//             <div className='wait-for'>
//                 <Input label='Wait For'
//                     name='data.first_name'
//                     className='sequence-wait-for-input'
//                     value={props.data?.first_name}
//                     onChange={props.onChange}
//                     // viewMode={props.viewMode}
//                 />
//             </div>
//             <div className='wait-for-unit'>
//                 <SelectField label='Time'
//                     options={[]}
//                     name='data.id_industry'
//                     value={props.data?.id_industry}
//                     onChange={props.onChange}
//                     // viewMode={props.viewMode}
//                 />
//             </div>
//         </div>}
//         <div className='sequence-template'>
//             <SelectField label='Choose Template'
//                 className='choose-template-input'
//                 options={[]}
//                 name='data.title'
//                 value={props.data?.title}
//                 onChange={props.onChange}
//                 // viewMode={props.viewMode}
//             />
//         </div>
//     </div>
// }

// function SequnceEmailTemplates(props) {
//     return <div className='sequence-email-templates'>
//         {[1, 2].map(sEmailTemplate => <SequnceEmailTemplate />)}
//     </div>
// }

// function SequnceEmailTemplate(props) {
//     return <div className='sequence-email-template'>
//         <div className='email-template-top'>
//             <div className='email-template-order'>
//                 First Email
//             </div>
//             <div className='email-template-subject'>
//                 Subject: firstName - Out CTO would like to talk with you
//             </div>
//         </div>
//         <div className='email-template-body'>
//             Hi firstName, I just spoke to our CTO about companyName and we
//             wanted to discuss the possibility of working together. We’re in
//             the process of finding agencies similar to companyName for
//             potential partnerships and strategic alliances. We are looking
//             for strategic partners to work with on many fronts: Since we are
//             singularly focused as a production company, we occasionally have
//             clients that have needs that are beyond what we offer and it is
//             great to have the right partners already in place to refer them
//             to. Let me know if you're available for an exploratory call this
//             week or next.
//             Thanks, YOUR NAME
//         </div>
//     </div>
// }

// function WeekdaySchedules(props) {
//     return <div className='weekday-schedules'>
//         {[1, 2, 3].map(weekday => <WeekdayScheduleRow />)}
//     </div>
// }

// function WeekdayScheduleRow(props) {
//     return <div className='weekday-schedule-row'>
//         <div className='weekday-enable-checkbox'>
//             <Checkbox labelText='Sunday'
//                 name='data.cald_required'
//                 checked={true}
//                 value={props.data?.cald_required}
//                 onChange={props.onChange}
//                 // viewMode={props.viewMode}
//             />
//         </div>
//         <div className='weekday-start-time'>
//             <TimeInput
//                 label='Start Time'
//                 format={'DD MMM, YYYY'}
//                 placeholder='HH:MM'
//                 name={`${props.name}.drop_off_time`}
//                 value={props.data?.drop_off_time}
//                 onChange={props.onChange}
//                 // viewMode={props.viewMode}
//             />
//         </div>
//         <div className='weekday-end-time'>
//             <TimeInput
//                 label='End Time'
//                 format={'DD MMM, YYYY'}
//                 placeholder='HH:MM'
//                 name={`${props.name}.drop_off_time`}
//                 value={props.data?.drop_off_time}
//                 onChange={props.onChange}
//                 // viewMode={props.viewMode}
//             />
//         </div>
//     </div>
// }


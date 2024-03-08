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
    PageTopRow,
    FormActions,
    Sections,
    DangerZone,
    ContactDetails,
    NavigationPanel,
} from 'src/components/outreachComponents'
import jsonData from '/data/json_data/input_data';

import {
    useRequestData,
    useCollection,
    useForm,
    useToggle,
} from 'src/hooks';

import {
    copy,
    getAge,
    request,
    getOptions,
    getDayLabel,
    getGenderLabel,
    openURLInNewTab,
    removeEmptyKeys,
} from 'src/helpers';

import moment from 'moment';
import { FormModal } from 'src/components/outreachComponents';

const initLeadForm = {
    data: {
        // first_name: null,
        // last_name: null,
        // name: null,
        // email: null,
        // phone: null,
        // linkedin_url: null,
        // status: null,
        // id_company: null,
        // id_designation: null,
        // number_of_linkedin_connects: null,
        // years_in_current_designation: null,
        // ids_user: [],
        // custom_fields: [],
        // to_linkedin_connect_on: null,
        // address: {
        //     basic_info: null,
        //     id_country: null,
        //     id_level_1_sub_division: null,
        //     id_level_2_sub_division: null,
        //     id_city: null,
        //     pincode: null,
        //     locality: null,
        //     landmark: null,
        // }
        name: null,
        first_name: null,
        last_name: null,
        email: null,
        phone: null,
        linkedin_url: null,
        status: null,
        id_company: null,
        id_designation: null,
        ids_user: [
            null,
            null,
        ],
        is_unsubscribed: null,
        first_sentence: null,
        last_sentence: null,
        is_saved: null,
        id_industry: null,
    }
}

const initCompanyForm = {
    name: null,
    short_name: null,
    ultra_short_name: null,
    description: null,
    website_url:null,
}

const initFilterForm = {
    data: {
        filterDate: moment().format('YYYY-MM-DD'),
        // filterDate: null,
    }
}

const initIndustryForm = {
    data: {
        name: null,
        lowercase_for_template: null,
    }
}

const initLoadLeadsForm = {
    data: {
        search_url: null,
        id_industry: null,
        start_page: null,
        end_page: null,
    }
}

export default function LeadsView(props) {
    let { id } = useParams();
    const alert_ = useAlert();
    const params =  new URL(window.location).searchParams;
    let navigate = useNavigate();
    const { me, setMe } = useContext(MeContext);
    const [ pageType, setPageType] = useState(params.get('status') === 'archived'
        ? 'archive-listing'
        : 'active-listing'
    );

    const [ originalForm, setOriginalForm] = useState(initLeadForm);
    const [ leadDetails, setLeadDetails ] = useState(null); //To show any other records
    const [ companyDetails, setCompanyDetails ] = useState(null); //To show any other records
    const [ originalLoadLeadsForm, setOriginalLoadLeadsForm] = useState(initLoadLeadsForm);

    const [ columns, setColumns ]  = useState([
        {
            name: 'Lead',
            id: 'name',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                return <div className='lead-details'>
                    <div className='lead-name' data-test='lead-name'>
                        {row.name} ({row.first_name})
                    </div>
                    <div className='lead-email'>
                        {row.email} ({row.username})
                    </div>
                </div>
            }
        },
        {
            name: 'Designation',
            id: 'role',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                let linkedIn = row?.linkedin_url ?? null;
                let linkedInDisplay = null;
                if (linkedIn) {
                    linkedInDisplay = linkedIn.length <= 20
                        ? linkedIn
                        : linkedIn.slice(0, 20) + '...'
                }

                return <div className='lead-role-linkedin'>
                    <div className='lead-role'>
                        {row?.designation_details?.name ?? <span
                            className='data-not-available'
                        >
                            Not available
                        </span>}
                    </div>
                    {linkedIn
                        ? <div className='lead-linkedin'
                            onClick={e => openURLInNewTab(e, linkedIn, false)}
                        >
                            {linkedInDisplay}
                        </div>
                        : <span className='data-not-available'>Not available</span>
                    }
                </div>
            }
        },
        {
            name: 'Company',
            id: 'company',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                let companyWebsite = row?.company_details?.website_url ?? null;
                let companyWebsiteDisplay = null;
                if (companyWebsite) {
                    companyWebsiteDisplay = companyWebsite.length <= 20
                        ? companyWebsite
                        : companyWebsite.slice(0, 20) + '...'
                }

                return <div className='company-details'>
                    <div className='company-name'>
                        {row?.company_details?.short_name
                            ? row.company_details.short_name + ` (${row.company_details.ultra_short_name})`
                            : <span
                                className='data-not-available'
                            >
                                Not available
                            </span>
                        }
                    </div>
                    {companyWebsite
                        ? <div className='company-website'
                            onClick={e => openURLInNewTab(e, companyWebsite, false)}
                        >
                            {companyWebsiteDisplay}
                        </div>
                        : <span className='data-not-available'>Not available</span>
                    }
                </div>
            }
        },
        {
            name: 'Country',
            id: 'country',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='lead-country'>
                    {row?.address_details?.country_details?.name ?? <span
                        className='data-not-available'
                    >
                        Not available
                    </span>}
                </div>
            }
        },
        {
            name: 'Industry',
            id: 'industry_details',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='company-industry'>
                    {row?.industry_details?.name}

                    <div className='company-industry-lowercase'>
                        {row?.industry_details?.lowercase_for_template}
                    </div>
                </div>
            }
        },
        {
            name: 'Actions',
            id: '#',
            visible: true,
            render: (row, customData) => {
                // Steps where leads can be dumped
                const dumpable_steps = [
                    'pending_enrichment',
                    'pending_manual_verification',
                    'fetching_emails_from_apollo',
                    'pushing_to_instantly',
                ];
                // Steps where leads can be individually promoted from
                const promotable_steps = [
                    'pending_enrichment',
                    'pending_manual_verification',
                    // 'fetching_emails_from_apollo',
                ];
                if (
                    dumpable_steps.includes(customData.activeStep.token)
                    || promotable_steps.includes(customData.activeStep.token)
                ) {
                    return <div className='promote-lead'>
                        {dumpable_steps.includes(customData.activeStep.token) && <button
                            className='button primary-button'
                            onClick={(e) => {
                                e.stopPropagation();
                                dumpLeads([row.id])
                            }}
                        >
                            <Icon path='dump-lead.svg' size={14} />
                        </button>}

                        {promotable_steps.includes(customData.activeStep.token) && <button
                            className='button primary-button'
                            onClick={(e) => {
                                e.stopPropagation();
                                if (customData.activeStep.token === 'pending_enrichment') {
                                    moveLeadToVerificationStep(row.id);
                                } else if (customData.activeStep.token === 'pending_manual_verification') {
                                    moveLeadToInstantlyStep(row.id);
                                } else {
                                    console.error('Unknown step')
                                }
                            }}
                        >
                            <Icon path='promote-lead.svg' size={14} />
                        </button>}
                    </div>
                } else {
                    return null
                }
            }
        },
    ]);

    const [
        filterForm,
        setFilterForm,
        onFilterChange,
    ] = useForm(initFilterForm);

    const [ leadC, updateLeadC, leadRef, isLeadRefVisible ] = useCollection(
        'leads',
        // null,
        // `id_step=1`,
        // `status=active&page=1&to_linkedin_connect_on=${filterForm.data.filterDate}`
    );

    const [
        companyForm,
        setCompanyForm,
        onCompanyChange,
        companyError,
        setCompanyError,
    ] = useForm(initCompanyForm);

    const [ companyC, updateCompanyC, companyRef, isCompanyRefVisible ] = useCollection(
        'companies',
    );

    useEffect(() => {
        reloadSteps();
    }, [ leadC.items.length ])


    const [
        isFetchStatusFromNeverbounceButtonVisible,
        setIsFetchStatusFromNeverbounceButtonVisible,
    ] = useState(true);
    // Step related
    const [ activeStep, setActiveStep ] = useState({});
    useEffect(() => {
        if(activeStep.id) {
            updateLeadC({
                queryString: `id_step=${activeStep.id}&has_failed_on_step=false`
            });
        } else if(activeStep.id == 0) {
            updateLeadC({
                queryString: ``,
            });
        }
    }, [ activeStep.id ]);
    const [ stepsData, updateStepsUrl, reloadSteps ] = useRequestData('steps');
    useEffect(() => {
        if(stepsData && Object.keys(activeStep).length === 0) {
            let tempActiveStep = stepsData[1];
            setActiveStep(tempActiveStep);
            // updateLeadC({
            //     queryString: `id_step=${activeStep.id}&has_failed_on_step=false`
            // });
        }
    }, [ stepsData ]);

    const [ mainClassName, setMainClassName] = useState(
        JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
        ? 'expanded-view'
        : ''
    );

    const [
        leadForm,
        setLeadForm,
        onLeadChange,
        leadError,
        setLeadError,
    ] = useForm(initLeadForm);
    const [ loaded, toggleLoaded ] = useToggle(false);

    const [ leadDetailsFormModal, leadDetailsFormModalToggle ]
        = useToggle(false);

    const [ selectedLeadId, setSelectedLeadId ] = useState(null);

    const [ loadLeadsFormModal, loadLeadsFormModalToggle ]
        = useToggle(false);

        const [
            industryForm,
            setIndustryForm,
            onIndustryChange,
            industryError,
            setIndustryError,
        ] = useForm(initIndustryForm);

        const [ industryC,
            updateIndustryC,
            industryRef,
            isIndustryRefVisible
        ] = useCollection(
            'industries',
            `status=active&page=1`
        );

        const [ loadLeadsForm, setLoadLeadsForm, onLoadLeadsChange, loadLeadsError, setLoadLeadsError ]
            = useForm(initLoadLeadsForm)

        const [ loadLeadsC, updateLoadLeadsC, loadLeadsRef, isLoadLeadsRefVisible ]
            = useCollection(
                'fetch-leads-from-apollo',
            )

    function onRowClick(e, index) {
        e.preventDefault();
        // navigate(`/leads/${leadC.items[index].id}`)
        leadDetailsFormModalToggle();
        // setLeadForm(
        //     data: leadC.items[index],
        // );
        setLeadForm(
            convertResponseToFormData({data: leadC.items[index]}),
        );

        setSelectedLeadId(leadC.items[index]?.id);
    }

    // useEffect(() => {
    //     updateLeadC(old => {
    //         let urlSearchParams = new URLSearchParams(old.queryString);
    //         let new_ = copy(old);
    //
    //         let toConnectLinkedin = urlSearchParams.get('to_linkedin_connect_on');
    //         // if (toConnectLinkedin !== filterForm.data.filterDate) {
    //
    //         // }
    //         urlSearchParams.set('to_linkedin_connect_on', filterForm.data.filterDate);
    //
    //         new_.queryString = urlSearchParams.toString();
    //         new_.loaded = false;
    //
    //         return new_;
    //     });
    // }, [ filterForm ]);

    useEffect(() => {
        console.log('@@Inside storage change useEffect');
        const handleStorageChange = (e) => {
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
                        leadDetails={leadDetails}
                        data={leadForm.data}
                        onChange={onLeadChange}
                        error={leadError}
                        // viewMode={viewMode}
                    />
                },
                // {
                //     name: 'Contact Details',
                //     content: <ContactDetails
                //         name='data'
                //         addressName='current_address'
                //         data={leadForm.data}
                //         setData={setLeadForm}
                //         onChange={onLeadChange}
                //         error={leadError}
                //         // viewMode={viewMode}
                //         emailRequired={true}
                //         addressRequired={true}
                //         timezoneRequired={true}
                //         phoneRequired={true}
                //         isCompanyDetails={false}
                //     />
                // },
            ]
        },
        {
            name: 'Company Details',
            icon: null,
            navigation:'company-details',
            subSections: [
                {
                    name: null,
                    content: <LeadCompanyDetails
                        id={id}
                        data={leadForm.data}
                        onChange={onLeadChange}
                        error={leadError}
                        setForm={setLeadForm}
                        // viewMode={viewMode}
                    />
                },
                // {
                //     name: 'Contact Details',
                //     content: <ContactDetails
                //         name='data'
                //         addressName='current_address'
                //         data={leadForm.data}
                //         setData={setLeadForm}
                //         onChange={onLeadChange}
                //         error={leadError}
                //         // viewMode={viewMode}
                //         emailRequired={false}
                //         addressRequired={true}
                //         timezoneRequired={true}
                //         phoneRequired={false}
                //         isCompanyDetails={true}
                //     />
                // },
            ]
        }
    ];

    if (id !== 'create') {
        let dangerZoneItems = [];

        let deleteSubSection = {
            mainActionTitle: 'Delete Lead',
            mainActionSubTitle: 'Are you sure, want to delete this lead?',
            actionButtonText: 'Delete',
            actionConfirmationText: 'Are you sure you want to delete this lead?',
            actionConfirmationButtonText: 'Yes, Delete',
            actionConfirmation: () => deleteRecord(id, 'leads', 'lead', alert_, navigate)
        }

        let archiveSubSection = {
            mainActionTitle: 'Archive Lead',
            mainActionSubTitle: 'Are you sure, want to archive this lead?',
            actionButtonText: 'Archive',
            actionConfirmationText: 'Are you sure you want to archive this lead?',
            actionConfirmationButtonText: 'Yes, Archive',
            actionConfirmation: () => archiveRecord(id, 'leads', 'lead')
        }

        let unArchiveSubSection = {
            mainActionTitle: 'Unarchive Lead',
            mainActionSubTitle: 'Lead will be available for campaigns',
            actionButtonText: 'Unarchive',
            actionConfirmationText: 'Are you sure you want to unarchive this lead?',
            actionConfirmationButtonText: 'Yes, Unarchive',
            actionConfirmation: () => unArchiveRecord(id, 'leads', 'lead')
        }

        //Add items in order for danger zone content
        // if (leadDetails?.data?.status === 'archived') {
        //     dangerZoneItems.push(unArchiveSubSection);
        // } else {
        //     dangerZoneItems.push(archiveSubSection);
        // }
        dangerZoneItems.push(deleteSubSection);

        // sections.push({
        //     name: 'Danger Zone',
        //     icon: 'danger-circle.svg',
        //     type: 'danger',
        //     navigation: 'danger-zone',
        //     subSections: [
        //         {
        //             name: null,
        //             content: <DangerZone
        //                 data={leadForm.data}
        //                 onChange={onLeadChange}
        //                 error={leadError}
        //                 items={dangerZoneItems}
        //             />
        //         }
        //     ]
        // });
    }

    //Used to convert response from API to form data
    function convertResponseToFormData(response) {
        const convertBooleanToString = (value) => {
            if ( value !== undefined && value !== null ) {
                return value ? 'true' : 'false'
            }

            return value;
        };

        return {
            data: {
                name: response?.data?.name ?? null,
                first_name: response?.data?.first_name ?? null,
                last_name: response?.data?.last_name ?? null,
                email: response?.data?.email ?? null,
                linkedin_url: response?.data?.linkedin_url ?? null,
                id_company: response?.data?.company_details?.id ?? null,
                id_designation: response?.data?.designation_details?.id ?? null,
                ids_user: response?.data?.users_details
                    ?.map(user => user?.user_details?.id) ?? [],
                first_sentence: response?.data?.first_sentence ?? null,
                last_sentence: response?.data?.last_sentence ?? null,
                is_saved: response?.data?.is_saved ?? null,
                id_industry: response?.data?.id_industry ?? null,
                competitors: response?.data?.competitors ?? null,
                // to_linkedin_connect_on: response?.data?.to_linkedin_connect_on ?? null,
                company: {
                    name: response?.data?.company_details?.name ?? null,
                    short_name: response?.data?.company_details?.short_name ?? null,
                    ultra_short_name: response?.data?.company_details?.ultra_short_name ?? null,
                    description: response?.data?.company_details?.description ?? null,
                    // website_url: response?.data?.company_details?.website_url ?? null,
                },
            }
        }
    }

    function convertFormDataToRequest(formData) {
        const convertStringToBoolean = (value) => {
            if (value !== undefined && value !== null) {
                return value === 'true';
            }

            return value;
        };

        console.log('Formdata', formData);
        // formData.data.start_page = Number(formData.data.start_page)
        // formData.data.end_page = Number(formData.data.end_page)
        console.log('formdata', formData);

        let requestData = removeEmptyKeys(formData,
            [null, undefined, {}, []],
            []
        );

        return requestData;
    }

    function createLead() {
        toggleLoaded();
        let requestData = convertFormDataToRequest(leadForm);

        request.post(`leads`, requestData)
            .then(([status_, response]) => {
                navigate('/leads');
                setLeadError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('New lead added');
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
                    setLeadError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function updateLead() {
        toggleLoaded();
        let requestData = convertFormDataToRequest(leadForm);

        console.log('Request Data', requestData, leadForm);
        request.patch(`leads/${selectedLeadId}`, requestData)
            .then(([status_, response]) => {
                let formData = convertResponseToFormData(response);
                setLeadForm(formData);
                setOriginalForm(formData);
                // setViewMode('read');
                setLeadError([]);
                // updateLeadVersionsC({
                //     reload: true,
                // });
                // toggleLoaded();
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Lead Updated');
                }
                updateLeadC({reload: true});
                leadDetailsFormModalToggle();
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while updating. Please try again.');
                }
                if (response.errors) {
                    setLeadError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function onCancelClick() {
        // setViewMode('read');
        setLeadForm(originalForm);
        leadDetailsFormModalToggle();
    }

    useEffect(() => {
        console.log('useEffect first line')
        if (id === 'create') {
            setLeadForm(initLeadForm);
            // setViewMode('edit');

            //Setting loaded to true, as we are not making API calls for create
            // updateLeadVersionsC({loaded: true,});
        } else {
            console.log('Before calling function')
            request.get(`leads/${id}`)
                .then(([status_, response]) => {
                    console.log('Inside useEffect option 2 :: SUCCESS');
                    let formData = convertResponseToFormData(response);
                    console.log('formData', response, formData);
                    setLeadForm(formData);
                    setOriginalForm(formData);
                    console.log('inside useEffe', { data: response.data});
                    setLeadDetails({ data: response.data});

                    if (response?.data?.status
                        && response?.data?.status==='archived'
                    ) {
                        // setViewMode('no-edit');
                    }

                    // if(response?.data?.company_details?.id) {
                    //     request.get(`companies/${response?.data?.company_details?.id}`)
                    //         .then(([status_, companyResponse]) => {
                    //             let companyData
                    //                 = convertCompanyResponseToFormData(companyResponse);
                    //             setCompanyDetails(companyData);
                    //         })
                    // }

                })
                .catch(([errorStatus, response]) => {
                    if (errorStatus === 404) {
                        setNotFound(true);
                    }
                })
            ;
        }
    }, []);

    function fetchLeads() {
        toggleLoaded();
        let requestData = convertFormDataToRequest(loadLeadsForm);

        request.post(`fetch-leads-from-apollo`, requestData)
            .then(([status_, response]) => {
                let formData = convertResponseToFormData(response);
                setLoadLeadsForm(formData);
                setOriginalLoadLeadsForm(formData);
                setLoadLeadsError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Fetching leads from Apollo');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while updating. Please try again.');
                }
                if (response.errors) {
                    setLoadLeadsError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            });
    }

    function fetchEmailsFromApollo() {
        request.post(`fetch-emails-from-apollo`, {})
            .then(([status_, response]) => {
                // Reload leads
                updateLeadC({reload: true});

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Emails fetched successfully from Apollo');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while updating. Please try again.');
                }
            })
            .finally(() => {
            });
    }

    function submitEmailsToNeverbounce() {
        request.post(`submit-emails-to-neverbounce`, {})
            .then(([status_, response]) => {
                // Reload leads
                updateLeadC({reload: true});

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Emails submitted to Neverbounce!');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while submitting to Neverbounce.');
                }
            })
            .finally(() => {
            });
    }

    function fetchEmailStatusesFromNeverbounce() {
        request.post(`check-and-fetch-all-neverbounce-jobs`, {})
            .then(([status_, response]) => {
                // Reload leads
                updateLeadC({reload: true});

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Email statuses fetched successfully from Neverbounce.');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while fetching email statuses.');
                }
            })
            .finally(() => {
            });
    }

    function submitEmailsToScrubby() {
        request.post(`submit-emails-to-scrubby`, {})
            .then(([status_, response]) => {
                // Reload leads
                updateLeadC({reload: true});

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Emails submitted to Scrubby!');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while submitting to Scrubby.');
                }
            })
            .finally(() => {
            });
    }

    function fetchEmailStatusesFromScrubby() {
        request.post(`fetch-email-statuses-from-scrubby`, {})
            .then(([status_, response]) => {
                // Reload leads
                updateLeadC({reload: true});

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Email statuses fetched successfully from Scrubby.');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while fetching email statuses from Scrubby.');
                }
            })
            .finally(() => {
            });
    }

    function moveLeadToVerificationStep(id_lead) {
        let requestData = {
            data: {
                'id_lead': id_lead,
            }
        }
        request.post(`move-lead-to-verification-step`, requestData)
            .then(([status_, response]) => {
                // Reload leads
                // updateLeadC({reload: true});

                // Remove that lead alone from the collection
                updateLeadC(old => {
                    let new_ = copy(old);

                    const leadIndex = new_.items.findIndex(item => item.id == id_lead);
                    // alert('Index: ' + leadIndex)

                    new_.items.splice(leadIndex, 1);

                    return new_;
                });

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Success!');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while promoting lead');
                }
            })
            .finally(() => {
            });
    }

    function moveLeadToInstantlyStep(id_lead) {
        let requestData = {
            data: {
                'id_lead': id_lead,
            }
        }
        request.post(`move-lead-to-instantly-step`, requestData)
            .then(([status_, response]) => {
                // Reload leads
                // updateLeadC({reload: true});

                // Remove that lead alone from the collection
                updateLeadC(old => {
                    let new_ = copy(old);

                    const leadIndex = new_.items.findIndex(item => item.id == id_lead);
                    // alert('Index: ' + leadIndex)

                    new_.items.splice(leadIndex, 1);

                    return new_;
                });

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Success!');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while promoting lead');
                }
            })
            .finally(() => {
            });
    }

    function pushLeadsToInstantlyCampaigns() {
        request.post(`push-leads-to-instantly-campaigns`, {})
            .then(([status_, response]) => {
                // Reload leads
                updateLeadC({reload: true});

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Emails pushed to Instantly. Please check the respective campaigns!');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while submitting to Instantly campaigns');
                }
            })
            .finally(() => {
            });
    }

    function dumpLeads(ids_lead) {
        let requestData = {
            data: {
                'ids_lead': ids_lead,
            }
        }
        request.post(`dump-leads`, requestData)
            .then(([status_, response]) => {
                // Reload leads
                // updateLeadC({reload: true});

                // Remove that lead alone from the collection
                for (const id_lead of ids_lead) {
                    updateLeadC(old => {
                        let new_ = copy(old);

                        const leadIndex = new_.items.findIndex(item => item.id == id_lead);
                        // alert('Index: ' + leadIndex)

                        new_.items.splice(leadIndex, 1);

                        return new_;
                    });
                }

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Success!');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while dumping leads');
                }
            })
            .finally(() => {
            });
    }

    return <div id='main-grid' className={`${mainClassName}`}>
        <Header />
        <Sidebar />
        <div id='leads-view' className='app-content listing-view'>
            <PageTopRow
                title={pageType === 'archive-listing'
                    ? 'Archived Leads'
                    : 'Leads'
                }
                buttonText={'Add Lead'}
                onButtonClick={() => navigate('/leads/create')}
                onButtonClickLoadLeads={loadLeadsFormModalToggle}
                type={pageType}
                setType={setPageType}
                searchAttributes={{
                    suggestionsURL: 'leads',
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
                    onSuggestionClick: (leadId) => {
                        navigate(`/leads/${leadId}`);
                    },
                }}
                filterData={filterForm.data}
                setFilterData={setFilterForm}
                collection={leadC}
                updateCollection={updateLeadC}
                leads
            />

            <div className='page-content'>
                <div className='steps-wrapper'>
                    <div className='left-content'>
                        <Steps
                            activeStep={activeStep}
                            setActiveStep={setActiveStep}
                            stepsData={stepsData}
                            updateStepsUrl={updateStepsUrl}
                            reloadSteps={reloadSteps}
                            activeStepCount={leadC.items.length}
                        />
                    </div>
                    <div className='right-content'>
                        {/* <button onClick={() => updateLeadC({reload: true})}>Reload leads</button> */}
                        <button className='button primary-button'
                            onClick={() => updateLeadC({
                                queryString: `id_step=${activeStep.id}&has_failed_on_step=false`
                            })}>
                                Active Leads
                        </button>
                        <button className='button primary-button'
                            onClick={() => updateLeadC({
                                queryString: `id_step=${activeStep.id}&has_failed_on_step=true`
                            })}>
                                Failed Leads
                        </button>

                        {activeStep.token == 'fetching_emails_from_apollo' && <button
                            className='button primary-button'
                            onClick={fetchEmailsFromApollo}
                        >Fetch emails</button>}

                        {activeStep.token == 'verifying_emails_using_neverbounce' && <button
                            className='button primary-button'
                            onClick={e => {
                                setIsFetchStatusFromNeverbounceButtonVisible(false);
                                setTimeout(() => {
                                    setIsFetchStatusFromNeverbounceButtonVisible(true);
                                }, 15000);
                                submitEmailsToNeverbounce(e)
                            }}
                        >Submit to Neverbounce</button>}

                        {activeStep.token == 'verifying_emails_using_neverbounce'
                            && isFetchStatusFromNeverbounceButtonVisible
                            && <button
                            className='button primary-button'
                            onClick={fetchEmailStatusesFromNeverbounce}
                        >Fetch statuses from Neverbounce</button>}

                        {activeStep.token == 'verifying_emails_using_scrubby' && <>
                            <button
                                className='button primary-button'
                                onClick={e => {
                                    submitEmailsToScrubby(e)
                                }}
                            >Submit to Scrubby</button>
                            <button
                                className='button primary-button'
                                onClick={e => {
                                    fetchEmailStatusesFromScrubby(e)
                                }}
                            >Fetch statuses from Scrubby</button>
                        </>}

                        {activeStep.token == 'pushing_to_instantly' && <button
                            className='button primary-button'
                            onClick={pushLeadsToInstantlyCampaigns}
                        >Push leads to Instantly campaigns</button>}
                    </div>
                </div>

                <Table
                    className='leads-table row-link'
                    data-test='leads-table'
                    items={leadC.items}
                    columns={columns}
                    controlColumns={[]}
                    loaded={leadC.loaded}
                    onRowClick={onRowClick}
                    tableEmptyText={pageType === 'archive-listing'
                        ? 'No archived leads'
                        : 'No leads added'
                    }
                    addNewRecordButtonText={pageType === 'archive-listing'
                        ? undefined
                        : 'Add Lead'
                    }
                    addNewRecordButtonURL='/leads/create'
                    collection={leadC}
                    updateCollection={updateLeadC}
                    reference={leadRef}
                    queryString={leadC.queryString}

                    name='lead'
                    setColumns={setColumns}
                    enableColumnPreference

                    customData={{activeStep: activeStep}}
                />
            </div>
           {leadDetailsFormModal && (
            <FormModal className='lead-details-modal'
                toggleModal={() => {
                    leadDetailsFormModalToggle();
                }}
                selectedLeadId={selectedLeadId}
            >
                {/* <PageTopRow
                    title={id === 'create'
                        ? 'Add Lead'
                        : `${leadDetails?.data?.name ?? ''}`
                    }
                    backButtonURL='/leads'
                    type={pageType}
                    archivedMessage={leadDetails?.data?.status === 'archived'
                        ? 'This lead has been archived'
                        : null
                    }

                    originalForm={originalForm}
                    updateForm={leadForm}
                    showUnsavedChangesBanner
                /> */}

                <div className='page-content'>
                    {/* <div className='left-page-content no-scrollbar'>
                        <FormActions
                            id={id}
                            // type={viewMode}
                            // setType={setViewMode}
                            createLabel='Add Lead'
                            submitAction={id === 'create'
                                ? createLead
                                : updateLead
                            }
                            cancelAction={onCancelClick}
                        />
                    </div> */}
                    <div className='right-page-content' data-test='right-page-content'>
                        <Sections sections={sections} />
                        <div className='save-cancel-button'>
                            <button className='button primary-button'>Promote Lead</button>
                            <button className='button primary-button'
                                onClick={e => updateLead()}
                            >Save</button>
                            <button className='button secondary-button cancel-action-button' onClick={onCancelClick}>Cancel</button>
                        </div>
                    </div>
                </div>
            </FormModal>
            )}
            {loadLeadsFormModal && (
                <FormModal
                    title='Load Leads'
                    toggleModal={() => {
                        loadLeadsFormModalToggle();
                    }}
                >
                    <div className='apollo-form-inputs-wrapper'>
                        <Input className='search-url'
                            label='Search-URL'
                            name='data.search_url'
                            value={loadLeadsForm?.data?.search_url}
                            onChange={onLoadLeadsChange}
                            error={loadLeadsError['data.search_url']}
                        />
                        <SelectField
                            label='Choose Industry'
                            options={getOptions(industryC?.items, 'name', 'id') ?? []}
                            name='data.id_industry'
                            value={loadLeadsForm?.data?.id_industry}
                            onChange={onLoadLeadsChange}
                            error={loadLeadsError['data.id_industry']}
                        />
                        <Input className='start-page-no'
                            label='Start Page'
                            name='data.start_page'
                            value={loadLeadsForm?.data?.start_page}
                            onChange={onLoadLeadsChange}
                            error={loadLeadsError['data.start_page']}
                        />
                        <Input className='end-page-no'
                            label='End Page'
                            name='data.end_page'
                            value={loadLeadsForm?.data?.end_page}
                            onChange={onLoadLeadsChange}
                            error={loadLeadsError['data.end_page']}
                        />
                        <button className='button primary-button'
                            onClick={fetchLeads}
                        >
                            Fetch Leads
                        </button>
                    </div>
                </FormModal>
            )}
        </div>
    </div>
}

function BasicDetailsPrimary(props) {
    let { commonData } = useContext(CommonValueContext);
    const [designationsC] = useCollection('designations');
    const [userC] = useCollection('users');
    const [companyC] = useCollection('companies');
    let [industryC] = useCollection('industries');

    return <div className='basic-details-primary'>
        {/* <div className='title'>
            <SelectField label='Title'
                className='lead-title'
                options={getOptions(jsonData?.titles, 'label', 'token') ?? []}
                name='data.title'
                value={props.data.title}
                onChange={props.onChange}
                error={props.error['data.title']}
                // viewMode={props.viewMode}
            />
        </div> */}
        <div className='first-name'>
            <Input label='First Name'
                name='data.first_name'
                className='lead-first-name-input'
                value={props.data.first_name}
                onChange={props.onChange}
                error={props.error['data.first_name']}
                // viewMode={props.viewMode}
            />
        </div>
        <div className='last-name'>
            <Input label='Last Name'
                name='data.last_name'
                className='lead-last-name-input'
                value={props.data.last_name}
                onChange={props.onChange}
                error={props.error['data.last_name']}
                // viewMode={props.viewMode}
            />
        </div>
        <div className='full-name'>
            <Input label='Full Name'
                name='data.name'
                className='lead-full-name-input'
                value={props.data.name}
                onChange={props.onChange}
                error={props.error['data.name']}
                // viewMode={props.viewMode}
            />
        </div>
        <div className='lead-email'>
            <Input label='Email'
                name='data.email'
                value={props.data.email}
                onChange={props.onChange}
                viewMode={props.viewMode}
                // error={props.error[`${props.name}.email`]}
                error={props.error['data.email']}
            />
        </div>
        <div className='company-industry'>
            <SelectField label='Industry'
                options={getOptions(industryC?.items, 'name', 'id') ?? []}
                name='data.id_industry'
                value={props.data?.id_industry}
                onChange={props.onChange}
                error={props.error['data.id_industry']}
            // viewMode={'read'}
            />
        </div>
        <div className='company-competitor'>
            <Input label='Competitor'
                className='company-competitors'
                name='data.competitors'
                value={props.data.competitors}
                onChange={props.onChange}
                error={props.error['data.competitors']}
            // viewMode={props.viewMode}
            />
        </div>
        <div className='linkedin-url'>
            <Input label='LinkedIn URL'
                name='data.linkedin_url'
                className='lead-linkedin-url-input'
                value={props.data.linkedin_url}
                onChange={props.onChange}
                error={props.error['data.linkedin_url']}
                // viewMode={props.viewMode}
            />
        </div>
        {/* <div className='linkedin-connections'>
            <Input label='LinkedIn Connections'
                type='number'
                name='data.number_of_linkedin_connects'
                className='lead-linkedin-connections-input'
                value={props.data.number_of_linkedin_connects}
                onChange={props.onChange}
                error={props.error['data.number_of_linkedin_connects']}
                // viewMode={props.viewMode}
            />
        </div>
        <div className='connected-with'>
            <DropDownMultiSelect label='Connected With'
                options={getOptions(userC?.items, 'name', 'id') ?? []}
                name='data.ids_user'
                value={props.data.ids_user || []}
                onChange={props.onChange}
                error={props.error['data.ids_user']}
                // viewMode={props.viewMode}
            />
        </div>
        <div className='lead-company'>
            <SelectField label='Company'
                options={getOptions(companyC?.items, 'name', 'id') ?? []}
                name='data.id_company'
                className='lead-company-input'
                value={props.data.id_company}
                onChange={props.onChange}
                error={props.error['data.id_company']}
                // viewMode={props.viewMode}
            />
        </div> */}
        {/* <div className='to-linkedin-connect'>
            <DateField label='To LinkedIn Connect On'
                name='data.to_linkedin_connect_on'
                value={props.data.to_linkedin_connect_on}
                onChange={props.onChange}
                error={props.error['data.to_linkedin_connect_on']}
                // viewMode={props.viewMode}
            />
        </div> */}
        <div className='lead-first-sentence'>
            <Input label='First Sentence'
                className='company-description-input'
                type='textarea'
                name='data.first_sentence'
                value={props.data?.first_sentence}
                onChange={props.onChange}
                error={props.error['data.first_sentence']}
            // viewMode={'read'}
            />
        </div>
        <div className='lead-last-sentence'>
            <Input label='Last Sentence'
                className='company-description-input'
                type='textarea'
                name='data.last_sentence'
                value={props.data?.last_sentence}
                onChange={props.onChange}
                error={props.error['data.last_sentence']}
            // viewMode={'read'}
            />
        </div>
    </div>
}

function LeadCompanyDetails(props) {
    let { commonData } = useContext(CommonValueContext);
    let [industryC] = useCollection('industries');
    let [specializationC] = useCollection('specializations');
    // let [companyTypeC] = useCollection('company-type');
    let [companyTypeC] = useCollection('companies');

    const recommendations = getCompanyShortForms(props.data?.company?.name);

    return <div className='lead-company-details'>
        <div className='company-name'>
            <Input label='Company Name'
                name='data.company.name'
                className='lead-company-name-input'
                value={props.data?.company?.name}
                onChange={props.onChange}
            // viewMode={'read'}
            />
        </div>
        <div className='company-short-name'>
            <Input label='Company Short Name'
                className='lead-company-name-input'
                name='data.company.short_name'
                value={props.data?.company?.short_name}
                onChange={props.onChange}
                // viewMode={'read'}
            />
            {recommendations && <div className='name-recommendations'>
                {recommendations.shorts.map((short_) => {
                    return <>
                        <button className='name-recommendation' onClick={e => {
                            props.setForm(old => {
                                let new_ = copy(old);
                                new_.data.company.short_name = short_;

                                return new_;
                            });
                        }}>
                            {short_}
                        </button>
                        &nbsp;&nbsp;
                    </>
                })}
            </div>}
        </div>
        <div className='company-ultra-short-name'>
            <Input label='Company Ultra Short Name'
                className='lead-company-name-input'
                name='data.company.ultra_short_name'
                value={props.data?.company?.ultra_short_name}
                onChange={props.onChange}
                // viewMode={'read'}
            />
            {recommendations && <div className='name-recommendations'>
                {recommendations.shorts.map((short_) => {
                    return <>
                        <button className='name-recommendation' onClick={e => {
                            props.setForm(old => {
                                let new_ = copy(old);
                                new_.data.company.ultra_short_name = short_;

                                return new_;
                            });
                        }}>
                            {short_}
                        </button>
                        &nbsp;&nbsp;
                    </>
                })}
            </div>}
        </div>
        {/* <div className='company-website'>
            <Input label='Company Website' 
                className='company-website'
                name='data.company.website_url'
                value={props.data?.company?.website_url}
                onChange={props.onChange}
                error={props.error['data.company.website_url']}
            />
        </div>
        <div className='company-notes'>
            <Input label='Notes' 
                type='textarea'
                className='company-notes'
                // name='data.company.website_url'
                // value={props.data?.company?.website_url}
                // onChange={props.onChange}
                // error={props.error['data.company.website_url']}
            />
        </div> */}
        {/* <div className='company-specialities'>
            <DropDownMultiSelect label='Company Specialities'
                //options={getOptions(specializationC?.items, 'name', 'id') ?? []}
                name='data.ids_specialities'
                value={props.data?.ids_specialities || []}
                onChange={props.onChange}
                error={props.error['data.ids_specialities']}
                options={commonData?.users
                    ? getOptions(commonData.users, 'name', 'id')
                    : []
                }
            // viewMode={'read'}
            />
        </div>
        <div className='company-website'>
            <Input label='Company Website'
                name='data.website_url'
                className='website-url-input'
                value={props.data?.website_url}
                onChange={props.onChange}
                error={props.error['data.website_url']}
            // viewMode={'read'}
            />
        </div>
        <div className='company-employee-count'>
            <Input label='Company Employee Count'
                type='number'
                name='data.employee_count'
                className='employee-count-input'
                value={props.data?.employee_count}
                onChange={props.onChange}
                error={props.error['data.employee_count']}
            // viewMode={'read'}
            />
        </div>
        <div className='min-company-employee-count'>
            <Input label='Min Company Employee Count'
                type='number'
                className='company-employee-count-input'
                name='data.employee_count_min'
                value={props.data?.employee_count_min}
                onChange={props.onChange}
                error={props.error['data.employee_count_min']}
            // viewMode={'read'}
            />
        </div>
        <div className='max-company-employee-count'>
            <Input label='Max Company Employee Count'
                type='number'
                name='data.employee_count_max'
                className='max-company-employee-count'
                value={props.data?.employee_count_max}
                onChange={props.onChange}
                error={props.error['data.employee_count_max']}
            // viewMode={'read'}
            />
        </div>
        <div className='company-type'>
            <SelectField label='Company Type'
                options={getOptions(companyTypeC?.items, 'name', 'id') ?? []}
                name='data.id_company_type'
                className='company-type-input'
                value={props.data?.id_company_type}
                onChange={props.onChange}
                error={props.error['data.id_company_type']}
            // viewMode={'read'}
            />
        </div>
        <div className='company-founded'>
            <Input label='Company Founded'
                type='number'
                name='data.founded_year'
                className='company-founded-input'
                value={props.data?.founded_year}
                onChange={props.onChange}
                error={props.error['data.founded_year']}
            // viewMode={'read'}
            />
        </div> */}
        <div className='company-description'>
            <Input label='Company Description'
                type='textarea'
                name='data.company.description'
                className='company-description-input'
                value={props.data?.company?.description}
                onChange={props.onChange}
                error={props.error['data.company.description']}
            // viewMode={'read'}
            />
        </div>
    </div>
}

function Steps({activeStep, setActiveStep, stepsData, activeStepCount}) {
    return <div className='steps'>
        <div
            className={
                activeStep.id == 0
                    ? 'step-active'
                    : 'step'
            }
        >
            <button
                onClick={() => setActiveStep({id: 0})}
            >
                All leads
            </button>
        </div>
        {stepsData?.map((stepData) => <div
            className={
                activeStep.id == stepData.id
                    ? 'step-active'
                    : 'step'
            }
        >
            <button
                onClick={() => setActiveStep(stepData)}
            >
                {stepData.name} {`(${stepData.leads_count})`}
            </button>
        </div>)}
    </div>
}

function getCompanyShortForms(name) {
    if (!name) {
        return null;
    }

    let shorts = [];

    // First name
    shorts.push(name.split(' ')[0]);
    // First & second names
    shorts.push(name.split(' ').slice(0, 2).join(' '))
    // Acronym
    shorts.push(name.split(' ').map(word => word.charAt(0).toUpperCase()).join(''))

    let ultraShorts = [];

    // First name
    ultraShorts.push(name.split(' ')[0]);
    // First & second names
    ultraShorts.push(name.split(' ').slice(0, 2).join(' '))
    // Acronym
    ultraShorts.push(name.split(' ').map(word => word.charAt(0).toUpperCase()).join(''))

    return { shorts, ultraShorts }
}


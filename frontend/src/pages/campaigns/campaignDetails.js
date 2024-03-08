import React, { useState, useEffect, useContext, useRef, useLayoutEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useAlert } from 'react-alert';

import { CommonValueContext, UserPreferenceContext, MeContext } from 'src/contexts';
import { useForm, useToggle, getEventValue, useCollection, useDeepCompareEffect } from 'src/hooks';
import {
    Icon,
    Table,
    Modal,
    Button,
    Header,
    Sidebar,
    BarChart,
    ContactCTA,
    NotFoundView,
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
import {
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
import jsonData from '/data/json_data/input_data';
import moment, { weekdays } from 'moment';

const initCampaignForm = {
    data: {
        // name: null,
        // id_exhibit_app: null,
        // mail_accounts: [],
        // ids_template: [],
        // sessions: [],

        created_at: null,
        last_updated_at: null,
        name: null,
        notes: null,
        start_date: null,
        end_date: null,
        end_type: null,
        status: null,
        is_deleted: null,
        campaign_leads_details: [],
        creator_user_details: null,
    }
}


export default function CampaignDetailsView(props) {
    let { id } = useParams();
    const alert_ = useAlert();
    const navigate = useNavigate();
    const { me, setMe } = useContext(MeContext);
    const { isSubMenuCollapsed, toggleSubMenu } = useContext(UserPreferenceContext);

    const [ notFound, setNotFound ] = useState(false);

    const [ deceasedModal, toggleDeceasedModal ] = useToggle(false);
    const [ viewMode, setViewMode] = useState('read'); //edit/read/no-edit( when archived )
    const [ pageType, setPageType ] = useState('detatil-page');
    const [ originalForm, setOriginalForm] = useState(initCampaignForm);
    const [ selectedVersion, setSelectedVersion ] = useState(null);
    const [ campaignDetails, setCampaignDetails ] = useState(null); //To show any other records

    const [
        campaignForm,
        setCampaignForm,
        onCampaignChange,
        campaignError,
        setCampaignError,
    ] = useForm(initCampaignForm);
    const [ loaded, toggleLoaded ] = useToggle(false);

    const [ campaignVersionsC, updateCampaignVersionsC ] = useCollection(null);

    const [ mainClassName, setMainClassName] = useState(
        JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
        ? 'expanded-view'
        : ''
    );

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
                        viewMode={viewMode}
                    />
                },
            ]
        },
        {
            name: 'Leads',
            icon: null,
            navigation: 'basic-details',
            subSections: [
                {
                    name: null,
                    content: <CampaignLeads
                        id={id}
                        data={campaignForm.data}
                        onChange={onCampaignChange}
                        error={campaignError}
                        viewMode={viewMode}
                    />
                },
            ]
        },
        {
            name: 'Sequences',
            icon: null,
            navigation: 'sequences',
            subSections: [
                {
                    name: null,
                    content: <SequencesPrimary
                        id={id}
                        data={campaignForm.data}
                        onChange={onCampaignChange}
                        error={campaignError}
                        viewMode={viewMode}
                    />
                },
            ]
        },
        {
            name: 'Schedule',
            icon: null,
            navigation: 'schedules',
            subSections: [
                {
                    name: null,
                    content: <WeekdaySchedules
                        id={id}
                        data={campaignForm.data}
                        onChange={onCampaignChange}
                        error={campaignError}
                        viewMode={viewMode}
                    />
                },
            ]
        },
    ];

    //Used to convert response from API to form data
    function convertResponseToFormData(response) {
        // console.log('Response', response.data.phones_details);
        const convertBooleanToString = (value) => {
            if ( value !== undefined && value !== null ) {
                return value ? 'true' : 'false'
            }

            return value;
        };

        return {
            'data': {
                'name': response.data.name,
                'notes': response.data.notes,
                'start_date': response.data.start_date,
                'end_date': response.data.end_date,
                'end_type': response.data.end_type,
                'status': response.data.status,
                'campaign_leads_details': response.data.campaign_leads_details,
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
        let requestData = removeEmptyKeys(formData,
            ['', null, undefined, {}, []],
        );

        return requestData;
    }

    function createCampaign() {
        let requestData = convertFormDataToRequest(campaignForm);

        request.post(`campaigns`, requestData)
            .then(([status_, response]) => {
                // let formData = convertResponseToFormData(response);
                // setCampaignForm(formData);
                // toggleLoaded();
                navigate('/campaigns');
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
        console.log('Campaign Form', campaignForm);
        let requestData = convertFormDataToRequest(campaignForm);

        console.log('Request Data', requestData);
        request.patch(`campaigns/${id}`, requestData)
            .then(([status_, response]) => {
                let formData = convertResponseToFormData(response);
                setCampaignForm(formData);
                setOriginalForm(formData);
                setViewMode('read');
                setCampaignError([]);
                updateCampaignVersionsC({
                    reload: true,
                });
                // toggleLoaded();
                if (response.message) {
                    alert_.success(response.message);
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
                if (response.errors) {
                    setCampaignError(response.errors);
                }
            });
    }

    function onCancelClick() {
        setViewMode('read');
        setCampaignForm(originalForm);
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
        setViewMode('read');
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
            setViewMode('edit');

            //Setting loaded to true, as we are not making API calls for create
            updateCampaignVersionsC({loaded: true,});
        } else {
            // console.log('Inside useEffect option 2');
            request.get(`campaigns/${id}`)
                .then(([status_, response]) => {
                    // console.log('Inside useEffect option 2 :: SUCCESS');
                    let formData = convertResponseToFormData(response);
                    setCampaignForm(formData);
                    setOriginalForm(formData);
                    setCampaignDetails({ data: response.data});
                    toggleLoaded();

                    if (response?.data?.status
                        && response?.data?.status==='archived'
                    ) {
                        setViewMode('no-edit');
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
                url: `campaigns/${id}/versions`,
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

    const myButton = (
        <button className='button primary-button' 
            // onClick={() => console.log('Button clicked')}
        >
            <Icon path='start.svg' size={16} />
          Campaign
        </button>
      );

    return <div id='main-grid' className={`${mainClassName}`}>
        <Header />
        <Sidebar />
        <div id='campaign-details-view' className='app-content details-view'>
            {notFound
                ? <NotFoundView />
                : <>
                    {/* {!equal(campaignForm, originalForm) && <UnsavedDataBanner />} */}
                    {/* {equal(campaignForm, originalForm) && <UnsavedDataBanner placeholder />} */}
                    <PageTopRow
                        title={id === 'create'
                            ? 'Add Campaigns'
                            :  `${campaignDetails?.data?.name ?? ''}`
                        }
                        backButtonURL='/campaigns'
                        type={pageType}
                        archivedMessage={campaignDetails?.data?.status === 'archived'
                            ? 'This campaign has been archived'
                            : null
                        }

                        originalForm={originalForm}
                        updateForm={campaignForm}
                        showUnsavedChangesBanner
                    >
                        {myButton}
                        </PageTopRow>
                    <div className={`page-content ${isSubMenuCollapsed ? 'collapsed' : ''}`}>
                        <div className='left-page-content no-scrollbar'>
                            <NavigationPanel sections={sections} />
                            {/* {(selectedVersion === null && me.permissions_map?.update_client)
                            && <FormActions
                                id={id}
                                type={viewMode}
                                setType={setViewMode}
                                createLabel='Add Campaign'
                                submitAction={id === 'create'
                                    ? createCampaign
                                    : () => {
                                        if (campaignForm.data.client_status === 'inactive'
                                        && (originalForm.data.client_status === undefined
                                            || originalForm.data.client_status === null
                                            || originalForm.data.client_status === 'active'
                                            )
                                        ) {
                                            toggleDeceasedModal();
                                            return;
                                        }
                                        updateCampaign();
                                    }
                                }
                                cancelAction={onCancelClick}
                            />} */}
                        </div>
                        <div className='right-page-content' data-test='right-page-content'>
                            <Sections sections={sections} />
                        </div>
                    </div>
                </>
            }
            {/* {deceasedModal && <Modal title='Warning'
                toggleModal={toggleDeceasedModal}
            >
                <div className='deceased-status-warning'>
                    <div className='warning-text'>
                        <p>
                        Future bookings for this client will be automatically cancelled if the status is changed to deceased, at which point the client will be archived.
                        </p>
                        <p> Are you sure you want to proceed with this action?</p>
                    </div>

                    <div className='action-buttons'>
                        <button className='button secondary-button'
                            onClick={e => {
                                e.preventDefault();
                                toggleDeceasedModal();
                            }}
                        >
                            Cancel
                        </button>
                        <button className='button primary-button'
                            onClick={e => {
                                updateCampaign();
                                toggleDeceasedModal();
                            }}
                        >
                            Yes
                        </button>
                    </div>
                </div>
            </Modal>} */}
        </div>
    </div>
}

function BasicDetailsPrimary(props) {
    let { commonData } = useContext(CommonValueContext);

    return <div className='basic-details-primary'>
        <div className='campaign-name'>
            <Input label='Campaign Name'
                name='data.name'
                className='lead-linkedin-connections-input'
                value={props.data.linkedin_connections}
                onChange={props.onChange}
                error={props.error['data.linkedin_connections']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='connected-with'>
            <DropDownMultiSelect label='Connected With'
                name='data.transportation.ids_connected_with'
                value={props.data?.transportation?.ids_connected_with || []}
                onChange={props.onChange}
                error={props.error['data.transportation.ids_connected_with']}
                options={commonData?.users
                    ? getOptions(commonData.users, 'name', 'id')
                    :  []
                }
                viewMode={props.viewMode}
            />
        </div>
        <div className='start-date'>
            <DateField label='Start Date'
                name='data.dob'
                value={props.data.dob}
                onChange={props.onChange}
                error={props.error['data.dob']}
                viewMode={props.viewMode}
                disableAfter={moment()}
            />
        </div>
    </div>
}

function CampaignLeads(props) {
    const [ leadC,
        updateLeadC,
        leadRef,
        isLeadRefVisible
    ] = useCollection(
        'leads',
    );

    const [ columns, setColumns ]  = useState([
        {
            name: 'Lead',
            id: 'name',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                return <div className='lead-details'>
                    <div className='lead-name'>
                        Robert Dawson
                    </div>
                    <div className='lead-email'>
                        robertdawson@example.com
                    </div>
                </div>
            }
        },
        {
            name: 'Lead Detail',
            id: 'role',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                let linkedIn = 'https://sg.linkedin.com/in/random-user-1665b11aa?trk=people-guest_people_search-card';
                let linkedInDisplay;
                if (linkedIn) {
                    linkedInDisplay = linkedIn.length <= 20
                        ? linkedIn
                        : linkedIn.slice(0, 20) + '...'
                } else {
                    linkedInDisplay = <span className='data-not-available'>Not available</span>
                }
                return <div className='lead-role-linkedin'>
                    <div className='lead-role'>
                        CEO
                    </div>
                    <div className='lead-linkedin'
                        onClick={e => openURLInNewTab(e, linkedIn, false)}
                    >
                        {linkedInDisplay}
                    </div>
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
                    France
                </div>
            }
        },
        {
            name: 'Connected With',
            id: 'linkedin-connection',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                let connectedWith = [
                    {
                        name: 'Paul',
                    },
                    {
                        name: 'Kevin',
                    }
                ]
                return <div className='linkedin-connected-with'>
                    {connectedWith.map(connectedWith => connectedWith.name).join(', ')}
                </div>
            }
        },
        {
            name: 'Step',
            id: 'step',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                let options = [
                    {
                        label: 'To be emailed',
                        value: 'to-be-emailed'
                    },
                    {
                        label: 'Got Response',
                        value: 'got-response'
                    }
                ]
                return <div className='linkedin-connected-with'>
                    <SelectField
                        options={options}
                    />
                </div>
            }
        },
        {
            name: 'Company',
            id: 'company',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                let companyWebsite = 'www.marvinandsons.com';
                let companyWebsiteDisplay;
                if (companyWebsite) {
                    companyWebsiteDisplay = companyWebsite.length <= 20
                        ? companyWebsite
                        : companyWebsite.slice(0, 20) + '...'
                } else {
                    companyWebsiteDisplay = <span className='data-not-available'>Not available</span>
                }

                return <div className='company-details'>
                    <div className='company-name'>
                        Marvin and Sons
                    </div>
                    <div className='company-website'
                        onClick={e => openURLInNewTab(e, companyWebsite)}
                    >
                        {companyWebsiteDisplay}
                    </div>
                </div>
            }
        },
    ]);

    function onRowClick(e, index) {
        e.preventDefault();
        // navigate(`/leads/${clientC.items[index].id}`)
    }

    return <div className='company-leads'>
        <Table
            className='company-leads-table row-link'
            data-test='company-leads-table'
            items={[{id: 1}]}
            columns={columns}
            controlColumns={[]}
            loaded={leadC.loaded}
            onRowClick={onRowClick}
            tableEmptyText= 'No leads added'
            collection={leadC}
            updateCollection={updateLeadC}
            reference={leadRef}
            queryString={leadC.queryString}

            name='company-leads'
            setColumns={setColumns}
            enableColumnPreference
        />
    </div>
}

function SequencesPrimary(props) {
    return <div className='sequences-primary'>
        <div className='sequence-primary-left'>
            <SequenceEmailSchedule />
        </div>
        <div className='sequence-primary-right'>
            <SequnceEmailTemplates />
        </div>
    </div>
}

function SequenceEmailSchedule(props)   {
    return <div className='sequence-email-schedule'>
        {[1, 2].map((sequenceEmail, index) => <SequenceEmail index={index} /> )}
        <div className='add-sequence-email'>
            <button className='button secondary-button add-sequnce-email-button'>
                + Follow-up
            </button>
        </div>
    </div>
}

function SequenceEmail(props) {
    return <div className='sequence-email'>
        <div className='sequence-header'>
            <div className='sequence-title'>First Email</div>
            <div className='sequence-subtitle'></div>
        </div>
        {props.index !=  0 && <div className='sequence-followup'>
            <div className='wait-for'>
                <Input label='Wait For'
                    name='data.first_name'
                    className='sequence-wait-for-input'
                    value={props.data?.first_name}
                    onChange={props.onChange}
                    viewMode={props.viewMode}
                />
            </div>
            <div className='wait-for-unit'>
                <SelectField label='Time'
                    options={[]}
                    name='data.id_industry'
                    value={props.data?.id_industry}
                    onChange={props.onChange}
                    viewMode={props.viewMode}
                />
            </div>
        </div>}
        <div className='sequence-template'>
            <SelectField label='Choose Template'
                className='choose-template-input'
                options={[]}
                name='data.title'
                value={props.data?.title}
                onChange={props.onChange}
                viewMode={props.viewMode}
            />
        </div>
    </div>
}

function SequnceEmailTemplates(props) {
    return <div className='sequence-email-templates'>
        { [1, 2].map(sEmailTemplate => <SequnceEmailTemplate />)}
    </div>
}

function SequnceEmailTemplate(props) {
    return <div className='sequence-email-template'>
        <div className='email-template-top'>
            <div className='email-template-order'>
                First Email
            </div>
            <div className='email-template-subject'>
                Subject: firstName - Out CTO would like to talk with you
            </div>
        </div>
        <div className='email-template-body'>
            Hi firstName, I just spoke to our CTO about companyName and we 
            wanted to discuss the possibility of working together. We’re in 
            the process of finding agencies similar to companyName for 
            potential partnerships and strategic alliances. We are looking 
            for strategic partners to work with on many fronts: Since we are 
            singularly focused as a production company, we occasionally have 
            clients that have needs that are beyond what we offer and it is 
            great to have the right partners already in place to refer them 
            to. Let me know if you're available for an exploratory call this 
            week or next.
            Thanks, YOUR NAME
        </div>
    </div>
}

function WeekdaySchedules(props) {
    return <div className='weekday-schedules'>
        {[1, 2, 3].map(weekday => <WeekdayScheduleRow />)}
    </div>
}

function WeekdayScheduleRow(props) {
    return <div className='weekday-schedule-row'>
        <div className='weekday-enable-checkbox'>
            <Checkbox labelText='Sunday'
                name='data.cald_required'
                checked={true}
                value={props.data?.cald_required}
                onChange={props.onChange}
                viewMode={props.viewMode}
            />
        </div>
        <div className='weekday-start-time'>
            <TimeInput
                label='Start Time'
                format={'DD MMM, YYYY'}
                placeholder='HH:MM'
                name={`${props.name}.drop_off_time`}
                value={props.data?.drop_off_time}
                onChange={props.onChange}
                viewMode={props.viewMode}
            />
        </div>
        <div className='weekday-end-time'>
            <TimeInput
                label='End Time'
                format={'DD MMM, YYYY'}
                placeholder='HH:MM'
                name={`${props.name}.drop_off_time`}
                value={props.data?.drop_off_time}
                onChange={props.onChange}
                viewMode={props.viewMode}
            />
        </div>
    </div>
}

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
    openURLInNewTab,
    removeEmptyKeys,
    getRandomString,
    getDetailsPageBarChartWidth,
} from 'src/helpers';
import {
    FormModal,
    FormActions,
    PageTopRow,
    NavigationPanel,
    VersionHistory,
    Sections,
    AddressSubSection,
    DangerZone,
    ContactDetails,
    EmergencyContactList,
    AMPMToggle,
    ComingSoon,
    YearFilter,
    UnsavedDataBanner,
} from 'src/components/outreachComponents';
import jsonData from '/data/json_data/input_data';
import moment from 'moment';

const initWarmupServiceForm = {
    data: {
        name: null,
    }
}

const initCompanyTypeForm = {
    data: {
        name: null,
    }
}

const initDesignationForm = {
    data: {
        name: null,
    }
}

const initDomainScoreServiceForm = {
    data: {
        name: null,
        website: null,
    }
}

const initEmailServiceProviderForm = {
    data: {
        name: null,
    }
}

const initExhibitAppForm = {
  data: {
  	name: null,
    url_template: null,
    status: 'active',
  }
}

const initIndustryForm = {
    data: {
        name: null,
        lowercase_for_template: null,
    }
}

const initSpecializationForm = {
  data: {
  	name: null,
  }
}

const initMailAccountForm = {
    data: {
        email: null,
        api_key: null,
        is_mailbox_created: null,
        primary_email: null,
        warmup_started_on: null,
        warmup_service_account: null,
        notes: null,
        id_domain: null,
        id_warmup_service: null,
        id_email_service_provider: null,
    }
}

export default function AdminView(props) {
    let { id } = useParams();
    const alert_ = useAlert();
    const navigate = useNavigate();
    const { me, setMe } = useContext(MeContext);
    const { isSubMenuCollapsed, toggleSubMenu } = useContext(UserPreferenceContext);

    const [ notFound, setNotFound ] = useState(false);

    const [ viewMode, setViewMode] = useState('read'); //edit/read/no-edit( when archived )
    const [ pageType, setPageType ] = useState('detatil-page');

    const [ mainClassName, setMainClassName] = useState(
        JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
        ? 'expanded-view'
        : ''
    );

    const [ mailAccountFormModal, mailAccountFormModalToggle ]
        = useToggle(false);
    const [ warmupServiceFormModal, warmupServiceformModalToggle ]
        = useToggle(false);
    const [ companyTypeFormModal, companyTypeFormModalToggle ]
        = useToggle(false);
    const [ designationFormModal, designationFormModalToggle ]
        = useToggle(false);
    const [ domainScoreServiceFormModal, domainScoreServiceFormModalToggle ]
        = useToggle(false);
    const [ emailServiceProviderFormModal, emailServiceProviderFormModalToggle ]
        = useToggle(false);
    const [ exhibitAppFormModal, exhibitAppFormModalToggle ]
        = useToggle(false);
    const [ industryFormModal, industryFormModalToggle ]
        = useToggle(false);
    const [ specializationFormModal, specializationFormModalToggle ]
        = useToggle(false);

    let sections = [
        {
            name: 'Mail Accounts',
            icon: null,
            navigation: 'mail-accounts-nav',
            sectionAction: e => {
                mailAccountFormModalToggle();
            },
            sectionActionButtonText: '+ Add Mail Account',
            subSections: [
                {
                    name: null,
                    content: <MailAccounts
                        formModal={mailAccountFormModal}
                        formModalToggle={() => {
                            mailAccountFormModalToggle();
                        }}
                    />
                },
            ]
        },
        {
            name: 'Company Types',
            icon: null,
            navigation: 'company-types-nav',
            sectionAction: e => {
                companyTypeFormModalToggle();
            },
            sectionActionButtonText: '+ Add Company Types',
            subSections: [
                {
                    name: null,
                    content: <CompanyTypes
                        formModal={companyTypeFormModal}
                        formModalToggle={() => {
                            companyTypeFormModalToggle()
                        }}
                    />
                },
            ]
        },
        {
            name: 'Warmup Services',
            icon: null,
            navigation: 'warmup-services-nav',
            sectionAction: e => {
                warmupServiceformModalToggle();
            },
            sectionActionButtonText: '+ Add Warmup Service',
            subSections: [
                {
                    name: null,
                    content: <WarmupServices
                        formModal={warmupServiceFormModal}
                        formModalToggle={() => {
                            warmupServiceformModalToggle()
                        }}
                    />
                },
            ]
        },
        {
            name: 'Designations',
            icon: null,
            navigation: 'designations-nav',
            sectionAction: e => {
                designationFormModalToggle();
            },
            sectionActionButtonText: '+ Add Designation',
            subSections: [
                {
                    name: null,
                    content: <Designations
                        formModal={designationFormModal}
                        formModalToggle={designationFormModalToggle}
                    />
                },
            ]
        },
        {
            name: 'Domain Score Services',
            icon: null,
            navigation: 'domain-score-services-nav',
            sectionAction: e => {
                domainScoreServiceFormModalToggle();
            },
            sectionActionButtonText: '+ Add Domain Score Service',
            subSections: [
                {
                    name: null,
                    content: <DomainScoreServices
                        formModal={domainScoreServiceFormModal}
                        formModalToggle={domainScoreServiceFormModalToggle}
                    />
                },
            ]
        },
        {
            name: 'Email Service Providers',
            icon: null,
            navigation: 'email-service-providers-nav',
            sectionAction: e => {
                emailServiceProviderFormModalToggle();
            },
            sectionActionButtonText: '+ Add Email Service Providers',
            subSections: [
                {
                    name: null,
                    content: <EmailServiceProviders
                        formModal={emailServiceProviderFormModal}
                        formModalToggle={emailServiceProviderFormModalToggle}
                    />
                },
            ]
        },
        {
            name: 'Exhibit Apps',
            icon: null,
            navigation: 'exhibit-apps-nav',
            sectionAction: e => {
                exhibitAppFormModalToggle();
            },
            sectionActionButtonText: '+ Add Exhibit App',
            subSections: [
                {
                    name: null,
                    content: <ExhibitApps
                        formModal={exhibitAppFormModal}
                        formModalToggle={exhibitAppFormModalToggle}
                    />
                },
            ]
        },
        {
            name: 'Custom Fields',
            icon: null,
            navigation: 'custom-fields-nav',
            sectionAction: e => {
            },
            sectionActionButtonText: '+ Add Custom Field',
            subSections: [
                {
                    name: null,
                    content: <CustomFields
                    />
                },
            ]
        },
        {
            name: 'Industries',
            icon: null,
            navigation: 'industries-nav',
            sectionAction: e => {
                industryFormModalToggle();
            },
            sectionActionButtonText: '+ Add Industries',
            subSections: [
                {
                    name: null,
                    content: <Industries
                        formModal={industryFormModal}
                        formModalToggle={() => {
                            industryFormModalToggle()
                        }}
                    />
                },
            ]
        },
        {
            name: 'Specializations',
            icon: null,
            navigation: 'specializations-nav',
            sectionAction: e => {
                specializationFormModalToggle();
            },
            sectionActionButtonText: '+ Add Specialization',
            subSections: [
                {
                    name: null,
                    content: <Specializations
                        formModal={specializationFormModal}
                        formModalToggle={() => {
                            specializationFormModalToggle()
                        }}
                    />
                },
            ]
        },
    ];

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
        <div id='admin-view' className='app-content details-view'>
            {notFound
                ? <NotFoundView />
                : <>
                    <PageTopRow
                        title='Admin'
                        type={pageType}
                    />

                    <div className={`page-content ${isSubMenuCollapsed ? 'collapsed' : ''}`}>
                        <div className='left-page-content no-scrollbar'>
                            <NavigationPanel sections={sections} />
                        </div>
                        <div className='right-page-content' data-test='right-page-content'>
                            <Sections sections={sections} />
                        </div>
                    </div>
                </>
            }
        </div>
    </div>
}

function MailAccounts(props) {
    const alert_ = useAlert();
    const [ loaded, toggleLoaded ] = useToggle(false);
    const [
        mailAccountForm,
        setMailAccountForm,
        onMailAccountChange,
        mailAccountError,
        setMailAccountError,
    ] = useForm(initMailAccountForm);

    const [ mailAccountC,
        updateMailAccountC,
        mailAccountRef,
        isMailAccountRefVisible
    ] = useCollection(
        'mail-accounts',
        `status=active&page=1`
    );
    const [ warmupServiceC ] = useCollection('warmup-services');

    const [ columns, setColumns ]  = useState([
        {
            name: 'S.No',
            id: 'id_batch',
            sortable: 'backend',
            visible: true,
            render: (row, customData, collection, updateCollection, index) => {
                return <div className='s-no'>
                    {index + 1}
                </div>
            }
        },
        {
            name: 'Account Name',
            id: 'email',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='account-email'>
                    {row.email}
                </div>
            }
        },
        {
            name: 'Campaign',
            id: 'campaign',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                let campaignList = [
                    {
                        name: 'Campaign 1',
                        started: true,
                    },
                    {
                        name: 'CEO Entrapment',
                    },
                ]
                let campaignListForDisplay = campaignList.map((campaign, index) => {
                    let className = '';
                    if (!campaign.started) {
                        className += ' campaign-not-started';
                    }

                    if (index !== (campaignList.length - 1)) {
                        className += ' add-comma';
                    }

                    return <span className={className}>
                        {campaign.name}
                    </span>
                })

                return <div className='campaign-details'>
                    {campaignList
                        // ? campaignList.map(campaign => campaign.name).join(', ')
                        ? campaignListForDisplay
                        : <span className='data-not-available'>Not added yet</span>
                    }
                </div>
            }
        },
        {
            name: 'Email Sent',
            id: 'email-sent',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='email-sent'>
                    10
                </div>
            }
        },
        {
            name: 'Warmup Started On',
            id: 'warmup-started-on',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                return <div className='warmup-started-on'>
                    {row.warmup_started_on
                        ? moment(row.warmup_started_on).format('DD MMM, YYYY')
                        : <span className='data-not-available'>Yet to start</span>
                    }
                </div>
            }
        },
        {
            name: 'Account Score',
            id: 'account-score',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                let accountScore = 10;
                return <div className='account-score'>
                    {accountScore || '-'}
                </div>
            }
        },
        {
            name: 'API Setup',
            id: 'is_api_setup',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='is-api-setup'>
                    {row.api_key
                        ? 'Yes'
                        : <span className='data-not-available'>No</span>
                    }
                </div>
            }
        },
        {
            name: 'Inbox Created',
            id: 'is_inbox_created',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='is-inbox-created'>
                    {row.is_mailbox_created
                        ? 'Yes'
                        : <span className='data-not-available'>No</span>
                    }
                </div>
            }
        },
    ]);

    const [ selectedMailAccountId, setSelectedMailAccountId ] = useState(null);

    function convertFormDataToRequest(formData) {
        const convertStringToBoolean = (value) => {
            if(value !== undefined && value !== null) {
                console.log('convertStringToBoolean matched', value, value === 'true');
                return value === 'true';
            }
            console.log('convertStringToBoolean', value);
            return value;
        };

        let requestData = copy(mailAccountForm);

        requestData.data['is_mailbox_created']
            = convertStringToBoolean(formData?.data?.['is_mailbox_created']);

        requestData = removeEmptyKeys(
            requestData,
            [null, undefined, {}, []],
        );
        return requestData;
    }

    function onRowClick(e, index) {
        e.preventDefault();

        props.formModalToggle();
        setMailAccountForm({
            data: mailAccountC.items[index],
        });

        // Pass the selected mail account ID to the modal
        setSelectedMailAccountId(mailAccountC.items[index]?.id);
    }

    function createMailAccount() {
        let requestData = convertFormDataToRequest(mailAccountForm);

        toggleLoaded();

        if (!requestData) {
            alert_.error('Add some data before submitting');
        }

        request.post(`mail-accounts`, requestData)
            .then(([status_, response]) => {
                updateMailAccountC({
                    reload: true,
                });
                props.formModalToggle();
                setMailAccountForm(initMailAccountForm);
                setMailAccountError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('New mail account added');
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
                    setMailAccountError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function updateMailAccount(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(mailAccountForm);

        request.patch(`mail-accounts/${id}`, requestData)
            .then(([status_, response]) => {
                setMailAccountForm(response);
                setMailAccountError([]);

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Mail Account Updated');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while updating. Please try again.');
                }
                if (response.errors) {
                    setMailAccountError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function deleteMailAccount(e) {
        e.preventDefault();

        request.delete(`mail-accounts/${selectedMailAccountId}`)
        .then(([status_, response]) => {
            setMailAccountForm(response);
            updateMailAccountC({
                reload:true,
            });
            props.formModalToggle();
            alert_.success(response.message || 'Mail Account deleted successfully')
        })
        .catch(([status_, response]) => {
            alert_.success(response.message || 'Error while deleting. Please try again.');
        });
    }

    return <div className='mail-accounts'>
        <Table
            className='mail-accounts-table section-table row-link'
            data-test='mail-accounts-table'
            items={mailAccountC.items}
            columns={columns}
            controlColumns={[]}
            loaded={mailAccountC.loaded}
            onRowClick={onRowClick}
            tableEmptyText='No email accounts added'
            addNewRecordButtonText='Add Email Account'
            addNewRecordButtonURL='/mail-accounts/create'
            collection={mailAccountC}
            updateCollection={updateMailAccountC}
            reference={mailAccountRef}
            queryString={mailAccountC.queryString}
        />
        {props.formModal && <FormModal
            title={mailAccountForm.data?.id
                ? 'Edit'
                : 'Add Mail Account'
            }
            toggleModal={() => {
                props.formModalToggle();
                setMailAccountForm(initMailAccountForm);
            }}
            submitActionText={mailAccountForm.data?.id
                ? 'Add'
                : 'Save'
            }
            submitAction={mailAccountForm.data?.id
                ? updateMailAccount
                : createMailAccount
            }
            cancelAction={() => {
                props.formModalToggle();
                setMailAccountForm(initMailAccountForm);
            }}
            deleteAction={deleteMailAccount}
            selectedMailAccountId={selectedMailAccountId}
        >
            <div className='mail-account-form'>
                <div className='row'>
                    <div className='mail-account-name'>
                        <Input
                            label='Mail Account Name'
                            name='data.email'
                            className='mail-account-name-input'
                            value={mailAccountForm.data?.email}
                            onChange={onMailAccountChange}
                            error={mailAccountError['data.email']}
                        />
                    </div>
                    <div className='is-mail-account-inbox-created'>
                        <RadioField
                            label='Inbox Created?'
                            options={[
                                { value: true, label: 'Yes' },
                                { value: false, label: 'No' },
                            ]}
                            name='data.is_mailbox_created'
                            value={mailAccountForm?.data?.is_mailbox_created}
                            onChange={onMailAccountChange}
                            error={mailAccountError['data.is_mailbox_created']}
                        />
                    </div>
                </div>
                <div className='row'>
                    <div className='mail-account-warmup-service'>
                        <SelectField label='Warmup Service'
                            options={getOptions(warmupServiceC.items, 'name', 'id')}
                            name='data.id_warmup_service'
                            value={mailAccountForm?.data?.id_warmup_service}
                            onChange={onMailAccountChange}
                            error={mailAccountError['data.id_warmup_service']}
                        />
                    </div>
                    <div className='mail-account-warmup-start-date'>
                        <DateField label='Warmup Start On'
                            name='data.warmup_started_on'
                            value={props.data?.warmup_started_on}
                            onChange={onMailAccountChange}
                            error={mailAccountError['data.warmup_started_on']}
                        />
                    </div>
                </div>
                <div className='row'>
                    <div className='mail-account-service-provider'>
                        <DateField label='Email Service Provider'
                            name='data.warmup_started_on'
                            value={props.data?.warmup_started_on}
                            onChange={onMailAccountChange}
                            error={mailAccountError['data.warmup_started_on']}
                        />
                    </div>
                    <div className='mail-account-api-key'>
                        <Input
                            label='API Key'
                            name='data.api_key'
                            className='mail-account-api-key-input'
                            value={mailAccountForm.data?.api_key}
                            onChange={onMailAccountChange}
                            error={mailAccountError['data.api_key']}
                        />
                    </div>
                </div>
            </div>
        </FormModal>}
    </div>
}

function WarmupServices(props) {
    const alert_ = useAlert();
    const [ loaded, toggleLoaded ] = useToggle(false);
    const [
        warmupServiceForm,
        setWarmupServiceForm,
        onWarmupServiceChange,
        warmupServiceError,
        setWarmupServiceError,
    ] = useForm(initWarmupServiceForm);

    const [ warmupServiceC,
        updateWarmupServiceC,
        warmupServiceRef,
        isWarmupServiceRefVisible
    ] = useCollection(
        'warmup-services',
        `status=active&page=1`
    );

    const [selectedWarmupServiceId, setSelectedWarmupServiceId] = useState(null);

    const [ columns, setColumns ]  = useState([
        {
            name: 'S.No',
            id: 'id_batch',
            sortable: 'backend',
            visible: true,
            render: (row, customData, collection, updateCollection, index) => {
                return <div className='batch-details'>
                    {index + 1}
                </div>
            }
        },
        {
            name: 'Name',
            id: 'name',
            sortable: 'backend',
            visible: true,
        },
    ]);


    function onRowClick(e, index) {
        e.preventDefault();

        console.log('Clicked Row Index:', index);
        console.log('Clicked Row Data:', warmupServiceC.items[index]);

        const selectedWarmupServiceId = warmupServiceC.items[index]?.id;

        props.formModalToggle();

        setWarmupServiceForm({
            data: warmupServiceC.items[index],
        });

        // Pass the selected warmup service ID to the modal
        props.setSelectedWarmupServiceId(selectedWarmupServiceId);
    }

    function createWarmupService(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(warmupServiceForm);

        if (!requestData) {
            alert_.error('Add some data before submitting');
            return;
        }

        request.post(`warmup-services`, requestData)
            .then(([status_, response]) => {
                setWarmupServiceForm(initWarmupServiceForm);
                updateWarmupServiceC({
                    reload: true,
                });
                props.formModalToggle();
                // setWarmupServiceForm(initWarmupServiceForm);
                setWarmupServiceError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('New warmup service added');
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
                    setWarmupServiceError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function updateWarmupService(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(warmupServiceForm);

        request.patch(`warmup-services/${id}`, requestData)
            .then(([status_, response]) => {
                setWarmupServiceForm(response);
                setWarmupServiceError([]);

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Warmup Service Updated');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while updating. Please try again.');
                }
                if (response.errors) {
                    setWarmupServiceError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function deleteWarmupService(e) {
        e.preventDefault();

        request.delete(`warmup-services/${warmupServiceForm.data.id}`)
        .then(([status_, response]) => {
            setWarmupServiceForm(response);
            updateWarmupServiceC({
                reload:true,
            });
            // setWarmupServiceForm(initWarmupServiceForm);
            props.formModalToggle();
            alert_.success(response.message || 'Warmup Service deleted successfully!')
        })
        .catch(([errorStatus, response]) => {
            alert_.success(response.message || 'Error while deleting. Please try again.');
        });
    }

    return <div className='warmup-services'>
        <Table
            className='warmup-services-table section-table row-link'
            data-test='warmup-services-table'
            items={warmupServiceC.items}
            columns={columns}
            controlColumns={[]}
            loaded={warmupServiceC.loaded}
            onRowClick={onRowClick}
            tableEmptyText='No warmup service added'
            collection={warmupServiceC}
            updateCollection={updateWarmupServiceC}
            reference={warmupServiceRef}
            queryString={warmupServiceC.queryString}

            name='warmup-services'
        />
        {props.formModal && <FormModal
            title={warmupServiceForm.data?.id
                ? 'Edit'
                : 'Add Warmup Service'
            }
            toggleModal={() => {
                props.formModalToggle();
                setWarmupServiceForm(initWarmupServiceForm);
            }}
            submitActionText={warmupServiceForm.data?.id
                ? 'Add'
                : 'Save'
            }
            submitAction={warmupServiceForm.data?.id
                ? updateWarmupService
                : createWarmupService
            }
            cancelAction={() => {
                props.formModalToggle();
                props.setData(initWarmupServiceForm);
            }}
            deleteAction={deleteWarmupService}
            selectedWarmupServiceId={selectedWarmupServiceId}
        >
            <div className='warmup-service-form'>
                <Input
                    label='Warmup Service Name'
                    name='data.name'
                    className='warmup-service-name-input'
                    value={warmupServiceForm.data?.name}
                    onChange={onWarmupServiceChange}
                    error={warmupServiceError['data.name']}
                />
            </div>
        </FormModal>}
    </div>
}

function CompanyTypes(props) {
    const alert_ = useAlert();
    const [ loaded, toggleLoaded ] = useToggle(false);
    const [
        companyTypeForm,
        setCompanyTypeForm,
        onCompanyTypeChange,
        companyTypeError,
        setCompanyTypeError,
    ] = useForm(initCompanyTypeForm);

    const [ companyTypeC,
        updateCompanyTypeC,
        companyTypeRef,
        isCompanyTypeRefVisible
    ] = useCollection(
        'company-types',
        `status=active&page=1`
    );

    const [selectedCompanyId, setSelectedCompanyId] = useState(null);

    const [ columns, setColumns ]  = useState([
        {
            name: 'S. No',
            id: 'id',
            sortable: 'backend',
            visible: true,
            render: (row, customData, collection, updateCollection, index) => {
                return <div className='batch-details'>
                    {index + 1}
                </div>
            }
        },
        {
            name: 'Company Types',
            id: 'name',
            sortable: 'backend',
            visible: true,
        },
    ]);

    function onRowClick(e, index) {
        e.preventDefault();

        props.formModalToggle();

        const selectedCompanyId = companyTypeC.items[index]?.id;

        setCompanyTypeForm({
            data: companyTypeC.items[index],
        });

        // Pass the selected company type ID to the modal
        props.setSelectedCompanyId(selectedCompanyId);
    }

    function createCompanyType(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(companyTypeForm);

        if (!requestData) {
            alert_.error('Add some data before submitting');
        }

        request.post(`company-types`, requestData)
            .then(([status_, response]) => {
                updateCompanyTypeC({
                    reload: true,
                });
                props.formModalToggle();
                setCompanyTypeForm(initCompanyTypeForm);
                setCompanyTypeError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('New company type added');
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
                    setCompanyTypeError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function updateCompanyType(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(companyTypeForm);

        request.patch(`company-types/${id}`, requestData)
            .then(([status_, response]) => {
                setCompanyTypeForm(response);
                setCompanyTypeError([]);

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Company Type Updated');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while updating. Please try again.');
                }
                if (response.errors) {
                    setCompanyTypeError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function deleteCompanyType(e) {
        e.preventDefault();

        request.delete(`company-types/${companyTypeForm.data.id}`)
            .then(([status_, response]) => {

                setCompanyTypeForm(response);
                updateCompanyTypeC({
                    reload:true,
                });
                props.formModalToggle();

                alert_.success(response.message || 'Company Type deleted successfully!')
            })
            .catch(([errorStatus, response]) => {
                alert_.error(response.message || 'Error while deleting. Please try again.');
            });
    }

    return <div className='company-types'>
        <Table
            className='company-types-table section-table row-link'
            data-test='company-types-table'
            items={companyTypeC.items}
            columns={columns}
            controlColumns={[]}
            loaded={companyTypeC.loaded}
            onRowClick={onRowClick}
            tableEmptyText='No company type added'
            collection={companyTypeC}
            updateCollection={updateCompanyTypeC}
            reference={companyTypeRef}
            queryString={companyTypeC.queryString}
        />
        {props.formModal && <FormModal
            title={companyTypeForm.data?.id
                ? 'Edit'
                : 'Add Company Type'
            }
            toggleModal={() => {
                console.log('Inside FormModal toggle')
                props.formModalToggle();
                setCompanyTypeForm(initCompanyTypeForm);
            }}
            submitActionText={companyTypeForm.data?.id
                ? 'Add'
                : 'Save'
            }
            submitAction={companyTypeForm.data?.id
                ? updateCompanyType
                : createCompanyType
            }
            cancelAction={() => {
                props.formModalToggle();
                props.setData(initCompanyTypeForm);
            }}
            deleteAction={deleteCompanyType}
            selectedCompanyId={selectedCompanyId}
        >
            <div className='company-type-form'>
                <Input
                    label='Name'
                    name='data.name'
                    className='company-type-name-input'
                    value={companyTypeForm.data?.name}
                    onChange={onCompanyTypeChange}
                    error={companyTypeError['data.name']}
                />
            </div>
        </FormModal>}
    </div>
}

function Designations(props) {
    const alert_ = useAlert();
    const [ loaded, toggleLoaded ] = useToggle(false);
    const [
        designationForm,
        setDesignationForm,
        onDesignationChange,
        designationError,
        setDesignationError,
    ] = useForm(initDesignationForm);

    const [ designationC,
        updateDesignationC,
        designationRef,
        isDesignationRefVisible
    ] = useCollection(
        'designations',
        `status=active&page=1`
    );

    const [ columns, setColumns ]  = useState([
        {
            name: 'S. No',
            id: 'id_',
            sortable: 'backend',
            visible: true,
            render: (row, customData, collection, updateCollection, index) => {
                return <div className='s-no'>
                    {index + 1}
                </div>
            }
        },
        {
            name: 'Designation',
            id: 'name',
            sortable: 'backend',
            visible: true,
        },
    ]);

    const [ selectedDesignationId, setSelectedDesignationId ] = useState(null);

    function onRowClick(e, index) {
        e.preventDefault();

        props.formModalToggle();

        const selectedDesignationId = designationC.items[index]?.id;

        setDesignationForm({
            data: designationC.items[index],
        });

        //pass the selected desgination id to the modal
        props.setSelectedDesignationId(selectedDesignationId);
    }

    function createDesignation(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(designationForm);

        if (!requestData) {
            alert_.error('Add some data before submitting');
        }

        request.post(`designations`, requestData)
            .then(([status_, response]) => {
                updateDesignationC({
                    reload: true,
                });
                props.formModalToggle();
                setDesignationForm(initDesignationForm);
                setDesignationError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('New designation added');
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
                    setDesignationError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    const id= designationForm.data?.id;

    function updateDesignation(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(designationForm);

        request.patch(`designations/${id}`, requestData)
            .then(([status_, response]) => {
                setDesignationForm(response);
                setDesignationError([]);

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Designation Updated');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {companyTypeForm
                    alert_.error('Error while updating. Please try again.');
                }
                if (response.errors) {
                    setDesignationError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function deleteDesignation(e) {
        e.preventDefault();

        request.delete(`designations/${designationForm.data.id}`)
        .then(([status_, response]) => {
            setDesignationForm(response);
            updateDesignationC({
                reload:true,
            });
            props.formModalToggle();
            alert_.success(response.message || 'Designation deleted successfully')
        })
        .catch(([errorStatus, response]) => {
            alert_.error(response.message || 'Error while deleting. Please try again.');
        });
    }

    return <div className='designations'>
        <Table
            className='designations-table section-table row-link'
            data-test='designations-table'
            items={designationC.items}
            columns={columns}
            controlColumns={[]}
            loaded={designationC.loaded}
            onRowClick={onRowClick}
            tableEmptyText='No designation added'
            collection={designationC}
            updateCollection={updateDesignationC}
            reference={designationRef}
            queryString={designationC.queryString}
        />
        {props.formModal && <FormModal
            title={designationForm.data?.id
                ? 'Edit'
                : 'Add Designation'
            }
            toggleModal={() => {
                props.formModalToggle();
                setDesignationForm(initDesignationForm);
            }}
            submitActionText={designationForm.data?.id
                ? 'Add'
                : 'Save'
            }
            submitAction={designationForm.data?.id
                ? updateDesignation
                : createDesignation
            }
            cancelAction={() => {
                props.formModalToggle();
                setDesignationForm(initDesignationForm);
            }}
            deleteAction={deleteDesignation}
            selectedDesignationId={selectedDesignationId}
        >
            <div className='designation-form'>
                <Input
                    label='Name'
                    name='data.name'
                    className='company-type-name-input'
                    value={designationForm.data?.name}
                    onChange={onDesignationChange}
                    error={setDesignationError['data.name']}
                />
            </div>
        </FormModal>}
    </div>
}

function DomainScoreServices(props) {
    const alert_ = useAlert();
    const [ loaded, toggleLoaded ] = useToggle(false);
    const [
        domainScoreServiceForm,
        setDomainScoreServiceForm,
        onDomainScoreServiceChange,
        domainScoreServiceError,
        setDomainScoreServiceError,
    ] = useForm(initDomainScoreServiceForm);

    const [ domainScoreServiceC,
        updateDomainScoreServiceC,
        domainScoreServiceRef,
        isDomainScoreServiceRefVisible
    ] = useCollection(
        'domain-score-services',
        `status=active&page=1`
    );

    const [ selectedDomainScoreServiceId, setSelectedDomainScoreServiceId] = useState(null);

    const [ columns, setColumns ]  = useState([
        {
            name: 'S. No',
            id: 'id_',
            sortable: 'backend',
            visible: true,
            render: (row, customData, collection, updateCollection, index) => {
                return <div className='s-no'>
                    {index + 1}
                </div>
            }
        },
        {
            name: 'Domain Score Service',
            id: 'name',
            sortable: 'backend',
            visible: true,
        },
        {
            name: 'Website',
            id: 'url',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                let url = row.website;
                return <div className='domain-score-service-url'
                    onClick={e => openURLInNewTab(e, url, false)}
                >
                    {url}
                </div>
            }
        },
    ]);


    function onRowClick(e, index) {
        e.preventDefault();

        props.formModalToggle();

        const selectedDomainScoreServiceID = domainScoreServiceC.items[index]?.id;

        setDomainScoreServiceForm({
            data: domainScoreServiceC.items[index],
        });

        props.setSelectedDomainScoreServiceId(selectedDomainScoreServiceID);
    }

    function createDomainScoreService(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(domainScoreServiceForm);

        if (!requestData) {
            alert_.error('Add some data before submitting');
        }

        request.post(`domain-score-services`, requestData)
            .then(([status_, response]) => {
                updateDomainScoreServiceC({
                    reload: true,
                });
                props.formModalToggle();
                setDomainScoreServiceForm(initDomainScoreServiceForm);
                setDomainScoreServiceError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('New domain score service added');
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
                    setDomainScoreServiceError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function updateDomainScoreService(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(domainScoreServiceForm);

        request.patch(`domain-score-services/${id}`, requestData)
            .then(([status_, response]) => {
                setDomainScoreServiceForm(response);
                setDomainScoreServiceError([]);

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Domain score service updated');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while updating. Please try again.');
                }
                if (response.errors) {
                    setDomainScoreServiceError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function deleteDomainScoreService(e) {
        e.preventDefault();

        request.delete(`domain-score-services/${domainScoreServiceForm.data.id}`)
        .then(([status_, response]) => {
            setDomainScoreServiceForm(response);
            updateDomainScoreServiceC({
                reload:true,
            });
            props.formModalToggle();
            alert_.success(response.message || 'Domain Score Service deleted successfully')
        })
        .catch(([errorStatus, response]) => {
            alert_.error(response.message || 'Error while deleting. Please try again.');
        });
    }

    return <div className='domain-score-services'>
        <Table
            className='domain-score-services-table section-table row-link'
            data-test='domain-score-services-table'
            items={domainScoreServiceC.items}
            columns={columns}
            controlColumns={[]}
            loaded={domainScoreServiceC.loaded}
            onRowClick={onRowClick}
            tableEmptyText='No domain score services added'
            collection={domainScoreServiceC}
            updateCollection={updateDomainScoreServiceC}
            reference={domainScoreServiceRef}
            queryString={domainScoreServiceC.queryString}
        />
        {props.formModal && <FormModal
            title={domainScoreServiceForm.data?.id
                ? 'Edit'
                : 'Add Domain Score Service'
            }
            toggleModal={() => {
                props.formModalToggle();
                setDomainScoreServiceForm(initDomainScoreServiceForm);
            }}
            submitActionText={domainScoreServiceForm.data?.id
                ? 'Add'
                : 'Save'
            }
            submitAction={domainScoreServiceForm.data?.id
                ? updateDomainScoreService
                : createDomainScoreService
            }
            cancelAction={() => {
                props.formModalToggle();
                props.setData(initDomainScoreServiceForm);
            }}
            deleteAction={deleteDomainScoreService}
            selectedDomainScoreServiceID={selectedDomainScoreServiceId}
        >
            <div className='domain-score-service-form'>
                <Input
                    label='Name'
                    name='data.name'
                    className='domain-score-service-name-input'
                    value={domainScoreServiceForm.data?.name}
                    onChange={onDomainScoreServiceChange}
                    error={domainScoreServiceError['data.name']}
                />
                <Input
                    label='Website'
                    name='data.website'
                    className='domain-score-service-website-input'
                    value={domainScoreServiceForm.data?.website}
                    onChange={onDomainScoreServiceChange}
                    error={domainScoreServiceError['data.website']}
                />
            </div>
        </FormModal>}
    </div>
}

function EmailServiceProviders(props) {
    const alert_ = useAlert();
    const [ loaded, toggleLoaded ] = useToggle(false);
    const [
        emailServiceProviderForm,
        setEmailServiceProviderForm,
        onEmailServiceProviderChange,
        emailServiceProviderError,
        setEmailServiceProviderError,
    ] = useForm(initEmailServiceProviderForm);

    const [ emailServiceProviderC,
        updateEmailServiceProviderC,
        emailServiceProviderRef,
        isEmailServiceProviderRefVisible
    ] = useCollection(
        'email-service-providers',
        `status=active&page=1`
    );

    const [ selectedEmailServiceProvidersId, setSelectedEmailServiceProvidersId ] = useState(null);

    const [ columns, setColumns ]  = useState([
        {
            name: 'S. No',
            id: 'id_',
            sortable: 'backend',
            visible: true,
            render: (row, customData, collection, updateCollection, index) => {
                return <div className='s-no'>
                    {index + 1}
                </div>
            }
        },
        {
            name: 'Email Score Service',
            id: 'name',
            sortable: 'backend',
            visible: true,
        },
        {
            name: 'Website',
            id: 'url',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                let url = 'Check whether we need this attribute'
                return <div className='email-score-service-url'
                    onClick={e => openURLInNewTab(e, url, false)}
                >
                    {url}
                </div>
            }
        },
    ]);

    function onRowClick(e, index) {
        e.preventDefault();

        props.formModalToggle();

        const selectedEmailServiceProvidersId = emailServiceProviderC.items[index]?.id;

        setEmailServiceProviderForm({
            data: emailServiceProviderC.items[index],
        });

        props.setSelectedEmailServiceProvidersId(selectedEmailServiceProvidersId);
    }

    function createEmailServiceProvider(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(emailServiceProviderForm);

        if (!requestData) {
            alert_.error('Add some data before submitting');
        }

        request.post(`email-service-providers`, requestData)
            .then(([status_, response]) => {
                updateEmailServiceProviderC({
                    reload: true,
                });
                props.formModalToggle();
                setEmailServiceProviderForm(initEmailServiceProviderForm);
                setEmailServiceProviderError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('New company type added');
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
                    setEmailServiceProviderError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function updateEmailServiceProvider(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(emailServiceProviderForm);

        request.patch(`email-service-providers/${id}`, requestData)
            .then(([status_, response]) => {
                setEmailServiceProviderForm(response);
                setEmailServiceProviderError([]);

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Email Service Provider Updated');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while updating. Please try again.');
                }
                if (response.errors) {
                    setEmailServiceProviderError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function deleteEmailServiceProvider(e) {
        e.preventDefault();

        request.delete(`email-service-providers/${emailServiceProviderForm.data.id}`)
            .then(([status_, response]) => {

                setEmailServiceProviderForm(response);
                updateEmailServiceProviderC({
                    reload:true,
                });
                props.formModalToggle();

                alert_.success(response.message || 'Email Service Provider deleted successfully!')
            })
            .catch(([errorStatus, response]) => {
                alert_.error(response.message || 'Error while deleting. Please try again.');
            });
    }

    return <div className='email-service-providers'>
        <Table
            className='email-service-providers-table section-table row-link'
            data-test='email-service-providers-table'
            items={emailServiceProviderC.items}
            columns={columns}
            controlColumns={[]}
            loaded={emailServiceProviderC.loaded}
            onRowClick={onRowClick}
            tableEmptyText='No email service provider added'
            collection={emailServiceProviderC}
            updateCollection={updateEmailServiceProviderC}
            reference={emailServiceProviderRef}
            queryString={emailServiceProviderC.queryString}
        />
        {props.formModal && <FormModal
            title={emailServiceProviderForm.data?.id
                ? 'Edit'
                : 'Add Email Service Provider'
            }
            toggleModal={() => {
                props.formModalToggle();
                setEmailServiceProviderForm(initEmailServiceProviderForm);
            }}
            submitActionText={emailServiceProviderForm.data?.id
                ? 'Add'
                : 'Save'
            }
            submitAction={emailServiceProviderForm.data?.id
                ? updateEmailServiceProvider
                : createEmailServiceProvider
            }
            cancelAction={() => {
                props.formModalToggle();
                props.setData(initEmailServiceProviderForm);
            }}
            deleteAction={deleteEmailServiceProvider}
            selectedEmailServiceProvidersId={selectedEmailServiceProvidersId}
        >
            <div className='email-service-provider-form'>
                <Input
                    label='Name'
                    name='data.name'
                    className='email-service-provider-name-input'
                    value={emailServiceProviderForm.data?.name}
                    onChange={onEmailServiceProviderChange}
                    error={emailServiceProviderError['data.name']}
                />
                {false && <Input
                    label='Website'
                    name='data.website'
                    className='email-service-provider-website-input'
                    value={emailServiceProviderForm.data?.website}
                    onChange={onEmailServiceProviderChange}
                    error={emailServiceProviderError['data.website']}
                />}
            </div>
        </FormModal>}
    </div>
}

function ExhibitApps(props) {
    const alert_ = useAlert();
    const [ loaded, toggleLoaded ] = useToggle(false);
    const [
        exhibitappForm,
        setExhibitAppForm,
        onExhibitAppChange,
        exhibitappError,
        setExhibitAppError,
    ] = useForm(initExhibitAppForm);

    const [ exhibitAppC,
        updateExhibitAppC,
        exhibitAppsRef,
        isExhibitAppRefVisible
    ] = useCollection(
        'exhibit-apps',
        `status=active&page=1`
    );

    const [ selectedExhibitAppId, setSelectedExhibitAppId ] = useState(null);

    const [ columns, setColumns ]  = useState([
        {
            name: 'S. No',
            id: 'id_',
            sortable: 'backend',
            visible: true,
            render: (row, customData, collection, updateCollection, index) => {
                return <div className='s-no'>
                    {index + 1}
                </div>
            }
        },
        {
            name: 'Exhibit Name',
            id: 'name',
            sortable: 'backend',
            visible: true,
        },
        {
            name: 'Exhibit URL Template',
            id: 'url',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='exhibit-url-template'>
                    {row.url_template ?? <span className='data-not-available'>
                        Not added yet
                    </span>}
                </div>
            }
        },
        {
            name: 'Status',
            id: 'url',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='exhibit-app-status'>
                    {row.status}
                </div>
            }
        },
    ]);

    function onRowClick(e, index) {
        e.preventDefault();

        props.formModalToggle();

        const selectedExhibitAppId = exhibitAppC.items[index]?.id;

        setExhibitAppForm({
            data: exhibitAppC.items[index],
        });

        props.setSelectedExhibitAppId(selectedExhibitAppId);
    }

    function createExhibitApp(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(exhibitappForm);

        if (!requestData) {
            alert_.error('Add some data before submitting');
        }

        request.post(`exhibit-apps`, requestData)
            .then(([status_, response]) => {
                updateExhibitAppC({
                    reload: true,
                });
                props.formModalToggle();
                setExhibitAppForm(initCompanyTypeForm);
                setExhibitAppError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('New exhibit app added');
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
                    setExhibitAppError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function updateExhibitApp(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(exhibitappForm);

        request.patch(`exhibit-apps/${id}`, requestData)
            .then(([status_, response]) => {
                setExhibitAppForm(response);
                setExhibitAppError([]);

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Exhibit App Updated');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while updating. Please try again.');
                }
                if (response.errors) {
                    setExhibitAppError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function deleteExhibitApp(e) {
        e.preventDefault();

        request.delete(`exhibit-apps/${exhibitappForm.data.id}`)
        .then(([status_, response]) => {
            setExhibitAppForm(response);
            updateExhibitAppC({
                reload:true,
            });
            props.formModalToggle();
            alert_.success(response.message || 'Exhibit App deleted successfully')
        })
        .catch(([errorStatus, response]) => {
            alert_.error(response.message || 'Error while deleting. Please try again.')
        })
    }


    return <div className='exhibit-apps'>
        <Table
            className='exhibit-apps-table section-table row-link'
            data-test='exhibit-apps-table'
            items={exhibitAppC.items}
            columns={columns}
            controlColumns={[]}
            loaded={exhibitAppC.loaded}
            onRowClick={onRowClick}
            tableEmptyText='No exhibit apps added'
            collection={exhibitAppC}
            updateCollection={updateExhibitAppC}
            reference={exhibitAppsRef}
            queryString={exhibitAppC.queryString}
        />
        {props.formModal && <FormModal
            title={exhibitappForm.data?.id
                ? 'Edit'
                : 'Add Exhibit App'
            }
            toggleModal={() => {
                props.formModalToggle();
                setExhibitAppForm(initCompanyTypeForm);
            }}
            submitActionText={exhibitappForm.data?.id
                ? 'Add'
                : 'Save'
            }
            submitAction={exhibitappForm.data?.id
                ? updateExhibitApp
                : createExhibitApp
            }
            cancelAction={() => {
                props.formModalToggle();
                props.setData(initExhibitAppForm);
            }}
            deleteAction={deleteExhibitApp}
            selectedExhibitAppId={selectedExhibitAppId}
        >
            <div className='exhibit-app-form'>
                <Input
                    label='Name'
                    name='data.name'
                    className='exhibit-app-name-input'
                    value={exhibitappForm.data?.name}
                    onChange={onExhibitAppChange}
                    error={exhibitappError['data.name']}
                />
                <Input
                    label='Exhibit URL Template'
                    name='data.url_template'
                    className='exhibit-app-url-template-input'
                    value={exhibitappForm.data?.url_template}
                    onChange={onExhibitAppChange}
                    error={exhibitappError['data.url_template']}
                />
                <SelectField label='Status'
                    className='exhibit-app-status'
                    options={[
                        {
                            name: 'Active',
                            value: 'active',
                        },
                        {
                            name: 'Inactive',
                            value: 'inactive',
                        },
                    ]}
                    name='data.exhibit-app-status'
                    value={exhibitappForm.data?.status}
                    onChange={onExhibitAppChange}
                    error={exhibitappError['data.status']}
                />
            </div>
        </FormModal>}
    </div>
}

function CustomFields(props) {
    const [ customFieldC,
        updateCustomFieldC,
        customFieldRef,
        isCustomFieldRefVisible
    ] = useCollection(
        'field-groups',
        `status=active&page=1`
    );

    const [ columns, setColumns ]  = useState([
        {
            name: 'S. No',
            id: 'id_',
            sortable: 'backend',
            visible: true,
            render: (row, customData, collection, updateCollection, index) => {
                return <div className='s-no'>
                    {index + 1}
                </div>
            }
        },
        {
            name: 'Custom Field Name',
            id: 'name',
            sortable: 'backend',
            visible: true,
        },
        {
            name: 'Custom Field Type',
            id: 'url',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='custom-field-type'>
                    Need clarification
                </div>
            }
        },
        {
            name: 'Object',
            id: 'url',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                return <div className='object-details'>
                    <div className='object-name'>
                        {row?.object_type_details?.name ?? <span className='data-not-available'>
                            Not available
                        </span>}
                    </div>
                    <div className='object-sub-type'>
                        {row?.object_type_details?.name ?? <span className='data-not-available'>
                            Check this
                        </span>}
                    </div>
                </div>
            }
        },
    ]);

    function onRowClick(e, index) {
        e.preventDefault();
    }

    return <div className='custom-fields'>
        <Table
            className='custom-fields-table section-table row-link'
            data-test='custom-fields-table'
            items={customFieldC.items}
            columns={columns}
            controlColumns={[]}
            loaded={customFieldC.loaded}
            onRowClick={onRowClick}
            tableEmptyText='No custom fields added'
            collection={customFieldC}
            updateCollection={updateCustomFieldC}
            reference={customFieldRef}
            queryString={customFieldC.queryString}
        />
    </div>
}

function Industries(props) {
    const alert_ = useAlert();
    const [ loaded, toggleLoaded ] = useToggle(false);
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

    const [ selectedIndustryId, setSelectedIndustryId ] = useState(null);

    const [ columns, setColumns ]  = useState([
        {
            name: 'S. No',
            id: 'id_',
            sortable: 'backend',
            visible: true,
            render: (row, customData, collection, updateCollection, index) => {
                return <div className='s-no'>
                    {index + 1}
                </div>
            }
        },
        {
            name: 'Name',
            id: 'name',
            sortable: 'backend',
            visible: true,
        },
        {
            name: 'Industry Lowercase',
            id: 'lowercase_for_template',
            sortable: 'backend',
            visible: true,
        },
    ]);

    function convertFullDataToFormData(fullData) {
        return {
            data: {
                name: fullData?.name ?? null,
                lowercase_for_template: fullData?.lowercase_for_template ?? null,
            }
        }
    }

    const [ editIndustryId, setEditIndustryId ] = useState();
    function onRowClick(e, index) {
        e.preventDefault();

        const selectedIndustryId = industryC.items[index]?.id;
        setEditIndustryId(selectedIndustryId);

        props.formModalToggle();


        let newFormData = convertFullDataToFormData(industryC.items[index]);
        setIndustryForm(newFormData);

        props.setSelectedIndustryId(setEditIndustryId);
    }

    function createIndustry(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(industryForm);

        if (!requestData) {
            alert_.error('Add some data before submitting');
        }

        request.post(`industries`, requestData)
            .then(([status_, response]) => {
                updateIndustryC({
                    reload: true,
                });
                setEditIndustryId(null);
                props.formModalToggle();
                setIndustryForm(initIndustryForm);
                setIndustryError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('New industry added');
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
                    setIndustryError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function updateIndustry(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(industryForm);

        request.patch(`industries/${editIndustryId}`, requestData)
            .then(([status_, response]) => {
                setIndustryForm(response);
                setIndustryError([]);
                setEditIndustryId(null);
                props.formModalToggle();

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Industry Updated');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while updating. Please try again.');
                }
                if (response.errors) {
                    setIndustryError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function deleteIndustry(e) {
        e.preventDefault();

        request.delete(`industries/${industryForm.data.id}`)
        .then(([status_, response]) => {
            setIndustryForm(response);
            updateIndustryC({
                reload:true,
            })
            props.formModalToggle();
            alert_.success(response.message || 'Industry deleted successfully')
        })
        .catch(([errorStatus, response]) => {
            alert_.error(response.message || 'Error while deleting. Please try again.')
        })
    }

    return <div className='industries'>
        <Table
            className='industries-table section-table row-link'
            data-test='industries-table'
            items={industryC.items}
            columns={columns}
            controlColumns={[]}
            loaded={industryC.loaded}
            onRowClick={onRowClick}
            tableEmptyText='No industries added'
            collection={industryC}
            updateCollection={updateIndustryC}
            reference={industryRef}
            queryString={industryC.queryString}
        />
        {props.formModal && <FormModal
            title={editIndustryId
                ? 'Edit'
                : 'Add Industry'
            }
            toggleModal={() => {
                setEditIndustryId(null);
                props.formModalToggle();
                setIndustryForm(initIndustryForm);
            }}
            submitActionText={editIndustryId
                ? 'Add'
                : 'Save'
            }
            submitAction={editIndustryId
                ? (e) => {updateIndustry(e, industryForm.id)}
                : createIndustry
            }
            cancelAction={() => {
                props.formModalToggle();
                props.setData(initIndustryForm);
            }}
            deleteAction={deleteIndustry}
            selectedIndustryId={selectedIndustryId}
        >
            <div className='industry-form'>
                <Input
                    label='Name'
                    name='data.name'
                    className='industry-name-input'
                    value={industryForm.data?.name}
                    onChange={onIndustryChange}
                    error={industryError['data.name']}
                />
                <Input
                    label='Lowercase for template'
                    name='data.lowercase_for_template'
                    className='industry-name-input'
                    value={industryForm.data?.lowercase_for_template}
                    onChange={onIndustryChange}
                    error={industryError['data.lowercase_for_template']}
                />
            </div>
        </FormModal>}
    </div>
}

function Specializations(props) {
    const alert_ = useAlert();
    const [ loaded, toggleLoaded ] = useToggle(false);
    const [
        specializationForm,
        setSpecializationForm,
        onSpecializationChange,
        specializationError,
        setSpecializationError,
    ] = useForm(initSpecializationForm);

    const [ specializationC,
        updateSpecializationC,
        specializationRef,
        isSpecializationRefVisible
    ] = useCollection(
        'specializations',
        `status=active&page=1`
    );

    const [ selectedSpecializationId, setSelectedSpecializationId ] = useState(null);

    const [ columns, setColumns ]  = useState([
        {
            name: 'S. No',
            id: 'id_',
            sortable: 'backend',
            visible: true,
            render: (row, customData, collection, updateCollection, index) => {
                return <div className='batch-details'>
                    {index + 1}
                </div>
            }
        },
        {
            name: 'Name',
            id: 'name',
            sortable: 'backend',
            visible: true,
        },
    ]);

    function onRowClick(e, index) {
        e.preventDefault();

        props.formModalToggle();
        const selectedSpecializationId = specializationC.items[index]?.id;
        setSpecializationForm({
            data: specializationC.items[index],
        });
        props.setSelectedSpecializationId(selectedSpecializationId);
    }

    function createSpecialization(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(specializationForm);

        if (!requestData) {
            alert_.error('Add some data before submitting');
        }

        request.post(`specializations`, requestData)
            .then(([status_, response]) => {
                updateSpecializationC({
                    reload: true,
                });
                props.formModalToggle();
                setSpecializationForm(initCompanyTypeForm);
                setSpecializationError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('New company type added');
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
                    setSpecializationError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function updateSpecialization(e) {
        e.preventDefault();

        toggleLoaded();
        let requestData = copy(specializationForm);

        request.patch(`specializations/${id}`, requestData)
            .then(([status_, response]) => {
                setSpecializationForm(response);
                setSpecializationError([]);

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Specialization Updated');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while updating. Please try again.');
                }
                if (response.errors) {
                    setSpecializationError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function deleteSpecialization(e) {
        e.preventDefault();

        request.delete(`specializations/${specializationForm.data.id}`)
        .then(([status_, response]) => {
            setSpecializationForm(response);
            updateSpecializationC({
                reload:true,
            })
            props.formModalToggle();
            alert_.success(response.message || 'Specialization deleted successfully')
        })
        .catch(([errorStatus, response]) => {
            alert_.error(response.message || 'Error while deleting. Please try again.')
        })
    }

    return <div className='specializations'>
        <Table
            className='specializations-table section-table row-link'
            data-test='specializations-table'
            items={specializationC.items}
            columns={columns}
            controlColumns={[]}
            loaded={specializationC.loaded}
            onRowClick={onRowClick}
            tableEmptyText='No specialization added'
            collection={specializationC}
            updateCollection={updateSpecializationC}
            reference={specializationRef}
            queryString={specializationC.queryString}
        />
        {props.formModal && <FormModal
            title={specializationForm.data?.id
                ? 'Edit'
                : 'Add Specialization'
            }
            toggleModal={() => {
                props.formModalToggle();
                setSpecializationForm(initCompanyTypeForm);
            }}
            submitActionText={specializationForm.data?.id
                ? 'Add'
                : 'Save'
            }
            submitAction={specializationForm.data?.id
                ? updateSpecialization
                : createSpecialization
            }
            cancelAction={() => {
                props.formModalToggle();
                props.setData(initSpecializationForm);
            }}
            deleteAction={deleteSpecialization}
            selectedSpecializationId={selectedSpecializationId}
        >
            <div className='specialization-form'>
                <Input
                    label='Name'
                    name='data.name'
                    className='specialization-name-input'
                    value={specializationForm.data?.name}
                    onChange={onSpecializationChange}
                    error={specializationError['data.name']}
                />
            </div>
        </FormModal>}
    </div>
}


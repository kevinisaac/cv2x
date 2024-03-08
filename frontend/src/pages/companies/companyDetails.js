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
    removeEmptyKeys,
    getRandomString,
    getDetailsPageBarChartWidth,

    deleteRecord,
    archiveRecord,
    unArchiveRecord,
} from 'src/helpers';
import {
    FormActions,
    PageTopRow,
    Sections,
    DangerZone,
    AMPMToggle,
    ComingSoon,
    YearFilter,
    ContactDetails,
    NavigationPanel,
    UnsavedDataBanner,
} from 'src/components/outreachComponents';
import jsonData from '/data/json_data/input_data';
import moment from 'moment';

const initCompanyForm = {
    data: {
        name: null,
        short_name: null,
        ultra_short_name: null,
        website_url: null,
        description: null,
        founded_year: null,
        employee_count: null,
        employee_count_min: null,
        employee_count_max: null,
        annual_revenue: null,
        annual_revenue_min: null,
        annual_revenue_max: null,
        custom_fields : {},
        id_industry: null,
        id_company_type: null,
        ids_specialization: [],
        custom_fields: {},
        logo_path: null,
        address: {
            id_country: null,
            id_level_1_sub_division: null,
            id_level_2_sub_division: null,
            id_city: null,
            basic_info: null,
            landmark: null,
            locality: null,
            pincode: null,
        }
    }
}


export default function CompanyDetailsView(props) {
    let { id } = useParams();
    const alert_ = useAlert();
    const navigate = useNavigate();
    const { me, setMe } = useContext(MeContext);
    const { isSubMenuCollapsed, toggleSubMenu } = useContext(UserPreferenceContext);

    const [ notFound, setNotFound ] = useState(false);

    const [ viewMode, setViewMode] = useState('read'); //edit/read/no-edit( when archived )
    const [ pageType, setPageType ] = useState('detatil-page');
    const [ originalForm, setOriginalForm] = useState(initCompanyForm);
    const [ companyDetails, setCompanyDetails ] = useState(null); //To show any other records

    const [
        companyForm,
        setCompanyForm,
        onCompanyChange,
        companyError,
        setCompanyError,
    ] = useForm(initCompanyForm);
    const [ loaded, toggleLoaded ] = useToggle(false);

    const [ mainClassName, setMainClassName] = useState(
        JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
        ? 'expanded-view'
        : ''
    );

    let sections = [
        {
            name: 'Company Details',
            icon: null,
            navigation: 'company-details',
            subSections: [
                {
                    name: null,
                    content: <CompanyDetailsPrimary
                        id={id}
                        data={companyForm.data}
                        onChange={onCompanyChange}
                        error={companyError}
                        viewMode={viewMode}
                    />
                },
                {
                    name: 'Contact Details',
                    content: <ContactDetails
                        name='data'
                        addressName='address'
                        data={companyForm.data}
                        setData={setCompanyForm}
                        onChange={onCompanyChange}
                        error={companyError}
                        viewMode={viewMode}
                        isCompanyDetails={true}
                        timezoneRequired
                    />
                },
            ]
        },
    ];

    if (id !== 'create') {
        let dangerZoneItems = [];

        let deleteSubSection = {
            mainActionTitle: 'Delete Company',
            mainActionSubTitle: 'Please make sure this company does not have any existing leads.',
            actionButtonText: 'Delete',
            actionConfirmationText: 'Are you sure you want to delete this company?',
            actionConfirmationButtonText: 'Yes, Delete',
            actionConfirmation: () => deleteRecord(
                id, 'companies', 'company', alert_, navigate,
            )
        }

        let archiveSubSection = {
            mainActionTitle: 'Archive Company',
            mainActionSubTitle: 'Please make sure this company does not have any existing leads.',
            actionButtonText: 'Archive',
            actionConfirmationText: 'Are you sure you want to archive this company?',
            actionConfirmationButtonText: 'Yes, Archive',
            actionConfirmation: () => archiveRecord(id, 'companies', 'company', alert_)
        }

        let unArchiveSubSection = {
            mainActionTitle: 'Unarchive Company',
            mainActionSubTitle: 'Company will be available for selection again.',
            actionButtonText: 'Unarchive',
            actionConfirmationText: 'Are you sure you want to unarchive this company?',
            actionConfirmationButtonText: 'Yes, Unarchive',
            actionConfirmation: () => unArchiveRecord(id, 'companies', 'company', alert_)
        }

        //Add items in order for danger zone content
        // if (companyDetails?.data?.status === 'archived') {
        //     dangerZoneItems.push(unArchiveSubSection);
        // } else {
        //     dangerZoneItems.push(archiveSubSection);
        // }
        dangerZoneItems.push(deleteSubSection);

        sections.push({
            name: 'Leads',
            icon: null,
            navigation: 'company-leads',
            subSections: [
                {
                    name: null,
                    content: <CompanyLeadsTable
                        id={id}
                        data={companyForm.data}
                        onChange={onCompanyChange}
                        error={companyError}
                        viewMode={viewMode}
                    />
                },
            ]
        })
        sections.push({
            name: 'Danger Zone',
            icon: 'danger-circle.svg',
            type: 'danger',
            navigation: 'danger-zone',
            subSections: [
                {
                    name: null,
                    content: <DangerZone
                        data={companyForm.data}
                        onChange={onCompanyChange}
                        error={companyError}
                        items={dangerZoneItems}
                    />
                }
            ]
        });
    }

    //Used to convert response from API to form data
    function convertResponseToFormData(response) {
        const convertBooleanToString = (value) => {
            if ( value !== undefined && value !== null ) {
                return value ? 'true' : 'false'
            }

            return value;
        };

        let formData = {
            data: {
                name: response?.data?.name ?? null,
                short_name: response?.data?.short_name ?? null,
                ultra_short_name: response?.data?.ultra_short_name ?? null,
                website_url: response?.data?.website_url ?? null,
                description: response?.data?.description ?? null,
                founded_year: response?.data?.founded_year ?? null,
                employee_count: response?.data?.employee_count ?? null,
                employee_count_min: response?.data?.employee_count_min ?? null,
                employee_count_max: response?.data?.employee_count_max ?? null,
                annual_revenue: response?.data?.annual_revenue ?? null,
                annual_revenue_max: response?.data?.annual_revenue_max ?? null,
                annual_revenue_min: response?.data?.annual_revenue_min ?? null,
                id_industry: response?.data?.industry_details?.id ?? null,
                id_company_type: response?.data?.company_type_details?.id ?? null,
                ids_specialization: response?.data?.specializations_details
                    ?.map(specialization => specialization.id) ?? [],
                custom_fields: [], //TODO: Add custom fields
                logo_path: response?.data?.logo_path ?? null,
                address: {
                    id_country:
                        response?.data?.address_details?.country_details?.id ?? null,
                    id_level_1_sub_division:
                        response?.data?.address_details?.level_1_sub_division_details?.id ?? null,
                    id_level_2_sub_division:
                        response?.data?.address_details?.level_2_sub_division_details?.id ?? null,
                    id_city:
                        response?.data?.address_details?.city_details?.id ?? null,
                    basic_info: response?.data?.address_details?.basic_info ?? null,
                    landmark: response?.data?.address_details?.landmark ?? null,
                    locality: response?.data?.address_details?.locality ?? null,
                    pincode: response?.data?.address_details?.pincode ?? null,
                }
            }
        }

        return formData;
    }

    function convertFormDataToRequest(formData) {
        const convertStringToBoolean = (value) => {
            if (value !== undefined && value !== null) {
                return value === 'true';
            }

            return value;
        };

        let requestData = removeEmptyKeys(
            formData,
            [ null, undefined, {}, []],
        );

        return requestData;
    }

    function createCompany() {
        toggleLoaded();
        let requestData = convertFormDataToRequest(companyForm);

        if (!requestData) {
            alert_.error('Add some data before submitting');
        }

        request.post(`companies`, requestData)
            .then(([status_, response]) => {
                navigate('/companies');
                setCompanyError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('New company added');
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
                    setCompanyError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function updateCompany() {
        toggleLoaded();
        let requestData = convertFormDataToRequest(companyForm);

        request.patch(`companies/${id}`, requestData)
            .then(([status_, response]) => {
                let formData = convertResponseToFormData(response);
                setCompanyForm(formData);
                setOriginalForm(formData);
                setViewMode('read');
                setCompanyError([]);

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Company Updated');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while updating. Please try again.');
                }
                if (response.errors) {
                    setCompanyError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function onCancelClick() {
        setViewMode('read');
        setCompanyForm(originalForm);
    }

    useEffect(() => {
        if (id === 'create') {
            setCompanyForm(initCompanyForm);
            setViewMode('edit');
        } else {
            request.get(`companies/${id}`)
                .then(([status_, response]) => {
                    let formData = convertResponseToFormData(response);
                    setCompanyForm(formData);
                    setOriginalForm(formData);
                    setCompanyDetails({data: response.data});

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
        <div id='company-details-view' className='app-content details-view'>
            {notFound
                ? <NotFoundView />
                : <>
                    <PageTopRow
                        title={id === 'create'
                            ? 'Add Company'
                            :  `${companyDetails?.data?.name ?? ''}`
                        }
                        backButtonURL='/companies'
                        type={pageType}
                        archivedMessage={companyDetails?.data?.status === 'archived'
                            ? 'This company has been archived'
                            : null
                        }

                        originalForm={originalForm}
                        updateForm={companyForm}
                        showUnsavedChangesBanner
                    />

                    <div className={`page-content ${isSubMenuCollapsed ? 'collapsed' : ''}`}>
                        <div className='left-page-content no-scrollbar'>
                            <NavigationPanel sections={sections} />
                            <FormActions
                                id={id}
                                type={viewMode}
                                setType={setViewMode}
                                createLabel='Add Company'
                                submitAction={id === 'create'
                                    ? createCompany
                                    : updateCompany
                                }
                                cancelAction={onCancelClick}
                            />
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

function CompanyDetailsPrimary(props) {
    let { commonData } = useContext(CommonValueContext);
    let [ industryC ] = useCollection('industries');
    let [ specializationC ] = useCollection('specializations');
    let [ companyTypeC ] = useCollection('company-types');

    return <div className='company-details'>
        <div className='company-name'>
            <Input label='Company Name'
                name='data.name'
                className='lead-company-name-input'
                value={props.data.name}
                onChange={props.onChange}
                error={props.error['data.name']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='company-short-name'>
            <Input label='Company Short Name'
                name='data.short_name'
                className='lead-company-name-input'
                value={props.data.short_name}
                onChange={props.onChange}
                error={props.error['data.short_name']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='company-ultra-short-name'>
            <Input label='Company Ultra Short Name'
                name='data.ultra_short_name'
                className='lead-company-name-input'
                value={props.data.ultra_short_name}
                onChange={props.onChange}
                error={props.error['data.ultra_short_name']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='company-industry'>
            <SelectField label='Industry'
                options={getOptions(industryC?.items, 'name', 'id') ?? []}
                name='data.id_industry'
                value={props.data.id_industry}
                onChange={props.onChange}
                error={props.error['data.id_industry']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='company-specialities'>
            <DropDownMultiSelect label='Company Specialities'
                type='number'
                options={getOptions(specializationC?.items, 'name', 'id') ?? []}
                name='data.ids_specialization'
                value={props.data?.ids_specialization || []}
                onChange={props.onChange}
                error={props.error['data.ids_specialization']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='company-website'>
            <Input label='Company Website'
                name='data.website_url'
                className='company-website-input'
                value={props.data.website_url}
                onChange={props.onChange}
                error={props.error['data.website_url']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='company-employee-count'>
            <Input label='Company Employee Count'
                type='number'
                name='data.employee_count'
                className='company-employee-count-input'
                value={props.data.employee_count}
                onChange={props.onChange}
                error={props.error['data.employee_count']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='min-company-employee-count'>
            <Input label='Min Company Employee Count'
                type='number'
                className='min-company-employee-count-input'
                name='data.employee_count_min'
                value={props.data.employee_count_min}
                onChange={props.onChange}
                error={props.error['data.employee_count_min']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='max-company-employee-count'>
            <Input label='Max Company Employee Count'
                type='number'
                name='data.employee_count_max'
                className='max-company-employee-count'
                value={props.data.employee_count_max}
                onChange={props.onChange}
                error={props.error['data.employee_count_max']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='company-type'>
            <SelectField label='Company Type'
                options={getOptions(companyTypeC?.items, 'name', 'id') ?? []}
                name='data.id_company_type'
                className='company-type-input'
                value={props.data.id_company_type}
                onChange={props.onChange}
                error={props.error['data.id_company_type']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='company-founded'>
            <Input label='Company Founded'
                type='number'
                name='data.founded_year'
                className='company-founded-input'
                value={props.data.founded_year}
                onChange={props.onChange}
                error={props.error['data.founded_year']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='company-logo'>
            <Input label='Company Logo'
                name='data.logo'
                className='company-logo-input'
                value={props.data.logo_path}
                onChange={props.onChange}
                error={props.error['data.logo_path']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='company-description'>
            <Input label='Company Description'
                type='textarea'
                name='data.description'
                className='company-description-input'
                value={props.data.description}
                onChange={props.onChange}
                error={props.error['data.description']}
                viewMode={props.viewMode}
            />
        </div>
    </div>
}

function CompanyLeadsTable(props) {
    const [ leadC,
        updateLeadC,
        leadRef,
        isLeadRefVisible
    ] = useCollection(
        'leads',
        `id_company=${props.id}`
    );

    const [ columns, setColumns ]  = useState([
        {
            name: 'Lead',
            id: 'name',
            visible: true,
            sortable: 'backend',
            render: (row) => {
                return <div className='lead-details'>
                    <div className='lead-name' data-test='lead-name'>
                        {row.first_name}
                    </div>
                    <div className='lead-email'>
                        {row.email}
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
            name: 'Connected With',
            id: 'linkedin-connection',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                let connectedWith
                    = row?.users_details?.map(user => user.user_details);

                return <div className='linkedin-connected-with'>
                    {connectedWith?.length > 0
                        ? connectedWith.map(connectedWith => connectedWith.name)
                            .join(', ')
                        : <span className='data-not-available'>
                            Not available
                        </span>
                    }
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
            name: 'Campaign',
            id: 'campaign',
            sortable: 'backend',
            visible: true,
            render: (row) => {
                let campaignList = [
                    {
                        name: 'Campaign 1',
                    },
                    {
                        name: 'CEO Entrapment',
                    },
                ]
                return <div className='campaign-details'>
                    {campaignList.map(campaign => campaign.name).join(', ')}
                </div>
            }
        },
    ]);

    function onRowClick(e, index) {
        e.preventDefault();
        navigate(`/leads/${leadC.items[index].id}`)
    }

    return <div className='company-leads-table'>
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


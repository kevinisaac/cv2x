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

const initLeadForm = {
    data: {
        first_name: null,
        last_name: null,
        name: null,
        email: null,
        phone: null,
        linkedin_url: null,
        status: null,
        id_company: null,
        id_designation: null,
        number_of_linkedin_connects: null,
        years_in_current_designation: null,
        ids_user: [],
        custom_fields: [],
        to_linkedin_connect_on: null,
        address: {
            basic_info: null,
            id_country: null,
            id_level_1_sub_division: null,
            id_level_2_sub_division: null,
            id_city: null,
            pincode: null,
            locality: null,
            landmark: null,
        }
    }
}


export default function LeadDetailsView(props) {
    let { id } = useParams();
    const alert_ = useAlert();
    const navigate = useNavigate();
    const { me, setMe } = useContext(MeContext);
    const { isSubMenuCollapsed, toggleSubMenu } = useContext(UserPreferenceContext);

    const [ notFound, setNotFound ] = useState(false);

    const [ viewMode, setViewMode] = useState('read'); //edit/read/no-edit( when archived )
    const [ pageType, setPageType ] = useState('detatil-page');
    const [ originalForm, setOriginalForm] = useState(initLeadForm);
    const [ selectedVersion, setSelectedVersion ] = useState(null);
    const [ leadDetails, setLeadDetails ] = useState(null); //To show any other records
    const [ companyDetails, setCompanyDetails ] = useState(null); //To show any other records

    const [
        leadForm,
        setLeadForm,
        onLeadChange,
        leadError,
        setLeadError,
    ] = useForm(initLeadForm);
    const [ loaded, toggleLoaded ] = useToggle(false);

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
                        leadDetails={leadDetails}
                        data={leadForm.data}
                        onChange={onLeadChange}
                        error={leadError}
                        viewMode={viewMode}
                    />
                },
                {
                    name: 'Contact Details',
                    content: <ContactDetails
                        name='data'
                        addressName='current_address'
                        data={leadForm.data}
                        setData={setLeadForm}
                        onChange={onLeadChange}
                        error={leadError}
                        viewMode={viewMode}
                        emailRequired={true}
                        addressRequired={true}
                        timezoneRequired={true}
                        phoneRequired={true}
                        isCompanyDetails={false}
                    />
                },
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
                        data={companyDetails?.data}
                        onChange={onLeadChange}
                        error={leadError}
                        viewMode={viewMode}
                    />
                },
                {
                    name: 'Contact Details',
                    content: <ContactDetails
                        name='data'
                        addressName='current_address'
                        data={leadForm.data}
                        setData={setLeadForm}
                        onChange={onLeadChange}
                        error={leadError}
                        viewMode={viewMode}
                        emailRequired={false}
                        addressRequired={true}
                        timezoneRequired={true}
                        phoneRequired={false}
                        isCompanyDetails={true}
                    />
                },
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
        //     name: 'Company Details',
        //     icon: null,
        //     navigation: 'company-details',
        //     subSections: [
        //         {
        //             name: null,
        //             content: <LeadCompanyDetails
        //                 id={id}
        //                 data={companyDetails?.data}
        //                 onChange={onLeadChange}
        //                 error={leadError}
        //                 viewMode={viewMode}
        //             />
        //         },
        //         // {
        //         //     name: 'Contact Details',
        //         //     content: <ContactDetails
        //         //         name='data'
        //         //         addressName='current_address'
        //         //         data={leadForm.data}
        //         //         setData={setLeadForm}
        //         //         onChange={onLeadChange}
        //         //         error={leadError}
        //         //         viewMode={viewMode}
        //         //     />
        //         // },
        //     ]
        // },);

        sections.push({
            name: 'Danger Zone',
            icon: 'danger-circle.svg',
            type: 'danger',
            navigation: 'danger-zone',
            subSections: [
                {
                    name: null,
                    content: <DangerZone
                        data={leadForm.data}
                        onChange={onLeadChange}
                        error={leadError}
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

        return {
            data: {
                first_name: response?.data?.first_name ?? null,
                last_name: response?.data?.last_name ?? null,
                name: response?.data?.name ?? null,
                email: response?.data?.email ?? null,
                phone: response?.data?.phone ?? null,
                linkedin_url: response?.data?.linkedin_url ?? null,
                status: response?.data?.status ?? null,
                id_company: response?.data?.company_details?.id ?? null,
                id_designation: response?.data?.designation_details?.id ?? null,
                number_of_linkedin_connects:
                    response?.data?.number_of_linkedin_connects ?? null,
                years_in_current_designation:
                    response?.data?.years_in_current_designation ?? null,
                ids_user: response?.data?.users_details
                    ?.map(user => user?.user_details?.id) ?? [],
                custom_fields: [],
                to_linkedin_connect_on: response?.data?.to_linkedin_connect_on ?? null,
                address: {
                    basic_info: response?.data?.address_details?.basic_info ?? null,
                    id_country: response?.data?.address_details?.country_details?.id ?? null,
                    id_level_1_sub_division: response?.data?.address_details?.level_1_sub_division_details?.id ?? null,
                    id_level_2_sub_division: response?.data?.address_details?.level_2_sub_division_details?.id ?? null,
                    id_city: response?.data?.address_details?.city_details?.id ?? null,
                    pincode: response?.data?.address_details?.pincode ?? null,
                    locality: response?.data?.address_details?.locality ?? null,
                    landmark: response?.data?.address_details?.landmark ?? null,
                }
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
            [null, undefined, {}, []],
            []
        );

        return requestData;
    }

    function convertCompanyResponseToFormData(response) {
        const convertBooleanToString = (value) => {
            if ( value !== undefined && value !== null ) {
                return value ? 'true' : 'false'
            }

            return value;
        };

        let formData = {
            data: {
                name: response?.data?.name ?? null,
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
        request.patch(`leads/${id}`, requestData)
            .then(([status_, response]) => {
                let formData = convertResponseToFormData(response);
                setLeadForm(formData);
                setOriginalForm(formData);
                setViewMode('read');
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
        setViewMode('read');
        setLeadForm(originalForm);
    }

    useEffect(() => {
        console.log('useEffect first line')
        if (id === 'create') {
            setLeadForm(initLeadForm);
            setViewMode('edit');

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
                        setViewMode('no-edit');
                    }

                    if(response?.data?.company_details?.id) {
                        request.get(`companies/${response?.data?.company_details?.id}`)
                            .then(([status_, companyResponse]) => {
                                let companyData
                                    = convertCompanyResponseToFormData(companyResponse);
                                setCompanyDetails(companyData);
                            })
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
    console.log('companyDetails', companyDetails);

    return <div id='main-grid' className={`${mainClassName}`}>
        <Header />
        <Sidebar />
        <div id='lead-details-view' className='app-content details-view'>
            {notFound
                ? <NotFoundView />
                : <>
                    <PageTopRow
                        title={id === 'create'
                            ? 'Add Lead'
                            :  `${leadDetails?.data?.name ?? ''}`
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
                    />

                    <div className={`page-content ${isSubMenuCollapsed ? 'collapsed' : ''}`}>
                        <div className='left-page-content no-scrollbar'>
                            <NavigationPanel sections={sections} />
                            <FormActions
                                id={id}
                                type={viewMode}
                                setType={setViewMode}
                                createLabel='Add Lead'
                                submitAction={id === 'create'
                                    ? createLead
                                    : updateLead
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

function BasicDetailsPrimary(props) {
    let { commonData } = useContext(CommonValueContext);
    const [ designationsC ] = useCollection('designations');
    const [ userC ] = useCollection('users');
    const [ companyC ] = useCollection('companies');

    return <div className='basic-details-primary'>
        <div className='title'>
            <SelectField label='Title'
                className='lead-title'
                options={getOptions(jsonData?.titles, 'label', 'token') ?? []}
                name='data.title'
                value={props.data.title}
                onChange={props.onChange}
                error={props.error['data.title']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='first-name'>
            <Input label='First Name'
                name='data.first_name'
                className='lead-first-name-input'
                value={props.data.first_name}
                onChange={props.onChange}
                error={props.error['data.first_name']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='last-name'>
            <Input label='Last Name'
                name='data.last_name'
                className='lead-last-name-input'
                value={props.data.last_name}
                onChange={props.onChange}
                error={props.error['data.last_name']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='full-name'>
            <Input label='Full Name'
                name='data.name'
                className='lead-full-name-input'
                value={props.data.name}
                onChange={props.onChange}
                error={props.error['data.name']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='username'>
            <Input label='Username'
                name='data.username'
                className='lead-username-input'
                value={props.leadDetails?.data?.username}
                onChange={props.onChange}
                error={props.error['data.username']}
                viewMode='read'
            />
        </div>
        <div className='designation'>
            <SelectField label='Designation'
                name='data.id_designation'
                options={getOptions(designationsC?.items, 'name', 'id') ?? []}
                className='lead-designation-input'
                value={props.data.id_designation}
                onChange={props.onChange}
                error={props.error['data.id_designation']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='years-in-position'>
            <Input label='Years In Position'
                type='number'
                name='data.years_in_current_designation'
                className='lead-years-in-position-input'
                value={props.data.years_in_current_designation}
                onChange={props.onChange}
                error={props.error['data.years_in_current_designation']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='linkedin-url'>
            <Input label='LinkedIn URL'
                name='data.linkedin_url'
                className='lead-linkedin-url-input'
                value={props.data.linkedin_url}
                onChange={props.onChange}
                error={props.error['data.linkedin_url']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='linkedin-connections'>
            <Input label='LinkedIn Connections'
                type='number'
                name='data.number_of_linkedin_connects'
                className='lead-linkedin-connections-input'
                value={props.data.number_of_linkedin_connects}
                onChange={props.onChange}
                error={props.error['data.number_of_linkedin_connects']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='connected-with'>
            <DropDownMultiSelect label='Connected With'
                options={getOptions(userC?.items, 'name', 'id') ?? []}
                name='data.ids_user'
                value={props.data.ids_user}
                onChange={props.onChange}
                error={props.error['data.ids_user']}
                viewMode={props.viewMode}
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
                viewMode={props.viewMode}
            />
        </div>
        <div className='to-linkedin-connect'>
            <DateField label='To LinkedIn Connect On'
                name='data.to_linkedin_connect_on'
                value={props.data.to_linkedin_connect_on}
                onChange={props.onChange}
                error={props.error['data.to_linkedin_connect_on']}
                viewMode={props.viewMode}
            />
        </div>
    </div>
}

function LeadCompanyDetails(props) {
    let { commonData } = useContext(CommonValueContext);
    let [ industryC ] = useCollection('industries');
    let [ specializationC ] = useCollection('specializations');
    let [ companyTypeC ] = useCollection('company-types');

    return <div className='lead-company-details'>
        <div className='company-name'>
            <Input label='Company Name'
                name='data.name'
                className='lead-company-name-input'
                value={props.data?.name}
                onChange={props.onChange}
                // viewMode={'read'}
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
        <div className='company-specialities'>
            <DropDownMultiSelect label='Company Specialities'
                //options={getOptions(specializationC?.items, 'name', 'id') ?? []}
                name='data.ids_specialities'
                value={props.data?.ids_specialities || []}
                onChange={props.onChange}
                error={props.error['data.ids_specialities']}
                options={commonData?.users
                    ? getOptions(commonData.users, 'name', 'id')
                    :  []
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
        </div>
        <div className='company-logo'>
            <Input label='Company Logo'
                name='data.logo'
                className='company-logo-input'
                value={props.data?.logo}
                onChange={props.onChange}
                error={props.error['data.logo']}
                // viewMode={'read'}
            />
        </div>
        <div className='company-description'>
            <Input label='Company Description'
                type='textarea'
                name='data.description'
                className='company-description-input'
                value={props.data?.description}
                onChange={props.onChange}
                error={props.error['data.description']}
                // viewMode={'read'}
            />
        </div>
    </div>
}

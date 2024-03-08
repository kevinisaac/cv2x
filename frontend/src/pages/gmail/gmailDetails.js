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
import moment from 'moment';

const initClientForm = {
    'data': {
        'name': '',
        'title': '',
        'status': 'active',
        'dob': '',
        'registration_date': moment().format('YYYY-MM-DD'),
        'review_date': '',
        'email': '',
        // 'id_profile_picture': 1,
        'profile_picture_details': {
            id: null,
            path: '',
        },
       'phones': [{
           label_name: 'home',
           phone_number: '',
        }],
        'current_address': {
            'basic_info': '',
            'locality': '',
            'pincode': '',
            'id_level_1_sub_division': null,
        },
        'postal_address_as_current_address': false,
        'postal_address': {
            'basic_info': '',
            'locality': '',
            'pincode': '',
            'id_level_1_sub_division': null,
        },
        'account_address_as_current_address': false,
        'account_address': {
            'basic_info': '',
            'locality': '',
            'pincode': '',
            'id_level_1_sub_division': null,
        },
        'billing_address_as_current_address': false,
        'billing_address': {
            'basic_info': '',
            'locality': '',
            'pincode': '',
            'id_level_1_sub_division': null,
        },
        'contacts': [],
        'id_country_birth': null,
        'gender': null ,
        'religion': '' ,
        'id_preferred_language': '',
        'id_native_language': '',
        'client_status': '',
        'client_status_date': '',
        'indigenous_status': '',
        'marital_status': '',
        'living_arrangement': '',
        'cald_required': false,
        'interpreter_needed': false,
        'referral': '',
        'ids_service_offered': [],
        'ids_mobility_assistance': [],
        'transportation': {
            'ids_vehicle_type': [],
            'ids_feature': [],
            'transportation_notes': null,
        },
        'meals_on_wheels': [],
        'food_delivery': {
            'delivery_area': '',
            'client_route': null,
            'dietary_requirements': '',
            'delivery_notes': '',
        },
        'medical_and_health': {
            'id_gp_surgery': '',
            'vision': '',
            'hearing': '',
            'has_bowel_or_bladder_issues': null,
            // 'self_managed': 'self-manage',
            'self_managed': '',
            'has_allergies': null,
            'has_dementia': null,
            'medicare_number': '',
            'medicare_expiry_date': '',
            'medication': '',
            'medical_condition': ''
        },
        'pension': {
            "pension_number": "",
            "id_pension_type": "",
            "billing_name": "",
            "dva": "",
            "pension_expiry_date": "",
            "id_funding_body": "",
        },
        'careplans': [],
        'service_allocation': null,
    }
}


export default function LeadDetailsView(props) {
    let { id } = useParams();
    const alert_ = useAlert();
    const navigate = useNavigate();
    const { me, setMe } = useContext(MeContext);
    const { isSubMenuCollapsed, toggleSubMenu } = useContext(UserPreferenceContext);

    const [ notFound, setNotFound ] = useState(false);

    const [ deceasedModal, toggleDeceasedModal ] = useToggle(false);
    const [ viewMode, setViewMode] = useState('read'); //edit/read/no-edit( when archived )
    const [ pageType, setPageType ] = useState('detatil-page');
    const [ originalForm, setOriginalForm] = useState(initClientForm);
    const [ selectedVersion, setSelectedVersion ] = useState(null);
    const [ clientDetails, setClientDetails ] = useState(null); //To show any other records

    const [
        clientForm,
        setClientForm,
        onClientChange,
        clientError,
        setClientError,
    ] = useForm(initClientForm);
    const [ loaded, toggleLoaded ] = useToggle(false);

    const [ clientVersionsC, updateClientVersionsC ] = useCollection(null);

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
                        urNo={clientDetails?.data.ur_no}
                        data={clientForm.data}
                        onChange={onClientChange}
                        error={clientError}
                        viewMode={viewMode}
                    />
                },
                {
                    name: null,
                    content: <BasicDetailsNotes
                        data={clientForm.data}
                        onChange={onClientChange}
                        error={clientError}
                        viewMode={viewMode}
                    />
                },
                {
                    name: 'Contact Details',
                    content: <ContactDetails
                        name='data'
                        addressName='current_address'
                        data={clientForm.data}
                        setData={setClientForm}
                        onChange={onClientChange}
                        error={clientError}
                        viewMode={viewMode}
                    />
                },
                {
                    name: 'Postal Address',
                    content: <AddressSubSection
                        checkboxLabelText='Current address as postal address'
                        name='data.postal_address'
                        data={clientForm.data.postal_address}
                        setData={setClientForm}
                        onChange={onClientChange}
                        error={clientError}
                        sameAsCheckBoxName='data.postal_address_as_current_address'
                        sameAsCheckBoxValue={clientForm.data.postal_address_as_current_address}
                        onSameAsCheckBoxClick={onSameAsCheckboxClick}
                        currentAddress={clientForm.data.current_address}
                        viewMode={viewMode}
                    />
                },
                {
                    name: 'Account Address',
                    content: <AddressSubSection
                        checkboxLabelText='Current address as accounts address'
                        name='data.account_address'
                        data={clientForm.data.account_address}
                        setData={setClientForm}
                        onChange={onClientChange}
                        error={clientError}
                        sameAsCheckBoxName='data.account_address_as_current_address'
                        sameAsCheckBoxValue={clientForm.data.account_address_as_current_address}
                        onSameAsCheckBoxClick={onSameAsCheckboxClick}
                        currentAddress={clientForm.data.current_address}
                        viewMode={viewMode}
                    />
                },
                {
                    name: 'Billing Address',
                    content: <AddressSubSection
                        checkboxLabelText='Current address as billing address'
                        name='data.billing_address'
                        data={clientForm.data.billing_address}
                        setData={setClientForm}
                        onChange={onClientChange}
                        error={clientError}
                        sameAsCheckBoxName='data.billing_address_as_current_address'
                        sameAsCheckBoxValue={clientForm.data.billing_address_as_current_address}
                        onSameAsCheckBoxClick={onSameAsCheckboxClick}
                        currentAddress={clientForm.data.current_address}
                        viewMode={viewMode}
                    />
                },
            ]
        },
        {
            name: 'Demographic',
            icon: null,
            navigation: 'demographic',
            subSections: [
                {
                    name: null,
                    content: <DemographicPrimary
                        data={clientForm.data}
                        onChange={onClientChange}
                        error={clientError}
                        viewMode={viewMode}
                    />
                },
                {
                    name: 'Status Details',
                    content: <DemographicStatusDetails
                        data={clientForm.data}
                        onChange={onClientChange}
                        error={clientError}
                        viewMode={viewMode}
                    />
                },
            ]
        },
        {
            name: 'Services Required',
            icon: null,
            navigation: 'services-required',
            subSections: [
                {
                    name: null,
                    content: <ServicesRequiredPrimary
                        data={clientForm.data}
                        onChange={onClientChange}
                        error={clientError}
                        viewMode={viewMode}
                    />
                },
                {
                    name: 'Transport Requirements',
                    content: <TransportRequirements
                        data={clientForm.data}
                        onChange={onClientChange}
                        error={clientError}
                        viewMode={viewMode}
                    />
                },
                {
                    name: 'Mobility Assistance',
                    content: <MobilityAssistance
                        data={clientForm.data}
                        onChange={onClientChange}
                        error={clientError}
                        viewMode={viewMode}
                    />
                },
            ]
        },
        {
            name: 'MoW',
            icon: null,
            navigation: 'mow',
            subSections: [
                {
                    name: null,
                    content: <MealsOnWheelsPrimary
                        data={clientForm.data}
                        setData={setClientForm}
                        onChange={onClientChange}
                        error={clientError}
                        viewMode={viewMode}
                    />
                },
                {
                    name: 'Delivery Details',
                    content: <DeliveryDetails
                        data={clientForm.data}
                        onChange={onClientChange}
                        error={clientError}
                        viewMode={viewMode}
                    />
                }
            ]
        },
        {
            name: 'Medical/Health',
            icon: null,
            navigation: 'medical-health',
            subSections: [
                {
                    name: null,
                    content: <MedicalHealth
                        data={clientForm.data}
                        onChange={onClientChange}
                        error={clientError}
                        viewMode={viewMode}
                    />
                }
            ]
        },
        {
            name: 'Pension',
            icon: null,
            navigation: 'pension',
            subSections: [
                {
                    name: null,
                    content: <Pension
                        data={clientForm.data}
                        onChange={onClientChange}
                        error={clientError}
                        viewMode={viewMode}
                    />
                }
            ]
        },
        {
            name: 'Careplan',
            icon: null,
            navigation: 'careplan',
            subSections: [
                {
                    name: null,
                    content: <CarePlan
                        data={clientForm.data}
                        setData={setClientForm}
                        onChange={onClientChange}
                        error={clientError}
                        viewMode={viewMode}
                    />
                }
            ]
        },
        {
            name: 'Emergency Contact',
            icon: null,
            navigation: 'emergency-contact',
            subSections: [
                {
                    name: null,
                    content: <EmergencyContactList
                        name='data.contacts'
                        data={clientForm.data.contacts}
                        setData={setClientForm}
                        onChange={onClientChange}
                        error={clientError}
                        viewMode={viewMode}
                    />
                }
            ]
        },
    ];

    if (id !== 'create') {
        if (me.permissions_map?.read_client_statistics) {
            sections.push({
                name: 'Statistics',
                navigation: 'statistics',
                subSections: [
                    {
                        name: null,
                        content: <ClientStatistics
                            id={id}
                        />
                    },
                ],
            });
        }
        sections.push({
            name: 'Journeys',
            icon: null,
            navigation: 'journeys',
            subSections: [
                {
                    name: null,
                    content: <ClientBookings
                        id={id}
                        viewMode={viewMode}
                    />
                },
            ]
        });
        sections.push({
            name: 'Ledger',
            icon: null,
            navigation: 'ledger',
            subSections: [
                {
                    name: null,
                    content: <Ledger
                        id={id}
                        viewMode={viewMode}
                    />
                },
            ]
        });

        sections[1].subSections.push({
            name: 'Service Commenced',
            content: <DemographicServiceCommenced
                client={clientDetails}
            />
        })

        if (clientDetails?.data?.status === 'archived') {
            //To add unarchive option for archived records
            sections.push({
                name: 'Danger Zone',
                icon: 'danger-circle.svg',
                type: 'danger',
                navigation: 'danger-zone',
                subSections: [
                    {
                        name: null,
                        content: <DangerZone
                            data={clientForm.data}
                            onChange={onClientChange}
                            error={clientError}
                            items={[
                                {
                                    mainActionTitle: 'Unarchive Client',
                                        mainActionSubTitle: 'Client will be available for selection again.',
                                        actionButtonText: 'Unarchive',
                                        actionConfirmationText: 'Are you sure you want to unarchive this client?',
                                        actionConfirmationButtonText: 'Yes, Unarchive',
                                        actionConfirmation: () => {
                                            let requestPayload = {
                                                data: {
                                                    'status': 'active',
                                                }
                                            }
                                            request.patch(`clients/${id}`, requestPayload)
                                                .then(([status_, response]) => {
                                                    navigate('/clients');
                                                    if (response.message) {
                                                        alert_.success(response.message);
                                                    } else {
                                                        alert_.success('Client Unarchived');
                                                    }
                                                })
                                                .catch(([errorStatus, response]) => {
                                                    if (response.message) {
                                                        alert_.error(response.message);
                                                    } else {
                                                        alert_.error('Unable to unarchive. Please try again');
                                                    }
                                                })
                                            ;
                                        }
                                },
                                    {
                                        mainActionTitle: 'Delete Vehicle',
                                        mainActionSubTitle: 'Please make sure this client does not have any existing booking.',
                                        actionButtonText: 'Delete',
                                        actionConfirmationText: 'Are you sure you want to delete this client?',
                                        actionConfirmationButtonText: 'Yes, Delete',
                                        actionConfirmation: () => {
                                            request.delete(`clients/${id}`)
                                                .then(([status_, response]) => {
                                                    navigate('/clients');
                                                    if (response.message) {
                                                        alert_.success(response.message);
                                                    } else {
                                                        alert_.success('Client Deleted');
                                                    }
                                                })
                                                .catch(([errorStatus, response]) => {
                                                    if (response.message) {
                                                        alert_.error(response.message);
                                                    } else {
                                                        alert_.error('Unable to delete. Please try again');
                                                    }
                                                })
                                            ;
                                        }
                                    },
                            ]}
                        />
                    }
                ]
            });
        } else {
            sections.push({
                name: 'Danger Zone',
                icon: 'danger-circle.svg',
                type: 'danger',
                navigation: 'danger-zone',
                subSections: [
                    {
                        name: null,
                        content: <DangerZone
                            data={clientForm.data}
                            onChange={onClientChange}
                            error={clientError}
                            items={[
                                {
                                    mainActionTitle: 'Archive Client',
                                        mainActionSubTitle: 'Please make sure this client does not have any existing booking.',
                                        actionButtonText: 'Archive',
                                        actionConfirmationText: 'Are you sure you want to archive this client?',
                                        actionConfirmationButtonText: 'Yes, Archive',
                                        actionConfirmation: () => {
                                            let requestPayload = {
                                                data: {
                                                    'status': 'archived',
                                                }
                                            }
                                            request.patch(`clients/${id}`, requestPayload)
                                                .then(([status_, response]) => {
                                                    navigate('/clients');
                                                    if (response.message) {
                                                        alert_.success(response.message);
                                                    } else {
                                                        alert_.success('Client Archived');
                                                    }
                                                })
                                                .catch(([errorStatus, response]) => {
                                                    if (response.message) {
                                                        alert_.error(response.message);
                                                    } else {
                                                        alert_.error('Unable to archive client. Contact administrator.');
                                                    }
                                                })
                                            ;
                                        }
                                },
                                    {
                                        mainActionTitle: 'Delete Client',
                                        mainActionSubTitle: 'Please make sure this client does not have any existing booking.',
                                        actionButtonText: 'Delete',
                                        actionConfirmationText: 'Are you sure you want to delete this client?',
                                        actionConfirmationButtonText: 'Yes, Delete',
                                        actionConfirmation: () => {
                                            request.delete(`clients/${id}`)
                                                .then(([status_, response]) => {
                                                    navigate('/clients');
                                                    if (response.message) {
                                                        alert_.success(response.message);
                                                    } else {
                                                        alert_.success('Client Deleted');
                                                    }
                                                })
                                                .catch(([errorStatus, response]) => {
                                                    if (response.message) {
                                                        alert_.error(response.message);
                                                    } else {
                                                        alert_.error('Unable to delete. Please try again');
                                                    }
                                                })
                                            ;
                                        }
                                    },
                            ]}
                        />
                    }
                ]
            });
        }
    }

    //Used to convert response from API to form data
    function convertResponseToFormData(response) {
        // console.log('Response', response.data.phones_details);
        const convertBooleanToString = (value) => {
            if ( value !== undefined && value !== null ) {
                return value ? 'true' : 'false'
            }

            return value;
        };

        let phones = response.data.phones_details?.map(phoneDetail => {
            return {
                id: phoneDetail.id,
                label_name: phoneDetail.label_name,
                phone_number: phoneDetail.phone_number,
            }
        }
        );

        if (phones.length === 0) {
            phones = [
                {
                    label_name: '',
                    phone_number: '',
                }
            ]
        }

        let selfManage;
        //Code to convert self_manage from boolean to string
        if (response.data?.medical_and_health?.self_managed) {
            selfManage = 'self-manage';
        } else {
            selfManage = 'non-self';
        }
        return {
            'data': {
                'name': response.data.name,
                'title': response.data.title,
                'status': response.data.status,
                'dob': response.data.dob,
                'registration_date': response.data.registration_date,
                'review_date': response.data.review_date,
                'email': response.data.email,
                // 'id_profile_picture': 1,
                'profile_picture_details': response.data.profile_picture_details,
                'phones': phones,
                'notes': response.data.notes,
                'current_address':{
                    'id': response.data.current_address_details?.id,
                    'basic_info': response.data.current_address_details?.basic_info ?? '',
                    'pincode': response.data.current_address_details?.pincode ?? null,
                    'locality': response.data.current_address_details?.locality ?? null,
                    'id_level_1_sub_division': response.data.current_address_details
                    ?.level_1_sub_division_details?.id ?? null,
                },
                'postal_address_as_current_address': response.data.postal_address_as_current_address,
                'postal_address': {
                    id: response.data.postal_address_details?.id,
                    basic_info: response.data.postal_address_details?.basic_info ?? '',
                    pincode: response.data.postal_address_details?.pincode ?? null,
                    locality: response.data.postal_address_details?.locality ?? null,
                    id_level_1_sub_division: response.data.postal_address_details
                    ?.level_1_sub_division_details?.id ?? null,
                },
                // 'postal_address_details': response.data.postal_address_details,
                'account_address_as_current_address': response.data.account_address_as_current_address,
                'account_address': {
                    id: response.data.account_address_details?.id,
                    basic_info: response.data.account_address_details?.basic_info ?? '',
                    pincode: response.data.account_address_details?.pincode ?? null,
                    locality: response.data.account_address_details?.locality ?? null,
                    id_level_1_sub_division: response.data.account_address_details
                    ?.level_1_sub_division_details?.id ?? null,
                },
                // 'account_address_details': response.data.account_address_details,
                'billing_address_as_current_address': response.data.billing_address_as_current_address,
                'billing_address': {
                    id: response.data.billing_address_details?.id,
                    basic_info: response.data.billing_address_details?.basic_info ?? '',
                    pincode: response.data.billing_address_details?.pincode ?? null,
                    locality: response.data.billing_address_details?.locality ?? null,
                    id_level_1_sub_division: response.data.billing_address_details
                    ?.level_1_sub_division_details?.id ?? null,
                },
                // 'billing_address_details': response.data.billing_address_details,
                'contacts': response.data.contacts_details
                .map(contact => {
                    return {
                        id: contact.id,
                        title: contact.title,
                        name: contact.name,
                        relation_type: contact.relation_type,
                        gender: contact.gender,
                        notes: contact.notes,
                        email: contact.email,
                        address: {
                            id: contact?.address_details?.id,
                            basic_info: contact?.address_details?.basic_info ?? '',
                            pincode: contact?.address_details?.pincode,
                            locality: contact?.address_details?.locality ,
                            id_level_1_sub_division: contact?.address_details
                            ?.level_1_sub_division_details?.id,
                        },
                        phones: contact.phones_details?.map(phone => {
                            return {
                                id: phone.id,
                                label_name: phone.label_name,
                                phone_number: phone.phone_number,
                            }
                        }),
                        id_profile_picture: contact.profile_picture_details?.id ?? null,
                    }
                }
                ),
                'id_country_birth': response.data.country_birth_details?.id ?? null,
                'gender': response.data?.gender ?? null,
                'religion': response.data.religion,
                'id_preferred_language': response.data.preferred_language_details?.id ?? null,
                'id_native_language': response.data.native_language_details?.id ?? null,
                'client_status': response.data.client_status,
                'client_status_date': response.data.client_status_date,
                'indigenous_status': response.data.indigenous_status,
                'marital_status': response.data.marital_status,
                'living_arrangement': response.data.living_arrangement,
                'cald_required': response.data.cald_required,
                'interpreter_needed': response.data.interpreter_needed,
                'referral': response.data.referral,
                'ids_service_offered': response.data.services_offered_details?.map(service => service.id)?? [],
                'ids_mobility_assistance': response.data.mobility_assistances_details?.map(mobilityAssistance => mobilityAssistance.id) ?? [],
                'transportation': {
                    'ids_vehicle_type': response.data.transportation?.vehicle_types_details
                    ?.map(type => type.id.toString()) ?? [],
                    'ids_feature': response.data.transportation?.features_details
                    ?.map(feature => feature.id) ?? [],
                    'transportation_notes': response.data.transportation?.transportation_notes,
                },
                'meals_on_wheels': response.data.meals_on_wheels_details
                ?.map(weekDay =>  {
                    return {
                        quantity: weekDay.quantity,
                        weekday: weekDay.weekday,
                        am_or_pm: weekDay.am_or_pm,
                        is_frozen: weekDay.is_frozen,
                    }
                }),
                'food_delivery': response.data.food_delivery,
                'medical_and_health': {
                    'id_gp_surgery': response.data?.medical_and_health?.gp_surgery_details?.id ?? null,
                    'vision': response.data?.medical_and_health?.vision ?? null,
                    'hearing': response.data?.medical_and_health?.hearing ?? null,
                    'has_bowel_or_bladder_issues': convertBooleanToString(response.data?.medical_and_health?.has_bowel_or_bladder_issues),

                    'self_managed': selfManage,
                    'has_allergies': convertBooleanToString(response.data?.medical_and_health?.has_allergies),
                    'has_dementia': convertBooleanToString(response.data?.medical_and_health?.has_dementia),
                    'medicare_number': response.data?.medical_and_health?.medicare_number ?? '',
                    'medicare_expiry_date': response.data?.medical_and_health?.medicare_expiry_date ?? '',
                    'medication': response.data?.medical_and_health?.medication ?? '',
                    'medical_condition': response.data?.medical_and_health?.medical_condition ?? '',
                },
                'pension':{
                    'pension_number': response.data?.pension?.pension_number ?? '',
                    'id_pension_type': response.data?.pension?.pension_type_details?.id ?? null,
                    'billing_name': response.data?.pension?.billing_name ?? '',
                    'dva': response.data?.pension?.dva ?? null,
                    'pension_expiry_date': response.data?.pension?.pension_expiry_date ?? '',
                    'id_funding_body': response.data?.pension?.funding_body_details?.id ?? null,
                },
                'careplans': response.data.careplans_details?.map(carePlan => {
                    return {
                        'id': carePlan.id,
                        'plan_name': carePlan.plan_name,
                        'plan_date': carePlan.plan_date,
                        'id_file': carePlan.file_details?.id ?? null,
                        'file_details': carePlan.file_details,
                    };
                }),
                'service_allocation': response.data.service_allocation,
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
            [
                'transportation',
                'postal_address',
                'current_address',
                'account_address',
                'billing_address',
            ]
        );

        delete requestData.data['profile_picture_details'];

        if (formData.data.profile_picture_details?.id)
            requestData.data['id_profile_picture'] = formData.data.profile_picture_details?.id;

        //Code to convert 'self_manage' to Boolean value
        if (requestData.data?.medical_and_health?.self_managed) {
            if (requestData.data.medical_and_health?.self_managed === 'self-manage') {
                requestData.data.medical_and_health.self_managed = true;
            } else {
                requestData.data.medical_and_health.self_managed = false;
            }
        }


        //Code to remove file_details attribute from careplans
        if (requestData.data?.careplans && requestData.data?.careplans.length > 0) {
            requestData.data['careplans'] = formData.data.careplans
                ?.map(carePlan => {
                    let returnCarePlan = {
                        'plan_name': carePlan.plan_name,
                        'plan_date': carePlan.plan_date,
                        'id_file': carePlan.file_details?.id ?? null,
                    }

                    if (carePlan.id) {
                        returnCarePlan['id'] = carePlan.id;
                    }
                    return returnCarePlan;
                })
            ;
        }

        //Code to convert boolean values if exists
        if (requestData.data.medical_and_health) {
            if (requestData.data.medical_and_health?.has_bowel_or_bladder_issues) {
                requestData.data.medical_and_health.has_bowel_or_bladder_issues =
                    convertStringToBoolean(requestData.data.medical_and_health.has_bowel_or_bladder_issues);
            }
            if (requestData.data.medical_and_health?.has_allergies) {
                requestData.data.medical_and_health.has_allergies =
                    convertStringToBoolean(requestData.data.medical_and_health.has_allergies);
            }
            if (requestData.data.medical_and_health?.has_dementia) {
                requestData.data.medical_and_health.has_dementia =
                    convertStringToBoolean(requestData.data.medical_and_health.has_dementia);
            }
        }

        if (formData.data?.transportation?.ids_vehicle_type) {
            requestData.data.transportation.ids_vehicle_type
                = formData.data.transportation.ids_vehicle_type.map(id => parseInt(id));
        }

        if (formData.data?.transportation?.ids_feature) {
            requestData.data.transportation.ids_feature
                = formData.data.transportation.ids_feature.map(id => parseInt(id));
        }


        return requestData;
    }

    function createClient() {
        let requestData = convertFormDataToRequest(clientForm);

        request.post(`clients`, requestData)
            .then(([status_, response]) => {
                // let formData = convertResponseToFormData(response);
                // setClientForm(formData);
                // toggleLoaded();
                navigate('/clients');
                setClientError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('New client added');
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
                    setClientError(response.errors);
                }
            });
    }

    function updateClient() {
        console.log('Client Form', clientForm);
        let requestData = convertFormDataToRequest(clientForm);

        console.log('Request Data', requestData);
        request.patch(`clients/${id}`, requestData)
            .then(([status_, response]) => {
                let formData = convertResponseToFormData(response);
                setClientForm(formData);
                setOriginalForm(formData);
                setViewMode('read');
                setClientError([]);
                updateClientVersionsC({
                    reload: true,
                });
                // toggleLoaded();
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Client Updated');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while updating. Please try again.');
                }
                if (response.errors) {
                    setClientError(response.errors);
                }
            });
    }

    function onCancelClick() {
        setViewMode('read');
        setClientForm(originalForm);
    }

    function onSameAsCheckboxClick(addressName) {
        setClientForm(old => {
            let new_ = copy(old);

            // To maintain the id of the exisiting record
            let address;
            let id = byString(new_, addressName + '.id');
            address = copy(clientForm.data.current_address);
            address.id = id;

            byString(new_, addressName, address);

            return new_;
        });
    }

    function onVersionClick(versionId) {
        setViewMode('read');
        request.get(`clients/${id}/versions/${versionId}`)
            .then(([status_, response]) => {
                let formData = convertResponseToFormData(response);
                setClientForm(formData);
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
        setClientForm(originalForm);
    }

    useEffect(() => {
        // console.log('Inside useEffect');
        if (id === 'create') {
            // console.log('Inside useEffect option 1');
            setClientForm(initClientForm);
            setViewMode('edit');

            //Setting loaded to true, as we are not making API calls for create
            updateClientVersionsC({loaded: true,});
        } else {
            // console.log('Inside useEffect option 2');
            request.get(`clients/${id}`)
                .then(([status_, response]) => {
                    // console.log('Inside useEffect option 2 :: SUCCESS');
                    let formData = convertResponseToFormData(response);
                    setClientForm(formData);
                    setOriginalForm(formData);
                    setClientDetails({ data: response.data});
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
            updateClientVersionsC({
                url: `clients/${id}/versions`,
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
        <div id='client-details-view' className='app-content details-view'>
            {notFound
                ? <NotFoundView />
                : <>
                    {/* {!equal(clientForm, originalForm) && <UnsavedDataBanner />} */}
                    {/* {equal(clientForm, originalForm) && <UnsavedDataBanner placeholder />} */}
                    <PageTopRow
                        title={id === 'create'
                            ? 'Add Client'
                            :  `${clientDetails?.data?.name ?? ''}`
                        }
                        backButtonURL='/clients'
                        type={pageType}
                        selectedVersionDetails={clientVersionsC.items
                                .find(version => version.id === selectedVersion)
                        }
                        archivedMessage={clientDetails?.data?.status === 'archived'
                            ? 'This client has been archived'
                            : null
                        }

                        originalForm={originalForm}
                        updateForm={clientForm}
                        showUnsavedChangesBanner
                    />

                    <div className={`page-content ${isSubMenuCollapsed ? 'collapsed' : ''}`}>
                        <div className='left-page-content no-scrollbar'>
                            <NavigationPanel sections={sections} />
                            {(selectedVersion === null && me.permissions_map?.update_client)
                            && <FormActions
                                id={id}
                                type={viewMode}
                                setType={setViewMode}
                                createLabel='Add Client'
                                submitAction={id === 'create'
                                    ? createClient
                                    : () => {
                                        if (clientForm.data.client_status === 'inactive'
                                        && (originalForm.data.client_status === undefined
                                            || originalForm.data.client_status === null
                                            || originalForm.data.client_status === 'active'
                                            )
                                        ) {
                                            toggleDeceasedModal();
                                            return;
                                        }
                                        updateClient();
                                    }
                                }
                                cancelAction={onCancelClick}
                            />}
                            {(me.permissions_map?.view_client_versions && viewMode === 'read') && <VersionHistory
                                id={id}
                                selectedVersion={selectedVersion}
                                loaded={clientVersionsC.loaded}
                                items={clientVersionsC.items}
                                type={pageType}
                                setType={setPageType}
                                onBackClick={onVersionBackClick}
                                onVersionClick={onVersionClick}
                            />}
                        </div>
                        <div className='right-page-content' data-test='right-page-content'>
                            <Sections sections={sections} />
                        </div>
                    </div>
                </>
            }
            {deceasedModal && <Modal title='Warning'
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
                                updateClient();
                                toggleDeceasedModal();
                            }}
                        >
                            Yes
                        </button>
                    </div>
                </div>
            </Modal>}
        </div>
    </div>
}

function BasicDetailsPrimary(props) {
    return <div className='basic-details-primary'>
        {props.id !== 'create' && <div className='client-id'>
            <Input label='UR Number'
                value={props.urNo}
                viewMode='read'
            />
        </div>}
        <div className='title'>
            <SelectField label='Title'
                className='client-title'
                options={getOptions(jsonData?.titles, 'label', 'token') ?? []}
                name='data.title'
                value={props.data.title}
                onChange={props.onChange}
                error={props.error['data.title']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='name'>
            <Input label='Name'
                name='data.name'
                className='client-name-input'
                value={props.data.name}
                onChange={props.onChange}
                error={props.error['data.name']}
                viewMode={props.viewMode}
                required
            />
        </div>
        <div className='date-of-birth'>
            <DateField label='Date of Birth'
                name='data.dob'
                value={props.data.dob}
                onChange={props.onChange}
                error={props.error['data.dob']}
                viewMode={props.viewMode}
                disableAfter={moment()}
            />
        </div>
        {/* <div className='sunassist-member-number'> */}
        {/*     <Input label='Sunassist Member Number' required /> */}
        {/* </div> */}
        <div className='registration-date'>
            <DateField label='Registration Date'
                name='data.registration_date'
                value={props.data.registration_date}
                onChange={props.onChange}
                error={props.error['data.registration_date']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='review-date'>
            <DateField label='Review Date'
                name='data.review_date'
                value={props.data.review_date}
                onChange={props.onChange}
                error={props.error['data.review_date']}
                viewMode={props.viewMode}
            />
        </div>
    </div>
}

function BasicDetailsNotes(props) {
    return <div class='basic-details-notes'>
        <Input label='Notes'
            type='textarea'
            name='data.notes'
            className='client-notes-input'
            value={props.data.notes}
            onChange={props.onChange}
            error={props.error['data.notes']}
            viewMode={props.viewMode}
        />
    </div>
}

function DemographicPrimary(props) {
    let { commonData } = useContext(CommonValueContext);

    return <div className='demographic-primary'>
        <div className='country-of-birth'>
            <SelectField label='Country of Birth'
                options={commonData?.countries
                    ? getOptions(commonData.countries, 'name', 'id')
                    :  []
                }
                name='data.id_country_birth'
                value={props.data.id_country_birth}
                onChange={props.onChange}
                error={props.error['data.id_country_birth']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='gender'>
            <SelectField label='Gender'
                options={getOptions(jsonData?.genders, 'label', 'token') ?? []}
                name='data.gender'
                value={props.data.gender}
                onChange={props.onChange}
                error={props.error['data.gender']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='religion'>
            <SelectField label='Religion'
                options={getOptions(jsonData?.religions, 'label', 'token') ?? []}
                name='data.religion'
                value={props.data.religion}
                onChange={props.onChange}
                error={props.error['data.religion']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='language-spoke-at-home'>
            <SelectField label='Language Spoke at Home'
                options={commonData?.languages
                    ? getOptions(commonData.languages, 'name', 'id')
                    :  []
                }
                name='data.id_native_language'
                value={props.data.id_native_language}
                onChange={props.onChange}
                error={props.error['data.id_native_language']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='preferred-language'>
            <SelectField label='Preferred Language'
                options={commonData?.languages
                    ? getOptions(commonData.languages, 'name', 'id')
                    :  []
                }
                name='data.id_preferred_language'
                value={props.data.id_preferred_language}
                onChange={props.onChange}
                error={props.error['data.id_preferred_language']}
                viewMode={props.viewMode}
            />
        </div>
    </div>
}

function DemographicStatusDetails(props) {
    return <div className='demographic-status-details'>
        <div className='grid-wrapper'>
            <div className='status'>
                <SelectField label='Status'
                    options={getOptions(jsonData?.client_alive_or_deceased, 'label', 'token') ?? []}
                    name='data.client_status'
                    value={props.data.client_status}
                    onChange={props.onChange}
                    error={props.error['data.client_status']}
                    viewMode={props.viewMode}
                />
            </div>
            <div className='status-date'>
                <DateField label='Status Date'
                    name='data.client_status_date'
                    value={props.data.client_status_date}
                    onChange={props.onChange}
                    error={props.error['data.client_status_date']}
                    viewMode={props.viewMode}
                />
            </div>
            <div className='indigenous-status'>
                <SelectField label='Indigenous State'
                    options={getOptions(jsonData?.indigenous_statuses, 'label', 'token') ?? []}
                    name='data.indigenous_status'
                    value={props.data.indigenous_status}
                    onChange={props.onChange}
                    error={props.error['data.indigenous_status']}
                    viewMode={props.viewMode}
                />
            </div>
            <div className='marital-status'>
                <SelectField label='Marital Status'
                    options={getOptions(jsonData?.marital_statuses, 'label', 'token') ?? []}
                    name='data.marital_status'
                    value={props.data.marital_status}
                    onChange={props.onChange}
                    error={props.error['data.marital_status']}
                    viewMode={props.viewMode}
                />
            </div>
            <div className='living-arrangement'>
                <SelectField label='Living Arrangement'
                    options={getOptions(jsonData?.living_arrangements, 'label', 'token') ?? []}
                    name='data.living_arrangement'
                    value={props.data.living_arrangement}
                    onChange={props.onChange}
                    error={props.error['data.living_arrangement']}
                    viewMode={props.viewMode}
                />
            </div>
        </div>
        <div className='checkbox-inputs-wrapper'>
            <div className='cald'>
                <Checkbox labelText='CALD'
                    name='data.cald_required'
                    checked={props.data.cald_required}
                    value={props.data.cald_required}
                    onChange={props.onChange}
                    error={props.error['data.cald_required']}
                    viewMode={props.viewMode}
                />
            </div>
            <div className='needs-interpreter'>
                <Checkbox labelText='Needs Interpreter'
                    name='data.interpreter_needed'
                    checked={props.data.interpreter_needed}
                    value={props.data.interpreter_needed}
                    onChange={props.onChange}
                    error={props.error['data.interpreter_needed']}
                    viewMode={props.viewMode}
                />
            </div>
        </div>
    </div>
}

function DemographicServiceCommenced(props) {
    return <div className='demographic-service-commenced'>
        <DateField label='Service Commenced'
            value={props.client?.data.created_at}
            viewMode={props.viewMode}
            disabled={true}
        />
    </div>
}

function ServicesRequiredPrimary(props){
    let { commonData } = useContext(CommonValueContext);

    return <div className='services-required-primary'>
        <CheckboxGroup
            value={props.data?.ids_service_offered}
            name='data.ids_service_offered'
            options={commonData?.client_services_offered
                ? getOptions(commonData.client_services_offered, 'name', 'id', 'labelText')
                :  []
            }
            onChange={props.onChange}
            viewMode={props.viewMode}
        />
    </div>
}

function TransportRequirements(props) {
    let { commonData } = useContext(CommonValueContext);
    // console.log('Transport Requirements', commonData);
    return <div className='transport-requirements'>
        <div className='row-1'>
            <div className='vehicle-type'>
                <DropDownMultiSelect label='Preferred Vehicles'
                    name='data.transportation.ids_vehicle_type'
                    value={props.data?.transportation?.ids_vehicle_type}
                    onChange={props.onChange}
                    error={props.error['data.transportation.ids_vehicle_type']}
                    options={commonData?.vehicle_types
                        ? getOptions(commonData.vehicle_types, 'name', 'id')
                        :  []
                    }
                    viewMode={props.viewMode}
                />
            </div>
        </div>
        <div className='row-2'>
            <CheckboxGroup
                name='data.transportation.ids_feature'
                value={props.data?.transportation?.ids_feature}
                onChange={props.onChange}
                options={commonData?.features
                    ? getOptions(commonData.features, 'name', 'id', 'labelText')
                    :  []
                }
                viewMode={props.viewMode}
            />
        </div>
        <div className='row-3'>
            <Input label='Notes' type='textarea'
                placeholder='Notes'
                name='data.transportation.transportation_notes'
                value={props.data?.transportation?.transportation_notes}
                onChange={props.onChange}
                error={props.error['data.transportation.transportation_notes']}
                viewMode={props.viewMode}
            />
        </div>
    </div>
}

function MobilityAssistance(props) {
    let { commonData } = useContext(CommonValueContext);

    return <div className='mobility-assistance'>
        <CheckboxGroup
            name='data.ids_mobility_assistance'
            value={props.data?.ids_mobility_assistance}
            onChange={props.onChange}
            options={commonData?.mobility_assistances
                ? getOptions(commonData.mobility_assistances, 'name', 'id', 'labelText')
                :  []
            }
            viewMode={props.viewMode}
        />
    </div>
}

function MealsOnWheelsPrimary(props) {
    function addRemoveDay(day) {
        props.setData(old_ => {
            let new_ = copy(old_);

            let index = new_.data['meals_on_wheels']
                .map(mow => mow.weekday).indexOf(day);
            if (index === -1) {
                new_.data['meals_on_wheels'].push({
                    'quantity': 1,
                    'weekday': day,
                    'am_or_pm': 'am',
                    'is_frozen': false
                });
            } else {
                new_.data['meals_on_wheels'].splice(index, 1);
            }

            return new_;
        });
    }
    // console.log('MealsOnWheelsPrimary', props.data.meals_on_wheels);

    return <div className='meals-on-wheel-primary'>
        {jsonData.weekdays.map((day, index) => {
            const isElementChecked = props.data?.meals_on_wheels
                ?.map(mow => mow.weekday)
                .includes(day.token);

            return <MealsOnWheelsRow
                data={props.data}
                setData={props.setData}
                onChange={props.onChange}
                day={day.token}
                dayLabel={day.label}
                isChecked={isElementChecked}
                addRemoveDay={addRemoveDay}
                position={props.data['meals_on_wheels']
                        .map(mow => mow.weekday).indexOf(day.token)
                }
                viewMode={props.viewMode}
                key={index}
                error={props.error}
            />
        })}
    </div>
}

function MealsOnWheelsRow(props) {
    let disabledProp = {};
    const [selected, setSelected] = useState(false);

    if (!props.isChecked) {
        disabledProp['disabled'] = true;
    }
    // console.log('MealsOnWheelsRow', props.position, props.data.meals_on_wheels[props.position]);

    return <div className='meals-on-wheels-row'>
        <div className='meals-day'>
            <Checkbox
                labelText={props.dayLabel}
                checked={props.isChecked}
                onChange={e => {
                    props.addRemoveDay(props.day);
                }}
                viewMode={props.viewMode}
            />
        </div>
        <div className='frozen'>
            <Checkbox
                labelText='Frozen'
                checked={props.data?.meals_on_wheels[props.position]?.is_frozen ?? false}
                name={`data.meals_on_wheels.${props.position}.is_frozen`}
                onChange={props.onChange}
                viewMode={props.viewMode}
                error={props.error[`data.meals_on_wheels.${props.position}.is_frozen`]}
                {...disabledProp}
            />
        </div>
        <div className='quantity'>
            <Input label='Quantity'
                type='number'
                name={`data.meals_on_wheels.${props.position}.quantity`}
                value={props.data?.meals_on_wheels[props.position]?.quantity ?? ''}
                onChange={props.onChange}
                viewMode={props.viewMode}
                error={props.error[`data.meals_on_wheels.${props.position}.quantity`]}
                {...disabledProp}
            />
        </div>
        <div className='am-pm-toggle-wrapper'>
            <AMPMToggle
                name={`data.meals_on_wheels.${props.position}.am_or_pm`}
                value={props.data?.meals_on_wheels[props.position]?.am_or_pm ?? ''}
                setValue={props.setData}
                viewMode={props.viewMode}
                error={props.error[`data.meals_on_wheels.${props.position}.am_or_pm`]}
                {...disabledProp}
            />
        </div>
    </div>
}

function DeliveryDetails(props) {
    return <div className='delivery-details'>
        <div className='delivery-input-grid'>
            <div className='delivery-area'>
                <SelectField label='Delivery Area'
                    options={getOptions(jsonData?.delivery_areas, 'label', 'token') ?? []}
                    name='data.food_delivery.delivery_area'
                    value={props.data.food_delivery.delivery_area}
                    onChange={props.onChange}
                    error={props.error['data.food_delivery.delivery_area']}
                    viewMode={props.viewMode}
                />
            </div>
            <div className='client-route'>
                <SelectField label='Client Route'
                    options={getOptions(jsonData?.client_routes, 'label', 'token') ?? []}
                    name='data.food_delivery.client_route'
                    value={props.data.food_delivery.client_route}
                    onChange={props.onChange}
                    error={props.error['data.food_delivery.client_route']}
                    viewMode={props.viewMode}
                />
            </div>
            <div className='dietary-requirements'>
                <SelectField label='Dietary Requirements'
                    options={getOptions(jsonData?.dietary_requirements, 'label', 'token') ?? []}
                    name='data.food_delivery.dietary_requirements'
                    value={props.data.food_delivery.dietary_requirements}
                    onChange={props.onChange}
                    error={props.error['data.food_delivery.dietary_requirements']}
                    viewMode={props.viewMode}
                />
            </div>
        </div>
        <div className='notes-input-wrapper'>
            <Input type='textarea'
                label='Notes'
                name='data.food_delivery.delivery_notes'
                value={props.data.food_delivery.delivery_notes}
                onChange={props.onChange}
                error={props.error['data.food_delivery.delivery_notes']}
                viewMode={props.viewMode}
            />
        </div>
    </div>
}

function MedicalHealth(props) {
    let { commonData } = useContext(CommonValueContext);
    // console.log('Medical and Health', props.data.medical_and_health);

    return <div className='medical-health'>
        <div className='medical-health-input-grid'>
            <div className='gp-surgery'>
                <SelectField label='GP Surgery'
                    options={commonData?.gp_surgeries
                        ? getOptions(commonData.gp_surgeries, 'name', 'id')
                        :  []
                    }
                    name='data.medical_and_health.id_gp_surgery'
                    value={props.data.medical_and_health.id_gp_surgery}
                    onChange={props.onChange}
                    error={props.error['data.medical_and_health.id_gp_surgery']}
                    viewMode={props.viewMode}
                />
            </div>
            <div className='vision'>
                <SelectField label='Vision'
                    options={getOptions(jsonData?.visions, 'label', 'token') ?? []}
                    name='data.medical_and_health.vision'
                    value={props.data.medical_and_health.vision}
                    onChange={props.onChange}
                    error={props.error['data.medical_and_health.vision']}
                    viewMode={props.viewMode}
                />
            </div>
            <div className='hearing'>
                <SelectField label='Hearing'
                    options={getOptions(jsonData?.hearings, 'label', 'token') ?? []}
                    name='data.medical_and_health.hearing'
                    value={props.data.medical_and_health.hearing}
                    onChange={props.onChange}
                    error={props.error['data.medical_and_health.hearing']}
                    viewMode={props.viewMode}
                />
            </div>
            <div className='allergies'>
                <SelectField label='Allergies'
                    options={getOptions(jsonData?.yes_or_no, 'label', 'token') ?? []}
                    name='data.medical_and_health.has_allergies'
                    value={props.data.medical_and_health.has_allergies}
                    onChange={props.onChange}
                    error={props.error['data.medical_and_health.has_allergies']}
                    viewMode={props.viewMode}
                />
            </div>
            <div className='dementia'>
                <SelectField label='Dementia'
                    options={getOptions(jsonData?.yes_or_no, 'label', 'token') ?? []}
                    name='data.medical_and_health.has_dementia'
                    value={props.data.medical_and_health.has_dementia}
                    onChange={props.onChange}
                    error={props.error['data.medical_and_health.has_dementia']}
                    viewMode={props.viewMode}
                />
            </div>
            <div className='medicare-number'>
                <Input label='Medicare Number'
                    name='data.medical_and_health.medicare_number'
                    value={props.data.medical_and_health.medicare_number}
                    onChange={props.onChange}
                    error={props.error['data.medical_and_health.medicare_number']}
                    viewMode={props.viewMode}
                />
            </div>
            <div className='medicare-expiry-date'>
                <DateField label='Medicare Expiry Date'
                    name='data.medical_and_health.medicare_expiry_date'
                    value={props.data.medical_and_health.medicare_expiry_date}
                    onChange={props.onChange}
                    error={props.error['data.medical_and_health.medicare_expiry_date']}
                    viewMode={props.viewMode}
                />
            </div>
        </div>
        <div className='bowl-or-bladder-issues-grid'>
            <div className='bowel-bladder-issue'>
                <SelectField label='Bowel or Bladder Issues'
                    options={getOptions(jsonData?.yes_or_no, 'label', 'token') ?? []}
                    name='data.medical_and_health.has_bowel_or_bladder_issues'
                    value={props.data.medical_and_health.has_bowel_or_bladder_issues}
                    onChange={props.onChange}
                    error={props.error['data.medical_and_health.has_bowel_or_bladder_issues']}
                    viewMode={props.viewMode}
                />
            </div>
            {props.data?.medical_and_health?.has_bowel_or_bladder_issues === 'true' && <div className='managed-by'>
                <RadioField
                    options={[
                        { value: 'self-manage', label: 'Self-Manage' },
                            { value: 'non-self', label: 'Non-Self' },
                    ]}
                    name='data.medical_and_health.self_managed'
                    value={props.data.medical_and_health.self_managed}
                    onChange={props.onChange}
                    error={props.error['data.medical_and_health.self_managed']}
                    viewMode={props.viewMode}
                />
            </div>}
        </div>
        <div className='medical-health-notes-grid'>
            <div className='medication'>
                <Input label='Medication' type='textarea'
                    name='data.medical_and_health.medication'
                    value={props.data.medical_and_health.medication}
                    onChange={props.onChange}
                    error={props.error['data.medical_and_health.medication']}
                    viewMode={props.viewMode}
                />
            </div>
            <div className='medical-condition'>
                <Input label='Medical Condition' type='textarea'
                    name='data.medical_and_health.medical_condition'
                    value={props.data.medical_and_health.medical_condition}
                    onChange={props.onChange}
                    error={props.error['data.medical_and_health.medical_condition']}
                    viewMode={props.viewMode}
                />
            </div>
        </div>
    </div>
}

function Pension(props) {
    let { commonData } = useContext(CommonValueContext);


    return <div className='pension'>
        <div className='pension-type'>
            <SelectField label='Pension Type'
                options={commonData?.pension_types
                    ? getOptions(commonData.pension_types, 'name', 'id')
                    :  []
                }
                name='data.pension.id_pension_type'
                value={props.data.pension.id_pension_type}
                onChange={props.onChange}
                error={props.error['data.pension.id_pension_type']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='pension-number'>
            <Input label='Pension Number'
                name='data.pension.pension_number'
                value={props.data.pension.pension_number}
                onChange={props.onChange}
                error={props.error['data.pension.pension_number']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='pension-expiry-date'>
            <DateField label='Pension Expiry Date'
                name='data.pension.pension_expiry_date'
                value={props.data.pension.pension_expiry_date}
                onChange={props.onChange}
                error={props.error['data.pension.pension_expiry_date']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='billing-name'>
            <Input label='Billing Name'
                name='data.pension.billing_name'
                value={props.data.pension.billing_name}
                onChange={props.onChange}
                error={props.error['data.pension.billing_name']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='dva'>
            <SelectField label='DVA'
                options={getOptions(jsonData?.dvas, 'label', 'token') ?? []}
                name='data.pension.dva'
                value={props.data.pension.dva}
                onChange={props.onChange}
                error={props.error['data.pension.dva']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='funding-body-details'>
            <SelectField label='Funding Body Details'
                options={commonData?.funding_bodies
                    ? getOptions(commonData.funding_bodies, 'name', 'id')
                    :  []
                }
                name='data.pension.id_funding_body'
                value={props.data.pension.id_funding_body}
                onChange={props.onChange}
                error={props.error['data.pension.id_funding_body']}
                viewMode={props.viewMode}
            />
        </div>
    </div>
}

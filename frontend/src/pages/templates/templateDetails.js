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

// const initClientForm = {
//     'data': {
//         'name': '',
//         'title': '',
//         'status': 'active',
//         'dob': '',
//         'registration_date': moment().format('YYYY-MM-DD'),
//         'review_date': '',
//         'email': '',
//         // 'id_profile_picture': 1,
//         'profile_picture_details': {
//             id: null,
//             path: '',
//         },
//        'phones': [{
//            label_name: 'home',
//            phone_number: '',
//         }],
//         'current_address': {
//             'basic_info': '',
//             'locality': '',
//             'pincode': '',
//             'id_level_1_sub_division': null,
//         },
//         'postal_address_as_current_address': false,
//         'postal_address': {
//             'basic_info': '',
//             'locality': '',
//             'pincode': '',
//             'id_level_1_sub_division': null,
//         },
//         'account_address_as_current_address': false,
//         'account_address': {
//             'basic_info': '',
//             'locality': '',
//             'pincode': '',
//             'id_level_1_sub_division': null,
//         },
//         'billing_address_as_current_address': false,
//         'billing_address': {
//             'basic_info': '',
//             'locality': '',
//             'pincode': '',
//             'id_level_1_sub_division': null,
//         },
//         'contacts': [],
//         'id_country_birth': null,
//         'gender': null ,
//         'religion': '' ,
//         'id_preferred_language': '',
//         'id_native_language': '',
//         'client_status': '',
//         'client_status_date': '',
//         'indigenous_status': '',
//         'marital_status': '',
//         'living_arrangement': '',
//         'cald_required': false,
//         'interpreter_needed': false,
//         'referral': '',
//         'ids_service_offered': [],
//         'ids_mobility_assistance': [],
//         'transportation': {
//             'ids_vehicle_type': [],
//             'ids_feature': [],
//             'transportation_notes': null,
//         },
//         'meals_on_wheels': [],
//         'food_delivery': {
//             'delivery_area': '',
//             'client_route': null,
//             'dietary_requirements': '',
//             'delivery_notes': '',
//         },
//         'medical_and_health': {
//             'id_gp_surgery': '',
//             'vision': '',
//             'hearing': '',
//             'has_bowel_or_bladder_issues': null,
//             // 'self_managed': 'self-manage',
//             'self_managed': '',
//             'has_allergies': null,
//             'has_dementia': null,
//             'medicare_number': '',
//             'medicare_expiry_date': '',
//             'medication': '',
//             'medical_condition': ''
//         },
//         'pension': {
//             "pension_number": "",
//             "id_pension_type": "",
//             "billing_name": "",
//             "dva": "",
//             "pension_expiry_date": "",
//             "id_funding_body": "",
//         },
//         'careplans': [],
//         'service_allocation': null,
//     }
// }

const initTemplateForm = {
    data: {
        name: null,
        created_at: null,
        last_updated_at: null,
        title: null,
        body: null,
    }
}


export default function TemplateDetailsView(props) {
    let { id } = useParams();
    const alert_ = useAlert();
    const navigate = useNavigate();
    const { me, setMe } = useContext(MeContext);
    const { isSubMenuCollapsed, toggleSubMenu } = useContext(UserPreferenceContext);

    const [ notFound, setNotFound ] = useState(false);

    const [ deceasedModal, toggleDeceasedModal ] = useToggle(false);
    const [ viewMode, setViewMode] = useState('read'); //edit/read/no-edit( when archived )
    const [ pageType, setPageType ] = useState('detatil-page');
    // const [ originalForm, setOriginalForm] = useState(initClientForm);
    const [ originalForm, setOriginalForm] = useState(initTemplateForm);
    const [ selectedVersion, setSelectedVersion ] = useState(null);
    const [ templateDetails, setTemplateDetails ] = useState(null); //To show any other records

    const [
        templateForm,
        setTemplateForm,
        onTemplateChange,
        templateError,
        setTemplateError,
    ] = useForm(initTemplateForm);
    const [ loaded, toggleLoaded ] = useToggle(false);

    const [ templateVersionsC, updateTemplateVersionsC ] = useCollection(null);

    const [ mainClassName, setMainClassName] = useState(
        JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
        ? 'expanded-view'
        : ''
    );

    let sections = [
        {
            name: 'Template Details',
            icon: null,
            navigation: 'template-details-nav',
            subSections: [
                {
                    name: null,
                    content: <TemplateDetails
                        id={id}
                        data={templateForm.data}
                        onChange={onTemplateChange}
                        error={templateError}
                        viewMode={viewMode}
                    />
                },
            ]
        },
        {
            name: 'Spintax Details',
            icon: null,
            navigation: 'spintax-details-nav',
            subSections: [
                {
                    name: null,
                    content: <SpintaxDetails
                        id={id}
                        data={templateForm.data}
                        onChange={onTemplateChange}
                        error={templateError}
                        viewMode={viewMode}
                    />
                },
            ]
        },
    ];

    if (id !== 'create') {
        let dangerZoneItems = [];

        let deleteSubSection = {
            mainActionTitle: 'Delete Template',
            mainActionSubTitle: 'Are you sure, want to delete this template?',
            actionButtonText: 'Delete',
            actionConfirmationText: 'Are you sure you want to delete this template?',
            actionConfirmationButtonText: 'Yes, Delete',
            actionConfirmation: () => deleteRecord(
                id, 'templates', 'template', alert_, navigate,
            )
        }

        dangerZoneItems.push(deleteSubSection);

        sections.push({
            name: 'Danger Zone',
            icon: 'danger-circle.svg',
            type: 'danger',
            navigation: 'danger-zone',
            subSections: [
                {
                    name: null,
                    content: <DangerZone
                        data={templateForm.data}
                        onChange={onTemplateChange}
                        error={templateError}
                        items={dangerZoneItems}
                    />
                }
            ]
        });
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

        let formData = {
            data: {
                name: response.data.name,
                title: response.data.title,
                body: response.data.body,
                created_at: response.data.created_at,
                last_updated_at: response.data.last_updated_at,
            }
        }
        return formData
    }

    function convertFormDataToRequest(formData) {
        const convertStringToBoolean = (value) => {
            if (value !== undefined && value !== null) {
                return value === 'true';
            }

            return value;
        };
        let requestData = copy(formData);

        requestData = removeEmptyKeys(
            requestData,
            [ null, undefined, {}, []],
        );
        
        return requestData;
    }

    function createTemplate() {
        let requestData = convertFormDataToRequest(templateForm);

        request.post(`templates`, requestData)
            .then(([status_, response]) => {
                // let formData = convertResponseToFormData(response);
                // setTemplateForm(formData);
                // toggleLoaded();
                navigate('/templates');
                setTemplateError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('New template added');
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
                    setTemplateError(response.errors);
                }
            });
    }

    function updateTemplate() {
        console.log('Template Form', templateForm);
        let requestData = convertFormDataToRequest(templateForm);

        console.log('Request Data', requestData);
        request.patch(`templates/${id}`, requestData)
            .then(([status_, response]) => {
                let formData = convertResponseToFormData(response);
                setTemplateForm(formData);
                setOriginalForm(formData);
                setViewMode('read');
                setTemplateError([]);
                updateTemplateVersionsC({
                    reload: true,
                });
                // toggleLoaded();
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Template Updated');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while updating. Please try again.');
                }
                if (response.errors) {
                    setTemplateError(response.errors);
                }
            });
    }

    useEffect(() => {
        // console.log('Inside useEffect');
        if (id === 'create') {
            // console.log('Inside useEffect option 1');
            setTemplateForm(initTemplateForm);
            setViewMode('edit');

            //Setting loaded to true, as we are not making API calls for create
            updateTemplateVersionsC({loaded: true,});
        } else {
            // console.log('Inside useEffect option 2');
            request.get(`templates/${id}`)
                .then(([status_, response]) => {
                    // console.log('Inside useEffect option 2 :: SUCCESS');
                    let formData = convertResponseToFormData(response);
                    setTemplateForm(formData);
                    setOriginalForm(formData);
                    setTemplateDetails({ data: response.data});
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
            updateTemplateVersionsC({
                url: `templates/${id}/versions`,
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

    function onCancelClick() {
        setViewMode('read');
        setTemplateForm(originalForm);
    }

    return <div id='main-grid' className={`${mainClassName}`}>
        <Header />
        <Sidebar />
        <div id='template-details-view' className='app-content details-view'>
            {notFound
                ? <NotFoundView />
                : <>
                    <PageTopRow
                        title={id === 'create' ?
                            'Add Template'
                            :  `${templateDetails?.data?.name ?? ''}`
                        }
                        backButtonURL='/templates'
                        type={pageType} originalForm={originalForm} updateForm={templateForm} showUnsavedChangesBanner
                    />

                    <div className={`page-content ${isSubMenuCollapsed ? 'collapsed' : ''}`}>
                        <div className='left-page-content no-scrollbar'>
                            <NavigationPanel sections={sections} />
                            <FormActions
                                id={id}
                                type={viewMode}
                                setType={setViewMode}
                                createLabel='Add Template'
                                submitAction={id === 'create'
                                    ? createTemplate
                                    : updateTemplate
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

function TemplateDetails(props) {

    const [ isMoreOpen, toggleIsMoreOpen, setIsMoreOpen ] = useToggle(false);
    const [ addVariableToTemplateBody, setAddVariableToTemplateBody ] = useState('');

    const addVariable = (variable) => {
        setAddVariableToTemplateBody((prevBody) => prevBody + `{{${variable}}}`);
        toggleIsMoreOpen();
    }

    return <div className='template-details'>
        <div className='template-name'>
            <Input label='Template Name' 
                className='template-name-input'
                name='data.name'
                value={props.data.name}
                onChange={props.onChange}
                error={props.error['data.name']}
                viewMode={props.viewMode} 
            />
        </div>
        <div className='template-subject'>
            <Input label='Template Subject' 
                className='template-subject-input'
                name='data.title'
                value={props.data.title}
                onChange={props.onChange}
                error={props.error['data.title']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='template-body'>
            <Input type='textarea' 
                label='Template Body' 
                className='notes'
                name='data.body' 
                // value={viewMode ? props.data.body : addVariableToTemplateBody}
                value={props.data.body}
                // onChange={(e) => setAddVariableToTemplateBody(e.target.value) && props.onChange}
                onChange={props.onChange} 
                error={props.error['data.body']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='template-action-icons'>
            <div className='add-spintax'>
                <Icon path='spintax.svg' size={16} />
            </div>
            <div className='add-variable'>
                <button className='button-variable'
                    onClick={e => {
                        e.preventDefault();
                        toggleIsMoreOpen();
                    }}
                    >
                    <Icon path='variable.svg' size={16} />
                </button>
            </div>
            <div className='add-link'>
                <Icon path='attachement.svg' size={16} />
            </div>
        </div>
        {isMoreOpen && (
            <div className='variable-modal'>
                <div className='template-variables'>
                    <button className='variables' onClick={() => addVariable('FirstName')}> First Name </button>
                    <button className='variables' onClick={() => addVariable('LastName')}> Last Name </button>
                    <button className='variables' onClick={() => addVariable('FullName')}>Full Name</button>
                    <button className='variables' onClick={() => addVariable('Company')}>Company</button>
                    <button className='variables' onClick={() => addVariable('Email')}>Email</button>
                    <button className='variables' onClick={() => addVariable('Title')}>Title</button>
                    <button className='variables' onClick={() => addVariable('PhoneNumber')}>Phone Number</button>
                    <button className='variables' onClick={() => addVariable('City')}>City</button>
                    <button className='variables' onClick={() => addVariable('State')}>State</button>
                    <button className='variables' onClick={() => addVariable('Country')}>Country</button>
                    <button className='variables' onClick={() => addVariable('Industry')}>Industry</button>
                </div>
            </div>
        )}
    </div>
}

function SpintaxDetails(props) {

    const [spintaxDetails, setSpintaxDetails] = useState([{ id: 1, variants: [{ variantId: 1 }] }]);

    const addSpintaxVariant = (spintaxId) => {
        setSpintaxDetails((prevSpintaxDetails) => {
            const newSpintaxDetails = [...prevSpintaxDetails];
            const spintaxIndex = newSpintaxDetails.findIndex((spintax) => spintax.id === spintaxId);

            if (spintaxIndex !== -1) {
                newSpintaxDetails[spintaxIndex].variants.push({
                    variantId: newSpintaxDetails[spintaxIndex].variants.length + 1,
                });
            }
            return newSpintaxDetails;
        });
    };

    const deleteSpintaxVariant = (spintaxId, variantId) => {
        setSpintaxDetails((prevSpintaxDetails) => {
            const newSpintaxDetails = [...prevSpintaxDetails];
            const spintaxIndex = newSpintaxDetails.findIndex((spintax) => spintax.id === spintaxId);

            if (spintaxIndex !== -1) {
                newSpintaxDetails[spintaxIndex].variants = newSpintaxDetails[spintaxIndex].variants.filter(
                    (variant) => variant.variantId !== variantId
                );
            }
            return newSpintaxDetails;
        });
    };

    const onAddSpintaxClick = () => {
        setSpintaxDetails((prevSpintaxDetails) => [
            ...prevSpintaxDetails,
            {
                id: prevSpintaxDetails.length + 1,
                variants: [{ variantId: 1 }],
            },
        ]);
    };

    function SpintaxComponent({ spintax, deleteSpintaxVariant, addSpintaxVariant }) {
        return (
            <div className='spintax-name'>
                <Input label='Spintax Name' className='spintax-name-input' />
                {spintax.variants.map((variant, index) => (
                    <div className='variant-with-delete' key={variant.variantId}>
                        <Input label={`Variant ${variant.variantId}`} 
                            className='spintax-variant-1' 
                        />
                        <button
                            className='variant-delete'
                            onClick={() => deleteSpintaxVariant(spintax.id, variant.variantId)}
                        >
                            <Icon path='delete-bin-red.svg' size={16} />
                        </button>
                        {index === spintax.variants.length - 1 && (
                            <button className='variant-add' 
                                onClick={() => addSpintaxVariant(spintax.id)}
                            >
                                <Icon path='plus-button-grey.svg' size={16} />
                            </button>
                        )}
                    </div>
                ))}
            </div>
        );
    }

    return <div className='spintax-details'>
        {spintaxDetails.map((spintax) => (
            <SpintaxComponent
                key={spintax.id}
                spintax={spintax}
                deleteSpintaxVariant={deleteSpintaxVariant}
                addSpintaxVariant={addSpintaxVariant}
            />
        ))}
        <div className='add-new-spintax'>
            <button className='button secondary-button'
                onClick={onAddSpintaxClick}
            >
                + Add New Spintax
            </button>
        </div>
    </div>
}

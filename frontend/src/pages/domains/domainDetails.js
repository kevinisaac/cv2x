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

const initDomainForm = {
    data: {
        name: null,
        is_https_enabled: null,
        is_redirected_to_main_domain: null,

        is_spf_set_up: null,
        is_dkim_set_up: null,
        is_dmarc_set_up: null,
        is_mx_set_up: null,
        is_mta_sts_dns_set_up: null,

        bought_on: null,
    }
}


export default function DomainDetailsView(props) {
    let { id } = useParams();
    const alert_ = useAlert();
    const navigate = useNavigate();
    const { me, setMe } = useContext(MeContext);
    const { isSubMenuCollapsed, toggleSubMenu } = useContext(UserPreferenceContext);

    const [ notFound, setNotFound ] = useState(false);

    const [ deceasedModal, toggleDeceasedModal ] = useToggle(false);
    const [ viewMode, setViewMode] = useState('read'); //edit/read/no-edit( when archived )
    const [ pageType, setPageType ] = useState('detatil-page');
    const [ originalForm, setOriginalForm] = useState(initDomainForm);
    const [ selectedVersion, setSelectedVersion ] = useState(null);
    const [ domainDetails, setDomainDetails ] = useState(null); //To show any other records

    const [
        domainForm,
        setDomainForm,
        onDomainChange,
        domainError,
        setDomainError,
    ] = useForm(initDomainForm);
    const [ loaded, toggleLoaded ] = useToggle(false);

    const [ domainVersionsC, updateDomainVersionsC ] = useCollection(null);

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
                        data={domainForm.data}
                        onChange={onDomainChange}
                        error={domainError}
                        viewMode={viewMode}
                    />
                },
            ]
        },
        {
            name: 'Setup Details',
            icon: null,
            navigation: 'setup-details',
            subSections: [
                {
                    name: null,
                    content: <SetupDetails
                        id={id}
                        data={domainForm.data}
                        onChange={onDomainChange}
                        error={domainError}
                        viewMode={viewMode}
                    />
                },
            ]
        },
    ];

    if (id !== 'create') {
        let dangerZoneItems = [];

        let deleteSubSection = {
            mainActionTitle: 'Delete Domain',
            mainActionSubTitle: 'Are you sure, want to delete this domain?',
            actionButtonText: 'Delete',
            actionConfirmationText: 'Are you sure you want to delete this domain?',
            actionConfirmationButtonText: 'Yes, Delete',
            actionConfirmation: () => deleteRecord(
                id, 'domains', 'domain', alert_, navigate,
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
                        data={domainForm.data}
                        onChange={onDomainChange}
                        error={domainError}
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
                name: response?.data?.name,
                is_https_enabled:
                    convertBooleanToString(response?.data?.is_https_enabled),
                is_redirected_to_main_domain:
                    convertBooleanToString(response?.data?.is_redirected_to_main_domain),

                is_spf_set_up:
                    convertBooleanToString(response?.data?.is_spf_set_up),
                is_dkim_set_up:
                    convertBooleanToString(response?.data?.is_dkim_set_up),
                is_dmarc_set_up:
                    convertBooleanToString(response?.data?.is_dmarc_set_up),
                is_mx_set_up:
                    convertBooleanToString(response?.data?.is_mx_set_up),
                is_mta_sts_dns_set_up:
                    convertBooleanToString(response?.data?.is_mta_sts_dns_set_up),

                bought_on: response?.data?.bought_on,
            }
        }


        return formData;
    }

    function convertFormDataToRequest(formData) {
        const convertStringToBoolean = (value) => {
            if (value !== undefined && value !== null) {
                console.log('convertStringToBoolean matched', value, value === 'true');
                return value === 'true';
            }

            console.log('convertStringToBoolean', value);
            return value;
        };

        let requestData = copy(formData);

        requestData.data['is_https_enabled']
            = convertStringToBoolean(formData?.data?.['is_https_enabled']);
        requestData.data['is_redirected_to_main_domain']
            = convertStringToBoolean(formData?.data?.['is_redirected_to_main_domain']);

        requestData.data['is_spf_set_up']
            = convertStringToBoolean(formData?.data?.['is_spf_set_up']);
        requestData.data['is_dkim_set_up']
            = convertStringToBoolean(formData?.data?.['is_dkim_set_up']);
        requestData.data['is_dmarc_set_up']
            = convertStringToBoolean(formData?.data?.['is_dmarc_set_up']);
        requestData.data['is_mx_set_up']
            = convertStringToBoolean(formData?.data?.['is_mx_set_up']);
        requestData.data['is_mta_sts_dns_set_up']
            = convertStringToBoolean(formData?.data?.['is_mta_sts_dns_set_up']);

        requestData = removeEmptyKeys(
            requestData,
            [ null, undefined, {}, []],
        );

        return requestData;
    }

    function createDomain() {
        let requestData = convertFormDataToRequest(domainForm);
        console.log('requestData', requestData);

        request.post(`domains`, requestData)
            .then(([status_, response]) => {
                let formData = convertResponseToFormData(response);
                setDomainForm(formData);

                toggleLoaded();

                navigate('/domains');
                setDomainError([]);
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('New domain added');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while submitting. Please resolve error and try again');
                }
                if (response.errors) {
                    setDomainError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function updateDomain() {
        let requestData = convertFormDataToRequest(domainForm);

        request.patch(`domains/${id}`, requestData)
            .then(([status_, response]) => {
                let formData = convertResponseToFormData(response);
                setDomainForm(formData);
                setOriginalForm(formData);
                setViewMode('read');
                setDomainError([]);

                toggleLoaded();

                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Domain Updated');
                }
            })
            .catch(([errorStatus, response]) => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while updating. Please try again.');
                }
                if (response.errors) {
                    setDomainError(response.errors);
                }
            })
            .finally(() => {
                toggleLoaded();
            })
        ;
    }

    function onCancelClick() {
        setViewMode('read');
        setDomainForm(originalForm);
    }

    useEffect(() => {
        // console.log('Inside useEffect');
        if (id === 'create') {
            // console.log('Inside useEffect option 1');
            setDomainForm(initDomainForm);
            setViewMode('edit');

            //Setting loaded to true, as we are not making API calls for create
            updateDomainVersionsC({loaded: true,});
        } else {
            // console.log('Inside useEffect option 2');
            request.get(`domains/${id}`)
                .then(([status_, response]) => {
                    // console.log('Inside useEffect option 2 :: SUCCESS');
                    let formData = convertResponseToFormData(response);
                    setDomainForm(formData);
                    setOriginalForm(formData);
                    setDomainDetails({ data: response.data});
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
            updateDomainVersionsC({
                url: `domains/${id}/versions`,
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
        <div id='domain-details-view' className='app-content details-view'>
            {notFound
                ? <NotFoundView />
                : <>
                    <PageTopRow
                        title={id === 'create'
                            ? 'Add Domain'
                            :  `${domainDetails?.data?.name ?? ''}`
                        }
                        backButtonURL='/domains'
                        type={pageType}
                        selectedVersionDetails={domainVersionsC.items
                                .find(version => version.id === selectedVersion)
                        }
                        archivedMessage={domainDetails?.data?.status === 'archived'
                            ? 'This domain has been archived'
                            : null
                        }

                        originalForm={originalForm}
                        updateForm={domainForm}
                        showUnsavedChangesBanner
                    />

                    <div className={`page-content ${isSubMenuCollapsed ? 'collapsed' : ''}`}>
                        <div className='left-page-content no-scrollbar'>
                            <NavigationPanel sections={sections} />
                            <FormActions
                                id={id}
                                type={viewMode}
                                setType={setViewMode}
                                createLabel='Add Domain'
                                submitAction={id === 'create'
                                    ? createDomain
                                    : updateDomain
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
    return <div className='basic-details-primary'>
        {false && <div className='domain-batch'>
            <SelectField label='Batch'
                options={[
                    {
                        label: "1",
                        value: 1,
                    },
                    {
                        label: "2",
                        value: 2,
                    },
                    {
                        label: "3",
                        value: 3,
                    },
                    {
                        label: "4",
                        value: 4,
                    },
                    {
                        label: "5",
                        value: 5,
                    },
                    {
                        label: "5",
                        value: 5,
                    },
                ]}
                name='data.id_batch'
                value={props?.data?.id_batch}
                onChange={props.onChange}
                error={props.error['data.id_batch']}
                viewMode={props.viewMode}
            />
        </div>}
        <div className='domain-name'>
            <Input label='Name'
                name='data.name'
                className='domain-name-input'
                value={props.data.name}
                onChange={props.onChange}
                error={props.error['data.name']}
                viewMode={props.viewMode}
                required
            />
        </div>
        <div className='https-enabled'>
            <RadioField
                options={[
                    { value: 'true', label: 'Yes' },
                    { value: 'false', label: 'No' },
                ]}
                name='data.is_https_enabled'
                value={props.data?.is_https_enabled}
                onChange={props.onChange}
                error={props.error['data.is_https_enabled']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='redirect-to-main-domain'>
            <RadioField
                options={[
                    { value: 'true', label: 'Yes' },
                    { value: 'false', label: 'No' },
                ]}
                name='data.is_redirected_to_main_domain'
                value={props.data?.is_redirected_to_main_domain}
                onChange={props.onChange}
                error={props.error['data.is_redirected_to_main_domain']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='domain-score'>
            <Input label='Domain Score'
                type='number'
                step='0.1'
                name='data.score'
                className='domain-score-input'
                value={props.data.score}
                onChange={props.onChange}
                error={props.error['data.score']}
                viewMode={props.viewMode}
                required
            />
        </div>
    </div>
}

function SetupDetails(props) {
    return <div className='setup-details'>
        <div className='spf-setup'>
            <RadioField
                label='SPF Setup'
                options={[
                    { value: 'true', label: 'Yes' },
                    { value: 'false', label: 'No' },
                ]}
                name='data.is_spf_set_up'
                value={props.data?.is_spf_set_up}
                onChange={props.onChange}
                error={props.error['data.is_spf_set_up']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='dmarc-setup'>
            <RadioField
                label='DMARC Setup'
                options={[
                    { value: 'true', label: 'Yes' },
                    { value: 'false', label: 'No' },
                ]}
                name='data.is_dmarc_set_up'
                value={props.data?.is_dmarc_set_up}
                onChange={props.onChange}
                error={props.error['data.is_dmarc_set_up']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='mx-setup'>
            <RadioField
                label='MX Setup'
                options={[
                    { value: 'true', label: 'Yes' },
                    { value: 'false', label: 'No' },
                ]}
                name='data.is_mx_set_up'
                value={props.data?.is_mx_set_up}
                onChange={props.onChange}
                error={props.error['data.is_mx_set_up']}
                viewMode={props.viewMode}
            />
        </div>
        <div className='mta-sts-dns-setup'>
            <RadioField
                label='MTA-STS DNS Setup'
                options={[
                    { value: 'true', label: 'Yes' },
                    { value: 'false', label: 'No' },
                ]}
                name='data.is_mta_sts_dns_set_up'
                value={props.data?.is_mta_sts_dns_set_up}
                onChange={props.onChange}
                error={props.error['data.is_mta_sts_dns_set_up']}
                viewMode={props.viewMode}
            />
        </div>
    </div>
}

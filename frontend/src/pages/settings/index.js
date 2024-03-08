import React, { useState, useEffect, useContext } from 'react';
import { useAlert } from 'react-alert';

import { MeContext, UserPreferenceContext } from 'src/contexts';
import { useForm, useToggle, useDeepCompareEffect, } from 'src/hooks';
import { request, copy, getChanges,} from 'src/helpers';
import moment from 'moment';
import {
    Icon,
    Table,
    Header,
    Sidebar,
    ContactCTA,
    ProfilePictureUpload,
} from 'src/components';
import {
    Input,
    Checkbox,
    DateField,
    SelectField,
    CheckboxGroup,
} from 'src/components/form';
import {
    Sections,
    PageTopRow,
    FormActions,
    NavigationPanel,
} from 'src/components/outreachComponents';



const initMeForm = {
    data: {
        name: '',
        phone: '',
        profile_picture_details: {},
        id_profile_picture: null,
        preferred_date_format: null,
        preferred_time_format: null,
    }
}

export default function SettingsView(props) {
    const { me, setMe } = useContext(MeContext);
    const { isSubMenuCollapsed, toggleSubMenu } = useContext(UserPreferenceContext);
    const alert_ = useAlert();
    //Default to edit mode for settings page
    const [ viewMode, setViewMode ] = useState('edit'); //edit/read
    const [
        meForm,
        setMeForm,
        onMeChange,
        meError,
        setMeError,
    ] = useForm(initMeForm);
    const [ originalForm, setOriginalForm ] = useState();

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
                        me={me}
                        data={meForm.data}
                        setData={setMeForm}
                        onChange={onMeChange}
                        error={meError}
                        afterProfilePictureUpload={afterProfilePictureUpload}
                    />
                },
            ]
        },

        {
            name: 'Personalization',
            icon: null,
            navigation: 'personalization',
            subSections: [
                {
                    name: null,
                    content: <Personalization
                        data={meForm.data}
                        onChange={onMeChange}
                        error={meError}
                    />
                },
            ]
        },

        {
            name: 'Security',
            icon: null,
            navigation: 'security',
            subSections: [
                {
                    name: null,
                    content: <Security
                        data={meForm.data}
                        onChange={onMeChange}
                        error={meError}
                    />
                },
            ]
        },
    ];

    function convertFormDataToRequest(formData) {
        let requestData = copy(formData);
        console.log('Request', requestData);

        //To remove profile picture details
        if (requestData.data?.profile_picture_details) {
            delete requestData.data.profile_picture_details;
            if (formData.data?.profile_picture_details?.id) {
                requestData.data['id_profile_picture'] = formData.data.profile_picture_details.id;
            } else {
                delete requestData.data.id_profile_picture;
            }
        }


        return requestData;
    }

    function updateUser() {
        let copyOriginalForm = copy(originalForm);
        let copyMeForm = copy(meForm);
        let changes = getChanges(copyOriginalForm, copyMeForm);
        let requestData = convertFormDataToRequest(changes);

        console.log('updateUser', copyOriginalForm, copyMeForm, changes);

        if (JSON.stringify(requestData) === '{}') {
            alert_.success('No new changes');
            return;
        }

        request.patch('me', requestData)
            .then(([status_, responseData]) => {
                setMeForm({
                    data: {
                        id_profile_picture: responseData.data.profile_picture_details?.id ?? null,
                        name: responseData.data.name,
                        phone: responseData.data.phone,
                        preferred_date_format: responseData.data.preferred_date_format,
                        preferred_time_format: responseData.data.preferred_time_format,
                        profile_picture_details: responseData.data.profile_picture_details,
                    },
                });
                setMe(element => {
                    element.name = responseData.data.name;
                    element.profile_picture_details = responseData.data.profile_picture_details;
                    element.preferred_date_format = responseData.data.preferred_date_format;
                    element.preferred_time_format = responseData.data.preferred_time_format;

                    return element;
                });
                setOriginalForm({
                    data: {
                        id_profile_picture: responseData.data.profile_picture_details?.id ?? null,
                        name: responseData.data.name,
                        phone: responseData.data.phone,
                        preferred_date_format: responseData.data.preferred_date_format,
                        preferred_time_format: responseData.data.preferred_time_format,
                        profile_picture_details: responseData.data.profile_picture_details,
                    },
                });
                setMeError([]);
                if (responseData.message) {
                    alert_.success(responseData.message);
                } else {
                    alert_.success('Account updated');
                }
            })
            .catch(([status_, responseData]) => {
                setMeError(responseData.errors);
                if (responseData.message) {
                    alert_.error(responseData.message);
                } else {
                    alert_.error('Error while updating. Please try again');
                }
            });
    }

    function afterProfilePictureUpload(response) {
        let requestData = {
            data: {
                id_profile_picture: response.data?.[0].id,
            }
        }

        request.patch('me', requestData)
            .then(([status_, response]) => {
                setMeForm({
                    data: {
                        name: response.data.name,
                        phone: response.data.phone,
                        preferred_date_format: response.data.preferred_date_format,
                        preferred_time_format: response.data.preferred_time_format,
                        profile_picture_details: response.data.profile_picture_details,
                    },
                });
                setMe(element => {
                    element.name = response.data.name;
                    element.profile_picture_details = response.data.profile_picture_details;
                    element.preferred_date_format = response.data.preferred_date_format;
                    element.preferred_time_format = response.data.preferred_time_format;

                    return element;
                });

                if (response.message) {
                    alert_.success(response.message)
                } else {
                    alert_.success('Profile picture updated')
                }
            })
    }

    useEffect(() => {
        //To ensure logged in user details are retreived
        if (me.name !== '') {
            setMeForm(old => {
                let new_ = copy(old);

                new_.data.id_profile_picture = me.profile_picture_details?.id ?? null,
                new_.data.name = me.name ?? '';
                new_.data.phone = me.phone ?? '';
                new_.data.preferred_date_format = me.preferred_date_format ?? '';
                new_.data.preferred_time_format = me.preferred_time_format ?? '';
                new_.data.profile_picture_details = me.profile_picture_details;

                return new_;
            });
            setOriginalForm({
                data: {
                    id_profile_picture: me.profile_picture_details?.id ?? null,
                    name: me.name ?? '',
                    phone: me.phone ?? '',
                    preferred_date_format: me.preferred_date_format ?? '',
                    preferred_time_format: me.preferred_time_format ?? '',
                    profile_picture_details: me.profile_picture_details,
                },
            });
        }
    }, [me]);

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
        <div id='settings-view' className='app-content details-view'>
            <PageTopRow title={props.heading} />

            <div className={`page-content ${isSubMenuCollapsed ? 'collapsed' : ''}`}>
                <div className='left-page-content'>
                    <NavigationPanel sections={sections} />
                    <FormActions
                        id={'create'}
                        type={'edit'}
                        setType={setViewMode}
                        createLabel='Save'
                        submitAction={updateUser}
                    />
                </div>
                <div className='right-page-content'>
                    <Sections sections={sections} />
                </div>
            </div>
        </div>
    </div>
}

function BasicDetailsPrimary(props) {
    return <div className='basic-details-primary'>
        <div className='profile-photo'>
            <ProfilePictureUpload
                name='data.profile_picture_details'
                value={props.data.profile_picture_details}
                setValue={props.setData}
                afterUpload={props.afterProfilePictureUpload}
            />
        </div>
        <div className='user-name'>
            <Input label='Username'
                viewMode='read'
                value={props.me.username}
            />
        </div>
        <div className='email'>
            <Input label='Email ID'
                viewMode='read'
                value={props.me.email}
            />
        </div>
        <div className='name'>
            <Input label='Name'
                name='data.name'
                value={props.data.name}
                onChange={props.onChange}
                error={props.error['data.name']}
            />
        </div>
        <div className='phone-no'>
            <Input label='Phone'
                name='data.phone'
                value={props.data.phone}
                onChange={props.onChange}
                error={props.error['data.phone']}
            />
        </div>
    </div>
}

function Security(props) {
    const alert_ = useAlert();
    const { me, setMe } = useContext(MeContext);
    const [ isLocked, setIsLocked ] = useState(true);
    const [
        securityForm,
        setSecurityForm,
        onSecurityChange,
        securityError,
        setSecurityError,
    ] = useForm({
        data: {
            password: '',
            new_email: '',
            new_password: '',
        }
    });

    function onUnlockClick() {
        let requestData = {
            data: {
                password: securityForm.data.password,
            }
        }

        request.post('me/unlock-to-update-account', requestData)
            .then(([status_, response]) => {
                setIsLocked(false);
            })
            .catch(([errorStatus, response]) => {
                setSecurityError(response.errors);
                if (response.message) {
                    alert_.error(response.message);
                }
            });
    }

    function updateEmailId() {
        let requestData = {
            data: {
                password: securityForm.data.password,
                new_email: securityForm.data.new_email,
            }
        }

        request.patch('me/change-email-or-password', requestData)
            .then(([status_, response]) => {
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Email change mail sent out');
                }
            })
            .catch(([errorStatus, response]) => {
                setSecurityError(response.errors);
                if (response.message) {
                    alert_.error(response.message);
                }
            });
    }

    function updatePassword() {
        let requestData = {
            data: {
                password: securityForm.data.password,
                new_password: securityForm.data.new_password,
            }
        }

        request.patch('me/change-email-or-password', requestData)
            .then(([status_, response]) => {
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Password Updated');
                }
            })
            .catch(([errorStatus, response]) => {
                setSecurityError(response.errors);
                if (response.message) {
                    alert_.error(response.message);
                }
            });
    }

    useEffect(() => {
        //Below check is to ensure logged in user data is loaded
        if (me.name !== '') {
            setSecurityForm(old => {
                let new_ = copy(old);

                new_.data.new_email = me.new_email ?? '';

                return new_;
            });
        }
    }, [me]);

    return <div className='security'>
        <div className='row-1'>
            <div className='update-email-id'>
                <Input label='Update your Email ID'
                    name='data.new_email'
                    value={securityForm.data.new_email}
                    onChange={onSecurityChange}
                    error={securityError['data.new_email']}
                />
            </div>
            <div className='send-invite-button'>
                <button className='button secondary-button'
                    onClick={e => {
                        e.preventDefault();
                        updateEmailId();
                    }}
                >
                    Send Invite
                </button>
            </div>
        </div>
        <div className='row-2'>
            <div className='update-password'>
                <Input type='password' label='Update your password'
                    name='data.new_password'
                    value={securityForm.data.new_password}
                    onChange={onSecurityChange}
                    error={securityError['data.new_password']}
                />
            </div>
            <div className='save'>
                <button className='button secondary-button'
                    onClick={e => {
                        e.preventDefault();
                        updatePassword();
                    }}
                >
                    Save
                </button>
            </div>
        </div>
        {isLocked && <div className='security-locked-screen'>
            <div className='center-div'>
                <div className='lock-icon'>
                    <Icon path='locked.svg' width={30} height={36} />
                </div>
                <div className='lock-subtitle'>
                    This content is locked
                </div>
                <div className='enter-password'>
                    Enter your password
                </div>
                <div className='current-password'>
                    <div className='current-password-input'>
                        <Input type='password' label='Current Password'
                            name='data.password'
                            value={securityForm.data.password}
                            onChange={onSecurityChange}
                            error={securityError['data.password']}
                        />
                    </div>
                    <div className='unlock-button'>
                        <button className='button primary-button'
                            onClick={e => {
                                e.preventDefault();
                                onUnlockClick();
                            }}
                        >
                            Unlock
                        </button>
                    </div>
                </div>
            </div>
        </div>}
    </div>
}

function Personalization(props) {
    let dateFormatOptions =  [
        'MMM D, YYYY',
        'D MMM, YYYY',
        'MMMM D, YYYY',
        'D MMMM, YYYY',
        'YYYY-MM-DD',
        'YYYY/MM/DD',
        'DD-MM-YYYY',
        'DD/MM/YYYY',
    ];

    let timeFormatOptions = [
        'HH:mm',
        'hh:mm a',
        'H:mm',
        'h:mm a',
    ]

    let dateFieldOptions = dateFormatOptions.map(dateFormat => {
        return {
            name: `${moment().format(dateFormat)} (${dateFormat})`,
            value: dateFormat,
        }
    });

    let timeFieldOptions = timeFormatOptions.map(timeFormat => {
        return {
            name: `${moment().format(timeFormat)} (${timeFormat})`,
            value: timeFormat,
        }
    })


    return <div className='personalization'>
        <div className='custom-date-format'>
            <SelectField
                label='Date Format'
                options={dateFieldOptions}
                name='data.preferred_date_format'
                value={props.data.preferred_date_format}
                onChange={props.onChange}
                error={props.error['data.preferred_date_format']}
            />
        </div>
        <div className='custom-time-format'>
            <SelectField
                label='Time Format'
                options={timeFieldOptions}
                name='data.preferred_time_format'
                value={props.data.preferred_time_format}
                onChange={props.onChange}
                error={props.error['data.preferred_time_format']}
            />
        </div>
    </div>
}

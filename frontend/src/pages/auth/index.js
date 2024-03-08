import { data } from 'autoprefixer';
import React, { useState, useEffect, useContext } from 'react';
import { Route, Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAlert } from 'react-alert';

import { Modal, Icon } from 'src/components';
import { Input, Button, } from 'src/components/form';
import { useCollection, useForm, useToggle } from 'src/hooks';
import { copy, getMap, moment, request, numFormat } from 'src/helpers';

const initalMeForm = {
    data: {
        id: 2,
        token: null,
        last_updated_at: null,
        name: 'Paul',
        username: 'paul',
        status: 'active',
        email: 'paul@domain.tld',
        is_email_verified: false,
        new_email: null,
        is_staff: null,
        is_admin: true,
        date_joined_at: null,
        last_login_at: null,
        preferred_date_format: null,
        preferred_time_format: null,
        preferred_columns: {},
        role_details: {},
        profile_picture_details: {}
    },
}

const initialLoginForm = {
    data: {
        email: '',
        password: '',
    }
}

const initialPasswordForm = {
    data: {
        email: '',
        password: '',
        password_again: '',
    }
}

const initialForgotPasswordForm = {
    data: {
        email: '',
    }
}

const initialResetPasswordForm = {
    data: {
        password: '',
        password_again: '',
    }
}

function LoginView(props) {
    const alert_ = useAlert();
    const navigate = useNavigate();
    const location_ = useLocation();
    // const { me, setMe } = useContext(MeContext);
    const [ forgotPasswordModal, toggleForgotPasswordModal ] = useToggle(false);

    const [
        loginForm,
        setLoginForm,
        onLoginFormInputChange,
        loginErrors,
        setLoginErrors,
    ] = useForm(copy(initialLoginForm));

    const [
        forgotPasswordForm,
        setForgotPasswordForm,
        onForgotPasswordChange,
        forgotPasswordError,
        setForgotPasswordError,
    ] = useForm(initialForgotPasswordForm);

    function onLoginSubmit(e) {
        e.preventDefault();

        request.post('login', loginForm)
            .then(([status_, data]) => {
                localStorage.setItem('jwt', data.data.access_token);
                // console.log('Login',  initalMeForm.data,  data.data);

                // window.location = '/';
                navigate('/leads');
            })
            .catch(([status_, errorData]) => {
                console.log('Login Error Data:', errorData);
                setLoginErrors(errorData.errors);

                if (errorData?.message) {
                    alert_.error(errorData.message);
                }
            });
    }

    function onForgotPasswordSubmit(e) {
        e.preventDefault();

        request.post('forgot-password', forgotPasswordForm)
            .then(([status_, data]) => {
                toggleForgotPasswordModal();
                setForgotPasswordForm(initialForgotPasswordForm);
                alert_.success('Email sent out successfully');
            })
            .catch(([status_, errorData]) => {
                console.log('Login Error Data:', errorData);
                setForgotPasswordError(errorData.errors);
            });
    }

    return <div className='form-box login-form-box'>
        <div className='logo-header'>
            <img src='static/images/outreach-logo-new.png'/>
        </div>

        <div className='login-form-wrapper'>
            <div className='login-form-main-heading'>{props.heading}</div>
            {/* <div className='login-form-sub-heading'></div> */}

            <form className='login-form' onSubmit={onLoginSubmit}>
                <div className='email'>
                    <Input type='text'
                        label='Email'
                        placeholder='Enter your email ID'
                        name='data.email'
                        value={loginForm.data.email}
                        onChange={onLoginFormInputChange}
                        error={loginErrors['data.email']}
                        data-test='email'
                    />
                </div>

                <div className='password'>
                    <Input type='password'
                        className='password'
                        label='Password'
                        placeholder='Enter your password'
                        name='data.password'
                        value={loginForm.data.password}
                        onChange={onLoginFormInputChange}
                        error={loginErrors['data.password']}
                        data-test='password'
                    />
                </div>


                <div className='forgot-password-link'>
                    <button type='button' onClick={toggleForgotPasswordModal}>
                        Forgot password?
                    </button>
                </div>

                <div className='login-submit-button'>
                    <button type='submit'
                        className='cobb primary-button'
                        data-test='login'
                    >
                        Login
                    </button>
                </div>
            </form>
        </div>
        {forgotPasswordModal && <Modal
            className='forgot-password-modal'
            toggleModal={toggleForgotPasswordModal}
        >
            <div className='forgot-password-content'>
                <div className='title'>
                    <h3>Forgot Password</h3>
                </div>

                <div className='subtitle'>
                    Please enter your registered email address, We’ll sent instruction  to reset your password
                </div>
                <form className='forgot-password-form' onSubmit={onForgotPasswordSubmit}>
                    <div className='email'>
                        <Input label='Email Id'
                            placeholder='Email'
                            name='data.email'
                            value={forgotPasswordForm.data.email}
                            onChange={onForgotPasswordChange}
                            error={forgotPasswordError['data.email']}
                        />
                    </div>

                    <div className='submit-action'>
                        <button type='submit' className='button primary-button'>
                            Submit
                        </button>
                    </div>
                </form>
            </div>
        </Modal>}
    </div>
}

function SetPasswordView(props) {
    const queryParams = new URLSearchParams(useLocation().search);
    const alert_ = useAlert();
    const navigate = useNavigate();

    const [
        passwordForm,
        setPasswordForm,
        onPasswordFormChange,
        passwordErrors,
        setPasswordErrors,
    ] = useForm(copy(initialPasswordForm));
    const [ isPasswordFormEnabled, setPasswordFormEnabled ] = useState(true);

    function onPasswordSubmit(e) {
        e.preventDefault();

        let requestData = copy(passwordForm);
        // Password again validation
        if (requestData.data.password !== requestData.data.password_again) {
            setPasswordErrors([{
                field: 'data.password_again',
                description: 'Passwords do not match',
            }]);

            return;
        }

        delete requestData.data.password_again;
        delete requestData.data.email;

        requestData.data.email = queryParams.get('email');
        requestData.data.password_set_token = queryParams.get('token');

        setPasswordFormEnabled(false);
        request.post('set-password', requestData)
            .then(([status_, data]) => {
                alert_.success('Password created successfully! Login to proceed.');
                console.log('Password created');

                navigate('/login');
            })
            .catch(([status_, errorData]) => {
                console.log('Set Password Error Data:', errorData);
                setPasswordErrors(errorData.errors);

                if (errorData?.message) {
                    alert_.error(errorData.message);
                } else if (errorData?.errors?.length > 0 && errorData?.errors[0].field === 'data.email') {
                    alert_.error(errorData?.errors[0].description);
                }
            });
    }

    return <div className='form-box set-password-form-box'>
        <div className='logo-header'>
            <img src='static/images/sunassist-login-logo.png'/>
        </div>

        <div className='form-box-body'>
            <div className='form-main-heading'>{props.heading}</div>
            <form className='set-password-form'
                onSubmit={onPasswordSubmit}
            >
                <Input type='text'
                    label='Email'
                    value={queryParams.get('email')}
                    disabled={true}
                />
                <Input type='password'
                    className='password'
                    label='Password'
                    placeholder='Enter your password'
                    name='data.password'
                    value={passwordForm.data.password}
                    onChange={onPasswordFormChange}
                    error={passwordErrors['data.password']}
                    data-test='password'
                />
                <Input type='password'
                    className='password-again'
                    label='Confirm password'
                    placeholder='Enter your password again'
                    name='data.password_again'
                    value={passwordForm.data.password_again}
                    onChange={onPasswordFormChange}
                    error={passwordErrors['data.password_again']}
                    data-test='password-again'
                />

                <button type='submit'
                    className='button primary-button register-button'
                >
                    Create
                </button>
            </form>
        </div>
    </div>
}

function ResetPasswordView(props) {
    const queryParams = new URLSearchParams(useLocation().search);
    const alert_ = useAlert();
    const navigate = useNavigate();

    const [
        passwordForm,
        setPasswordForm,
        onPasswordFormChange,
        passwordErrors,
        setPasswordErrors,
    ] = useForm(copy(initialPasswordForm));
    const [ isPasswordFormEnabled, setPasswordFormEnabled ] = useState(true);

    function onPasswordSubmit(e) {
        e.preventDefault();

        let requestData = copy(passwordForm);
        // Password again validation
        if (requestData.data.password !== requestData.data.password_again) {
            setPasswordErrors([{
                field: 'data.password_again',
                description: 'Passwords do not match',
            }]);

            return;
        }

        delete requestData.data.password_again;
        delete requestData.data.email;

        requestData.data.email = queryParams.get('email');
        requestData.data.password_reset_token = queryParams.get('token');

        setPasswordFormEnabled(false);
        request.post('reset-password', requestData)
            .then(([status_, data]) => {
                alert_.success('Password reset successful! Login to proceed.');
                console.log('Password created');

                navigate('/login');
            })
            .catch(([status_, errorData]) => {
                console.log('Set Password Error Data:', errorData);
                setPasswordErrors(errorData.errors);

                if (errorData?.message) {
                    alert_.error(errorData.message);
                }
            });
    }

    return <div className='form-box set-password-form-box'>
        <div className='logo-header'>
            <img src='static/images/sunassist-login-logo.png'/>
        </div>

        <div className='form-box-body'>
            <div className='form-main-heading'>{props.heading}</div>
            <form className='set-password-form'
                onSubmit={onPasswordSubmit}
            >
                <Input type='text'
                    label='Email'
                    value={queryParams.get('email')}
                    disabled={true}
                />
                <Input type='password'
                    className='password'
                    label='Password'
                    placeholder='Enter your password'
                    name='data.password'
                    value={passwordForm.data.password}
                    onChange={onPasswordFormChange}
                    error={passwordErrors['data.password']}
                    data-test='password'
                />
                <Input type='password'
                    className='password-again'
                    label='Confirm password'
                    placeholder='Enter your password again'
                    name='data.password_again'
                    value={passwordForm.data.password_again}
                    onChange={onPasswordFormChange}
                    error={passwordErrors['data.password_again']}
                    data-test='password-again'
                />

                <button type='submit'
                    className='button primary-button register-button'
                >
                    Reset Password
                </button>
            </form>
        </div>
    </div>
}

function VerifyEmailView(props) {
    const queryParams = new URLSearchParams(useLocation().search);
    const navigate = useNavigate();
    const [ isVerified, setIsVerified ] = useState(false);

    function onEmailActivate() {
        let requestData = {
            data: {

            }
        };
        requestData.data.new_email = queryParams.get('new_email');
        requestData.data.new_email_verification_token = queryParams.get('token');

        request.post('confirm-new-email', requestData)
            .then(([status_, data]) => {
                setIsVerified(true);
                setTimeout(() => {
                    console.log('Timeout completed');
                    navigate('/login');
                }, 100);
            })
            .catch(([status_, errorData]) => {
                console.log('Set Password Error Data:', errorData);
            });
    }

    useEffect(() => {
        onEmailActivate();
    }, []);

    return <div className='form-box verify-email-success'>
        <div className='logo-header'>
            <img src='static/images/sunassist-login-logo.png'/>
        </div>

        {isVerified && <div className='form-box-body'>
            <div className='green-tick'>
                <Icon path='green-circle-tick.svg' size={50} />
            </div>
            <div className='success-text'>
                Your email address has been verified.
            </div>
        </div>}
        {!isVerified && <div className='form-box-body'>
            Email verfication under progress...
        </div>}
    </div>
}

function ForgotPasswordView(props) {
    const navigate = useNavigate();
    const location_ = useLocation();

    const [
        forgotPasswordForm,
        setForgotPasswordForm,
        onForgotPasswordFormInputChange,
        forgotPasswordErrors,
        setForgotPasswordErrors,
    ] = useForm(copy(initialForgotPasswordForm));
    const [ isForgotPasswordFormEnabled, setForgotPasswordFormEnabled ] = useState(true);

    function onForgotPasswordSubmit(e) {
        e.preventDefault();
        setForgotPasswordFormEnabled(false);
        // setForgotPasswordErrors([]);
        console.log('Forgot Password form',forgotPasswordForm);
        request.post('forgot-password', forgotPasswordForm, (status_, data) => {
            localStorage.setItem('jwt', data.data.access_token);

            //To redirect to admin articles page if logged in user is admin
            if (data.data.role_details) {
                window.location = 'admin/articles';
            } else {
                window.location = '/';
            }
        }, (status_, errorData) => {
            console.log('ForgotPassword Error Data:', errorData);
            setForgotPasswordErrors(errorData.errors);
        });
    }

    return <LoggedOutTemplate>
        <div className='form-box forgot-password-form-box'>
            <div className='form-box-header'>
                Forgot your password?
            </div>

            <div className='form-box-body'>
                <form className='forgot-password-form' onSubmit={onForgotPasswordSubmit}>
                    <Input type='text'
                        label='Email'
                        placeholder='Enter your email ID'
                        name='data.email'
                        value={forgotPasswordForm.data.email}
                        onChange={onForgotPasswordFormInputChange}
                        error={forgotPasswordErrors['data.email']}
                    />

                    <button type='submit'
                        className='cobb primary-button forgot-password-button'
                    >
                        Submit
                    </button>
                </form>
            </div>

            <div className='form-box-footer'>
                <Link to='/login'>
                    Login here
                </Link>
                <Link to='/register'>
                    If you don't have an account, create one here
                </Link>
            </div>
        </div>
    </LoggedOutTemplate>
}

function LoggedOutTemplate(props) {
    return <div id='main-grid'>
        <div id='logged-out-template-view' className='app-content'>
            {props.children}
        </div>
    </div>
}

export {
    LoginView,
    VerifyEmailView,
    SetPasswordView,
    ResetPasswordView,
}


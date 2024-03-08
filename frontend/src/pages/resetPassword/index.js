import { data } from 'autoprefixer';
import React, { useState, useEffect } from 'react';
import { Route, Link, useNavigate } from 'react-router-dom';
import { useAlert } from 'react-alert';

import { Icon } from 'src/components';
import { Input, Button, } from 'src/components/form';
import { copy, getMap, moment, request, numFormat } from 'src/helpers';
import { useCollection, useForm, useToggle } from 'src/hooks';

const initPasswordForm = {
    data: {
        password: '',
        confirmPassword: '',
    }
}

const initUserDetails = {
    name: ''
}

export default function ResetPasswordView(props) {
    const queryParams = new URLSearchParams(window.location.search);
    const alert_ = useAlert();
    const navigate = useNavigate();

    const email = queryParams.get('email');
    const token = queryParams.get('token');

    const [
        passwordForm,
        setPasswordForm,
        onPasswordChange,
        passwordErrors,
        setPasswordErrors,
    ] = useForm(initPasswordForm);

    const [ userDetails, setUserDetails ] = useState(initUserDetails);

    function onSubmit(e) {
        e.preventDefault();
        let requestPayload = passwordForm;

        if (passwordForm.data.password != passwordForm.data.confirmPassword) {
            setPasswordErrors([{
                'field': 'data.confirmPassword',
                'description': 'Passwords should match',
            }]);
            return;
        }

        delete passwordForm.data.confirmPassword;

        request.post(
            `reset-password?email=${email}&token=${token}`,
            requestPayload,
            (successStat, data) => {
                navigate(`/login`, {replace: true});
            },
            (errorStat, data) => {
                setPasswordErrors(data.data.errors);
            }
        );
    }

    useEffect(() => {
        request.get(
            `reset-password?email=${email}&token=${token}`,
            (successStat, data) => {
                setUserDetails(data.data.user_details);
            },
            (errorStat, data) => {
                alert_.error('Encounter unexpected error. Please reload the page');
            }
        )
    }, []);

    console.log('User Details', userDetails);

    return <div id='reset-password-page-view'>
        <div className='page-header'>
            <img className='logo' src='/static/images/logo.svg' />
        </div>

        <div className='content-box box'>
            <h1 className='title'>Hey,  {userDetails.name}</h1>

            <div className='forms'>
                <form className='password-form' id='password-form'>
                    <h2 className='form-title'>Reset your password</h2>

                    <div className='password-box'>
                        <Input type='password'
                            label='New Password'
                            className='password-one'
                            placeholder='Enter your new password'
                            name='data.password'
                            value={passwordForm.data.password}
                            onChange={onPasswordChange}
                        />
                        <Input type='password'
                            label='Confirm Password'
                            className='password-two'
                            placeholder='Re-enter password for confirmation'
                            name='data.confirmPassword'
                            value={passwordForm.data.confirmPassword}
                            onChange={onPasswordChange}
                            error={passwordErrors['data.password']}
                        />
                    </div>
                </form>
            </div>
            <div className='controls-row'>
                <button
                    className='primary'
                    type='submit'
                    htmlFor='password-form'
                    onClick={onSubmit}
                >
                    Save Password
                </button>
            </div>
        </div>


    </div>
}


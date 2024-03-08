import React, { useState } from 'react';
import { useToggle } from 'src/hooks';

export default function SuccessView(props) {
    const [ isShown, setShown ] =  useToggle(props.display);
    console.log('Inside Display success', isShown);
    function onClickClose () {
        setShown(false);
    }

    return <div id={isShown ? 'success' : 'display-none'}>
        <div className='success-wrapper'>
            <img className='close-button'
                src='/static/images/icons/close-button.svg'
                onClick={onClickClose}
            />
            <div className='message-wrapper'>
                <div className="title">Invoice Status Updated!</div>
                <img src='/static/images/success.png' />
                <div className="message">Invoice status has successfully updated and
                    has moved to the verification stage.
                </div>
            </div>
        </div>
    </div>
}

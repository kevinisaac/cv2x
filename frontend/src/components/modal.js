import React, { useState, useEffect, useRef } from 'react';

import {
    Icon,
} from 'src/components';


export default function Modal(props) {
    // console.log(props.toggleModal);
    useEffect(() => {
        document.addEventListener('click', onClick, false);

        return () =>
            document.removeEventListener('click', onClick, false);
    }, []);

    function onClick(e) {
        if (e.target.classList.contains('modal')) {
            // console.log('Clicked outside');
            props.toggleModal();
        }
    }

    // const node = useRef();
    return <div className={`modal ${props.className || ''}`}>
        <div className='inner'>
            {!props.noHeader && <ModalHeader title={props.title}
                toggleModal={props.toggleModal}
            />}

            {props.children}
        </div>
    </div>
}

function ModalHeader(props) {
    return <div className='header'>
        <h2>{props.title}</h2>

        {/* <div className='close icon close-icon' onClick={props.toggleModal}></div> */}
        <button
            type='button'
            className='cobb close-button'
            onClick={e => {
                e.preventDefault();
                e.stopPropagation();
                // console.log('Inside toggle modal');
                props.toggleModal();
            }}
        >
            <Icon path='x-dark-grey.svg' size={10}/>
        </button>
    </div>
}

function ModalFooter(props) {
    return <div className='footer'>
        <input className='button primary-button'
            type='submit'
            value={props.buttonName}
            form={props.form}
            disabled={!props.loaded}
        />
    </div>
}


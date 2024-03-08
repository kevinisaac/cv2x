import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';

import {
    Tag,
    Icon,
    Table,
    Header,
    Sidebar,
    Sticker,
    SubNavBar,
    DonutChart,
    AddressInput,
    ChangePasswordInput,
} from 'src/components';

import {
    Input,
    DateField,
    FileField,
    RadioField,
    SelectField,
    CreditCardInput,
} from 'src/components/form';
import { useForm, useToggle } from 'src/hooks';
import { copy, request, moment } from 'src/helpers';


export default function ComponentsView(props) {
    const [ oldPassword, setOldPassword ] = useState();
    const [ newPassword, setNewPassword ] = useState();

    const [ isStickerOn, toggleSticker ] = useToggle(true);

    return <div id='main-grid'>
        <Header />
        <Sidebar />

        <div id='components-view'>
            <h1>Components view</h1>

            <div className='components'>
                <AddressInput label='Address'
                    error='Some error message'
                />
                <br />

                {false && <Sticker toggle={toggleSticker}
                    title='Add to email queue'
                    disabled={false}
                >
                    <div className='top-section'>
                        <RadioField
                            options={[
                                {
                                    label: 'Share now',
                                    value: 'share',
                                },
                                {
                                    label: 'Schedule',
                                    value: 'schedule',
                                },
                                {
                                    label: 'Add to Queue',
                                    value: 'queue',
                                },
                            ]}
                            value='queue'
                        />
                    </div>

                    <form className='schedule-form'>
                        <div className='form-inputs-box box'>
                            <div className='recipients-input input-wrapper'>
                                <input type='text'
                                    placeholder='Add Recipients'
                                    className='country-input'
                                />
                            </div>

                            <div className='subject-input input-wrapper'>
                                <input type='text'
                                    placeholder='Subject'
                                    className='state-input'
                                />
                            </div>

                            <div className='address-text-input input-wrapper'>
                                <textarea
                                    placeholder='Your Message'
                                    className='message-text-input'
                                >
                                    {props.value}
                                </textarea>
                            </div>

                            <div className='form-articles'>
                                <FormArticle />
                                <FormArticle />
                                <FormArticle />
                            </div>

                            <div className='layout-row'>
                                <div className='layout-section'>
                                    <div className='layout-text'>Layout:</div>
                                    <div className='layout-icons'>
                                        <button className='layout-button active'>
                                            <Icon path='wide-layout-selected.svg' />
                                        </button>
                                        <button className='layout-button'>
                                            <Icon path='narrow-layout.svg' />
                                        </button>
                                    </div>
                                </div>
                                <div className='add-article-section'>
                                    <button type='button'
                                        className='add-article-button'
                                    >
                                        + Add Article
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className='form-controls'>
                            <button type='button'
                                className='primary schedule-button'
                            >
                                Schedule
                            </button>
                        </div>
                    </form>
                </Sticker>}
                <br />

                {isStickerOn && <Sticker toggle={toggleSticker}
                    title='Add to LinkedIn Queue'
                    disabled={false}
                >
                    <div className='top-section'>
                        <div className='share-timing'>
                            <RadioField
                                options={[
                                    {
                                        label: 'Share now',
                                        value: 'share',
                                    },
                                    {
                                        label: 'Schedule',
                                        value: 'schedule',
                                    },
                                    {
                                        label: 'Add to Queue',
                                        value: 'queue',
                                    },
                                ]}
                                value='queue'
                            />
                        </div>

                        <button type='button'
                            className='share-via'
                        >
                            Share via Email
                        </button>
                    </div>

                    <form className='schedule-form'>
                        <div className='form-inputs-box box'>
                            <div className='address-text-input input-wrapper'>
                                <textarea
                                    placeholder='Your Message'
                                    className='message-text-input'
                                >
                                    {props.value}
                                </textarea>
                            </div>

                            <div className='form-articles'>
                                <FormArticle />
                            </div>
                        </div>

                        <div className='form-controls'>
                            <button type='button'
                                className='primary schedule-button'
                            >
                                Schedule
                            </button>
                        </div>
                    </form>
                </Sticker>}
                <br />

                <CreditCardInput />
                <br />
                <ChangePasswordInput
                    oldPassword={oldPassword}
                    setOldPassword={setOldPassword}
                    newPassword={newPassword}
                    setNewPassword={setNewPassword}
                    disabled={!oldPassword}
                />
                <br />

                <Input type='text'
                    prefixIconPath='search-grey.svg'
                    placeholder='Search articles'
                />
                <br />

                <div className='tags'>
                    <Tag name='Lifehacks' selected />
                    <Tag name='Finance' />
                    <Tag name='Business' />
                    <Tag name='Computer Security' selected />
                    <Tag name='Electronics' />
                    <Tag name='Gaming' />
                </div>
                <br />

                <RadioField
                    options={[
                        {
                            label: 'Share now',
                            value: 'share',
                        },
                        {
                            label: 'Schedule',
                            value: 'schedule',
                        },
                        {
                            label: 'Add to Queue',
                            value: 'queue',
                        },
                    ]}
                    value='queue'
                />
                <br />

                <div className='contact-lists-wrapper'>
                    <ContactLists />
                </div>
                <br />

                <SubNavBar />
                <br />
            </div>
        </div>
    </div>
}


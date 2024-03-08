import React, { useState, useEffect, useContext, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAlert } from 'react-alert';

import { CommonValueContext, UserPreferenceContext, MeContext } from 'src/contexts';
import { useToggle, useDeepCompareEffect, useForm, getEventValue } from 'src/hooks';
import {
    Icon,
    Table,
    Modal,
    Button,
    Tooltip,
    DragDrop,
    Calendar,
    KeyValueTooltip,
} from 'src/components';
import {
    Input,
    Checkbox,
    DateField,
    SelectField,
    SearchBox,
    TimeInput,
} from 'src/components/form';
import {
    copy,
    equal,
    getMap,
    request,
    getOptions,
    getDayLabel,
    getNestedValue,
    byString,
    hhmmToDuration,
    minutesToHHMM,
    copyToClipboard,
} from 'src/helpers';
import jsonData from '/data/json_data/input_data';
import moment from 'moment';


function PageTopRow(props) {
    const location_ = useLocation();
    const navigate = useNavigate();
    const alert_ = useAlert();
    let versionHistoryDetails = '';
    const [ isMoreOpen, toggleIsMoreOpen, setIsMoreOpen ] = useToggle(false);
    let searchInput = <SimpleSearchBox
        collection={props.collection}
        updateCollection={props.updateCollection}
    />

    let backURL;
    if (props.backButtonURL) {
        //Below property used to check for archived data
        if (props.archivedMessage) {
            backURL = props.backButtonURL + '?status=archived';
        } else {
            backURL = location_.pathname.includes('/bookings/')
                ? localStorage.getItem('prevURL') || props.backButtonURL
                : props.backButtonURL
        }
    }

    const [ files, setFiles ] = useState([]);
    const [ isExporting, setIsExporting ] = useState(false);

    let optionsIndustry = [];

    // if (props.leads.loaded) {
    //     optionsIndustry
    //         = Array.from(new Set(props.leads.items.map(leads => leads.industry_details?.name)))
    //         .map(industryId => {
    //             let industry = props.leads.items
    //                 .find(leads => leads.client_details.id === industryId).client_details;

    //             return {
    //                 name: industry.name,
    //                 value: industry.id,
    //             }

    //         });

    //     optionsIndustry.sort((a, b) => a.name.localeCompare(b.name));
    // }

    return <div className='page-top-row'>
        <div className='top-row-left'>
            {/* {props.backButton && <button onClick={e => navigate(-1)} className='back-button'> */}
            {props.backButtonURL && <a
                href={backURL}
                className='back-button'
            >
                <Icon path='left-arrow.svg' width={15} height={17.5} />
            </a>}
            <div className='page-title' data-test='page-title'>
                {props.title}
            </div>
            {props.titleSubscript && <div className='title-subscript'>
                {props.titleSubscript}
            </div>}
            {(props.showUnsavedChangesBanner
                && !equal(props.updateForm, props.originalForm)
            )
            &&  <UnsavedDataBanner />}
        </div>
        <div className='top-row-right'>
            {props.archivedMessage && <div className='archived-message'>
                {props.archivedMessage}
            </div>}
            {props.children}
            {props.type === 'active-listing' && <>
                <div className='search-box-wrapper'>
                    {searchInput}
                </div>
                {props.leads && <>
                    {/* <div className='date-filter-wrapper'>
                        <DateFilter
                            name='data.filterDate'
                            value={props.filterData.filterDate}
                            setValue={props.setFilterData}
                        />
                    </div> */}
                    <div className='industry-filter-wrapper'>
                        <SelectField
                            className='calendar-client-selection'
                            placeholder='All Industry'
                            // name='data.industry_details?.name'
                            // value={props.data.industry_details?.name}
                            onChange={props.onChange}
                            // options={optionsIndustry}
                            pure
                            enableNoneOption
                        />
                    </div>
                </>
                }
                {props.leads && <> <div className='import-leads-button'>
                    <DragDrop
                        files={files}
                        setFiles={setFiles}
                        singleFileUpload={true}
                        url='leads/file-imports'
                        onSuccess={(responseData) => {
                            alert_.success('File Imported');
                            props.updateCollection({
                                reload: true,
                            });
                        }}
                    >
                        <div className='button primary-button' >
                            <Icon path='import.svg' size={18} />
                            <div className='import-button-text'>Import</div>
                        </div>
                    </DragDrop>
                    <button className='button primary-button export-button'
                        onClick={e => {
                            e.preventDefault();
                            setIsExporting(true);

                            request.download(`leads/-/export`)
                                .then(async (response) => {
                                    const blob = await response.blob();
                                    // const blob = new Blob([response], {type : "application/pdf"});
                                    const url = window.URL.createObjectURL(blob);
                                    const link = document.createElement('a');
                                    link.href = url;
                                    link.setAttribute('target', '_blank');
                                    link.click();
                                })
                                .finally(() => {
                                    setIsExporting(false);
                                });
                        }}
                    >
                        {isExporting ? 'Exporting...' : 'Export'}
                    </button>
                </div> </>}
                {props.buttonText && <div className='add-record-button'>
                    <button className='button primary-button' data-test='primary-button'
                        onClick={e => {
                            e.preventDefault();
                            props.onButtonClick();
                        }}
                    >
                        {props.buttonText}
                    </button>
                </div>}
                {props.leads && <div className='load-leads-button'>
                        <button className='button primary-button'
                            onClick={e => {
                                e.preventDefault();
                                props.onButtonClickLoadLeads();
                            }}
                        >
                            Load Leads
                        </button>
                </div>}
                {props.moreOptions && <div className='more-options-wrapper'>
                    <button className='more-options-button'
                        onClick={e => {
                            e.preventDefault();
                            toggleIsMoreOpen();
                        }}>
                        <Icon path='more.svg' width={18} height={4} />
                    </button>
                    {isMoreOpen && <div className='more-options-list'>
                        {props.moreOptions.map((moreOption, index) => <button
                            className='more-option-button'
                            onClick={e => {
                                e.preventDefault();
                                moreOption.onClick();
                                setIsMoreOpen(false);
                            }}
                        >
                            <div className='more-option-icon'>
                                <Icon path={moreOption.icon} width={14} height={12.25} />
                            </div>
                            <div className='more-option-text'>
                                {moreOption.label}
                            </div>
                        </button>)}
                    </div>}
                </div>}
            </>}
            {props.type === 'archive-listing' && <>
                <div className='search-box-wrapper'>
                    {searchInput}
                </div>
                <div className='back-button-wrapper'>
                    <button className='back-button'
                        onClick={e => {
                            e.preventDefault();
                            props.onBackClick();
                            props.setType('active-listing');
                        }}
                    >
                        <Icon path='left-arrow.svg' size={20} />
                        <div className='back-button-text'>Back</div>
                    </button>
                </div>
            </>}
        </div>
    </div>
}

function SimpleSearchBox(props) {
    const [ filterText, setFilterText ] = useState('');

    let className = 'search-box';
    let postfixIcon = filterText.length > 0 ? 'x-dark-grey.svg' : 'search.svg';

    function onPostfixClick(e) {
        setFilterText('');

        let urlSearchParams = new URLSearchParams(props.collection.queryString);
        urlSearchParams.set('q', '');

        props.updateCollection({
            queryString: urlSearchParams.toString(),
        });
    }

    function onChange(e) {
        setFilterText(e.target.value);

        //To consider any other filters which are already added
        let urlSearchParams = new URLSearchParams(props.collection.queryString);
        urlSearchParams.set('q', e.target.value);

        props.updateCollection({
            queryString: urlSearchParams.toString(),
        })
    }

    return <div className={className}>
        <Input className={`search-input${filterText.length > 0 ? ' with-data' : ''}`}
            postfixIconPath={postfixIcon}
            placeholder='Search'
            value={filterText}
            onChange={e => onChange(e)}
            onPostfixClick={onPostfixClick}
        />
    </div>
}

function NavigationPanel(props) {
    const { isSubMenuCollapsed, toggleSubMenu } = useContext(UserPreferenceContext);

    const [ selectedSubSection, setSelectedSubSection ] = useState(null);

    return <div className='navigation-panel' data-test='navigation-panel'>
        <button className='expand-collapse'
            onClick={() => toggleSubMenu()}
        >
            {isSubMenuCollapsed
                ? <Icon path='expand.svg' size={9} />
                : <Icon path='collapse.svg' size={9} />
            }
        </button>

        {props.sections.map((section, index) => <a
            key={section.navigation}
            href={`#${section.navigation}`}
            className={`section-link${selectedSubSection == index
                ? ' selected-sub-section'
                : ''
            }`}
            onClick={e => {
                setSelectedSubSection(index);
            }}
        >
        <div className={`section-icon-or-number ${isSubMenuCollapsed ? 'collapsed' : ''}`}>
            {section.icon
                ? <Icon path={section.icon} size={13} />
                : isSubMenuCollapsed
                    ? index + 1
                    : <></>
            }
        </div>

        {isSubMenuCollapsed
            ? <></>
            : <>
                {section.type === 'danger' && <div
                    className='link-text danger-link'
                >
                    {section.name}
                </div>}
                {section.type !== 'danger' && <div
                    className='link-text'
                >
                    {section.name}
                </div>}
            </>
        }
        </a>)}
    </div>
}

function FormActions(props) {
    const { isSubMenuCollapsed, toggleSubMenu } = useContext(UserPreferenceContext);

    return <div className={`form-actions ${isSubMenuCollapsed ? 'collapsed' : ''}`}>
        {props.type === 'read' && <div className='form-edit-button'>
            <button className='button primary-button'
                onClick={e => {
                    e.preventDefault();
                    props.setType('edit');
                }}
            >
                {isSubMenuCollapsed
                    ? <Icon path='edit.svg' />
                    : 'Edit'
                }
            </button>
        </div>}
        {(props.type === 'edit' && props.id === 'create') && <>
            <div className='form-save-button'>
                <button className='button primary-button' onClick={e => {
                    e.preventDefault();
                    props.submitAction();
                }}>
                    {isSubMenuCollapsed
                        ? <Icon path='save.svg' />
                        : props.createLabel
                    }
                </button>
            </div>
        </>}
        {(props.type === 'edit' && props.id !== 'create') && <>
            <div className='form-cancel-button'>
                <button className='button secondary-button' onClick={e => {
                    e.preventDefault();
                    props.cancelAction();
                }}>
                    {isSubMenuCollapsed
                        ? <Icon path='cancel.svg' />
                        : 'Cancel'
                    }
                </button>
            </div>
            <div className='form-save-button'>
                <button className='button primary-button' onClick={e => {
                    e.preventDefault();
                    props.submitAction(e);
                }}>
                    {isSubMenuCollapsed
                        ? <Icon path='save.svg' />
                        : 'Save'
                    }
                </button>
            </div>
        </>}
    </div>
}

function Sections(props) {
    return <div className='sections'>
        {props.sections.map((section, index) => <Section
            title={section.name}
            titleDescription={section.titleDescription}
            type={section.type}
            navigation={section.navigation}
            subSections={section.subSections}
            sectionAction={section.sectionAction}
            sectionActionButtonText={section.sectionActionButtonText}
            key={index}
            className={section.className}
        />)}
    </div>
}

function Section(props) {
    let className = 'section';
    if (props.type === 'danger') {
        className +=  ' danger-section';
    }

    if (props.className) {
        className += ' ' + props.className;
    }

    return  <div className={className}>
        <span id={props.navigation} className='section-anchor'/>
        <div className='section-heading'>
            <div className='section-heading-left'>
                <div className='section-title'>{props.title}</div>
                {props.titleDescription && <div className='title-description'>
                    {props.titleDescription}
                </div>}
            </div>
            <div className='section-heading-right'>
                {props.sectionAction && <button
                    className='button secondary-button section-action-button'
                    onClick={e => props.sectionAction(e)}
                >
                    {props.sectionActionButtonText || 'Action Text Required'}
                </button>}
            </div>
        </div>
        <div className='section-content'>
            {props.subSections.map((subSection, index) => <SubSection
                title={subSection.name}
                className={subSection.className}
                content={subSection.content}
                key={index}
            />)}
        </div>
    </div>
}

function SubSection(props) {
    return <div className={`sub-section${props.className ? ` ${props.className}` : ''}`}>
        {props.title && <div className='sub-section-title'>{props.title}</div>}
        <div className='sub-section-content'>
            {props.content}
        </div>
    </div>
}

function DangerZoneItem(props) {
    let className = 'danger-zone-item';
    if (props.isConfirmationActive) {
        className += ' danger-zone-item-grey-out';
    }


    return <div className={className}>
        <div className='left-section'>
            <div className='main-action-title'>{props.mainActionTitle}</div>
            <div className='main-action-subtitle'>{props.mainActionSubTitle}</div>
        </div>
        <div className='right-section'>
            {!props.isConfirmationActive && <button className='button danger-button'
                onClick={e => {
                    e.preventDefault();
                    props.enableConfirmation();
                }}
            >
                {props.actionButtonText}
            </button>}
        </div>
    </div>
}

function DangerZone(props) {
    const [ confirmActionUI, setConfirmActionUI ] = useState(false);
    const [ selectedItem, setSelectedItem ] = useState(null);


    return <div className='danger-zone'>
        {props.items.map((item, index) => <DangerZoneItem
            mainActionTitle={item.mainActionTitle}
            mainActionSubTitle={item.mainActionSubTitle}
            actionButtonText={item.actionButtonText}
            actionConfirmation={item.actionConfirmation}
            enableConfirmation={() => {
                setSelectedItem(index);
                setConfirmActionUI(true);
            }}
            isConfirmationActive={confirmActionUI}
            key={index}
        />)}
        {confirmActionUI && <div className='action-confirmation-ui'>
            <div className='action-confirmation-text'>
                {props.items[selectedItem].actionConfirmationText}
            </div>
            <div className='action-buttons'>
                <div className='cancel-button'>
                    <button className='button secondary-button'
                        onClick={e => {
                            e.preventDefault();
                            setSelectedItem(null);
                            setConfirmActionUI(false);
                        }}
                    >
                        Cancel
                    </button>
                </div>
                <div className='submit-button'>
                    <button className='button danger-button'
                        onClick={e => {
                            e.preventDefault();
                            props.items[selectedItem].actionConfirmation();
                        }}
                    >
                        {props.items[selectedItem].actionConfirmationButtonText}
                    </button>
                </div>
            </div>
        </div>}
    </div>
}

function LoaderPlaceholderBox(props) {
    let style = {
        ...props.style,
    }
    if (props.width) {
        style['width'] = props.width + 'px';
    }
    return <div className='loader-placeholder-box' style={style}></div>
}

function AMPMToggle(props) {
    function onButtonClick(e, buttonValue) {
        e.preventDefault();
        props.setValue(old => {
            let new_ = copy(old);

            byString(new_, props.name, buttonValue);

            return new_;
        });
    }

    const isActive = (buttonValue) => {
        let className = props.value === buttonValue
            ? ' am-pm-active'
            : ''
        ;

        return className;
    }

    let displayContent;
    if (!props.viewMode || props.viewMode === 'edit') {
        displayContent = <>
            <button
                className={`am-pm-button am-button${isActive('am')}`}
                onClick={e => onButtonClick(e, 'am')}
                disabled={props.disabled}
            >
                AM
            </button>
            <button
                className={`am-pm-button pm-button${isActive('pm')}`}
                onClick={e => onButtonClick(e, 'pm')}
                disabled={props.disabled}
            >
                PM
            </button>
        </>
    } else {
        displayContent =  <>
            <div
                className={`am-pm-button am-button${isActive('am')}`}
                disabled={props.disabled}
            >
                AM
            </div>
            <div
                className={`am-pm-button pm-button${isActive('pm')}`}
                disabled={props.disabled}
            >
                PM
            </div>
        </>
    }

    return <div className='am-pm-toggle'>
        {displayContent}
    </div>
}

function ComingSoon(props) {
    return <div className='coming-soon'>
        <img src='/static/images/coming-soon.png'/>
    </div>
}

function WeekView(props) {
    const dayOptions = [
        {
            label: 'S',
            value: 'SU',
        },
        {
            label: 'M',
            value: 'MO',
        },
        {
            label: 'T',
            value: 'TU',
        },
        {
            label: 'W',
            value: 'WE',
        },
        {
            label: 'T',
            value: 'TH',
        },
        {
            label: 'F',
            value: 'FR',
        },
        {
            label: 'S',
            value: 'SA',
        },
    ];

    // const [ selectedValues, setSelectedValues ] = useState([]);

    const isChecked = (element) =>  props.value.indexOf(element) > -1;

    function addOrRemove(element) {
        props.setValue(old => {
            let new_ = copy(old);

            let value = byString(new_, props.name);

            let index = value.indexOf(element);
            if (index === -1) {
                value.push(element);
            } else {
                value.splice(index, 1);
            }


            byString(new_, props.name, value);

            return new_;
        });
    }

    return <div className='week-view'>
        {dayOptions.map(day => <button
            className={`week-day${isChecked(day.value) ? ' active' : ''}`}
            onClick={e => {
                e.preventDefault();
                if (props.viewMode === 'edit') {
                    addOrRemove(day.value);
                }
            }}
        >
            {day.label}
        </button>)}
    </div>
}

function DateFilter(props) {
    const [ isExpanded, toggleIsExpanded, setIsExpanded ] = useToggle(false);

    const [ time, setTime ] = useState('');
    const [ selectedDate, setSelectedDate ] = useState(null);
    const [ enteredDate, setEnteredDate ] = useState(() => {
        let date = moment(props.value);
        if (date.isValid()) {
            return date.format('DD/MM/YYYY');
        }
        return moment().add(1, 'days').format('DD/MM/YYYY')
    });
    const [ enteredTime, setEnteredTime ] = useState('00:00 AM');

    function onClick(e) {
        let calendarElement = document.querySelector('.calendar');
        let calendarInputElement = dateFieldNode.current;

        if (calendarElement && !calendarElement.contains(e.target)
            && !calendarInputElement.contains(e.target)) {
            setIsExpanded(false);
        }
    }

    // To close calendar when clicking outside
    const dateFieldNode = useRef();
    useEffect(() => {
        document.addEventListener('click', onClick);

        return () => document.removeEventListener('click', onClick);
    }, []);

    //To set value on change
    useEffect(() => {
        props.setValue(old => {
            let new_ = copy(old);
            //Check added as there was an error with selectedDate = null
            if (selectedDate) {
                if (typeof selectedDate === 'string') {
                    byString(new_, props.name, selectedDate);
                } else {
                    byString(new_, props.name, selectedDate.format('YYYY-MM-DD'));
                }
            }

            return new_;
        });

        //To close on date select. Might cause unexpected closes
        setIsExpanded(false);
    }, [selectedDate]);

    let showSubText = false;
    let date = moment(selectedDate);
    if (date.isSame(moment(), 'day')) {
        showSubText = true;
    } else if (moment().subtract(1, 'days').isSame(date, 'day')) {
        showSubText = true;
    }  else if (moment().add(1, 'days').isSame(date, 'day')) {
        showSubText = true;
    }

    return <div className='date-filter' ref={dateFieldNode}>
        <div className='selected-date-label' onClick={toggleIsExpanded}>
            <div className='main-text'>
                {selectedDate ? (
                    getDayLabel(moment(selectedDate),
                        'MMM D, YYYY',
                        'YYYY-MM-DD',
                        'Not Available',
                        true
                    )) : 'Select a Date' }
            </div>
            {/* {showSubText && <div className='sub-text'>
                ({getDayLabel(moment(selectedDate), 'MMM D, YYYY')})
            </div>} */}
        </div>
        <div className='switch-selected-date'>
            <button className='previous-next-button select-previous-date'
                onClick={e => {
                    e.preventDefault();
                    setSelectedDate(old => {
                        let new_ = copy(old);
                        new_ = moment(old, 'YYYY-MM-DD').subtract(1, 'days').format('YYYY-MM-DD');
                        return new_;
                    });
                }}
            >
                <Icon path='left-indent.svg' width={7} height={12} />
            </button>
            <button className='previous-next-button select-next-date'
                onClick={e => {
                    e.preventDefault();
                    setSelectedDate(old_ => {
                        let new_ = copy(old_);
                        new_ = moment(old_, 'YYYY-MM-DD').add(1, 'days').format('YYYY-MM-DD');
                        return new_;
                    });
                }}
            >
                <Icon path='right-indent.svg' width={7} height={12} />
            </button>
        </div>
        {isExpanded && <Calendar className='date-filter-calendar'
            name={props.name}
            value={props.value}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            enteredDate={enteredDate}
            setEnteredDate={setEnteredDate}
            enteredTime={enteredTime}
            setEnteredTime={setEnteredTime}
            onChange={props.onChange}
            setCalendarVisible={() => console.log('')}
            // datetime={props.datetime}   // Whether to get the time along with the date or not
            disableBefore={props.disableBefore}
            disableAfter={props.disableAfter}
        />}
    </div>
}

function YearFilter(props) {
    let year=moment(props.data.startDate).format('YYYY');

    function navigatePrevYear() {
        props.setData(old => {
            let new_ = copy(old);

            new_.startDate = moment(old.startDate).subtract(1, 'year').format('YYYY-MM-DD');
            new_.endDate = moment(old.endDate).subtract(1, 'year').format('YYYY-MM-DD');

            return new_;
        })
    }

    function navigateNextYear() {
        props.setData(old => {
            let new_ = copy(old);

            new_.startDate = moment(old.startDate).add(1, 'year').format('YYYY-MM-DD');
            new_.endDate = moment(old.endDate).add(1, 'year').format('YYYY-MM-DD');

            return new_;
        })
    }

    return <div className='year-filter'>
        <button className='previous-year' onClick={navigatePrevYear}>
            <Icon path='left-indent.svg' width={12} height={14} />
        </button>
        <div className='selected-year'>
            {year}
        </div>
        <button className='next-year' onClick={navigateNextYear}>
            <Icon path='right-indent.svg' width={12} height={14} />
        </button>
    </div>
}

function UnsavedDataBanner(props) {
    return <div className='unsaved-data-banner'>
        <Icon path='important-white.svg' size={25} />
        You have unsaved changes on this page
    </div>
}

function PhoneNumber(props) {
    return <div className='phone-number'>
        <div className='phone-number-input'>
            <Input label='Phone'
                // name={`${props.name}.phone_number`}
                // value={props.data.phone_number}
                // onChange={props.onChange}
                // viewMode={props.viewMode}
                // error={props.error[`${props.name}.phone_number`]}
            />
        </div>
    </div>
}

function ContactDetails(props) {
    let { commonData } = useContext(CommonValueContext);
    //To handle scenarios where contact details collected will not be wrapped up in single object
    let addressName = props.addressName ?? 'current_address';
    let addressData = props.data[addressName] ?? {};

    const cityLabel = props.isCompanyDetails ? 'Company City' : 'Lead City';
    const stateLabel = props.isCompanyDetails ? 'Company State' : 'Lead State';
    const postcodeLabel = props.isCompanyDetails ? 'Company Postcode' : 'Lead Postcode';
    const timezoneLabel = props.isCompanyDetails ? 'Company Timezone' : 'Lead Timezone';

    return <div className='contact-details'>
        <div className='contact-details-grid'>
            {props.emailRequired && <div className='email input-wrapper'>
                <Input label='Email'
                    name={`data.email`}
                    value={props.data.email}
                    onChange={props.onChange}
                    viewMode={props.viewMode}
                    error={props.error[`${props.name}.email`]}
                />
            </div>}

            {props.addressRequired && (
                <div className='address input-wrapper'>
                    <Input label='Address'
                        name={`${props.name}.${addressName}.basic_info`}
                        value={addressData.basic_info}
                        onChange={props.onChange}
                        viewMode={props.viewMode}
                        error={props.error[`${props.name}.${addressName}.basic_info`]}
                    />
                </div>
            )}

            <div className='city input-wrapper'>
                <Input label={cityLabel}
                    name={`${props.name}.${addressName}.locality`}
                    value={addressData.locality}
                    onChange={props.onChange}
                    viewMode={props.viewMode}
                    error={props.error[`${props.name}.${addressName}.locality`]}
                />
            </div>

            <div className='state input-wrapper'>
                <SelectField label={stateLabel}
                    options={commonData?.level_1_sub_divisions
                        ? getOptions(commonData.level_1_sub_divisions, 'name', 'id')
                        :  []
                    }
                    name={`${props.name}.${addressName}.id_level_1_sub_division`}
                    value={addressData.id_level_1_sub_division}
                    onChange={props.onChange}
                    viewMode={props.viewMode}
                    error={props.error[`${props.name}.${addressName}.id_level_1_sub_division`]}
                />
            </div>

            <div className='postcode input-wrapper'>
                <Input label={postcodeLabel}
                    name={`${props.name}.${addressName}.pincode`}
                    value={addressData.pincode}
                    onChange={props.onChange}
                    viewMode={props.viewMode}
                    error={props.error[`${props.name}.${addressName}.pincode`]}
                />
            </div>

            {props.timezoneRequired && (
                <div className='timezone input-wrapper'>
                    <Input label={timezoneLabel}
                        name={`${props.name}.timezone`}
                        value={addressData.timezone}
                        onChange={props.onChange}
                        viewMode={props.viewMode}
                        error={props.error[`${props.name}.timezone`]}
                    />
            </div>
            )}

            {props.phoneRequired && (
               <PhoneNumber />
            )}

        </div>
    </div>
}

function FormModal(props) {
    return <div className='form-modal'>
        <Modal
            title={props.title}
            className={props.className}
            toggleModal={props.toggleModal}
        >
            {props.children}
            <div className='form-actions'>
                <div className='form-actions-left'>
                    {props.title === 'Edit' &&
                    //props.deleteAction &&
                     (
                        <button
                            className='button danger-button'
                            //onClick={e => props.deleteAction(e)}
                            onClick={(e) => props.deleteAction && props.deleteAction(e)}
                        >
                            Delete
                         </button>
                    )}
                </div>
                <div className='form-actions-right'>
                    {(props.cancelAction) && <button
                        className='button secondary-button cancel-action-button'
                        onClick={e => props.cancelAction(e)}
                    >
                        Cancel
                    </button>}
                    {(props.submitActionText && props.submitAction) && <button
                        className='button primary-button submit-action-button'
                        onClick={e => props.submitAction(e)}
                    >
                        {props.submitActionText}
                    </button>}
                </div>
            </div>
        </Modal>
    </div>
}

export {
    Section,
    Sections,
    WeekView,
    FormModal,
    YearFilter,
    DateFilter,
    ComingSoon,
    SubSection,
    PageTopRow,
    FormActions,
    DangerZone,
    AMPMToggle,
    ContactDetails,
    DangerZoneItem,
    NavigationPanel,
    UnsavedDataBanner,
    PhoneNumber,
}

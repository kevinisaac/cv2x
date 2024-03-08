import React, { useState, useEffect, useContext, useRef, useMemo } from 'react';
import { Link, Redirect, NavLink } from 'react-router-dom';
import { useAlert } from 'react-alert';

import {
    copy,
    request,
    getTime,
    byString,
    ancestorHasClass,
    getNestedValue,
} from 'src/helpers';
import { useToggle, useCollection } from 'src/hooks';
import { Input, DateField } from 'src/components/form';
import BarChart from 'src/components/barChart';

import Calendar from './calendar';
import Modal from './modal';
import Paginator from './paginator';
import Table from './table';
import moment from 'moment';

import Header from './header';
import Sidebar from './sidebar';

import {
    PageTopRow,
    NavigationPanel,
    VersionHistory,
    Sections,
    Section,
    SubSection,
} from './outreachComponents'



function NotFoundView(props) {
    return <div className='not-found-view'>
        <div className='number'>404</div>
        <div className='text'>Page not found</div>
        <Link to='/' className='home-link'>
            Go Home
        </Link>
    </div>
}

function PageSectionTitle(props) {
    return <div className='page-section-title'>
        {props.name}
    </div>
}

function Footer(props) {
    return <div className='footer'>
        test
    </div>
}


function PlaceholderBox(props) {
    let classes = 'placeholder-box';
    if (props.circle) {
        classes += ' circle';
    }

    if (props.className) {
        classes += ' ' + props.className;
    }

    return <div className={classes}
        style={{
            width: props.width || props.size || undefined,
            height: props.height || props.size || undefined,
        }}
    />
}


/* Used by react-alert */
function AlertTemplate(props) {
    /* props.options.type = 'success', 'error', etc. */

    return <div className={`alert-template ${props.options.type}`}>
        {props.options.type === 'success'
            ? <Icon path='success-alert.svg' size={18} />
            : <Icon path='error-alert.svg' size={18} />
        }

        <div className='alert-message'>
            {props.message}
        </div>

        <button className='cobb alert-close' onClick={props.close}>
            {props.options.type === 'success'
                ? <Icon path='x-alert-green.svg' size={9} />
                : <Icon path='x-alert-red.svg' size={9} />
            }
        </button>
    </div>
}


function Icon(props) {
    let width, height;
    let tooltipClass;

    if (props.size) {
        width = height = props.size;
    } else if (props.width || props.height) {
        if (props.width) {
            width = props.width;
        }

        if (props.height) {
            height = props.height;
        }
    } else {
        width = height = 12;
    }

    if (props.tooltip) {
        tooltipClass
            = 'icon-tooltip'
            + (props.tooltipClass ? ' ' + props.tooltipClass : '');
    }

    return <div className='icon'>
        <div onClick={props.onClick}
            className={`icon-image ${props.className || ''}`}
            style={{
                width: width ? width + 'px' : undefined,
                height: height ? height + 'px' : undefined,
                backgroundImage:
                    `url(/static/images/icons/${props.path ? props.path : 'placeholder.svg'})`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'center',
                backgroundSize: `${width}px ${height}px`,
                ...props.style,
            }}
        >
        </div>
        {props.tooltip && <div className={tooltipClass}>
            {props.tooltip}
        </div>}
    </div>
}



function ButtonGroup(props) {
    return <div className={`button-group ${props.className || ''}`}>
        {props.children}
    </div>
}

function Button(props) {
    let className;

    if (props.type ===  'danger') {
        className = 'danger-button';
    } else if (props.type === 'danger-2') {
        className = 'danger-2-button';
    } else if (props.type === 'secondary') {
        className = 'secondary-button';
    } else if (props.type === 'secondary-2') {
        className = 'secondary-2-button';
    }
    else {
        className = 'primary-button';
    }

    if (props.className) {
        className += ' ' + props.className;
    }

    return <button className={`button ${className}`}
        onClick={e => {
            e.preventDefault();
            props.onClick();
        }}
    >
        {props.children}
    </button>
}


function EmptyBox(props) {
    return <div className='empty-box'>
        <div className='empty-content'>
            <Icon size={25}
                path='empty-placeholder-add.svg'
                className='add-icon'
            />
            <div className='empty-placeholder-text'>
                {props.placeholderText}
            </div>
        </div>
        {props.buttonText && <button className='add-new-button primary'>
            {props.buttonText}
        </button>}
    </div>
}

function PopUpBox(props) {
    /*
    pass toggle in the props
    eg. const [ showDiv, toggleShowDiv ] = useToggle(false);
        <PopUpBox toggle={toggleShowDiv}> UI Content </PopUpBox>
    */
    // To close the options when clicking outside
    let ref = useRef();
    // console.log('Use Reference', ref);
    useEffect(() => {
        document.addEventListener('click', onClick);

        return () => document.removeEventListener('click', onClick);
    }, []);

    function onClick(e) {
        e.preventDefault();
        let optionsElement = document.querySelector('.popup-box');
        let inputElement = ref.current;
        // console.log('Input Element', inputElement, optionsElement);
        if (optionsElement && !optionsElement.contains(e.target)
                && !inputElement.contains(e.target)) {
            props.toggle();
        }
    }

    function onCloseButtonClick(e) {
        e.preventDefault();
        props.toggle();
    }

    // console.log('Inside popup box');
    return <div className={`popup-box ${props.className}`} ref={ref}>
        {props.requireCloseButton && <div
            className='close-button'
            onClick={onCloseButtonClick}
        >
            <button>
                <Icon path='close-button.svg' size={10} />
            </button>
        </div>}
        {props.children}
    </div>
}


function DropDown(props) {
    /*
    Example for value input of DropDown component
    const value = [
        {
            name: 'All Staffs',
            value: 'all',
        },
        {
            name: 'Mathew King',
            value: '1',
        },
        {
            name: 'Kevin DeBryune',
            value: '2',
        },
        {
            name: 'John Stones',
            value: '3',
        },
        {
            name: 'Jack Mason',
            value: '4',
        },
    ];
    */
    const [ isExpanded, toggleIsExpanded ] = useToggle(false);
    const [ displayLabel, setDislayLabel ] = useState('');

    useEffect(() => {
        if(props.loaded) {
            /* Set the drop down value only if the value is not initialsed */
            if (props.value === null)
                props.onChange(old => {
                    return props.options!=null
                    ? props.options[0].value
                    : null
                });
            let matchingList = props.options.filter(value => value.value === props.value);
            if(matchingList.length > 0)
                setDislayLabel(matchingList[0].name);
        }
    }, [props.loaded]);

    return (props.loaded && <div className='drop-down' onClick={toggleIsExpanded}>
        <button className='value'>
            {displayLabel}
            <Icon path='drop-down-arrow.svg' width={8} height={4} />
        </button>
        {isExpanded && <PopUpBox toggle={toggleIsExpanded}>
            <div className='options-list'>
                {props.options.map(value => <button
                    className='option'
                    onClick={ () => {
                        console.log('Inside aaaaaaaaaaaaaa', value);
                        props.onChange(value.value)
                        setDislayLabel(value.name);
                    }
                    }
                >
                    {value.name}
                </button>)}
            </div>
        </PopUpBox>}
    </div>)
}

function DragDrop(props) {
    /**
     * Component Props:
     *
     * setFiles (Function, required):
     *   - A function to update the parent component's state with the uploaded files' information.
     *
     * files (Array, required):
     *   - An array of files, initially empty, that will be populated with the uploaded files' information.
     *
     * singleFileUpload (Boolean, optional, default: false):
     *   - Set to true for single file upload use cases like profile pictures or cover images.
     *
     * limit (Number, optional):
     *   - The maximum number of files allowed for uploading. If not provided, there is no limit.
     *
     * placeholderRequired (Boolean, optional, default: false):
     *   - Set to true if a placeholder should be displayed while the file is being uploaded.
     *
     * randomId (String, required,):
     *   - Set to true if a placeholder should be displayed while the file is being uploaded.
     *
     * Usage Example:
     *   const [files, setFiles] = useState([]);
     *   <DragDrop
     *     setFiles={setFiles}
     *     files={files}
     *     singleFileUpload={true}
     *     limit={5}
     *     placeholderRequired={true}
     *   >
     *     UI Content
     *   </DragDrop>
     */
    const alert_ = useAlert();
    const [ drag, setDrag ] = useState(false);

    //Code added to prevent default browser behaviour[opening files]
    function onDragEnter(e) {
        e.preventDefault();
        e.stopPropagation();

        setDrag(true);
    }

    //Code added to prevent default browser behaviour[opening files]
    function onDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    //Code added to prevent default browser behaviour[opening files]
    function onDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();

        setDrag(false);
    }

    function onDrop(e) {
        e.preventDefault();
        e.stopPropagation();

        // Do the count check
        if (props.limit && props.files.length >= props.limit) {
            alert_.error(`Cannot upload more than ${props.limit} files`);
            return;
        }

        setDrag(false);

        if(e.dataTransfer.files &&  e.dataTransfer.files.length > 0) {
            for (let i = 0; i < e.dataTransfer.files.length; i++) {
                const tempFile = e.dataTransfer.files[i];
                const tempId = Math.random();
                let uploadFile = {
                    id: tempId,
                    type: tempFile.type.substring(tempFile.type.lastIndexOf('/')+1),
                    original_name: tempFile.name,
                    loaded: (70 *((tempFile.size/1000000).toFixed(2)))/100,
                    total: (tempFile.size/1000000).toFixed(2),
                };

                if (props.placeholderRequired) {
                    props.setFiles((oldFiles) => {
                        let _new = copy(oldFiles);
                        _new.push(uploadFile);
                        return _new;
                    });
                }


                let data = new FormData();
                data.append('files', e.dataTransfer.files[i]);

                request.postFormFiles('files', data,
                    (successStat, data) => {
                        props.setFiles((old_) => {
                            let new_ = copy(old_);
                            if (props.placeholderRequired) {
                                let index = new_.map(file => file.id).indexOf(tempId);
                                let temp = new_.splice(index, 1);
                            }

                            new_.push({
                                id: data.data[0].id,
                                type: data.data[0].type,
                                original_name: data.data[0].original_name,
                                path: data.data[0].path,
                                loaded: (tempFile.size/1000000).toFixed(2),
                                total: (tempFile.size/1000000).toFixed(2),
                            });

                            return new_;
                        });
                    },
                    (errorStat, data) => {
                        if (props.placeholderRequired) {
                            props.setFiles( old_ => {
                                let new_ = copy(old_);
                                let index = new_.map(file => file.id).indexOf(tempId);
                                let temp = new_.splice(index, 1);

                                return new_;
                            });

                        }
                    },
                );
            }
        }
    }

    function onChange(e) {
        e.stopPropagation();

        // Do the count check
        if (props.limit && props.files.length >= props.limit) {
            alert_.error(`Cannot upload more than ${props.limit} files`);
            return;
        }

        const tempFile = e.target.files[0];
        console.log('##File onChange', e.target);
        const tempId = Math.random();
        let uploadFile = {
            id: tempId,
            type: tempFile.type.substring(tempFile.type.lastIndexOf('/')+1),
            original_name: tempFile.name,
            loaded: (70 *((tempFile.size/1000000).toFixed(2)))/100,
            total: (tempFile.size/1000000).toFixed(2),
        };

        if (props.placeholderRequired) {
            props.setFiles((oldFiles) => {
                let _new = [];
                if (!props.singleFileUpload) {
                    _new = copy(oldFiles);
                    _new.push(uploadFile);
                } else {
                    _new.push(uploadFile);
                }
                return _new;
            });
        }


        let data = new FormData();
        data.append('files', e.target.files[0]);
        request.postFormFiles(props.url ?? 'files', data)
            .then(([status_, responsedata]) => {
                if (props.onSuccess) {
                    props.onSuccess(responsedata);
                    return;
                }

                props.setFiles(old_ => {
                    let new_ = copy(old_);
                    if (props.singleFileUpload) {
                        new_ = [];
                    }
                    if (props.placeholderRequired) {
                        let index = new_.map(file => file.id).indexOf(tempId);
                        let temp = new_.splice(index, 1);
                    }

                    new_.push({
                        id: responsedata.data[0].id,
                        type: responsedata.data[0].type,
                        path: responsedata.data[0].path,
                        original_name: responsedata.data[0].original_name,
                        loaded: (tempFile.size/1000000).toFixed(2),
                        total: (tempFile.size/1000000).toFixed(2),
                    });

                    return new_;
                });
            })
            .catch(([errorStat, response]) => {
                // To delete the progres placeholder if file upload is not successfull
                console.log('Error', response);
                alert_.error(response.message);
                // if (props.placeholderRequired) {
                //     props.setFiles( old_ => {
                //         let new_ = copy(old_);
                //         let index = new_.map(file => file.id).indexOf(tempId);
                //         let temp = new_.splice(index, 1);
                //
                //         return new_;
                //     });
                // }
            });
    }

    return <div className='drag-drop'
        onDragEnter={(e) => onDragEnter(e)}
        onDragOver={(e) => onDragOver(e)}
        onDragLeave={(e) => onDragLeave(e)}
        onDrop={(e) => onDrop(e)}
    >
        <input type='file'
            className='input-file'
            id={`file-drag-upload-${props.randomId}`}
            onChange={onChange}
        />
        <label className='file-drag-upload' htmlFor={`file-drag-upload-${props.randomId}`}>
            {props.children}
        </label>
    </div>
}

function Image(props) {
    let width, height;
    let tooltipClass;

    if (props.size) {
        width = height = props.size;
    } else if (props.width || props.height) {
        if (props.width) {
            width = props.width;
        }

        if (props.height) {
            height = props.height;
        }
    }

    if (props.tooltip) {
        tooltipClass
            = 'image-tooltip'
            + (props.tooltipClass ? ' ' + props.tooltipClass : '');
    }

    return <div className={`image ${props.className || ''}`}
        style={{
            width: width ? width + 'px' : undefined,
            height: height ? height + 'px' : undefined,
            ...props.style,
        }}
    >
        <img
            src={`url(/static/images/icons/${props.path ? props.path : 'placeholder.svg'})`}
            style={{
                width: width ? width + 'px' : undefined,
                height: height ? height + 'px' : undefined,
            }}
        />
        {props.tooltip && <div className={tooltipClass}>
            {props.tooltip}
        </div>}
    </div>
}

function ToastMessage(props) {
    /*
     * props: className, timeout, enableClose
     */
    const myDiv = document.getElementById('toast-message');
    const className= props.className;

    setTimeout(function() {
      closeMessage();
    }, 5000);

    function closeMessage() {
        myDiv.remove();
    }

    return <div id='toast-message' className={props.className}>
        Test
    </div>
}


function KeyValueTooltip(props) {
    /*
    const items = [
        {
            key: [
                { label: 'First', style: { color: 'red', fontWeight: 'bold' } },
                { label: ' Key', style: { color: 'blue' } }
            ],
            value: [
                { label: 'First', style: { color: 'green' } },
                { label: ' Value', style: { fontStyle: 'italic' } }
            ]
        },
        {
            key: [
                { label: 'Second', style: { color: 'purple', fontWeight: 'bold' } },
                { label: ' Key', style: { color: 'orange' } }
            ],
            value: [
                { label: 'Second', style: { color: 'pink' } },
                { label: ' Value', style: { textDecoration: 'underline' } }
            ]
        },
    ];
    * */
    return <>
        {props.items.map((keyValue, index) => <div
            className='key-value'
        >
            <div className='tooltip-key'>
                {keyValue.key.map((keyPart, index) => <span style={keyPart.style}>
                    {keyPart.label}
                </span>)}
            </div>

            <div className='tooltip-seperator'>:</div>

            <div className='tooltip-value'>
                {keyValue.value.map((valuePart, index) => <span style={valuePart.style}>
                    {valuePart.label}
                </span>)}
            </div>
        </div>)}
    </>
}

function Tooltip(props) {
    return <div className='tooltip' style={props.style}>
        {props.children}
    </div>
}

function SearchSuggestion(props) {
    const [filterText, setFilterText] = useState('');

    useEffect(() => {
        setFilterText(props.filterText || '');
    }, [props.filterText]);

    function highlightMatches(text) {
        const filterTextChars = filterText.toLowerCase().split('');
        const textChars = text.split('');

        return textChars.map((character, index) => {
            let className = 'suggestion-character';
            if (filterTextChars.length > 0 && filterTextChars[0] === character.toLowerCase()) {
                className += ' match';
                filterTextChars.splice(0, 1);
            }

            if (character === ' ') {
                return <span className={className} key={index}>&nbsp;</span>;
            }
            return <span className={className} key={index}>{character}</span>;
        });
    }

    function getDisplayContent(suggestionTemplate) {
        // console.log('SearchSuggestion',props.data, suggestionTemplate);
        let displayContent = suggestionTemplate.values.map(data => {
            let labelValue = getNestedValue(props.data, data.name);

            if (data.type === 'date') {
                labelValue = data.dateFormat
                    ? moment(labelValue, 'YYYY-MM-DD').format(data.dateFormat)
                    : moment(labelValue, 'YYYY-MM-DD').format('YYYY-MM-DD')
                ;
            }

            if (data.defaultValue && (labelValue === undefined || labelValue === null)) {
                labelValue = data.defaultValue;
            }

            return labelValue;
            // if (data.disableHighlight) {
                // return labelValue;
            // } else {
                // return highlightMatches(labelValue);
            // }
        });
        let displayContentString = displayContent.join(props.data.valuesSeperator ?? ' ');
        if (suggestionTemplate.disableHighlight) {
            return displayContentString;
        } else {
            // console.log('getDisplayContent', displayContent);
            return highlightMatches(displayContentString);
        }
        // return displayContent.join(' ');
        // return displayContent;
    }

    return <button className='search-suggestion'
        onClick={e => {
            e.preventDefault();
            props.onClick(props.data.id);
        }}
    >
        <div className='suggestion-row-1'>
            {props.topLeft && <div className='suggestion-top-left'>
                {getDisplayContent(props.topLeft)}
            </div>}
            {props.topRight && <div className='suggestion-top-right'>
                {getDisplayContent(props.topRight)}
            </div>}
        </div>

        <div className='suggestion-row-2'>
            {props.bottomLeft && <div className='suggestion-bottom-left'>
                {getDisplayContent(props.bottomLeft)}
            </div>}
            {props.bottomRight && <div className='suggestion-bottom-right'>
                {getDisplayContent(props.bottomRight)}
            </div>}
        </div>
    </button>
}

function DemoPictureUpload(props) {
    const alert_ = useAlert();
        // const [ dp, setDp ] = useState();

    function onFileUpload(e) {
        let data = new FormData();
        data.append('files', e.target.files[0]);

        request.postFormFiles('files', data)
            .then(([status_, responseData]) => {
                props.setValue(old_ => {
                    let new_ = copy(old_);
                    // console.log('New_:: before',old_,  new_, new_.data.id_profile_picture, props.name);
                    byString(new_, props.name, responseData.data[0]);
                    // console.log('New_:: after', new_, new_.data.id_profile_picture);
                    return new_;
                });
                // if (props.setDp) {
                //     props.setDp(data.data[0]);
                // }

                return [status_, responseData];
            })
            .then(([status_, responseData]) => {
                console.log('Input', status_, responseData);
                props.afterUpload(responseData);
            })
            .catch(([errorStat, response]) => {
                console.error('Error while uploading', response.message);
                alert_.error(response.message);
            });
    }

    return <div className='profile-picture-upload'>
        <input
            type='file'
            id='input-demo-upload'
            onChange={onFileUpload}
        />
        <label htmlFor='input-demo-upload' className='profile-upload-label'>
            <div className='title'>{props.label || 'Demo Picture'}</div>
            {props.value?.id && <img src={props.value.path} className='profile-dp' />}
            {!props.value?.id && <img src='/static/images/headshot-placeholder.png' className='profile-dp' />}
            <div className='action-label'>
                Upload
            </div>
        </label>
    </div>
}

function CompanyPictureUpload(props) {
    const alert_ = useAlert();
        // const [ dp, setDp ] = useState();

    function onFileUpload(e) {
        let data = new FormData();
        data.append('files', e.target.files[0]);

        request.postFormFiles('files', data)
            .then(([status_, responseData]) => {
                props.setValue(old_ => {
                    let new_ = copy(old_);
                    // console.log('New_:: before',old_,  new_, new_.data.id_profile_picture, props.name);
                    byString(new_, props.name, responseData.data[0]);
                    // console.log('New_:: after', new_, new_.data.id_profile_picture);
                    return new_;
                });
                // if (props.setDp) {
                //     props.setDp(data.data[0]);
                // }

                return [status_, responseData];
            })
            .then(([status_, responseData]) => {
                console.log('Input', status_, responseData);
                props.afterUpload(responseData);
            })
            .catch(([errorStat, response]) => {
                console.error('Error while uploading', response.message);
                alert_.error(response.message);
            });
    }

    return <div className='profile-picture-upload'>
        <input
            type='file'
            id='input-company-upload'
            onChange={onFileUpload}
        />
        <label htmlFor='input-company-upload' className='profile-upload-label'>
            <div className='title'>{props.label || 'Company Logo'}</div>
            {props.value?.id && <img src={props.value.path} className='profile-dp' />}
            {!props.value?.id && <img src='/static/images/headshot-placeholder.png' className='profile-dp' />}
            <div className='action-label'>
                Upload
            </div>
        </label>
    </div>
}

function ProfilePictureUpload(props) {
    const alert_ = useAlert();
        // const [ dp, setDp ] = useState();

    function onFileUpload(e) {
        let data = new FormData();
        data.append('files', e.target.files[0]);

        request.postFormFiles('files', data)
            .then(([status_, responseData]) => {
                props.setValue(old_ => {
                    let new_ = copy(old_);
                    // console.log('New_:: before',old_,  new_, new_.data.id_profile_picture, props.name);
                    byString(new_, props.name, responseData.data[0]);
                    // console.log('New_:: after', new_, new_.data.id_profile_picture);
                    return new_;
                });
                // if (props.setDp) {
                //     props.setDp(data.data[0]);
                // }

                return [status_, responseData];
            })
            .then(([status_, responseData]) => {
                console.log('Input', status_, responseData);
                props.afterUpload(responseData);
            })
            .catch(([errorStat, response]) => {
                console.error('Error while uploading', response.message);
                alert_.error(response.message);
            });
    }

    return <div className='profile-picture-upload'>
        <input
            type='file'
            id='input-profile-upload'
            onChange={onFileUpload}
        />
        <label htmlFor='input-profile-upload' className='profile-upload-label'>
            <div className='title'>{props.label || 'Profile Photo'}</div>
            {props.value?.id && <img src={props.value.path} className='profile-dp' />}
            {!props.value?.id && <img src='/static/images/headshot-placeholder.png' className='profile-dp' />}
            <div className='action-label'>
                Upload
            </div>
        </label>
    </div>
}

export {
    /* Common components */
    Icon,
    Image,
    Table,
    Modal,
    Button,
    Tooltip,
    KeyValueTooltip,
    PopUpBox,
    DropDown,
    DragDrop,
    Calendar,
    BarChart,
    Paginator,
    ButtonGroup,
    NotFoundView,
    // InputWithIcon,
    PlaceholderBox,
    ProfilePictureUpload,

    /* Layout components */
    Header,
    Sidebar,
    PageSectionTitle,
    Footer,

    /* Page content related components */
    EmptyBox,
    AlertTemplate,
    SearchSuggestion,

    /*Common Inputs*/
    Input,

    ToastMessage,
}


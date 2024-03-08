import React, { useState, useEffect, useContext, useRef } from 'react';

import { useCollection } from 'src/hooks';
import { LanguageContext, trl } from 'src';
import { Calendar, Icon, SearchSuggestion, DragDrop} from 'src/components';
import { equal,
    getRandomString,
    toLower,
    getNestedValue,
    copy,
    getOptions,
    request,
    byString,
    copyToClipboard,
} from 'src/helpers';
import { useToggle } from 'src/hooks';
import moment from 'moment';


// NOTE: Memoing fields don't rerender them if a prop function uses a prop
// inside the parent component and that prop changes
// Already faced the issue with toggleAllRowSelection checkbox

const DateField = React.memo(props => {
    // If `props.time` is set to true, the field is assumed to be a
    // datetime field and the time input is taken into account for handling
    //
    const [ selectedDate, setSelectedDate ] = useState(props.value || null);

    // Note: Passing a function as an argument to useState gets executed without
    // having to call the function: https://github.com/facebook/react/issues/15209
    const [ enteredDate, setEnteredDate ] = useState(() => {
        let date = moment(props.value);
        if (date.isValid()) {
            return date.format('DD/MM/YYYY');
        }
        return moment().add(1, 'days').format('DD/MM/YYYY')
    });
    const [ enteredTime, setEnteredTime ] = useState(() => {
        let time = moment(props.value);
        if (time.isValid()) {
            return time.format('HH:mm A');
        }
        return '10:00 AM';
    });
    const [ calendarVisible, setCalendarVisible ] = useState(false);

    // To close calendar when clicking outside
    useEffect(() => {
        document.addEventListener('click', onClick);

        return () => document.removeEventListener('click', onClick);
    }, []);

    let errorClass = props.errorMessage ? 'error' : '';

    function toggleCalendar() {
        setCalendarVisible(old => {
            if (old) {
                return false;
            }
            return true;
        });
        // calendarVisible ? setCalendarVisible(false) : setCalendarVisible(true);
    }

    function onClick(e) {
        let calendarElement = document.querySelector('.calendar');
        let calendarInputElement = dateFieldNode.current;

        if (calendarElement && !calendarElement.contains(e.target)
            && !calendarInputElement.contains(e.target)) {
            setCalendarVisible(false);
            console.log('**Inside calendar input', calendarElement, e.target);
        }
    }

    let className = `date-field ${props.className || ''}`;
    if (props.disabled) {
        className += ' disabled'
    }

    let classNameDateInput = 'date-label';
    const dateFieldNode = useRef();

    //Logic to manipulate states based on viewMode
    let displayElement;
    if (!props.viewMode || props.viewMode === 'edit') {
        // Display logic for edit
        displayElement = <>
            {props.label && <label className={`label${props.error ? ' error-label' : ''}`}>
                {props.label}
                {props.required && <span className='required'> *</span>}
            </label>}

            <div className={`date-input ${props.error && 'error'}`}>
                <div className={classNameDateInput || ''}
                    onClick={e => {
                        props.disabled || toggleCalendar();
                    }}
                    disabled={props.disabled}
                >
                    {props.value
                        ? <span className='readable-date input-display-text'>
                            {props.datetime
                                    && moment(props.value).format('MMMM Do, YYYY, h:mm a')
                                    || moment(props.value).format('MMM D, YYYY')
                            }
                        </span>
                        : <span className='placeholder'>
                            {props.placeholder ? props.placeholder : ''}
                        </span>
                    }

                    <Icon
                        path={props.iconPath || 'calendar.svg'}
                        width={14}
                        height={15}
                    />
                </div>

                {calendarVisible && <Calendar className='calendar'
                    value={props.value}
                    selectedDate={selectedDate}
                    setSelectedDate={setSelectedDate}
                    enteredDate={enteredDate}
                    setEnteredDate={setEnteredDate}
                    enteredTime={enteredTime}
                    setEnteredTime={setEnteredTime}
                    onChange={props.onChange}
                    setCalendarVisible={setCalendarVisible}
                    datetime={props.datetime}   // Whether to get the time along with the date or not
                    disableBefore={props.disableBefore}
                    disableAfter={props.disableAfter}
                />}

                <input type='text' autoComplete='off'
                    style={{display: 'none'}}
                    className={`date-text-input`}
                    name={props.name}
                    value={props.value || ''}
                    onChange={props.onChange}
                    // onFocus={showCalendar}
                />
            </div>

            {props.error && <span className='error-message'>
                {props.error}
            </span>}

            {props.success && <span className='succes-message'>
                {props.success}
            </span>}
        </>
    } else {
        // Dispaly logic for read state
        displayElement = <>
            {props.label && <label className='read-state-label'>
                {props.label}
                {props.required && <span className='required'> *</span>}
            </label>}
            <div className='read-state-value'>
                {props.value ? moment(props.value, 'YYYY-MM-DD').format('MMM DD, YYYY') : '-'}
            </div>
        </>
    }

    return <div className={className} ref={dateFieldNode}>
        {displayElement}
    </div>
}, equal);

const FileField = React.memo(props => {
    const [ randomId , setRandomId ] = useState(getRandomString());

    let displayElement;

    if (!props.viewMode || props.viewMode === 'edit') {
        displayElement = <div className={`file-field ${props.className || ''}`}>
            {props.label && <label className='label'>
                {props.label}
                {props.required && <span className='required'> *</span>}
            </label>}

            <DragDrop
                randomId={randomId}
                files={props.files}
                setFiles={props.setFiles}
                singleFileUpload={true}
            >
                <div className='file-field-input'>
                    {(((props.files?.length ?? 0) === 0) && props.placeholder) && <div
                        className='file-field-placeholder'
                    >
                        {props.placeholder || ''}
                    </div>}
                    {((props.files?.length ?? 0) > 0) && <div className='file-name'>
                        {props.files[0].original_name}
                    </div>}
                    <div className='file-attach-icon'>
                        <Icon path='file-clip.svg' width={14} height={15} />
                    </div>
                </div>
            </DragDrop>

            {!props.pure && <span className='error-message'>
                {props.errorMessage}
            </span>}

            {!props.pure && <span className='succes-message'>
                {props.successMessage}
            </span>}
        </div>
    } else {
        if ( props.files.length > 0 ) {
            console.log('##Else', props.files[0],
                props.files[0].original_name,
                props.files[0].path,
                props.files[0].path.split('/').slice(-1)[0])
        }
        displayElement = <div className={`read-file-field ${props.className || ''}`}>
             {props.label && <label className='read-state-label'>
                {props.label}
                {props.required && <span className='required'> *</span>}
            </label>}

            {( ((props.files?.length ?? 0) === 0) && props.placeholder)
                 && <div className='read-file-field-placeholder'>
                -
            </div>}

            {((props.files?.length ?? 0) > 0) && <div>
                <a href={props.files[0].path}
                    className='read-file-name'
                    target='_blank'
                >
                    {props.files[0].original_name ?? props.files[0].path.split('/').slice(-1)[0]}
                </a>
            </div>}
        </div>
    }

    return displayElement;
}, equal);

const Input = React.memo(props => {
    const textAreaRef = useRef();
    const hiddenDivRef = useRef();
    let displayElement;

    useEffect(() => {
        if (props.autoResize) {
            let textArea = textAreaRef.current;
            let hiddenDiv = hiddenDivRef.current;

            // textArea.style.resize = 'none';
            textArea.style.overflow = 'hidden';

            // Add the same content to the hidden div
            let value = props.value || '';
            hiddenDiv.innerHTML = value || 'a';
            if (value[value.length - 1] == '\n') {
                hiddenDiv.innerHTML = value + 'a';
            }

            // Briefly make the hidden div block but invisible
            // This is in order to read the height
            hiddenDiv.style.visibility = 'hidden';
            hiddenDiv.style.display = 'block';
            // console.log(
            // 'Hidden Div height:',
            // hiddenDiv.offsetHeight,
            // );
            textArea.style.height = hiddenDiv.offsetHeight + 'px';

            // Make the hidden div display:none again
            hiddenDiv.style.visibility = 'visible';
            hiddenDiv.style.display = 'none';
        }
    }, [ props.value ]);

    let inputElement;
    if (props.type === 'textarea') {
        inputElement = <>
            <textarea {...props}
                ref={textAreaRef}
                className={`input-element input-display-text ${props.error && 'error'}`}
                name={props.name}
                value={props.value}
                onChange={props.onChange}
            >
                {props.value}
            </textarea>

            {/* Used for textarea autoresize
                - https://www.impressivewebs.com/textarea-auto-resize/ */}
            {props.autoResize && <div ref={hiddenDivRef}
                className='hidden-div'
            />}
        </>
    } else {
        let searchStr;
        let options = props.options || [];
        let className = 'input-element-wrapper';
        if (props.error) {
            className += ' error';
        }
        if (props.disabled) {
            className += ' disabled';
        }

        inputElement = <div className={className}>
            {props.prefixIconPath && <Icon path={props.prefixIconPath}
                className='prefix'
                size={15}
            />}

            <input {...props}
                type={props.type}
                className={`input-element input-display-text ${props.error && 'error'}`}
                name={props.name}
                value={props.value}
                onChange={props.onChange}
                disabled={!!props.disabled}
            />

            {props.suggest && props.value && <div className='suggestions'>
                {options.map(option => <button
                    type='button'
                    className='cobb suggestion'
                    onClick={e => props.onOptionSelect(e, option)}
                >
                    {(searchStr = toLower(String(props.value)).split('')) && ''}
                    {option.name.split('').map((letter, index) => {
                        let className = 'suggestion-character';
                        if (searchStr.length > 0 && searchStr[0] === toLower(letter)) {
                            className += ' match';
                            searchStr.splice(0, 1);
                        }

                        return <span className={className}>{letter}</span>
                    })}
                </button>)}
            </div>}

            {props.postfixText && <span className='input-inside-right'>
                {props.postfixText}
            </span>}

            {props.postfixIconPath && <Icon path={props.postfixIconPath}
                onClick={props.onPostfixClick}
                className='postfix'
                size={12}
            />}
        </div>
    }

    let className = 'input';
    if (props.className) {
        className += ' ' + props.className;
    }
    if (props.type==='textarea') {
        className += ' textarea';
    }

    if (!props.viewMode || props.viewMode === 'edit') {
        //Display logic for edit
        displayElement = <>
            {props.label && <label className={`label${props.error ? ' error-label' : ''}`}>
                {props.label}
                {props.required && <span className='required'> *</span>}
            </label>}

            {inputElement}

            {!props.pure && <span className='error-message'>
                {props.error}
            </span>}
            {!props.pure && <span className='success-message'>
                {props.success}
            </span>}
        </>
    } else {
        //Dispaly logic for read state
        displayElement = <>
            {props.label && <label className='read-state-label'>
                {props.label}
                {props.required && <span className='required'> *</span>}
            </label>}
            <div className='read-state-value' onClick={e => copyToClipboard(props.value)}>
                {props.value ? props.value : '-'}
            </div>
        </>
    }

    return <div className={className}>
        {displayElement}
    </div>
}, equal);

const RadioField = React.memo(props => {
    // For reference
    // const options = [
    //     { value: 'male', label: 'Male' },
    //     { value: 'female', label: 'Female' },
    //     { value: 'other', label: 'Other' },
    // ];

    let radioOptions = props.options.map((option, index) => {
        let checked;
        if (props.value && Array.isArray(props.value)) {
            checked = props.value.includes(option.value);
        } else {
            checked = props.value == option.value;
        }

        return <label key={option.value}>
            <input type='radio'
                name={props.name}
                value={option.value}
                checked={checked}
                onClick={props.onChange}
                onChange={e => e}
                data-value={Array.isArray(props.value)
                    ? props.value.join()
                    : props.value
                }
                data-multi={Array.isArray(props.value)}
                className={checked ? 'checked' : ''}
            />
            {/* <span className='label-text'>{option.name || option.label}</span> */}
            {/* For custom radio button */}
            <span className='checkmark'>
                <div className='selection-circle'>
                    <div className='selected'></div>
                </div>
                <span className='label-text'>{option.name || option.label}</span>
            </span>
        </label>
    });

    if (props.viewMode && props.viewMode === 'read') {
        radioOptions = props.options.map((option, index) => {
        let checked;
        if (props.value && Array.isArray(props.value)) {
            checked = props.value.includes(option.value);
        } else {
            checked = props.value == option.value;
        }

        return <label key={option.value}>
            <input type='radio'
                name={props.name}
                value={option.value}
                checked={checked}
                onChange={e => e}
                data-value={Array.isArray(props.value)
                    ? props.value.join()
                    : props.value
                }
                data-multi={Array.isArray(props.value)}
                className={checked ? 'checked' : ''}
            />
            {/* <span className='label-text'>{option.name || option.label}</span> */}
            {/* For custom radio button */}
            <span className='checkmark'>
                <div className='selection-circle'>
                    <div className='selected'></div>
                </div>
                <span className='label-text'>{option.name || option.label}</span>
            </span>
        </label>
    });
    }

    return <span className={`radio-field ${props.className || ''}`}>
        <label className={`label${props.error ? ' error-label' : ''}`}>
            {props.label}
            {props.required && <span className='required'> *</span>}
        </label>
        <div className='radio-options'>
            {radioOptions}
        </div>
        <span className='error-message'>{props.errorMessage}</span>
        <span className='succes-message'>{props.successMessage}</span>
    </span>
}, equal);

const DropDownMultiSelect = (props) => {
    /*
      DropDownMultiSelect Component Props:

      1. className (optional): A string representing additional CSS classes to be added to the component's root element for customizing its appearance.

      2. placeholder (optional): A string representing the placeholder text to be displayed when no options are selected.

      3. value (required): An array containing the currently selected option values.

      4. options (required): An array of objects, where each object has a 'name' and a 'value' property. The 'name' property is the display text of the option, and the 'value' property is its unique identifier.

      5. setValue (required): A callback function used to update the 'value' prop with the new array of selected option values.

      6. label (optional): A string representing the label for the DropDownMultiSelect component.

      7. required (optional): A boolean indicating whether the selection is required for the form or not. If true, a red asterisk (*) will be displayed next to the label.

      8. onChange (required): A callback function called when an option is selected or deselected. This function should handle the change in selected options and update the component's state accordingly.
    */

    /*
        To-Do: Integrate with existing useForm()
    */

    const [ showOptions, toggleShowOptions, setShowOptions ] = useToggle(false);
    let displayValue = '';
    let className = `drop-down-multiselect${' ' + props.className}`;


    // To close the options when clicking outside
    let ref = useRef();
    useEffect(() => {
        if (showOptions) {
            document.addEventListener('click', onClick);

            return () => document.removeEventListener('click', onClick);
        }
    }, [showOptions]);

    function onClick(e) {
        e.preventDefault();
        let optionsElement = document.querySelector('.options');
        let inputElement = ref.current;

        if (optionsElement && !optionsElement.contains(e.target)
                && !inputElement.contains(e.target)) {
            setShowOptions(false);
        }
    }

    function onSelectAllClick(e) {
        // e.preventDefault();
        /* Need the setData() for select all*/
        props.setData(old => {
            let new_ = copy(old);

            byString(new_,
                props.name,
                props.options.map(option => option.value)
            );

            return new_;
        })
    }

    function onClearAllClick(e) {
        /* Need the setData() for select all*/
        props.setData(old => {
            let new_ = copy(old);

            byString(new_, props.name, []);

            return new_;
        })
    }

    // Logic for displayValue
    if (props.value.length === 0) {
        displayValue = props.placeholder || 'Select Values';
    } else if (props.value.length === 1) {
        displayValue = props.options.find(element => element.value == props.value[0])?.name ?? 'Loading..';
    } else if (props.value.length > 1) {
        displayValue = (props.options
            .find(element => element.value == props.value[0])?.name ?? 'Loading..')
            + ` + ${props.value.length - 1}`;
    }

    function toggleOption(value) {
        let index = props.value
            .map(element => element).indexOf(value);
        if(index === -1) {
            props.setValue(oldValue => [...oldValue, value]);
        }else {
            props.setValue(oldValue => {
                let tempList = [...props.value];
                tempList.splice(index, 1);
                return [...tempList];
            });
        }
    }
    let tempList = [...props.value];
    function toggleOptionTemp(value) {
        // let tempList = [...props.value];
        let index = tempList
            .map(element => element).indexOf(value);
        if(index === -1) {
            return tempList = [...tempList, value];
        }else {
            return tempList.splice(index, 1);
        }
    }

    let displayContent;
    if (!props.viewMode || props.viewMode === 'edit') {
        displayContent = <>
            <label className='label' htmlFor='drop-down-multiselect'>
                {props.label}
                {props.required && <span className='required'> *</span>}
            </label>
            <div className='options-selected-wrapper' onClick={toggleShowOptions}>
                <div className='option-selected'>{displayValue}</div>
                <div className='drop-down-arrow'>
                    <Icon path='line-arrow-down-faded.svg' width={10} height={7}/>
                </div>
            </div>
            {showOptions && <div className='options-container'>
                <div className='options'>
                    {props.options.map(option => <button className='cobb option'
                        data-value={option.value}
                        data-valuearray={props.value}
                        // data-value={tempList}
                        data-name={props.name}
                        onClick={(e) => {
                            // toggleOptionTemp(option.value);
                            return props.onChange(e);
                        }}
                    >
                        {props.value.find(element => element == option.value)
                            && <Icon path='checkbox-checked.svg' size={15} />}

                        {!props.value.find(element => element == option.value)
                            && <Icon path='checkbox-unchecked.svg' size={15} />}

                        <label className='option-label'>{option.name}</label>
                    </button>)}
                </div>
                { props.showBulkActions && <div className='bulk-action-buttons'>
                    <div className='select-all-container'>
                        <button
                            className='select-all-button'
                            onClick={e => onSelectAllClick(e)}
                        >
                            Select All
                        </button>
                    </div>
                    <div className='clear-all-container'>
                        <button
                            className='clear-all-button'
                            onClick={e => onClearAllClick(e)}
                        >
                            Clear All
                        </button>
                    </div>
                </div>}
            </div>}
        </>
    } else {
        let selectedReadValues = props.options
            .filter(element => props.value.includes(element.value))
            .map(element => element.name);
        let displayValue = '-';
        if (selectedReadValues.length > 0 ) {
            displayValue = selectedReadValues.join(', ');
        }

        displayContent = <>
            {props.label && <label className='read-state-label'>
                {props.label}
                {props.required && <span className='required'> *</span>}
            </label>}
            <div className='read-state-value'>
                {displayValue}
            </div>
        </>
    }

    return <div className={className} ref={ref}>
        {displayContent}
    </div>
}

// Not memoing since the indeterminate state is not updated for
// some rows selection if memoed
// Update: No indeterminate state required for this M5 Dashboard, so memoing
const Checkbox = React.memo(props => {
    let displayElement;
    if (!props.viewMode || props.viewMode === 'edit') {
        //Display logic for edit
        displayElement = <>
            {props.label && <label className='label'>
                {props.label}
            </label>}

            <label className='checkbox-inner'>
                <input type='checkbox'
                    name={props.name}
                    checked={props.checked}
                    onChange={props.onChange}
                    // ref={props.inputRef}
                    data-value={props.value} //To add support CheckboxGroup
                    disabled={props.disabled}
                />

                {/* For custom radio button */}
                <span className='checkmark'>
                    <span className='checkmark-inner'></span>
                </span>

                {props.labelText && <div className='label-text'>
                    <span>{props.labelText}</span>
                </div> }
            </label>

            {props.errorMessage && <span className='error-message'>{props.errorMessage}</span>}
            {props.successMessage && <span className='succes-message'>{props.successMessage}</span>}
        </>
    } else {
        //Dispaly logic for read state
        displayElement = <>
            {props.label && <label className='read-state-label'>
                {props.label}
                {props.required && <span className='required'> *</span>}
            </label>}
            <label className='checkbox-inner checkbox-inner-read-state'>
                <input type='checkbox'
                    name={props.name}
                    checked={props.checked}
                    // ref={props.inputRef}
                    data-value={props.value} //To add support CheckboxGroup
                />

                {/* For custom radio button */}
                <span className='checkmark'>
                    <span className='checkmark-inner'></span>
                </span>

                {props.labelText && <div className='label-text'>
                    <span>{props.labelText}</span>
                </div> }
            </label>
        </>
    }

    return <div className={`checkbox-field ${props.className || ''}`} >
        {displayElement}
    </div>
}, equal);

const CheckboxGroup = React.memo(props => {
    /*
     * props: value = []
     *  returnIntegerId = true/false  This ensures that the value which gets converted to string is converted to integer before saving. Set to true by default.
     *The value property should be an array
     */
    let returnIntegerId = props.returnIntegerId  && props.returnIntegerId !== false
        ? props.returnIntegerId
        : true;

    return <div className='checkbox-group'
        data-name={props.name}
        data-value={props.value}
        data-returnintegerd={returnIntegerId}
    >
        {props.options.map((option, index) => {
            let checkboxValue = option.value;

            return <Checkbox
                labelText={option.labelText}
                key={index}
                value={option.value}
                checked={props.value.includes(option.value)}
                onChange={props.onChange}
                viewMode={props.viewMode}
            />
        })}
    </div>
}, equal);

function SearchBox(props) {
    //Additional Sunassit specific styling has been added
    const [ isExpanded, setIsExpanded ] = useState(false);
    const [ filterText, setFilterText ] = useState('');
    const [ suggestionsC, updateSuggestionsC ]
        = useCollection(props.suggestionsURL ?? '',
            `q=${filterText}${props.suggestionsParams ? ('&' + props.suggestionsParams) : ''}`,
            null,
            null,
            null,
            false
        );

    let className = 'search-box';
    let postfixIcon = filterText.length > 0 ? 'x-dark-grey.svg' : 'search.svg';

    //Code to set border of input element if filterText is not empty
    if (filterText.length > 0) {
        className += ' search-box-suggestions-open'
    }

    //Functionality added later to preserve text on clicking more button
    function onPostfixClick(e) {
        setFilterText('');

        let urlSearchParams = new URLSearchParams(props.collection.queryString);
        urlSearchParams.set('q', '');

        props.updateCollection({
            queryString: urlSearchParams.toString(),
        });
    }

    //Functionality added later to preserve text on clicking more button
    useEffect(() => {
        let urlSearchParams = new URLSearchParams(suggestionsC.queryString);
        urlSearchParams.set('q', filterText);

        updateSuggestionsC({
            queryString: urlSearchParams.toString(),
        });

        if (filterText.length > 0) {
            setIsExpanded(true);
        } else if (filterText.length === 0) {
            setIsExpanded(false);
        }
    }, [filterText]);

    //Added to update collection if there are changes to suggestionParams
    useEffect(() => {
        let urlSearchParams = new URLSearchParams();
        urlSearchParams.set('q', filterText);

        updateSuggestionsC({
            queryString: urlSearchParams.toString() + '&' + props.suggestionsParams,
        });
    }, [props.suggestionsParams]);

    //Functionality added later to preserve text on clicking more button
    useEffect(() => {
        let q = new URLSearchParams(props.collection.queryString).get('q');

        if (q) {
            setFilterText(q);
        }

    }, [props.collection.queryString]);
    console.log('##Searchbox', props.suggestionsParams);

    return <div className={className}>
        <Input className={`search-input${filterText.length > 0 ? ' with-data' : ''}`}
            postfixIconPath={postfixIcon}
            placeholder='Search'
            value={filterText}
            onChange={e => {
                setFilterText(e.target.value);
            }}
            onPostfixClick={onPostfixClick}
        />
        {(props.showSuggestions
            && isExpanded
            && (suggestionsC.items?.length ?? 0 > 0))
            ? <div className='search-suggestions'>
                {suggestionsC.items.slice(0,4).map(suggestion => <SearchSuggestion
                    data={suggestion}
                    filterText={filterText}
                    topLeft={props.suggestionData.topLeft}
                    topRight={props.suggestionData.topRight}
                    bottomLeft={props.suggestionData.bottomLeft}
                    bottomRight={props.suggestionData.bottomRight}
                    onClick={props.onSuggestionClick}
                />)}
                {suggestionsC.items.length > 4 && <button
                    className='search-suggestion more-suggestions-button'
                    onClick={e => {
                        e.preventDefault();
                        props.onMoreButtonClick(filterText);
                        setIsExpanded(false);
                        // setFilterText('');
                    }}
                >
                    {`${suggestionsC.items.length} more...`}
                </button>}
            </div>
            : null
        }
        {(props.showSuggestions
            && isExpanded
            && suggestionsC.items.length === 0)
        && <div className='search-suggestions no-suggestions'>
            No suggestions
        </div>}
    </div>
}

const SelectField = React.memo(props => {
    const [ isOn, toggle, setOn ] = useToggle(false);
    const [ optionC, updateOptionC ] = useCollection(null);
    let displayElement;
    let options = props.enableLazyLoadOptions
        ? (optionC.loaded ? getOptions(optionC.items, 'name', 'id') : [])
        : (props.options || [])
    ;

    // To close the options when clicking outside
    useEffect(() => {
        document.addEventListener('click', onClick);

        return () => document.removeEventListener('click', onClick);
    }, []);

    function onClick(e) {
        let optionsElement = document.querySelector('.select-options');
        let selectInputElement = selectFieldNode.current;

        if (optionsElement && !optionsElement.contains(e.target)
            && !selectInputElement.contains(e.target)) {
            setOn(false);
        }
    }

    if (props.enableNoneOption) {
        options = [{
            name: '-----',
            value: 'clear',
        }, ...options];
    }

    let selectedOption;
    if (props.value !== null && props.value !== undefined) {
        selectedOption = options.find(option => option.value === props.value);

        if (props.enableLazyLoadOptions && selectedOption === undefined) {
            request.get(`${props.optionsURL}/${props.value}`)
                .then(([status_, response]) => {
                    let newItems = copy(optionC.items);
                    newItems.push(response.data);
                    updateOptionC({
                        items: newItems,
                    });
                })
            ;
        }
    }


    const [ filterText, setFilterText ] = useState('');

    // Frontend search: New custom search matches if all words in box
    // are found anywhere in the option.label, case in-sensitive
    function customFilter(option, rawInput) {
        const words = rawInput.split(' ');

        if (option.data.searchString) {
            return words.reduce(
                (acc, cur) =>
                acc &&
                option.data.searchString
                .toLowerCase()
                .includes(cur.toLowerCase()),
                true
            );
        }

        if (typeof option.label === 'string') {
            return words.reduce(
                (acc, cur) =>
                acc && option.label.toLowerCase().includes(cur.toLowerCase()),
                true
            );
        }

        if (!rawInput) {
            return true;
        }

        return false;
    }

    const selectFieldNode = useRef();
    let inputClassName = 'select-box-left input-display-text';
    if (filterText) {
        inputClassName += ' filter-text';
    }

    if (selectedOption) {
        inputClassName += ' option-selected';
    }

    // console.log('SelectField', props);

    if (!props.viewMode || props.viewMode === 'edit') {
        //Display logic for edit
        displayElement = <>
            {props.label && <label className={`label${props.error ? ' error-label' : ''}`}>
                {props.label}
                {props.required && <span className='required'> *</span>}
            </label>}

            <div className='select-field-inner'>
                <div className={`select-box ${props.error && 'error'}`}
                    onClick={!props.disabled ? toggle : null}
                >
                    <input {...props}
                        type='text'
                        className={inputClassName}
                        data-test='dropdown-searchable-text-input'
                        value={filterText}
                        onChange={e => {
                            setFilterText(e.target.value);
                            setOn(true);
                        }}
                        placeholder={(selectedOption && selectedOption.name)
                                || props.placeholder
                                || 'Select a value'
                        }
                        autoComplete='off'
                        disabled={props.disabled}
                    />
                    <div className='select-box-right'>
                        <Icon width={10} height={7}
                            path={props.boxRightIcon || 'line-arrow-down-faded.svg'}
                        />
                    </div>
                </div>

                {isOn && <div className='select-options'>
                    {options.length > 0 && options.map((selectOption, index) => {
                        let itemMatches = true;
                        let optionNameCharacters = selectOption.name
                            ? selectOption.name.toString().split('')
                            : [];

                        let filterTextRemainingChars = toLower(filterText).split('');
                        let buttonText = optionNameCharacters.map((character, index) => {
                            let className = 'suggestion-character';
                            // console.log(filterTextChars, filterTextChars[0], character);
                            if (filterTextRemainingChars.length > 0
                                && filterTextRemainingChars[0] === toLower(character)) {
                                className += ' match';
                                filterTextRemainingChars.splice(0, 1);
                            }

                            if (index === optionNameCharacters.length - 1
                                && filterTextRemainingChars.length > 0) {
                                itemMatches = false;
                            }

                            if (character === ' ') {
                                return <span className={className}>
                                    &nbsp;
                                </span>
                            }
                            return <span className={className}>
                                {character}
                            </span>
                        });

                        if (!itemMatches) {
                            return null;
                        }

                        return <button type='button'
                            className='select-option'
                            data-value={selectOption.value}
                            // Since HTML attributes cannot store type, we
                            // have to explicity specify the type here
                            // for useForm to get the value in the proper type
                            data-type={typeof selectOption.value}
                            onClick={e => {
                                props.onChange(e);
                                setOn(false);
                                setFilterText('');
                            }}
                            key={index}
                        >
                            {buttonText}
                        </button>
                    })}
                    {options.length === 0 && <div className='select-options-no-data'>
                        No options available
                    </div>}
                </div>}
            </div>

            {!props.pure && <>
                <span className='error-message'>{props.error}</span>
                <span className='success-message'>{props.success}</span>
            </>}
        </>
    } else {
        const selectedValue = options.find(option => option.value === props.value);
        //Dispaly logic for read state
        displayElement = <>
            {props.label && <label className='read-state-label'>
                {props.label}
                {props.required && <span className='required'> *</span>}
            </label>}
            <div className='read-state-value'>
                {selectedValue?.name ?? '-'}
            </div>
        </>
    }

    useEffect(() => {
        console.log('SelectField LazyLoad useEffect');
        if (props.enableLazyLoadOptions) {
            console.log('$$Inside SelectField lazy load');
            updateOptionC({
                url: props.optionsURL,
                queryString: `${props.optionsURLParams ? props.optionsURLParams+'&' : ''}page_size=10&q=${filterText}`,
            });
        }
    }, [props.enableLazyLoadOptions, filterText]);

    return <div
        className={`select-field ${props.className || ''}${props.disabled && props.viewMode === 'edit' ? 'select-field-disabled' : ''}`}
        name={props.name}
        ref={selectFieldNode}
    >
        {displayElement}
    </div>
}, equal);

const TimeInput = React.memo(props => {
    const [ isOn, toggleIsOn, setIsOn ] = useToggle(false);
    const [ displayTime, setDisplayTime ] = useState(
        moment(props.value, 'HH:mm').isValid()
        ? moment(props.value, 'HH:mm').format(props.format || 'HH:mm')
        : null
    );
    let displayElement;
    let options = [];

    let time = moment().hours(7).minutes(0);
    while (time.isSameOrBefore(moment().hours(18).minutes(0))) { // End time is 5 PM
        options.push({
            name: time.format(props.format || 'HH:mm'),
            value: time.format('HH:mm'),
        });
        time.add(props.customTime ? props.customTime : 15, 'minutes'); // increments by 15 minutes
        // time.add(15, 'minutes'); // increments by 15 minutes
    }

    function onTimeChange(e, source) {
        //If props.format not present it means default value
        if (source === 'input') {
            setDisplayTime(e.target.value);
        } else if (source === 'option-select') {
            setDisplayTime(moment(e.target.value, 'HH:mm').format(props.format || 'HH:mm'));
        }
        props.onChange(e);
    }

    if (!props.viewMode || props.viewMode === 'edit') {
        displayElement = <>
            {props.label && <label className={`label${props.error ? ' error-label' : ''}`}>
                {props.label}
                {props.required && <span className='required'> *</span>}
            </label>}

            <div className={`time-input-display${props.error ? ' error' : ''}`}>
                <div className={`time-input-box`}
                >
                    <input {...props}
                        type='text'
                        className='time-input-field'
                        data-test='dropdown-searchable-text-input'
                        value={displayTime}
                        onChange={e => onTimeChange(e, 'input')}
                        placeholder={ displayTime
                            || props.format
                            || props.placeholder
                            || 'Enter time'
                        }
                        autoComplete='off'
                        disabled={props.disabled}
                    />
                    <div className='time-input-right'
                        onClick={e => toggleIsOn()}
                    >
                        <Icon width={10} height={7}
                            path={props.boxRightIcon || 'line-arrow-down-faded.svg'}
                        />
                    </div>
                </div>

                {isOn && <div className='time-options'>
                    {options.length > 0 && options.map((option, index) => {
                        return <button className='time-option'
                            value={option.value}
                            onClick={e => {
                                // props.onChange(e);
                                onTimeChange(e, 'option-select');
                                setIsOn(false);
                            }}
                        >
                            {option.name}
                        </button>
                    })}
                    {options.length === 0 && <div className='select-options-no-data'>
                        No options available
                    </div>}
                </div>}
            </div>

            {!props.pure && <>
                <span className='error-message'>{props.error}</span>
                <span className='success-message'>{props.success}</span>
            </>}
        </>
    } else {
        //Dispaly logic for read state
        displayElement = <>
            {props.label && <label className='read-state-label'>
                {props.label}
                {props.required && <span className='required'> *</span>}
            </label>}
            <div className='read-state-value'>
                {displayTime}
            </div>
        </>
    }
    // console.log('!!TimeComponent',
        // moment(props.value, 'HH:mm').format('HH:mm'),
        // moment(props.value, 'HH:mm').format(props.format || 'HH:mm'),
        // props.value,
        // displayTime);

    useEffect(() => {
        //TODO: temporary fix
        if (props.viewMode === 'read') {
            setDisplayTime(moment(props.value, 'HH:mm').isValid()
            ? moment(props.value, 'HH:mm').format(props.format || 'HH:mm')
            : null)
        }
    }, [props.value]);

    return <div
        className='time-input'
        name={props.name}
    >
        {displayElement}
    </div>
}, equal);


export {
    Input,
    Checkbox,
    SearchBox,
    DateField,
    FileField,
    RadioField,
    SelectField,
    DropDownMultiSelect,
    CheckboxGroup,
    TimeInput,
}


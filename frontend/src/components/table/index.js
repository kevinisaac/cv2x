import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { useElementVisibility } from 'src/hooks';
import { useAlert } from 'react-alert';

import { LanguageContext, trl } from 'src';
import { MeContext } from 'src/contexts';
import { Icon, Button } from 'src/components';
import { CompositeTextField } from 'src/components/form';
import { copy, byString, equal, request } from 'src/helpers'

import TableRow from './tableRow';
import TableHeaderRow from './tableHeaderRow';
import TableFilterRow from './tableFilterRow';


// export default function Table(props) {
function Table(props) {
    let alert_ = useAlert();
    let navigate = useNavigate();
    // const [ ref, isVisible ] = useElementVisibility();
    // const lang = useContext(LanguageContext);
    let returnItem;
    let tableHeaderClassName;

    //Column Preferences
    const { me, setMe } = useContext(MeContext);
    const [ preferredColumns, setPreferredColumns ] = useState([]);

    const [ sorting, setSorting ] = useState({
        sortedColID: null,
        reverseSorted: false,
    });

    /* Frontend search */
    function filterByColumn(e) {
        // console.log('Filtering by column..');
        var colID = e.target.dataset.colid;

        var cloneItems = [...props.items];
        props.items.filter((row, index) => {
            if (typeof row[colID] === 'number') {
                var normalizedColID = row[colID].toString();
            } else {
                var normalizedColID = row[colID].toLowerCase();
            }

            const isMatch = normalizedColID.search(
                e.target.value.toLowerCase()
            ) !== -1;

            cloneItems[index].display = isMatch ? true : false;
        });
        props.updateCollection({
            items: cloneItems,
        });
    }

    // console.log('Rendering table:', props.items);
    // On Row select - happens with the row or the select checkbox is clicked
    function onCheckboxClick(index) {
        if (props.selectableRows === null || props.selectableRows == undefined) {
            return;
        }

        // -1 = unlimited, 0 = exactly one, etc. _selected is the corresponding property of the item
        // '_' is used to distinguish it from normal data properties
        const selectableRows = props.selectableRows;
        // console.log('On row click:', props.items);

        // NOTE: For some reason, JSON.stringify here was acting very funny
        // the selection was messed up and had to spend 3 hours and all dark thoughts before trying this.
        // Still don't know why that wasn't working given https://stackoverflow.com/questions/38259519/
        props.updateCollection(oldCollection => {
            let newItems = copy(oldCollection.items);

            // Currently selected rows count
            let currentRowSelectionCount = newItems.reduce((count, newItem) => {
                count += newItem._selected ? 1 : 0;
                return count;
            }, 0);

            if (selectableRows === -1) {
                // Unlimited number of rows can be selected
                // Toggle the clicked row
                if (newItems[index]._selected === true) {
                    // console.log('inside first select');
                    newItems[index]._selected = false;
                    currentRowSelectionCount -= 1;
                } else {
                    newItems[index]._selected = true;
                    currentRowSelectionCount += 1;
                }
            } else if (selectableRows === 0) {
                // Exactly 1 row can be selected
                if (!newItems[index]._selected) {
                    // Get the current selected row and remove it's selection
                    newItems.map((newItem) => {
                        if (newItem._selected) {
                            newItem._selected = false;
                            currentRowSelectionCount -= 1;
                        }
                    });

                    // Select the current row
                    newItems[index]._selected = true;
                    currentRowSelectionCount += 1;
                }
            } else {
                // X number of rows max to be selected
                if (newItems[index]._selected) {
                    // Unselect row if already selected
                    newItems[index]._selected = false;
                    currentRowSelectionCount -= 1;
                } else {
                    // Conditionally select row
                    if (currentRowSelectionCount < selectableRows) {
                        newItems[index]._selected = true;
                        currentRowSelectionCount += 1;
                    }
                }
            }

            // Call the side effect
            if (props.onRowSelect) {
                props.onRowSelect(newItems, currentRowSelectionCount);
            }
            return { items: newItems };
        });
    }

    // Any column that is hidden due to user preference is filtered here
    const visibleColumns = props.columns.filter(column => {
        // temporarily disabling by returning true
        return column.visible;
        // return true;
    });
    // To set colSpan for the loaders
    let totalColumns = visibleColumns.length + props.controlColumns.length;
    if (props.selectableRows === -1) {
        totalColumns += 1;
    }

    //Code for updating preferred columns
    useEffect(() => {
        if (me?.preferred_columns) {
            let preferredColumnsTemp = me?.preferred_columns[props.name] ?? null;
            if (preferredColumnsTemp !== null) {
                setPreferredColumns(me.preferred_columns[props.name]);

                props.setColumns(old => {
                    //Below code commented out so that render function is not removed
                    // let new_ = copy(old);

                    old = old.map(column => {
                        if (preferredColumnsTemp.includes(column.id)) {
                            column.visible = true;
                        } else {
                            column.visible = false;
                        }
                        return  column;
                    });

                    return old;
                });
            }
        }
    }, [me]);

    function togglePreferredColumns(e, columnId) {
        let index = preferredColumns.indexOf(columnId);
        let preferredColCopy = copy(preferredColumns);
        let mePreferredColumns = copy(me?.preferred_columns);

        if (index === -1) {
            //Column is not selected. Add it to the preferred columns
            preferredColCopy.push(columnId);
        } else {
            //Column present in preferred column. Remove it from list
            preferredColCopy.splice(index, 1);
        }
        console.log('Outside preferredCOl', preferredColCopy.length, preferredColCopy);
        if (preferredColCopy.length === 0) {
            console.log('Inside preferredCOl');
            alert_.error('Atleast one column should be selected');
            return;
        }

        setPreferredColumns(preferredColCopy);

        props.setColumns(old => {
            //Below code commented out so that render function is not removed
            // let new_ = copy(old);

            old = old.map(column => {
                if (preferredColCopy.includes(column.id)) {
                    column.visible = true;
                } else {
                    column.visible = false;
                }
                return  column;
            });

            return old;
        });

        if (mePreferredColumns) {
            mePreferredColumns[props.name] = preferredColCopy;

            let requestData = {
                data: {
                    preferred_columns: mePreferredColumns,
                }
            }
            // console.log('Table PC useEffect IF', requestData);
            request.patch('me', requestData)
                .then(([status_, response]) => {
                    setMe(old => {
                        let new_ = copy(old);

                        new_.preferred_columns = mePreferredColumns;

                        return new_;
                    });
                });
        }
    }

    // Data rows
    var dataRows = null;
    if (props.loaded) {
        // console.log(props.items);
        dataRows = props.items.map((item, index) => {
            var className = 'row';
            if (item._selected) {
                className += ' selected'
            }

            if (item.is_hidden) {
                className += ' hidden'
            }

            // console.log('----------');
            // console.log(byString(props.items[index], props.keyField) || props.items[index].id.toString());
            // console.log(props.items[index].id.toString());
            // console.log('Table Index', props.items[index]);
            return (
                <TableRow className={className}
                    key={
                        byString(props.items[index], props.keyField)
                            || props.items[index].id.toString()
                    }
                    style={props.getRowStyles && props.getRowStyles(props.items[index])}
                    editable={props.editable}
                    deletable={props.deletable}
                    selectableRows={props.selectableRows}

                    updateRow={props.updateRow}
                    deleteRow={props.deleteRow}

                    index={index}
                    row={props.items[index]}
                    displayRowModifier={props.displayRowModifier}
                    columns={visibleColumns}
                    controlColumns={props.controlColumns}
                    hoverOptions={props.hoverOptions}

                    onClick={props.onRowClick}
                    onCheckboxClick={onCheckboxClick}
                    urlPath={props.urlPath} // Required for URL cells in each row

                    onEditIconClick={props.onEditIconClick}
                    customData={props.customData}

                    collection={props.collection}
                    updateCollection={props.updateCollection}
                    reference={index === (props.items.length-1) ? props.reference : null}
                />
            );
        });

        if (props.getCustomRows) {
            dataRows.push(props.getCustomRows(visibleColumns, props.customData));
        }
    }
    if (!props.loaded) {
        returnItem = <table className={`table table-loader ${props.className ? props.className : ''}`}
            data-test={props['data-test']}
        >
            <thead className='table-header'>
                <tr className='table-loader-header-row'>
                    {[1, 2, 3, 4, 5].map((column, index) => <th className='table-loader-header-data' key={index} />)}
                </tr>
            </thead>
            <tbody className='table-body'>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((row, index) => <tr className='table-loader-row' key={index}>
                    {[1, 2, 3, 4, 5].map((column, colIndex) => <td className='table-loader-data' key={colIndex} />)}
                </tr>)}
            </tbody>
        </table>
    } else if (props.loaded && props.items.length > 0 ) {
        returnItem = <table className={`table ${props.className ? props.className : ''}`}
            data-test={props['data-test']}
        >
            <thead className='table-header'>
                <TableHeaderRow collapsed={props.collapsed}
                    customData={props.customData}
                    items={props.items}
                    columns={visibleColumns}
                    controlColumns={props.controlColumns}
                    urlPath={props.urlPath}
                    queryString={props.queryString}

                    editable={props.editable}
                    deletable={props.deletable}
                    updateCollection={props.updateCollection}
                    listName={props.listName}
                    selectableRows={props.selectableRows}

                    // For column reorder functionality to work
                    setColumns={props.setColumns}
                    className={tableHeaderClassName}

                    //For column sorting
                    sorting={sorting}
                    setSorting={setSorting }

                    //For column preferences
                    availableColumns={props.columns}
                    preferredColumns={preferredColumns}
                    setPreferredColumns={setPreferredColumns}
                    togglePreferredColumns={togglePreferredColumns}
                    enableColumnPreference={props.enableColumnPreference}
                />

                {props.filters && (
                    <TableFilterRow
                        columns={visibleColumns}
                        filters={props.filters}
                        onSearchFieldChange={props.onSearchFieldChange}
                        onSelectedItemChange={props.onSelectedItemChange}
                        onSearch={props.onSearch}
                        onClear={props.onClearFilters}
                    />
                )}
            </thead>
            <tbody className='table-body'>
                {!props.collapsed && (
                    !props.loaded
                        ? <tr className='table-body-row'>
                            <td className='loader' colSpan={totalColumns}>
                                Loading...
                            </td>
                        </tr>
                        : dataRows && dataRows.length > 0
                            ? dataRows
                            : <tr className='table-body-row'>
                                <td className='no-data' colSpan={totalColumns}>
                                    {/* No data found */}
                                    {props.noRecordsMessage && <div className='create-first-record'>
                                        {props.noRecordsMessage}
                                    </div>}
                                    {props.createFirstRecordText && <div className='create-first-record'>
                                        <Icon path='create-table-record.svg' size={35} />
                                        <div className='create-first-record-text'>
                                            {props.createFirstRecordText || ''}
                                        </div>
                                        {<button
                                            className='cobb primary'
                                            onClick={props.createRecordToggle}
                                        >
                                            {props.newRecordLabel}
                                        </button>}
                                    </div>}
                                </td>
                            </tr>
                )}
            </tbody>
        </table>
    } else if (props.loaded && props.items.length === 0) {
        returnItem = <div className='table-empty'>
            <div className='table-empty-text'>{props.tableEmptyText}</div>
            {props.addNewRecordButtonText && <div className='add-new-record-button'>
                <Button onClick={() => {
                    navigate(props.addNewRecordButtonURL)
                }} type='primary'>{props.addNewRecordButtonText}</Button>
            </div>}
        </div>
    }

    return returnItem;
}

// Re-render only if props are different
export default React.memo(Table, (prevProps, nextProps) => {
    // console.log('Table memo', prevProps, nextProps);
    // return equal(prevProps, nextProps);
    return false;
});


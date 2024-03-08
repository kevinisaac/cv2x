import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

import { Icon } from 'src/components';
import { useToggle } from 'src/hooks';
import { Checkbox } from 'src/components/form';
import { byString, equal, request, copy } from 'src/helpers';


export default function TableHeaderRow(props) {
    // For column reorder - used inside the Column component
    const [ source, setSource ] = useState();
    const [ expandColumnPreference,
        toggleExpandColumnPreference,
        setExpandColumnPreference
    ]  = useToggle(false);

    function onColumnSortClick(colID, sortable, e) {
        // console.log('Handling sort click..', props);
        var list = [...props.items];

        // Backend sorting
        if (sortable === 'backend') {
            // TODO Temporarily patch the `id` column to `id_` till backend is unified
            if (colID === 'id') {
                colID = 'id_';
            }

            var urlSearchParams = new URLSearchParams(props.queryString);
            // console.log('##onColumnSortClick', props.queryString);

            if (props.sorting.sortedColID === colID) {
                // Already sorted column is sorted (toggled)
                var newReverseSorted = !props.sorting.reverseSorted;
                urlSearchParams.set('reverse', newReverseSorted.toString());

                // 1. Send request and update query string of parent state
                // 2. Update table component's state to keep track of the sort details
                props.setSorting(sorting => ({
                    ...sorting,
                    reverseSorted: !sorting.reverseSorted,
                }));
            } else {
                // A fresh column is sorted
                urlSearchParams.set('order_by', colID);
                urlSearchParams.set('reverse', 'false');

                // Update table component's state to keep track of the sort details
                props.setSorting({
                    sortedColID: colID,
                    reverseSorted: false,
                });
            }

            // Update the parent component's state to trigger re-rendering
            const url = `${props.urlPath}?${urlSearchParams}`;
            props.updateCollection({
                queryString: urlSearchParams.toString(),
                loaded: false,
            });

            return;
        }

        // Frontend sorting
        if (props.sorting.sortedColID === colID) {
            // console.log('Reverse sorting..');
            list.reverse();
            props.setSorting((sorting) => ({
                ...sorting,
                reverseSorted: !sorting.reverseSorted,
            }));
        } else {
            // console.log('Normal sorting..');
            list.sort((a, b) => {
                if (byString(a, colID) === byString(b, colID)) {
                    return 0;
                } else {
                    return (byString(a, colID) < byString(b, colID)) ? -1 : 1;
                }
            });
            props.setSorting((sorting) => ({
                sortedColID: colID,
                reverseSorted: false,
            }));
        }
        props.updateCollection({items: list})
    }

    function toggleAllRowsSelection(e) {
        let select = false;
        if (rowsSelectionState === 'none') {
            select = true;
        }

        let tempItems = copy(props.items);
        tempItems.map(item => {
            item._selected = select;
        });

        // console.log('Toggling everything..');
        props.updateCollection({
            items: tempItems
        });
    }

    function getRowsSelectionState() {
        // Returns: 'all'/'none'/'some'
        let selectedCount = 0;
        let unselectedCount = 0;
        props.items.map(item => {
            if (item._selected) {
                selectedCount += 1;
            } else {
                unselectedCount += 1;
            }
        });

        if (selectedCount === 0) {
            return 'none';
        } else if (unselectedCount === 0) {
            return 'all';
        } else {
            return 'some';
        }
    }

    const rowsSelectionState = getRowsSelectionState();

    // console.log('Rendering TableHeaderRow..', rowsSelectionState);
    return (
        <tr className={`table-header-row${props.className ? ' '+props.className : ''}`}>
            {/* <EditColumnHeader editable={props.editable} /> */}
            {/* <DeleteColumnHeader deletable={props.deletable} /> */}

            {/* Render the select checkboxes if rows are selectable */}
            { props.selectableRows === -1 && <th className='select-column control-column table-header-data'>
                <Checkbox
                    onChange={toggleAllRowsSelection}
                    checked={rowsSelectionState === 'all'}
                    inputRef={el => {
                        return el
                            && (el.indeterminate = rowsSelectionState === 'some');
                    }}
                />
            </th> }

            {/* Render the control columns first, if any */}
            { props.controlColumns.map((col, index) => (
                <th key={index}
                    className='control-column table-header-data'
                    style={{
                        minWidth: col.minWidth,
                        width: col.width,
                    }}
                >
                    {col.name}
                </th>
            )) }

            {props.columns.map((col) => <Column
                key={col.id}
                column={col}
                customData={props.customData}
                sorting={props.sorting}
                onColumnSortClick={onColumnSortClick}

                // For column reordering
                columns={props.columns}
                setColumns={props.setColumns}
                source={source}
                setSource={setSource}
            />)}
            {props.enableColumnPreference && <div className='column-preferences'>
                <div className='column-preferences-toggle'>
                    <button onClick={e => {
                        e.preventDefault();
                        toggleExpandColumnPreference();
                    }}
                    >
                        <Icon path='plus-button-grey.svg' />
                    </button>
                </div>
                {expandColumnPreference && <div className='column-preferences-expanded'>
                    {props.availableColumns.map(aC => {
                        const isChecked = props.preferredColumns.includes(aC.id);
                        return <div className='column-preference-item'
                            onClick={e => props.togglePreferredColumns(e, aC.id)}
                        >
                            {isChecked && <div className='checked-icon box-check-green-icon'>
                                <div className='tick'>&#x2713;</div>
                            </div>}
                            {!isChecked && <div className='checked-icon box-grey-icon'>
                            </div>}

                            <div className='column-name'>{aC.name}</div>
                        </div>
                    }
                    )}
                </div>}
            </div>}
        </tr>
    );
}

function Column(props) {
    // if (!props?.col.visible) {
        //Added to check feasibility of column preferences using CSS
        // return;
    // }
    return <th key={props.column.id}
        className={`data-header ${props.column.headerClassName || ''} table-header-data`}
    >
        <div className='draggable-header'
            id={props.column.id}
        >
            {props.column.renderHeader
                ? props.column.renderHeader(props.column, props.customData)
                : <span className='column-name'
                    onClick={props.column.sortable
                        ? () => props.onColumnSortClick(props.column.id, props.column.sortable)
                        : null
                    }
                >
                    {props.column.name}
                    {props.column.id === props.sorting.sortedColID
                        ? props.sorting.reverseSorted ? ' ↓' : ' ↑'
                        : ''
                    }
                </span>
            }
        </div>
    </th>
}

// export default function TableHeaderRow(props) {
//     const [ sorting, setSorting ] = useState({
//         sortedColID: null,
//         reverseSorted: false,
//     });
//
//     // For column reorder - used inside the Column component
//     const [ source, setSource ] = useState();
//
//     function onColumnSortClick(colID, sortable, e) {
//         // console.log('Handling sort click..', props);
//         var list = [...props.items];
//         // console.log(list);
//         // console.log(colID);
//
//         // Backend sorting
//         if (sortable === 'backend') {
//             // TODO Temporarily patch the `id` column to `id_` till backend is unified
//             if (colID === 'id') {
//                 colID = 'id_';
//             }
//
//             // Set the loading status for the table
//             // this.props.updateCollection({
//             //     status: 'loading',
//             // });
//
//             // console.log('--------', props.queryString);
//             var urlSearchParams = new URLSearchParams(props.queryString);
//
//             if (sorting.sortedColID === colID) {  // Already sorted column is sorted (toggled)
//                 // console.log(`Same sorted column ${colID} is toggled`);
//                 var newReverseSorted = !sorting.reverseSorted;
//                 urlSearchParams.set('reverse', newReverseSorted.toString());
//                 // console.log(urlSearchParams.toString());
//                 // console.log(this.state);
//
//                 // 1. Send request and update query string of parent state
//                 // 2. Update table component's state to keep track of the sort details
//                 setSorting(sorting => ({
//                     ...sorting,
//                     reverseSorted: !sorting.reverseSorted,
//                 }));
//             } else { // A fresh column is sorted
//                 // console.log(`Fresh column ${sortable} is sorted`);
//                 // console.log(colID);
//                 urlSearchParams.set('order_by', colID);
//                 urlSearchParams.set('reverse', 'false');
//                 // console.log(urlSearchParams.toString());
//
//                 // Update table component's state to keep track of the sort details
//                 setSorting({
//                     sortedColID: colID,
//                     reverseSorted: false,
//                 });
//             }
//
//             // console.log(urlSearchParams.toString());
//
//             // Update the parent component's state to trigger re-rendering
//             const url = `${props.urlPath}?${urlSearchParams}`;
//             props.updateCollection({
//                 queryString: urlSearchParams.toString(),
//                 loaded: false,
//             });
//             // request.get(url, (status, data) => {
//             //     props.updateCollection({
//             //         items: data.data,
//             //         queryString: urlSearchParams.toString(),
//             //         loaded: true,
    //             //     });
//             // });
    //
//             return;
//         }
    //
//         // Frontend sorting
//         // console.log('Frontend sorting');
    //         if (sorting.sortedColID === colID) {
//             // console.log('Reverse sorting..');
//             list.reverse();
    //             setSorting((sorting) => ({
    //                 ...sorting,
//                 reverseSorted: !sorting.reverseSorted,
//             }));
    //         } else {
//             // console.log('Normal sorting..');
//             list.sort((a, b) => {
//                 if (byString(a, colID) === byString(b, colID)) {
    //                     return 0;
    //                 } else {
//                     return (byString(a, colID) < byString(b, colID)) ? -1 : 1;
    //                 }
//             });
    //             setSorting((sorting) => ({
    //                 sortedColID: colID,
    //                 reverseSorted: false,
//             }));
    //         }
    //         props.updateCollection({items: list})
//         // console.log('-------------');
    //         // console.log(list);
//     }
    //
//     function toggleAllRowsSelection(e) {
//         let select = false;
//         if (rowsSelectionState === 'none') {
    //             select = true;
//         }
    //
//         let tempItems = copy(props.items);
    //         tempItems.map(item => {
    //             item._selected = select;
//         });
    //
//         // console.log('Toggling everything..');
    //         props.updateCollection({
    //             items: tempItems
//         });
//     }
//
    //     function getRowsSelectionState() {
//         // Returns: 'all'/'none'/'some'
//         let selectedCount = 0;
//         let unselectedCount = 0;
//         props.items.map(item => {
    //             if (item._selected) {
//                 selectedCount += 1;
    //             } else {
    //                 unselectedCount += 1;
//             }
//         });
    //
    //         if (selectedCount === 0) {
//             return 'none';
//         } else if (unselectedCount === 0) {
    //             return 'all';
    //         } else {
//             return 'some';
    //         }
    //     }
//
//     const rowsSelectionState = getRowsSelectionState();
//
    //     // console.log('Rendering TableHeaderRow..', rowsSelectionState);
//     return (
    //         <tr className='table-header-row'>
//             {/* <EditColumnHeader editable={props.editable} /> */}
    //             {/* <DeleteColumnHeader deletable={props.deletable} /> */}
//
    //             {/* Render the select checkboxes if rows are selectable */}
    //             { props.selectableRows === -1 && <th className='select-column control-column table-header-data'>
    //                 <Checkbox
    //                     onChange={toggleAllRowsSelection}
    //                     checked={rowsSelectionState === 'all'}
    //                     inputRef={el => {
    //                         return el
//                             && (el.indeterminate = rowsSelectionState === 'some');
    //                     }}
//                 />
    //             </th> }
//
//             {/* Render the control columns first, if any */}
    //             { props.controlColumns.map((col, index) => (
    //                 <th key={index}
//                     className='control-column table-header-data'
    //                     style={{
//                         minWidth: col.minWidth,
//                         width: col.width,
    //                     }}
//                 >
//                     {col.name}
//                 </th>
    //             )) }
    //
//             {props.columns.map((col) => <Column
//                 key={col.id}
    //                 column={col}
//                 customData={props.customData}
//                 sorting={sorting}
//                 onColumnSortClick={onColumnSortClick}
//
//                 // For column reordering
//                 columns={props.columns}
//                 setColumns={props.setColumns}
//                 source={source}
    //                 setSource={setSource}
    //             />)}
//         </tr>
//     );
// }
    //
// function Column(props) {
    //     const columnResizerEl = useRef();
//     const columnEl = useRef();
//
    //     // Resize related
//     const [ width, setWidth ] = useState();
//
//     let startX, startWidth;
//     function handleResizerDragStart(e) {
    //         startX = e.clientX;
//         // startWidth = parseInt(document.defaultView.getComputedStyle(columnResizerEl.current).width, 10);
//         startWidth = parseInt(document.defaultView.getComputedStyle(columnEl.current).width, 10);
//         document.addEventListener('mousemove', handleResizerDrag, false);
    //         document.addEventListener('mouseup', handleResizerDragEnd, false);
    //     }
//
//     function handleResizerDrag(e) {
//         let newWidth = (startWidth + e.clientX - startX) + 'px';
//         setWidth(newWidth);
//     }
    //
//     function handleResizerDragEnd(e) {
    //         document.removeEventListener('mousemove', handleResizerDrag, false);
//         document.removeEventListener('mouseup', handleResizerDragEnd, false);
//     }
//
//     useEffect(() => {
//         columnResizerEl.current.addEventListener('mousedown', handleResizerDragStart);
//     });
//
//
//     // Reorder related
    //     function handleReorderDragStart(e) {
//         props.setSource(e.target.id)
//     }
//
//     function handleReorderDragOver(e) {
//         e.preventDefault()
//         // console.log('Reorder drag over');
//     }
    //
//     function handleReorderDragEnter(e) {
    //         if (props.source && e.target.id && props.source != e.target.id) {
    //             // Pop the dragged element and add it to the drop position
//             props.setColumns(oldColumns => {
    //                 let newColumns = copy(oldColumns);
//                 const sourcePosition = newColumns.map(column => column.id)
//                     .indexOf(props.source);
    //                 const targetPosition = newColumns.map(column => column.id)
//                     .indexOf(e.target.id)
    //
//                 console.log(sourcePosition, targetPosition);
//                 const removedColumn = newColumns.splice(sourcePosition, 1)[0];
//                 newColumns.splice(targetPosition, 0, removedColumn);
//
//                 console.log('New Columns:', newColumns);
//
//                 return newColumns;
    //             });
//         }
    //     }
//
//     function handleReorderDrop(e) {
//         // console.log('Reorder drag drop');
//     }
    //
    //
//     return <th key={props.column.id}
    //         ref={columnEl}
//         className={`data-header ${props.column.headerClassName || ''} table-header-data`}
    //         style={{
//             minWidth: width,
    //             width: width,
//         }}
//     >
//         {/* <div className='draggable-header' */}
//         <div className='draggable-header'
//             id={props.column.id}
//             draggable
    //             onDragStart={handleReorderDragStart}
    //             onDragOver={handleReorderDragOver}
//             onDrop={handleReorderDrop}
//             onDragEnter={handleReorderDragEnter}
//         >
//             {props.column.renderHeader
//                 ? props.column.renderHeader(props.column, props.customData)
//                 : <span className='column-name'
    //                     onClick={props.column.sortable
//                         ? () => props.onColumnSortClick(props.column.id, props.column.sortable)
//                         : null
    //                     }
//                 >
//                     {props.column.name}
//                     {props.column.id === props.sorting.sortedColID
    //                         ? props.sorting.reverseSorted ? ' ↓' : ' ↑'
    //                         : ''
//                     }
//                 </span>
    //             }
//         </div>
//         <div className='resizer' ref={columnResizerEl}>
//             <div className='resizer-left' />
    //             <div className='resizer-center' />
//             <div className='resizer-right' />
//         </div>
//     </th>
// }

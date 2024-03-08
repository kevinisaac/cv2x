import React, {useState, useEffect} from 'react';
import { Link } from 'react-router-dom';

import { equal } from 'src/helpers';


function TableFilterRow(props) {
    // const [ columns, setColumns ] = useState({});

    // function onFieldChange(id, e) {
    //     console.log('dffieeeeeed');
    //     setColumns(state => ({
    //         ...state,
    //         [id]: e.target.value,
    //     }));
    // }

    /***** Render helper *****/
    function getFilterField(col) {
        // TODO Temporary until backend naming is unified
        if (col.id === 'id') {
            col.id = 'id_';
        }

        if (col.filterField === undefined) {
            return '';
        } else if (col.filterField.type === 'text') {
            return (
                <input data-colid={col.id} type='text' onChange={this.filterByColumn} />
            );
        } else if (col.filterField.type === 'composite_text_field') {
            // Getting both the name and the value for the selected dropdown item
            const selectedItem = col.filterField.filterOptions.find(item => (
                item.value === props.filters[col.id][0].operator
            ));
            return (
                <CompositeTextField id={col.id} type='text'
                    dropdownItems={col.filterField.filterOptions}
                    // selectedItem={props.filters[col.id][0].operator}
                    selectedItem={selectedItem}
                    // onSelectedItemChange={props.onSelectedItemChange}
                    text={props.filters[col.id][0].value[0]}
                    onChange={props.onSearchFieldChange}
                    onSelectedItemChange={() => console.log('dfdfdf')}
                    // onTextChange={() => console.log('dfdf')}
                />
            );
        } else {
            return '';
        }
    }

    console.log('Rendering table filter row..');
    return (
        <tr>
            {/* Search related column(s) */}
            <th>
                {
                    props.onSearch ?
                        <>
                            <input type='submit' value='Search'
                                onClick={props.onSearch}
                            />
                            <input type='button' value='Clear'
                                onClick={props.onClear}
                            />
                        </>
                    : 'Nope'
                }
            </th>
            <th></th>

            {/* Normal columns */}
            {
                props.columns.map((col) =>
                    <th key={col.id}>
                        {getFilterField(col)}
                    </th>
                )
            }
        </tr>
    );
}

export default React.memo(TableFilterRow);


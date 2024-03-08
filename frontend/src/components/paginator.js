import React, { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';

import { Input } from 'src/components/form';
import { trl, LanguageContext } from 'src';
import { format } from 'src/helpers';


export default function Paginator(props) {
    let pages = [...Array(props.totalPages).keys()].map((number) => {
        const pageNumber = number + 1;  // Since index starts at 0

        let className = 'paginator-page';
        if (pageNumber === props.currentPage) {
            className += ' active';
        }
        if((pageNumber === props.currentPage)
            || (pageNumber === props.currentPage+1)
            || (pageNumber === props.currentPage+2)
            || (pageNumber === props.totalPages)) {
            return <li key={pageNumber}
                className={className}
                onClick={(e) => props.onPageNumberClick(e, pageNumber)}
            >
                {pageNumber}
            </li>
        }else {
            return null;
        }

    });

    if(pages.length>4){
        pages.splice(3,0,'...');
    }

    let gotoPage;
    let standardPageSize = 10;
    let startRowNo, endRowNo, totalRows;

    startRowNo = (props.currentPage * standardPageSize) - standardPageSize + 1;
    endRowNo = startRowNo + (standardPageSize-1);

    if(props.currentPage === props.totalPages) {
        endRowNo = startRowNo + props.noOfRecords - 1;
        // totalRows = totalRows
    }

    return <div className='paginator'>
        <div className='left-section'>
            <div className='pages-overview'>
                {/* Page <strong>{props.currentPage}</strong> out of <strong>{props.totalPages}</strong> */}
                Showing <strong>{startRowNo} - {endRowNo} of {props.noOfRecords}</strong>
            </div>
        </div>

        <div className='right-section'>
            <button className='cobb icon double-arrow-left-faded-icon'  // First page
                onClick={e => props.onPageNumberClick(e, 1)}
                disabled={props.currentPage === 1 ? true : false}
            ></button>
            <button className='cobb icon single-arrow-left-faded-icon'  // Previous page
                onClick={e => props.onPageNumberClick(e, props.currentPage - 1)}
                disabled={props.currentPage === 1 ? true : false}
            ></button>

            <ul className='paginator-pages'>
                {pages}
            </ul>

            <button className='cobb icon single-arrow-right-faded-icon' // Next page
                onClick={e => props.onPageNumberClick(e, props.currentPage + 1)}
                disabled={props.currentPage === props.totalPages ? true : false}
            ></button>
            <button className='cobb icon double-arrow-right-faded-icon' // Last page
                onClick={e => props.onPageNumberClick(e, props.totalPages)}
                disabled={props.currentPage === props.totalPages ? true : false}
            ></button>

            <div className='go-to-page'>
                <span>Go to</span>
                {/* <Input /> */}
                <input name='goto'
                    value={gotoPage}
                    onChange={e => gotoPage = e.target.value }
                />
                <button className='cobb go-button'
                    onClick={e => { return props.onPageNumberClick(e, gotoPage)}}
                    disabled={props.currentPage === props.totalPages ? true : false}
                >Go</button>
            </div>
        </div>
    </div>
}

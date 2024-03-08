import React, {useState, useEffect} from 'react';

export default function LoadingScreen(props) {
    // return <div className='main-grid'>
    //     <Header />
    //     <Sidebar />
    //     <div id='loading-view' className='app-content'>
    //         Test
    //     </div>
    // </div>
    return <div id='loading-view' className='app-content'>
        <div className='top-section'>
            <div className='box1'></div>
            <div className='box2'></div>
            <div className='box3'></div>
        </div>
        <div className='middle-section'>
            <div className='box'></div>
            <div className='box'></div>
            <div className='box'></div>
        </div>
        <div className='table-section'>
            {[1, 2, 3, 4].map( () => <div className='column'>
                <div className='head-box'></div>
                {[1, 2, 3, 4, 5, 6, 7, 8].map(() => <div className='row-box'>
                </div>)}
            </div>)}
        </div>
    </div>
}

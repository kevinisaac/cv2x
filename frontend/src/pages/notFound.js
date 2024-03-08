import React from 'react';
import { Link } from 'react-router-dom';


export default function NotFoundView(props) {
    return <div id='not-found'>
        <div className='number'>404</div>
        <div className='text'>Page not found</div>
        <Link to='/' className='home-link'>
            Go Home
        </Link>
    </div>
}


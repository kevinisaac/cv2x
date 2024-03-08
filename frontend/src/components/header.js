import React, { useContext, useState, useEffect, } from 'react';
import { Link,} from 'react-router-dom';

import { Icon, } from 'src/components';
import { MeContext } from 'src/contexts';


export default function Header(props) {
    const { me, setMe } = useContext(MeContext);

    return <div id='header'>
        <div className='left-section'>
            <Link to='/' className='outreach-logo'>
                <img src='/static/images/outreach-logo.png'/>
            </Link>
            <div className='application-title'>Outreach</div>
        </div>
        <div className='right-section'>
            <div className='user-profile-picture'>
                <Link to='/settings'>
                    {me?.profile_picture_details?.id
                        ? <img src={me.profile_picture_details.path} />
                        : <img src='/static/images/dp-placeholder.jpg' />
                    }
                </Link>
            </div>
            <div className='user-details'>
                <div className='user-name' data-test='profile-name'>
                    <Link to='/settings'>
                        {me?.name || 'Placeholder Value'}
                    </Link>
                </div>
                <div className='user-role'>
                    {me?.is_admin && <>
                        <div className='role-name'>Admin</div>
                        <div className='role-icon'>
                            <Icon path='golden-star.svg' size={12}/>
                        </div>
                    </>}
                    {!me?.is_admin && <>
                        <div className='role-name'>
                            {me?.role_details?.name || 'Role'}
                        </div>
                    </>}
                </div>
            </div>
        </div>
    </div>
}


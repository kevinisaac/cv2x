import React, { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';

import { Icon } from 'src/components';

export default function Sidebar(props) {
    const navigate = useNavigate();
    const [ isCollapsed, setIsCollapsed] = useState(
        JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
    );

    const collapsedClassName = 'sidebar-collapsed';
    const expandedClassName = 'sidebar-expanded';

    const items = [
        {
            name: 'Leads',
            icon: 'lead.svg',
            height: 18.28,
            width: 13.92,
            url: '/leads',
            dataTestSidebarNav: 'nav-leads',
        },
        {
            name: 'Campaigns',
            icon: 'campaign.svg',
            height: 18.28,
            width: 13.92,
            url: '/campaigns',
            dataTestSidebarNav: 'nav-campaigns',
        },
        {
            name: 'Gmail',
            icon: 'gmail.svg',
            height: 18.28,
            width: 13.92,
            url: '/gmail',
            dataTestSidebarNav: 'nav-gmail',
        },
        {
            name: 'Companies',
            icon: 'company.svg',
            height: 18.28,
            width: 13.92,
            url: '/companies',
            dataTestSidebarNav: 'nav-companies',
        },
        {
            name: 'Domains',
            icon: 'domain.svg',
            height: 18.28,
            width: 13.92,
            url: '/domains',
            dataTestSidebarNav: 'nav-domains',
        },
        {
            name: 'Templates',
            icon: 'template.svg',
            height: 18.28,
            width: 13.92,
            url: '/templates',
            dataTestSidebarNav: 'nav-domains',
        },
        {
            name: 'Leads Imports',
            icon: '',
            height: 18.28,
            width: 13.92,
            url: '/lead-imports',
            dataTestSidebarNav: 'nav-lead-imports',
        },
        {
            name: 'Admin',
            icon: 'admin.svg',
            height: 18.28,
            width: 13.92,
            url: '/admin',
            dataTestSidebarNav: 'nav-admin',
        },
        {
            name: 'Subscribers',
            icon: 'user.svg',
            height: 16,
            width: 16,
            url: '/subscribers',
            dataTestSidebarNav: 'nav-subscribers',
        },
        {
            name: 'Users',
            icon: 'user.svg',
            height: 16,
            width: 16,
            url: '/users',
            dataTestSidebarNav: 'nav-users',
        },
        {
            name: 'Roles',
            icon: 'role.svg',
            height: 18,
            width: 21,
            url: '/roles',
            dataTestSidebarNav: 'nav-roles',
        },
        {
            name: 'Profile',
            icon: 'gear.svg',
            height: 18,
            width: 17,
            url: '/settings',
            dataTestSidebarNav: 'nav-settings',
        },
    ]

    function onSidebarToggle(e) {
        e.preventDefault();
        setIsCollapsed(old => {
            let new_ = !old;
            localStorage.setItem('preferences.sidebarCollapsed', new_);
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'preferences.sidebarCollapsed',
              old,
              new_,
            }));

            return new_;
        });
    }

    function onLogoutClick(e) {
        console.log('START');
        e.preventDefault();

        localStorage.removeItem('jwt');
        navigate('/login');
        console.log('END');
    }

    return <div id='sidebar'
        className={isCollapsed ? collapsedClassName : expandedClassName}
    >
        <nav className='navigation-links'>
            {items.map((item, index) => <NavLink
                to={item.url}
                className='sidebar-item'
                key={index}
                data-test={item.dataTestSidebarNav}
            >
                <Icon path={item.icon} width={item.width} height={item.height} />
                {!isCollapsed && <div
                    className='item-name'
                >
                    {item.name}
                </div>}

            </NavLink>)}
        </nav>
        <div className='bottom-items'>
            <button
                className='logout-button sidebar-item'
                onClick={onLogoutClick}
            >
                <Icon path='logout.svg' width={19} height={16} />
                {!isCollapsed && <div className='sidebar-toggle-text'>Logout</div>}
            </button>
            <button
                className='sidebar-toggle sidebar-item'
                data-test='sidebar-toggle'
                onClick={onSidebarToggle}
            >
                {isCollapsed && <Icon path='expand.svg' width={14.63} height={13.51} />}
                {!isCollapsed && <>
                    <Icon path='collapse.svg' width={14.63} height={13.51} />
                    <div className='sidebar-toggle-text'>Collapse</div>
                </>}
            </button>
        </div>
    </div>
}

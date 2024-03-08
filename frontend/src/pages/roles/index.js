import React, { useState, useEffect, useContext } from 'react';
import { useAlert } from 'react-alert';

import { UserPreferenceContext, MeContext } from 'src/contexts';
import { useCollection, useToggle, useForm } from 'src/hooks';
import {
    Icon,
    Modal,
    Table,
    Header,
    Tooltip,
    Sidebar,
    ContactCTA,
} from 'src/components';
import { Input, } from 'src/components/form';
import {
    Sections,
    PageTopRow,
    NavigationPanel,
} from 'src/components/outreachComponents';
import { copy, request } from 'src/helpers';

const initRoleForm = {
    data: {
        name: '',
    }
}

export default function RolesView(props) {
    const { isSubMenuCollapsed, toggleSubMenu } = useContext(UserPreferenceContext);
    const [ roleC,
        updateRoleC,
        roleRef,
        isRoleRefVisible
    ] = useCollection('roles');
    const [ userC ] = useCollection('users');

    const [ mainClassName, setMainClassName] = useState(
        JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
        ? 'expanded-view'
        : ''
    );

    let sections = [
        {
            name: 'Roles',
            icon: null,
            navigation: 'roles',
            subSections: [
                {
                    name: null,
                    content: <RolesSection
                        collection={roleC}
                        updateCollection={updateRoleC}
                        users={userC}
                    />
                },
            ]
        },
        {
            name: 'Permissions',
            icon: null,
            navigation: 'permissions',
            className: 'permissions-section-main',
            subSections: [
                {
                    name: null,
                    content: <PermissionsSection
                        roles={roleC}
                        updateRoles={updateRoleC}
                    />
                }
            ]
        },
    ];

    useEffect(() => {
        const handleStorageChange = (e) => {
            // if (e.key === 'preferences.sidebarCollapsed' && e.newValue !== e.oldValue) {
            if (e.key === 'preferences.sidebarCollapsed') {
                setMainClassName(JSON.parse(localStorage.getItem('preferences.sidebarCollapsed'))
                    ? ' expanded-view'
                    : ''
                )
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, []);

    return <div id='main-grid' className={`${mainClassName}`}>
        <Header />
        <Sidebar />
        <div id='roles-view' className='app-content details-view'>
            <PageTopRow title='Roles' />

            <div className={`page-content ${isSubMenuCollapsed ? 'collapsed' : ''}`}>
                <div className='left-page-content'>
                    <NavigationPanel sections={sections} />
                </div>
                <div className='right-page-content'>
                    <Sections sections={sections} />
                </div>
            </div>
        </div>
    </div>
}

const RolesSection = (props) => {
    const alert_ = useAlert();
    const { me, setMe } = useContext(MeContext);

    const [ viewMode, setViewMode ] = useState('read'); //edit/read
    const [ modalType, setModalType ] = useState('create'); //create/update
    const [ roleModal, toggleRoleModal ] = useToggle(false);
    const [
        roleForm,
        setRoleForm,
        onRoleChange,
        roleError,
        setRoleError,
    ] = useForm(initRoleForm);
    let finalRoleItems = [
        {
            id: 999999999, // Very large ID so that it should never reach
            number_of_users: props.users.
                items.filter(user => user.is_admin === true).length,
            name: <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
            }}>
                Admin  <Icon path='golden-star.svg' size={12}/>
            </div>,
        },
        ...props.collection.items,
    ]

    const [ columns, setColumns ]  = useState([
        {
            name: 'Name',
            id: 'name',
            visible: true,
            // sortable: 'backend',
        },
        {
            name: 'No. of Users',
            id: 'no_of_users',
            visible: true,
            // sortable: 'backend',
            render: (row) => {
                return <div className='no_of_users'>
                    {row.number_of_users}
                </div>
            }
        },
        {
            name: 'Action',
            id: '#',
            visible: true,
            render: (row) => {
                return <div className='actions'>
                    <div className='delete-role'>
                        <button className='button danger-2-button'
                            onClick={e => onDeleteClick(e, row.id)}
                            disabled={(row.number_of_users ?? 1) > 0}
                        >
                            Delete
                        </button>
                        {(row.number_of_users ?? 1) > 0 && <div className='user-assigned-warning'>
                            <Icon path='important.svg' />
                            <Tooltip>
                                You cannot delete a role that has been assigned to a user
                            </Tooltip>
                        </div>}
                    </div>
                </div>
            }
        },
    ]);

    function onRowClick() {

    }

    function createRole() {
        request.post(`roles`, roleForm)
            .then(([status_, response]) => {
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Role added');
                }

                props.updateCollection({
                    reload: true,
                });
                toggleRoleModal();
                setRoleError([]);
            })
            .catch(([errorStatus, response]) => {
                setRoleError(response.errors);
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Error while adding role. Please try again.');
                }
            });
    }

    function updateRole() {

    }


    function onDeleteClick(e, id) {
        e.preventDefault();

        request.delete(`roles/${id}`)
            .then(([status_, response]) => {
                if (response.message) {
                    alert_.success(response.message);
                } else {
                    alert_.success('Role Deleted');
                }
                props.updateCollection({
                    reload: true,
                });
            })
            .catch(() => {
                if (response.message) {
                    alert_.error(response.message);
                } else {
                    alert_.error('Unable to delete. Please try again');
                }
            })
    }

    return <div className='roles-section'>
        { <div className='add-roles-button'>
            <button className='button secondary-button'
                onClick={e => {
                    e.preventDefault();
                    setRoleForm(initRoleForm);
                    setModalType('create');
                    setViewMode('edit')
                    toggleRoleModal();
                }}
            >
                + Add New
            </button>
        </div>}
        <div className='roles-table'>
            { <Table
                className='role-table'
                items={finalRoleItems}
                columns={columns}
                queryString={props.collection.queryString}
                controlColumns={[]}
                loaded={props.collection.loaded}
                onRowClick={onRowClick}
                tableEmptyText='No roles added'

                collection={props.collection}
                updateCollection={props.updateCollection}

                setColumns={setColumns}
            />}
        </div>
        {roleModal && <Modal title={modalType === 'create' ? 'Add New Role' : 'Role Details'}
            className='role-modal'
            toggleModal={toggleRoleModal}
        >
            <div className='role-modal-content'>
                <div className='name'>
                    <Input label='Name'
                        name='data.name'
                        value={roleForm.data.name}
                        onChange={onRoleChange}
                        error={roleError['data.name']}
                        viewMode={viewMode}
                    />
                </div>
                <div className='action-button'>
                    {(false && viewMode === 'edit' && modalType === 'update')
                        && <button className='button primary-button'
                        onClick={e => {
                            e.preventDefault();
                            setUserForm(originalFormData);
                            setViewMode('read');
                        }}
                    >
                        Cancel
                    </button>}
                    {viewMode === 'edit' && <button className='button primary-button'
                        onClick={e => {
                            e.preventDefault();
                            if (modalType === 'create') {
                                createRole();
                            } else {
                                updateRole();
                            }
                        }}
                    >
                        {modalType === 'create' ? 'Add' : 'Update'}
                    </button>}
                    {false && viewMode === 'read' && <button className='button primary-button'
                        onClick={e => {
                            e.preventDefault();
                            setViewMode('edit');
                        }}
                    >
                        Edit
                    </button>}
                </div>
            </div>
        </Modal>}
    </div>
}

const PermissionsSection = (props) => {
    const alert_ = useAlert();
    const { me, setMe } = useContext(MeContext);
    const [ permissionModal, togglePermissionModal, setPermissionModal ] = useToggle(false);
    const [ permissionModalState, setPermissionModaState] = useState({});
    const [ permissionC,
        updatePermissionC,
    ] = useCollection('permissions');

    function toggleRolePermission(role, permissionBit) {
        // TODO: Add check to see if role has permission to update permission
        // if (!me.permissions_map?.update_permissions_for_role) {
            // return;
        // }

        const permissionBitSeq = BigInt(role.permission_bit_sequence || '0');
        const newPermissionBitSeq = permissionBit ^ permissionBitSeq;
        let requestData = {
            data: {
                permission_bit_sequence: newPermissionBitSeq,
            }
        };
        request.patch(`roles/${role.id}`, requestData)
            .then(([status_, response]) => {
                let rolesCopy = copy(props.roles.items);
                rolesCopy.map(roleCopy => {
                    if (roleCopy.id === role.id) {
                        roleCopy.permission_bit_sequence = newPermissionBitSeq;
                    }
                })

                props.updateRoles({
                    items: rolesCopy,
                });
            })
            .catch(([status_, response]) => {
                if (response.errors.length === 0 && response.message === null) {
                    alert_.error('Unable to update role permission. Please try again')
                } else if (response.message !== null ) {
                    alert_.error(response.message);
                } else if (response.errors.length > 0) {
                    alert_.error(response.errors[0].description);
                }
            })
        ;
    }

    function togglePermissionAndDependents() {
        let permissionBitSeq = permissionModalState.permissionBitSeq;

        for (const permission of permissionModalState.permission.dependent_details) {
            let permissionBit = BigInt(permission.permission_bit);

            //If permission inactive
            if (!(permissionBit & permissionModalState.permissionBitSeq))
            // if (!(permissionBit.and(permissionModalState.permissionBitSeq).value))
            {
                permissionBitSeq = permissionBit ^ permissionBitSeq;
            }
        }

        //Toggle parent permission
        permissionBitSeq = permissionModalState.permissionBit ^ permissionBitSeq;

        let requestData = {
            data: {
                permission_bit_sequence: permissionBitSeq,
            }
        };
        request.patch(`roles/${permissionModalState.role.id}`, requestData)
            .then(([status_, response]) => {
                let rolesCopy = copy(props.roles.items);
                rolesCopy.map(roleCopy => {
                    if (roleCopy.id === permissionModalState.role.id) {
                        roleCopy.permission_bit_sequence = permissionBitSeq;
                    }
                })

                props.updateRoles({
                    items: rolesCopy,
                });
                togglePermissionModal();
            })
            .catch(([status_, response]) => {
                if (response.errors.length === 0 && response.message === null) {
                    alert_.error('Unable to update role permission')
                } else if (response.message !== null ) {
                    alert_.error(response.message);
                } else if (response.errors.length > 0) {
                    alert_.error(response.errors[0].description);
                }
            })
        ;
    }

    const permissionRows = permissionC.items.map(permission => {
        const permissionBit = BigInt(permission.permission_bit);

        let cells = props.roles.items.map(role => {
            const permissionBitSeq = BigInt(role.permission_bit_sequence || '0');

            return <div className='permission-cell' key={role.id}>
                {
                    // permissionBit.and(permissionBitSeq).value
                    permissionBit & permissionBitSeq
                        ? <div className='permission-icon box-check-green-icon'
                            onClick={e => toggleRolePermission(role, permissionBit)}
                        ></div>
                        : <div className='permission-icon box-grey-icon'
                            onClick={e => {
                                if (permission.dependent_details?.length > 0) {
                                    setPermissionModaState({
                                        role: role,
                                        permission: permission,
                                        permissionBit: permissionBit,
                                        permissionBitSeq: permissionBitSeq,
                                    });
                                    togglePermissionModal();
                                } else {
                                    toggleRolePermission(role, permissionBit);
                                }
                            }}
                        ></div>
                }
            </div>
        });

        const adminPermissionCell = <div
            className='permission-cell'
            key={999999999}
        >
            <div
                className='permission-icon box-check-green-icon'
                style={{cursor: 'not-allowed'}}
            />
        </div>

        cells = [...cells, adminPermissionCell]

        let permissionTooltipMessage = <span>Enabling this will also enable &nbsp;
            <span className='permission-name-tooltip' >
                {permission.dependent_details
                    .map(permission => permission.name).join(', ')}
            </span>
        </span>

        return <div className='permission-row' key={permission.id}>
            <div className='permission-name-wrapper'>
                <div className='permission-name'>
                    {permission.name || 'Name not available'}
                </div>

                <div className='dependent-permissions-warning'>
                    {permission.dependent_details?.length > 0
                    && <div className='requirement-warning no-registration'>
                        <Icon path='important.svg' />
                        <Tooltip>
                            {permissionTooltipMessage}
                        </Tooltip>
                    </div>}
                </div>
            </div>
            {cells}
        </div>
    });

    //Return null if user does not have read permissions permission
    // if (!me.permissions_map?.read_permissions) {
        // return
    // }

    return <div className='permissions-section'>
        <div className='permission-header-row'>
            <div className='permission-column-title'>
                Permission
            </div>
            <div className='roles-header'>
                {props.roles.items.map(role => <div className='role-header-name'>
                    {role.name || 'NA'}
                </div>)}
                <div className='role-header-name' style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                }}>
                    Admin  <Icon path='golden-star.svg' size={12}/>
                </div>
            </div>
        </div>
        {permissionRows}

        {permissionModal && <Modal
            title='Permissions'
            className='permission-modal'
            toggleModal={togglePermissionModal}
        >
            <div className='permission-modal-content'>
                <div className='line-1'>
                    "{permissionModalState.permission.name}" permission is related with following permissions. The changes in "{permissionModalState.permission.name}" will reflect on others.
                </div>
                <div className='dependent-permission-list'>
                    {permissionModalState.permission
                        .dependent_details.map(dPermission => <div className='d-permission'>
                            &bull; {dPermission.name}
                    </div>)}
                </div>
                <div className='confirmation-line'>
                    Are you sure you want to change create user permission?
                </div>
                <div className='permission-action'>
                    <button className='button secondary-button'
                        onClick={e => {
                            togglePermissionModal();
                            setPermissionModaState({});
                        }}
                    >
                        No
                    </button>
                    <button className='button primary-button'
                        onClick={e => {togglePermissionAndDependents()}}
                    >Yes</button>
                </div>
            </div>
        </Modal>}
    </div>
}

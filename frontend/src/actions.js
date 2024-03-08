function logout() {
    localStorage.removeItem('jwt');
    window.location = '/login';
}


export {
    logout,
}


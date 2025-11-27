import React, { createContext, useState, useContext, useEffect } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
    const [currentToken, setCurrentToken] = useState(() => localStorage.getItem('token'));
    const [loggedInUser, setLoggedInUser] = useState(() => JSON.parse(localStorage.getItem('user')));
    const [loggedInUserType, setLoggedInUserType] = useState(() => localStorage.getItem('userType'));

    const updateUserState = (token, user, userType) => {
        setCurrentToken(token);
        setLoggedInUser(user);
        setLoggedInUserType(userType);

        if (token && user && userType) {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('userType', userType);
        } else {
            localStorage.clear();
        }
    };

    const handleLogout = () => {
        updateUserState(null, null, null);
        // You might want to show a message here
        console.log('Logged out successfully.');
    };

    const value = {
        currentToken,
        loggedInUser,
        loggedInUserType,
        updateUserState,
        handleLogout
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) throw new Error('useUser must be used within a UserProvider');
    return context;
};
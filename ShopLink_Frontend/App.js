import React, { useState, useEffect } from 'react';
import { UserProvider, useUser } from './contexts/UserContext';
import AuthPage from './components/AuthPage';
import CustomerDashboard from './components/CustomerDashboard';
import OwnerDashboard from './components/OwnerDashboard';

function App() {
    return (
        <UserProvider>
            <div className="bg-gray-100 min-h-screen">
                <header className="bg-white shadow-md">
                    <nav className="container mx-auto px-6 py-4">
                        <h1 className="text-3xl font-bold text-primary">ShopLink</h1>
                    </nav>
                </header>
                <main className="container mx-auto p-6">
                    <AppContent />
                </main>
                <div id="modal-container"></div> {/* For global modals */}
            </div>
        </UserProvider>
    );
}

function AppContent() {
    const { loggedInUserType } = useUser();

    // Based on the user type, render the correct dashboard or the login page.
    if (loggedInUserType === 'customer') {
        return <CustomerDashboard />;
    }

    if (loggedInUserType === 'owner') {
        return <OwnerDashboard />;
    }

    return <AuthPage />;
}

export default App;
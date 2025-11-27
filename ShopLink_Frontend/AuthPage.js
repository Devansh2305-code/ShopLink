import React, { useState } from 'react';
import { useUser } from '../contexts/UserContext';
import { secureFetch, showMessage } from '../utils';

// This would be another component, but keeping it simple for now.
function RegistrationModal({ userType, closeModal }) {
    const handleRegistration = async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        const registerEndpoint = `/auth/${userType}/register`;

        const response = await secureFetch(registerEndpoint, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            showMessage(response.data.message || "Registration successful! Please log in.");
            closeModal();
        }
    };

    const isCustomer = userType === 'customer';
    const title = isCustomer ? 'New Customer Registration' : 'New Shop Owner Registration';
    const formFields = isCustomer ? (
        <>
            <input type="text" name="name" placeholder="Full Name" className="input-field" required />
            <input type="number" name="age" placeholder="Age" className="input-field" min="16" required />
            <select name="gender" className="input-field" required>
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
            </select>
            <input type="text" name="address" placeholder="Full Address" className="input-field" required />
            <input type="tel" name="phone" placeholder="Contact Number (10 digits)" pattern="\d{10}" className="input-field" required />
        </>
    ) : (
        <>
            <input type="text" name="shopName" placeholder="Shop Name" className="input-field" required />
            <input type="text" name="ownerName" placeholder="Owner Name" className="input-field" required />
            <input type="text" name="registrationId" placeholder="Registration ID" className="input-field" required />
            <input type="text" name="category" placeholder="Shop Category (e.g., Clothing)" className="input-field" required />
            <input type="tel" name="phone" placeholder="Contact Number (10 digits)" pattern="\d{10}" className="input-field" required />
        </>
    );

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-8 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
                    <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">&times;</button>
                </div>
                <form onSubmit={handleRegistration} className="space-y-4">
                    {formFields}
                    <input type="password" name="password" placeholder="Set Password" className="input-field" required />
                    <button type="submit" className="btn-primary w-full">{title}</button>
                </form>
            </div>
        </div>
    );
}

function AuthPage() {
    const { updateUserState } = useUser();
    const [showModal, setShowModal] = useState(null); // 'customer' or 'owner'

    const handleLogin = async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const userType = form.dataset.userType;
        const formData = new FormData(form);
        const payload = Object.fromEntries(formData.entries());
        const loginEndpoint = `/auth/${userType}/login`;

        const response = await secureFetch(loginEndpoint, {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const { token, user } = response.data;
            updateUserState(token, user, userType);
            showMessage(`${userType.toUpperCase()} login successful!`);
        } else {
            showMessage('Login failed. Check credentials.', 'error');
        }
    };

    return (
        <>
            {showModal && <RegistrationModal userType={showModal} closeModal={() => setShowModal(null)} />}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="card bg-white p-6 md:p-10 rounded-xl">
                    <h2 className="text-2xl font-bold mb-6 text-primary">Customer Portal</h2>
                    <form onSubmit={handleLogin} data-user-type="customer" className="space-y-4">
                        <input type="text" name="phone" placeholder="Phone Number" className="input-field" required />
                        <input type="password" name="password" placeholder="Password" className="input-field" required />
                        <div className="flex flex-col space-y-2">
                            <button type="submit" className="btn-primary">Customer Login</button>
                            <button type="button" onClick={() => setShowModal('customer')} className="btn-primary !bg-gray-400">Customer Register</button>
                        </div>
                    </form>
                </div>
                <div className="card bg-white p-6 md:p-10 rounded-xl">
                    <h2 className="text-2xl font-bold mb-6 text-secondary">Shop Owner Portal</h2>
                    <form onSubmit={handleLogin} data-user-type="owner" className="space-y-4">
                        <input type="text" name="registrationId" placeholder="Registration ID" className="input-field" required />
                        <input type="password" name="password" placeholder="Password" className="input-field" required />
                        <div className="flex flex-col space-y-2">
                            <button type="submit" className="btn-primary !bg-secondary">Owner Login</button>
                            <button type="button" onClick={() => setShowModal('owner')} className="btn-primary !bg-gray-400">Owner Register</button>
                        </div>
                    </form>
                </div>
            </div>
        </>
    );
}

export default AuthPage;
import React, { createContext, useState, useContext, useEffect } from 'react';

const UserContext = createContext(null);

export function UserProvider({ children }) {
    const [currentToken, setCurrentToken] = useState(() => localStorage.getItem('token'));
    const [loggedInUser, setLoggedInUser] = useState(() => JSON.parse(localStorage.getItem('user')));
    const [loggedInUserType, setLoggedInUserType] = useState(() => localStorage.getItem('userType'));
    const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('cart')) || []);

    // Persist cart to localStorage whenever it changes
    useEffect(() => {
        localStorage.setItem('cart', JSON.stringify(cart));
    }, [cart]);


    const updateUserState = (token, user, userType) => {
        setCurrentToken(token);
        setLoggedInUser(user);
        setLoggedInUserType(userType);

        if (token && user && userType) {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            localStorage.setItem('userType', userType);
        } else {
            // Clear everything on logout
            localStorage.clear();
            setCart([]); // Also clear cart from state
        }
    };

    const addToCart = (product, shop) => {
        setCart(prevCart => {
            // If cart is not empty and the new item is from a different shop, clear the cart.
            if (prevCart.length > 0 && prevCart[0].shopId !== shop._id) {
                alert("You can only order from one shop at a time. Starting a new cart.");
                return [{ ...product, quantity: 1, shopId: shop._id, shopName: shop.shopName }];
            }

            const existingItem = prevCart.find(item => item._id === product._id);
            if (existingItem) {
                // If item exists, increase quantity
                return prevCart.map(item =>
                    item._id === product._id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            // If item doesn't exist, add it to cart
            return [...prevCart, { ...product, quantity: 1, shopId: shop._id, shopName: shop.shopName }];
        });
    };

    const updateCartItemQuantity = (productId, quantity) => {
        setCart(prevCart => {
            if (quantity <= 0) {
                return prevCart.filter(item => item._id !== productId);
            }
            return prevCart.map(item =>
                item._id === productId ? { ...item, quantity } : item
            );
        });
    };

    const clearCart = () => {
        setCart([]);
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
        handleLogout,
        cart,
        addToCart,
        updateCartItemQuantity,
        clearCart
    };

    return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) throw new Error('useUser must be used within a UserProvider');
    return context;
};
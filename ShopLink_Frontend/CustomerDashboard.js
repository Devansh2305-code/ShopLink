import React, { useState, useEffect, useCallback } from 'react';
import { useUser } from '../contexts/UserContext';
import { secureFetch, showMessage } from '../utils';
import Cart from './Cart';

function CustomerDashboard() {
    const { loggedInUser, handleLogout } = useUser();
    const [shops, setShops] = useState([]);
    const [selectedShop, setSelectedShop] = useState(null);
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    // Fetch all shops when the component mounts
    useEffect(() => {
        const fetchShops = async () => {
            setIsLoading(true);
            const response = await secureFetch('/customer/shops');
            if (response.ok) {
                setShops(response.data);
            }
            setIsLoading(false);
        };
        fetchShops();
    }, []);

    // Fetch products when a shop is selected
    const handleSelectShop = async (shop) => {
        setSelectedShop(shop);
        setProducts([]); // Clear previous products
        setIsLoading(true);
        const response = await secureFetch(`/customer/shops/${shop._id}/products`);
        if (response.ok) {
            setProducts(response.data);
        }
        setIsLoading(false);
    };

    if (isLoading && shops.length === 0) {
        return <div>Loading shops...</div>;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Welcome, {loggedInUser?.name}!</h2>
                <button onClick={handleLogout} className="btn-secondary">Logout</button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                    {!selectedShop ? (
                        <ShopList shops={shops} onSelectShop={handleSelectShop} />
                    ) : (
                        <ProductList
                            products={products}
                            selectedShop={selectedShop}
                            onBack={() => setSelectedShop(null)}
                            isLoading={isLoading}
                        />
                    )}
                </div>
                <div className="lg:col-span-1">
                    <Cart />
                </div>
            </div>
        </div>
    );
}

function ShopList({ shops, onSelectShop }) {
    return (
        <div className="card bg-white p-6 rounded-xl">
            <h3 className="text-xl font-bold mb-4">Available Shops</h3>
            {shops.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {shops.map(shop => (
                        <div key={shop._id} className="border p-4 rounded-lg hover:shadow-md cursor-pointer" onClick={() => onSelectShop(shop)}>
                            <h4 className="font-bold text-lg">{shop.shopName}</h4>
                            <p className="text-sm text-gray-600">{shop.category}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500">No shops are available at the moment.</p>
            )}
        </div>
    );
}

function ProductList({ products, selectedShop, onBack, isLoading }) {
    const { addToCart } = useUser();

    // Use useCallback to memoize the handler function.
    // This prevents creating a new function on every render for the onClick prop.
    const handleAddToCart = useCallback((product) => {
        addToCart(product, selectedShop);
    }, [addToCart, selectedShop]);

    return (
        <div className="card bg-white p-6 rounded-xl">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Products from {selectedShop.shopName}</h3>
                <button onClick={onBack} className="text-primary hover:underline"> &larr; Back to Shops</button>
            </div>
            {isLoading ? (
                <div>Loading products...</div>
            ) : products.length > 0 ? (
                <div className="space-y-4">
                    {products.map(product => (
                        <div key={product._id} className="flex justify-between items-center border-b pb-2">
                            <div>
                                <h4 className="font-semibold">{product.name}</h4>
                                <p className="text-gray-700">₹{product.price}</p>
                            </div>
                            <button onClick={() => handleAddToCart(product)} className="btn-primary px-3 py-1">Add to Cart</button>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-gray-500">This shop has no products listed yet.</p>
            )}
        </div>
    );
}

export default CustomerDashboard;

// ```

// #### `c:/Users/gaura/OneDrive/文档/GitHub/ShopLink/ShopLink_Frontend/components/Cart.js`

// This component will display the cart's contents and total.

// ```diff

import React from 'react';
import { useUser } from '../contexts/UserContext';
import { secureFetch, showMessage } from '../utils';

function Cart() {
    const { cart, updateCartItemQuantity, clearCart } = useUser();

    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    const handleCheckout = async () => {
        if (cart.length === 0) {
            showMessage("Your cart is empty.", "warning");
            return;
        }

        const orderDetails = {
            shopId: cart[0].shopId,
            items: cart.map(item => ({ productId: item._id, quantity: item.quantity })),
            totalAmount: total,
        };

        const response = await secureFetch('/customer/orders', {
            method: 'POST',
            body: JSON.stringify(orderDetails),
        });

        if (response.ok) {
            showMessage("Order placed successfully!", "success");
            clearCart();
        } else {
            showMessage(response.data.message || "Failed to place order.", "error");
        }
    };

    return (
        <div className="card bg-white p-6 rounded-xl sticky top-6">
            <h3 className="text-xl font-bold mb-4">My Cart</h3>
            {cart.length === 0 ? (
                <p className="text-gray-500">Your cart is empty.</p>
            ) : (
                <>
                    <div className="space-y-3 mb-4">
                        {cart.map(item => (
                            <div key={item._id} className="flex justify-between items-center text-sm">
                                <div>
                                    <p className="font-semibold">{item.name}</p>
                                    <p className="text-gray-600">₹{item.price} x {item.quantity}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => updateCartItemQuantity(item._id, item.quantity - 1)} className="border rounded-full w-6 h-6">-</button>
                                    <span>{item.quantity}</span>
                                    <button onClick={() => updateCartItemQuantity(item._id, item.quantity + 1)} className="border rounded-full w-6 h-6">+</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="border-t pt-4">
                        <div className="flex justify-between font-bold text-lg">
                            <span>Total</span>
                            <span>₹{total.toFixed(2)}</span>
                        </div>
                        <button onClick={handleCheckout} className="btn-primary w-full mt-4">
                            Checkout
                        </button>
                        <button onClick={clearCart} className="text-center w-full mt-2 text-red-500 hover:underline text-sm">
                            Clear Cart
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

export default Cart;